import React, { useMemo, useState } from 'react';
import { LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import type { ProcessedRecord } from '../types';
import { calculateVisitCheckInMetrics } from '../utils/visitMetrics';

type InsightContext = {
  totalVisits: number;
  totalRows: number;
  checkedInVisits: number;
  checkInRate: number;
  missingCheckouts: number;
  lateVisits: number;
  averageDurationMinutes: number | null;
  breakdowns: Record<string, Record<string, number>>;
};

interface AIInsightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  records: ProcessedRecord[];
}

const examples = [
  'Bagaimana performa check-in periode ini?',
  'Area mana yang paling aktif?',
  'Apa insight dari book type?',
  'Apa yang perlu ditindaklanjuti?',
];

function aggregate(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((out, value) => {
    const label = value?.trim() || 'Belum diisi';
    out[label] = (out[label] || 0) + 1;
    return out;
  }, {});
}

function localSummary(metrics: InsightContext, question: string): string {
  const top = (values: Record<string, number>) => Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => name + ' (' + count + ' visit)').join(', ') || '-';

  let answer = 'Periode/filter aktif: ' + metrics.totalVisits + ' visit unik, ' +
    metrics.checkedInVisits + ' tercatat check-in (' + metrics.checkInRate + '%).';
  if (question.toLowerCase().includes('area')) answer += '\nArea teratas: ' + top(metrics.breakdowns.area) + '.';
  else if (question.toLowerCase().includes('book')) answer += '\nBook type teratas: ' + top(metrics.breakdowns.bookType) + '.';
  else answer += '\nArea: ' + top(metrics.breakdowns.area) + '.\nBook type: ' + top(metrics.breakdowns.bookType) + '.';
  answer += '\nPerlu ditindaklanjuti: ' + metrics.missingCheckouts +
    ' visit tanpa check-out dan ' + metrics.lateVisits + ' visit dengan keterlambatan.';
  return answer;
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({ isOpen, onClose, records }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGenerative, setIsGenerative] = useState(false);

  const context = useMemo<InsightContext>(() => {
    // Only send aggregate statistics. No client, ticket, PIC or contact details.
    const metrics = calculateVisitCheckInMetrics(records);
    const visitsByKey = new Map<string, ProcessedRecord[]>();
    records.forEach((r) => {
      if (!visitsByKey.has(r.primaryVisitKey)) visitsByKey.set(r.primaryVisitKey, []);
      visitsByKey.get(r.primaryVisitKey)!.push(r);
    });
    const groups = [...visitsByKey.values()];
    const visits = groups.map((g) => g[0]);
    const durations = visits.map((r) => r.durationMinutes)
      .filter((duration): duration is number => typeof duration === 'number' && duration >= 0 && duration <= 1440);
    return {
      ...metrics,
      totalRows: records.length,
      missingCheckouts: groups.filter((g) => g.some((r) => r.checkInDateObj !== null) &&
        !g.some((r) => r.checkOutDateObj !== null)).length,
      lateVisits: groups.filter((g) => g.some((r) => r.punctualityStatus === 'late')).length,
      averageDurationMinutes: durations.length
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : null,
      breakdowns: {
        area: aggregate(visits.map((r) => r.area)),
        bookType: aggregate(visits.map((r) => r.bookType)),
        status: aggregate(visits.map((r) => r.status)),
        month: aggregate(visits.map((r) => r.dateVisit?.slice(3))),
      },
    };
  }, [records]);

  if (!isOpen) return null;

  async function ask(text: string) {
    const prompt = text.trim().slice(0, 700);
    if (!prompt || loading) return;
    setQuestion(prompt);
    setLoading(true);
    setAnswer('');
    setMessage('');
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, context }),
      });
      if (response.status === 404 || response.status === 503) {
        setAnswer(localSummary(context, prompt));
        setIsGenerative(false);
        setMessage('Statistik lokal. Agar AI generatif aktif, set GEMINI_API_KEY di Netlify.');
      } else {
        const payload: { answer?: string; error?: string } = await response.json();
        if (!response.ok) throw new Error(payload.error || 'AI belum tersedia');
        setAnswer(payload.answer || 'Tidak ada jawaban yang bisa ditampilkan.');
        setIsGenerative(true);
      }
    } catch {
      setAnswer(localSummary(context, prompt));
      setIsGenerative(false);
      setMessage('Koneksi AI belum tersedia. Menampilkan ringkasan statistik terfilter.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="insights-title"
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-violet-100 p-2 text-violet-700"><Sparkles className="h-5 w-5"/></span>
            <div>
              <h2 id="insights-title" className="font-bold text-slate-900">AI Insight</h2>
              <p className="text-xs text-slate-500">Mengikuti filter dashboard aktif</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup AI Insight" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5"/>
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-xs leading-5 text-slate-700">
            Hanya metrik agregat yang digunakan. Tiket, nama outlet, alamat, nomor kontak dan PIC tidak dikirim ke AI.
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-slate-500">Coba tanyakan</p>
            {examples.map((example) => (
              <button type="button" key={example} disabled={loading} onClick={() => void ask(example)}
                className="block w-full rounded-xl border border-slate-200 p-3 text-left text-sm hover:border-violet-300 hover:bg-violet-50">
                {example}
              </button>
            ))}
          </div>
          {(answer || loading || message) && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-violet-700">
                {isGenerative ? 'Jawaban AI' : 'Insight Statistik'}
              </div>
              {loading ? <p className="text-sm text-slate-500">Menganalisis data terfilter…</p> :
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{answer}</p>}
              {message && <p className="text-[11px] text-amber-700">{message}</p>}
            </div>
          )}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void ask(question); }}
          className="border-t border-slate-200 bg-slate-50 p-4">
          <div className="flex gap-2">
            <textarea aria-label="Tulis pertanyaan AI" maxLength={700} value={question}
              onChange={(event) => setQuestion(event.target.value)} rows={2}
              placeholder="Tanyakan insight dari data kunjungan…"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3 text-sm"/>
            <button type="submit" aria-label="Kirim pertanyaan" disabled={loading || !question.trim()}
              className="self-end rounded-xl bg-violet-700 p-3 text-white disabled:opacity-40">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Verifikasi insight terhadap angka dashboard.</p>
        </form>
      </section>
    </div>
  );
};
