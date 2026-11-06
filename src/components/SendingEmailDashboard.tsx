import React, { useEffect, useMemo, useState } from 'react';
import type { RawDataRow } from '../types';
import { matchSendingEmailRows } from '../utils/sendingEmail';

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const panel = 'rounded-2xl border border-slate-200 bg-white p-4';

export function SendingEmailDashboard({ rows, refresh }: { rows: RawDataRow[]; refresh: number }) {
  const [timeline, setTimeline] = useState<RawDataRow[] | null>(null);
  const [error, setError] = useState(false);
  const [consultant, setConsultant] = useState('');
  const [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch('/api/worksheets?sheet=timeline-omni', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Timeline belum tersedia');
        const data = await response.json();
        if (!Array.isArray(data.records)) throw new Error('Timeline tidak valid');
        if (!controller.signal.aborted) setTimeline(data.records);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [refresh]);

  const data = useMemo(() => matchSendingEmailRows(rows, timeline ?? []), [rows, timeline]);
  const months = [...new Set(data.map(item => item.scheduled.slice(0, 7)).filter(Boolean))].sort().reverse();
  const consultantName = (row: RawDataRow) => row['Nama Consultant']?.trim() || 'Belum tercatat';
  const consultants = [...new Set<string>(data.map(({ row }) => consultantName(row)))].sort((a, b) => a.localeCompare(b, 'id'));
  const filtered = data.filter(({ row, scheduled }) => (!month || scheduled.startsWith(month)) &&
    (!consultant || consultantName(row) === consultant) &&
    [row['Ticket ID'], row['Nama Consultant'], row['Nama Support'], row['Nama Outlet']]
      .some(value => (value || '').toLowerCase().includes(query.trim().toLowerCase())));
  const sent = filtered.filter(item => item.emailDays !== null && item.emailDays <= 1).length;
  const completed = filtered.filter(item => item.completed && item.completed === item.scheduled).length;
  const knownSent = filtered.filter(item => item.sent).length;
  const knownCompleted = filtered.filter(item => item.completed).length;
  const rate = (n: number, denominator: number) => denominator ? number.format(n / denominator * 100) + '%' : '—';
  const lastPage = Math.max(1, Math.ceil(filtered.length / 15));
  const currentPage = Math.min(page, lastPage);

  return <div className="space-y-4">
    <div className={panel + ' flex flex-wrap gap-3'}>
      <label className="text-sm">Bulan jadwal
        <select className="ml-2 rounded border p-2" value={month} onChange={event => { setMonth(event.target.value); setPage(1); }}>
          <option value="">Semua bulan</option>{months.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="text-sm">Konsultan
        <select className="ml-2 rounded border p-2" value={consultant} onChange={event => { setConsultant(event.target.value); setPage(1); }}>
          <option value="">Semua konsultan</option>{consultants.map(name => <option key={name}>{name}</option>)}
        </select>
      </label>
      <input className="rounded border p-2 text-sm" aria-label="Cari tiket, tim, atau outlet" placeholder="Cari tiket, tim, atau outlet" value={query}
        onChange={event => { setQuery(event.target.value); setPage(1); }} />
    </div>
    {error && <p role="alert" className="text-sm text-amber-800">TIMELINE OMNI gagal dimuat. {timeline ? 'Hasil terakhir masih ditampilkan.' : 'KPI belum tersedia.'}</p>}
    {!timeline && !error && <p role="status" className="text-sm text-slate-600">Memuat TIMELINE OMNI…</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        ['Total tiket', number.format(filtered.length), 'Tiket SEND EMAIL sesuai filter, di luar status CANCEL'],
        ['Email terkirim paling lambat H+1', rate(sent, knownSent), number.format(sent) + ' dari ' + number.format(knownSent) + ' tiket dengan jejak SEND EMAIL'],
        ['Status COMPLETED di hari jadwal', rate(completed, knownCompleted), number.format(completed) + ' dari ' + number.format(knownCompleted) + ' tiket dengan jejak COMPLETED'],
      ].map(([label, value, note]) => <article key={label} className={panel}>
        <h2 className="text-sm font-semibold">{label}</h2><p className="my-2 text-2xl font-bold">{value}</p><p className="text-xs text-slate-600">{note}</p>
      </article>)}
    </div>
    <p className="text-sm text-slate-600">Target form selesai di hari jadwal adalah 100%. Sheet sumber belum menyediakan waktu submit form, sehingga status COMPLETED ditampilkan sebagai indikator terpisah. Tiket tanpa jejak status tidak masuk pembagi KPI terkait.</p>
    <section className={panel}>
      <h2 className="font-semibold">Rincian Sending Email</h2>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50"><tr>{['Tiket', 'Konsultan', 'Status tiket', 'Jadwal', 'COMPLETED', 'SEND EMAIL', 'Selisih email', 'Keterangan'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{filtered.slice((currentPage - 1) * 15, currentPage * 15).map((item, index) =>
          <tr key={index} className="border-t border-slate-100">{[
            item.row['Ticket ID'], consultantName(item.row), item.row.Status, item.scheduled, item.completed, item.sent,
            item.emailDays === null ? '' : 'H+' + item.emailDays,
            !item.scheduled ? 'Jadwal belum tercatat' : !timeline ? 'Timeline belum tersedia' : [
              item.emailDays === null ? 'Email: belum ada jejak kirim' : item.emailDays <= 1 ? 'Email: tepat waktu' : 'Email: lewat H+1',
              !item.completed ? 'COMPLETED: belum ada jejak' : item.completed === item.scheduled ? 'COMPLETED: di hari jadwal' : 'COMPLETED: setelah hari jadwal',
            ].join(' · '),
          ].map((value, column) => <td key={column} className="p-2">{value || '—'}</td>)}</tr>)}</tbody>
      </table></div>
      {!filtered.length && <p className="mt-3 text-sm">Tidak ada tiket sesuai filter.</p>}
      {lastPage > 1 && <div className="mt-3 flex justify-end gap-3 text-sm">
        <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Sebelumnya</button>
        <span>{currentPage} / {lastPage}</span>
        <button disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Berikutnya</button>
      </div>}
    </section>
  </div>;
}
