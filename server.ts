import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer as createViteServer } from 'vite';

const app = express();
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const rateWindowMs = 60 * 60 * 1000;
const rateLimit = 12;

app.disable('x-powered-by');
app.use(express.json({ limit: '12kb' }));

function cleanBreakdown(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === 'string' ? row.label.trim().slice(0, 60) : '';
    const visits = Number(row.visits);
    if (!label || !Number.isFinite(visits) || visits < 0) return [];
    return [{ label, visits: Math.min(Math.round(visits), 10000000) }];
  });
}

function cleanContext(value: unknown) {
  const context = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const count = (key: string) => {
    const value = Number(context[key]);
    return Number.isFinite(value) && value >= 0 ? Math.min(Math.round(value), 10000000) : 0;
  };
  const average = Number(context.averageDurationMinutes);
  const breakdowns = context.breakdowns && typeof context.breakdowns === 'object'
    ? context.breakdowns as Record<string, unknown>
    : {};

  return {
    totalVisits: count('totalVisits'),
    totalRows: count('totalRows'),
    missingCheckouts: count('missingCheckouts'),
    lateVisits: count('lateVisits'),
    onTimeVisits: count('onTimeVisits'),
    averageDurationMinutes: Number.isFinite(average) && average >= 0 ? Math.min(Math.round(average), 100000) : null,
    deduplicated: context.deduplicated === true,
    breakdowns: {
      area: cleanBreakdown(breakdowns.area),
      bookType: cleanBreakdown(breakdowns.bookType),
      status: cleanBreakdown(breakdowns.status),
      month: cleanBreakdown(breakdowns.month),
    },
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/insights', async (req, res) => {
  const now = Date.now();
  const address = req.ip || req.socket.remoteAddress || 'unknown';
  const bucket = requestCounts.get(address);
  if (!bucket || now >= bucket.resetAt) {
    requestCounts.set(address, { count: 1, resetAt: now + rateWindowMs });
  } else if (bucket.count >= rateLimit) {
    return res.status(429).json({ error: 'Batas penggunaan AI untuk sementara tercapai. Coba lagi nanti.' });
  } else {
    bucket.count += 1;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI Insight belum aktif. Tambahkan OPENAI_API_KEY pada konfigurasi server.' });
  }

  const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 700) : '';
  if (!question) return res.status(400).json({ error: 'Pertanyaan belum diisi.' });

  const context = cleanContext(req.body?.context);
  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions: [
          'Kamu adalah analis operasional ESB untuk dashboard kunjungan lapangan.',
          'Jawab dalam Bahasa Indonesia yang ringkas, jelas, dan langsung.',
          'Gunakan hanya angka dalam ringkasan agregat yang diberikan. Jangan menebak atau membuat angka.',
          'Jika jumlah data terlalu kecil atau suatu metrik tidak tersedia, sampaikan batasannya.',
          'Jangan meminta atau menyimpulkan informasi pribadi pelanggan. Data yang tersedia hanya agregat.',
          'Berikan insight dan tindakan yang bisa dicek kembali di dashboard.',
        ].join(' '),
        input: `Ringkasan dashboard terfilter (JSON):\n${JSON.stringify(context)}\n\nPertanyaan:\n${question}`,
        max_output_tokens: 650,
        store: false,
      }),
    });

    const payload = await upstream.json() as {
      error?: { message?: string };
      output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
    };

    if (!upstream.ok) {
      console.error('OpenAI Responses API returned an error:', upstream.status);
      return res.status(502).json({
        error: upstream.status === 401
          ? 'Kunci API OpenAI belum valid. Periksa konfigurasi server.'
          : 'Layanan AI belum bisa menjawab saat ini. Coba lagi sebentar.',
      });
    }

    const answer = (payload.output || [])
      .flatMap((item) => item.content || [])
      .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n')
      .trim();

    if (!answer) return res.status(502).json({ error: 'Layanan AI tidak mengembalikan jawaban teks.' });
    return res.json({ answer, model });
  } catch (error) {
    console.error('AI insight request failed:', error);
    return res.status(502).json({ error: 'Koneksi ke layanan AI gagal. Periksa koneksi server dan coba lagi.' });
  }
});

app.get('/api/download-singlefile', async (_req, res) => {
  const outputPath = path.join(rootDir, 'dist', 'index.html');
  try {
    if (!existsSync(outputPath)) await build({ configFile: path.join(rootDir, 'vite.config.ts') });
    const html = await readFile(outputPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard-visit-offline.html"');
    return res.send(html);
  } catch (error) {
    console.error('Offline export failed:', error);
    return res.status(500).send('File HTML offline gagal dibuat.');
  }
});

if (isProduction) {
  const distDir = path.join(rootDir, 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  const vite = await createViteServer({
    configFile: path.join(rootDir, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Dashboard ESB running at http://localhost:${port}`);
});
