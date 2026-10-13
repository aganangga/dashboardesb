import React, { useEffect, useMemo, useState } from 'react';
import { WORKSHEETS } from '../utils/worksheetCsv.mjs';
import type { RawDataRow } from '../types';

type Dataset = { headers: string[]; records: RawDataRow[]; fetchedAt: string; source: string };
interface Props {
  selected: string;
  onSelect: (id: string) => void;
  onVisitLoaded: (data: RawDataRow[], headers: string[]) => void;
}

function WorksheetTable({ dataset }: { dataset: Dataset }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { setSearch(''); setPage(1); }, [dataset]);
  const filtered = useMemo(() => dataset.records.filter(row =>
    Object.values(row).some(value => String(value ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  ), [dataset, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const current = Math.min(page, pages);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="text-sm text-slate-600">Cari data worksheet
        <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="block mt-1 rounded-lg border border-slate-300 px-3 py-2" placeholder="Cari di semua kolom…" />
      </label>
      <span className="text-sm text-slate-500">{filtered.length.toLocaleString('id-ID')} dari {dataset.records.length.toLocaleString('id-ID')} baris · {dataset.headers.length} kolom</span>
    </div>
    <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-100"><tr>
        <th scope="col" className="px-3 py-3 text-left">No.</th>
        {dataset.headers.map(header => <th key={header} scope="col" className="whitespace-nowrap px-3 py-3 text-left">{header}</th>)}
      </tr></thead><tbody>
        {filtered.slice((current - 1) * 50, current * 50).map((row, index) => <tr key={(current - 1) * 50 + index} className="border-t border-slate-100 odd:bg-white even:bg-slate-50">
          <td className="px-3 py-2">{(current - 1) * 50 + index + 1}</td>
          {dataset.headers.map(header => <td key={header} className="max-w-sm whitespace-pre-wrap px-3 py-2 align-top">{row[header] || '—'}</td>)}
        </tr>)}
      </tbody></table>
      {!filtered.length && <p className="p-6 text-center text-slate-500">Tidak ada data yang cocok.</p>}
    </div>
    <div className="flex justify-end items-center gap-3 text-sm">
      <button disabled={current <= 1} onClick={() => setPage(current - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Sebelumnya</button>
      <span>Halaman {current} dari {pages}</span>
      <button disabled={current >= pages} onClick={() => setPage(current + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Berikutnya</button>
    </div>
  </div>;
}

export function WorksheetDashboard({ selected, onSelect, onVisitLoaded }: Props) {
  const [datasets, setDatasets] = useState<Record<string, Dataset>>({});
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sheet = WORKSHEETS.find(sheet => sheet.id === selected)!;
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    if (window.location.protocol === 'file:') {
      setLoading(false);
      setError('Versi offline memakai data tersimpan. Buka dashboard online untuk memuat worksheet.');
      return;
    }
    setLoading(true);
    async function load() {
      try {
        const response = await fetch(`/api/worksheets?sheet=${encodeURIComponent(selected)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Worksheet belum dapat dimuat.');
        if (!Array.isArray(data.headers) || !Array.isArray(data.records) || !data.records.length) throw new Error('Data worksheet tidak valid.');
        if (controller.signal.aborted) return;
        setDatasets(previous => ({ ...previous, [selected]: data }));
        if (selected === 'visit') onVisitLoaded(data.records, data.headers);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Worksheet belum dapat dimuat.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [selected, reload]);
  const dataset = datasets[selected];
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5" aria-label="Pilihan worksheet">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <label htmlFor="worksheet-select" className="text-xs font-semibold uppercase text-slate-500">Tampilkan worksheet</label>
        <select id="worksheet-select" value={selected} onChange={e => onSelect(e.target.value)} className="block mt-2 min-w-56 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">
          {WORKSHEETS.map(sheet => <option key={sheet.id} value={sheet.id}>{sheet.title}</option>)}
        </select>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{sheet.title}</h2>
        <p className="mt-1 text-xs text-slate-500">{dataset ? `${dataset.records.length.toLocaleString('id-ID')} baris · Google Sheets · Dimuat ${new Date(dataset.fetchedAt).toLocaleString('id-ID')}` : 'Sumber: Google Sheets'}</p>
      </div>
      <button onClick={() => setReload(value => value + 1)} disabled={loading} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Memuat…' : 'Muat ulang worksheet'}</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{error}{selected === 'visit' && ' Data kunjungan sebelumnya tetap ditampilkan.'}</p>}
    {selected !== 'visit' && dataset && <WorksheetTable dataset={dataset} />}
    {selected !== 'visit' && !dataset && !error && <p role="status" className="text-sm text-slate-500">Memuat data {sheet.title}…</p>}
  </section>;
}
