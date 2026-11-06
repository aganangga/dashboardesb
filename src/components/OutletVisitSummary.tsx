import React, { useMemo, useState } from 'react';
import type { ProcessedRecord } from '../types';

export function OutletVisitSummary({ records }: { records: ProcessedRecord[] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const rows = useMemo(() => {
    const visits = new Map<string, ProcessedRecord>();
    for (const record of records) {
      if (!visits.has(record.primaryVisitKey)) visits.set(record.primaryVisitKey, record);
    }
    const groups = new Map<string, { outlet: string; month: string; total: number; types: Map<string, number> }>();
    for (const record of visits.values()) {
      const [day, month, year] = record.dateVisit.split('/');
      if (!day || !month || !year) continue;
      const outlet = record.outletName.trim() || 'Outlet belum tercatat';
      const period = `${year}-${month}`;
      const key = JSON.stringify([outlet.toLowerCase().replace(/\s+/g, ' '), period]);
      const group = groups.get(key) ?? { outlet, month: period, total: 0, types: new Map() };
      const type = record.bookType.trim() || 'Belum tercatat';
      group.total++;
      group.types.set(type, (group.types.get(type) ?? 0) + 1);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => b.total - a.total || b.month.localeCompare(a.month) || a.outlet.localeCompare(b.outlet));
  }, [records]);
  const matches = rows.filter(row => row.outlet.toLowerCase().includes(query.trim().toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(matches.length / 10));
  const currentPage = Math.min(page, pageCount);
  const monthFormat = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Kunjungan per Outlet</h2>
        <p className="mt-1 text-sm text-slate-600">Kunjungan unik per bulan berdasarkan tanggal visit. Urutan dari volume tertinggi.</p>
      </div>
      <input aria-label="Cari outlet di rekap bulanan" placeholder="Cari outlet…" value={query}
        onChange={event => { setQuery(event.target.value); setPage(1); }}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </div>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-700"><tr>
          <th className="p-3">Outlet</th><th className="p-3">Bulan</th><th className="p-3 text-right">Visit</th><th className="p-3">Rincian Book Type</th>
        </tr></thead>
        <tbody>{matches.slice((currentPage - 1) * 10, currentPage * 10).map(row => <tr key={JSON.stringify([row.outlet, row.month])} className="border-t border-slate-100">
          <th scope="row" className="p-3 font-semibold">{row.outlet}</th>
          <td className="p-3 whitespace-nowrap">{monthFormat.format(new Date(row.month + '-01T00:00:00Z'))}</td>
          <td className="p-3 text-right font-bold tabular-nums">{row.total}</td>
          <td className="p-3"><div className="flex flex-wrap gap-2">{[...row.types].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([type, count]) =>
            <span key={type} className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-900">{type} <b>{count}</b></span>
          )}</div></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!matches.length && <p className="p-3 text-sm text-slate-600">Tidak ada outlet yang cocok dengan filter.</p>}
    {pageCount > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-sm">
      <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Sebelumnya</button>
      <span>Halaman {currentPage} dari {pageCount}</span>
      <button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Berikutnya</button>
    </div>}
  </section>;
}
