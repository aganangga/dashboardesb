// Netlify Functions v2. GEMINI_API_KEY stays on the server (never in client JS).
const MODEL = 'gemini-2.5-flash';

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI API belum dikonfigurasi.' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'JSON tidak valid' }), { status: 400 }); }

  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 700) : '';
  if (!question || !body?.context || typeof body.context !== 'object') {
    return new Response(JSON.stringify({ error: 'Pertanyaan dan metrik wajib ada' }), { status: 400 });
  }

  // Explicit allowlist of aggregate metrics. Never forward raw CSV or ticket/client identities.
  const c = body.context;
  const counts = (value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).slice(0, 40).filter(([key, val]) =>
        key.length <= 60 && typeof val === 'number' && Number.isFinite(val)))
    : {};
  const data = {
    totalVisits: Number(c.totalVisits) || 0,
    totalRows: Number(c.totalRows) || 0,
    checkedInVisits: Number(c.checkedInVisits) || 0,
    anomalyVisits: Number(c.anomalyVisits) || 0,
    checkInRate: Number(c.checkInRate) || 0,
    missingCheckouts: Number(c.missingCheckouts) || 0,
    lateVisits: Number(c.lateVisits) || 0,
    averageDurationMinutes: Number(c.averageDurationMinutes) || null,
    breakdowns: {
      area: counts(c.breakdowns?.area),
      bookType: counts(c.breakdowns?.bookType),
      status: counts(c.breakdowns?.status),
      month: counts(c.breakdowns?.month),
    },
  };
  const prompt = [
    'Berperan sebagai analis operasional ESB dalam bahasa Indonesia yang ringkas.',
    'Gunakan hanya data agregat yang tersedia; jangan mengarang atau menebak.',
    'Definisi Check-In Rate (KPI yang disetujui) = (Total Visit unik - Anomali Menginap unik) / Total Visit unik × 100%.',
    'Tawarkan tindak lanjut operasional bila relevan.',
    'Pertanyaan: ' + question,
    'Data agregat: ' + JSON.stringify(data),
  ].join('\n');

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Provider AI tidak tersedia (' + response.status + ')' }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }
    const result = await response.json();
    const answer = result?.candidates?.[0]?.content?.parts
      ?.filter((part) => typeof part.text === 'string').map((part) => part.text).join('\n') || '';
    return new Response(JSON.stringify({ answer }), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Koneksi AI sedang tidak tersedia.' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = { path: '/api/insights' };
