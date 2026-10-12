import React, { useMemo, useState } from 'react';
import { LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import type { ProcessedRecord } from '../types';

type Bucket = { label: string; visits: number };
type InsightContext = {
  totalVisits: number;
  totalRows: number;
  missingCheckouts: number;
  lateVisits: number;
  onTimeVisits: number;
  averageDurationMinutes: number | null;
  deduplicated: boolean;
  breakdowns: {
    area: Bucket[];
    bookType: Bucket[];
    status: Bucket[];
    month: Bucket[];
  };
};

interface AIInsightPanelProps {
  open: boolean;
  onClose: () => void;
  records: ProcessedRecord[];
  totalVisits: number;
  deduplicateEnabled: boolean;
}

const suggestions = [
  'Apa temuan utama dari data yang sedang difilter?',
  'Area mana yang perlu jadi prioritas tindak lanjut?',
  'Bagaimana kualitas check-in dan ketepatan waktu?',
];

function topBuckets(values: string[]): Bucket[] {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const label = value?.trim() || 'Tidak diisi';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, visits]) => ({ label, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  open,
  onClose,
  records,
  totalVisits,
  deduplicateEnabled,
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const context = useMemo<InsightContext>(() => {
    const distinct = new Map<string, ProcessedRecord>();
    records.forEach((record) => {
      const key = record.primaryVisitKey || record.uniqueVisitKey || record.id;
      if (!distinct.has(key)) distinct.set(key, record);
    });
    const rows = deduplicateEnabled ? [...distinct.values()] : records;
    const durations = rows
      .map((record) => record.durationMinutes)
      .filter((value): value is number => typeof value === 'number' && value >= 0);
    const months = rows.map((record) => {
      const parts = (record.agendaDate || '').split('/');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : 'Tidak diketahui';
    });

    return {
      totalVisits,
      totalRows: records.length,
      missingCheckouts: rows.filter((record) => !record.checkOutTime).length,
      lateVisits: rows.filter((record) => record.punctualityStatus === 'late').length,
      onTimeVisits: rows.filter((record) => ['early', 'on_time'].includes(record.punctualityStatus)).length,
      averageDurationMinutes: durations.length
        ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
        : null,
      deduplicated: deduplicateEnabled,
      breakdowns: {
        area: topBuckets(rows.map((record) => record.area)),
        bookType: topBuckets(rows.map((record) => record.bookType)),
        status: topBuckets(rows.map((record) => record.status)),
        month: topBuckets(months),
      },
    };
  }, [records, totalVisits, deduplicateEnabled]);

  if (!open) return null;

  const submit = async (value = question) => {
    const cleaned = value.trim();
    if (!cleaned || loading) return;
    setQuestion(cleaned);
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleaned, context }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Insight belum bisa dibuat. Coba lagi.');
      setAnswer(result.answer || 'Belum ada jawaban yang bisa ditampilkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Koneksi AI tidak berhasil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-insight-title"
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="ai-insight-title" className="text-lg font-bold text-slate-900">AI Insight</h2>
              <p className="mt-0.5 text-sm text-slate-500">Analisis mengikuti filter dashboard saat ini</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup panel AI">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-slate-700">
            Aku membaca ringkasan metrik dan breakdown agregat sesuai filter aktif. Data outlet, alamat, nomor kontak, dan tiket tidak dikirim untuk analisis.
          </div>

          <div className="mt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Coba tanyakan</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setQuestion(suggestion); void submit(suggestion); }}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {(loading || answer || error) && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-700">Pertanyaan</p>
              <p className="text-sm text-slate-700">{question}</p>
              <div className="my-4 h-px bg-slate-100" />
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-700">Jawaban</p>
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Sedang menganalisis data terfilter…</p>
              ) : error ? (
                <p className="text-sm leading-6 text-rose-700">{error}</p>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{answer}</p>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => { event.preventDefault(); void submit(); }}
          className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5"
        >
          <label htmlFor="ai-question" className="sr-only">Tulis pertanyaan</label>
          <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
            <textarea
              id="ai-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              maxLength={700}
              rows={2}
              placeholder="Tanyakan insight dari data kunjungan…"
              className="max-h-32 min-h-12 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-700 text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Kirim pertanyaan"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Jawaban AI membantu membaca pola; cek kembali angka pada dashboard.</p>
        </form>
      </section>
    </div>
  );
};
