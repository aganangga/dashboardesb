import { useMemo, useState } from 'react';
import type { ProcessedRecord } from '../types';
import { formatDuration } from '../utils/dataProcessor';

const pageSize = 15;
const arrivalStatus = { early: 'Lebih awal', on_time: 'Tepat waktu', late: 'Terlambat', not_checked_in: 'Belum check-in' };

export function VisitCheckDashboard({ records, mode }: { records: ProcessedRecord[]; mode: 'check-in' | 'check-out' }) {
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const arrival = mode === 'check-in';
  const title = arrival ? 'Check-in' : 'Check-out';
  const getTime = (row: ProcessedRecord) => arrival ? row.checkInDateObj : row.checkOutDateObj;
  const present = records.filter(row => getTime(row)).length;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return records.filter(row => {
      const time = arrival ? row.checkInDateObj : row.checkOutDateObj;
      return (status === 'all' || (status === 'missing' ? !time : !!time)) &&
        [row.ticketId, row.outletName, row.supportName].some(value => value.toLowerCase().includes(term));
    }).sort((a, b) => {
      const aDate = (arrival ? a.checkInDateObj : a.checkOutDateObj) ?? a.agendaDateObj;
      const bDate = (arrival ? b.checkInDateObj : b.checkOutDateObj) ?? b.agendaDateObj;
      return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
    });
  }, [records, arrival, query, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const headings = arrival ? ['Jadwal', 'Check-in aktual', 'Ketepatan'] : ['Check-out aktual', 'Durasi', 'Status'];
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="grid gap-3 sm:grid-cols-3">
      <p>Total baris visit <strong className="block text-xl">{records.length}</strong></p>
      <p>Sudah {title.toLowerCase()} <strong className="block text-xl">{present}</strong></p>
      <p>Belum {title.toLowerCase()} <strong className="block text-xl">{records.length - present}</strong></p>
    </div>
    <div className="flex flex-wrap gap-3">
      <input className="rounded-lg border border-slate-200 p-2" aria-label="Cari tiket, outlet, atau support" placeholder="Cari tiket, outlet, atau support" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} />
      <select className="rounded-lg border border-slate-200 p-2" aria-label={'Status ' + title} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
        <option value="all">Semua status</option><option value="present">Sudah {title.toLowerCase()}</option><option value="missing">Belum {title.toLowerCase()}</option>
      </select>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50"><tr>{['Tiket', 'Outlet', 'Support', ...headings].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{filtered.slice((current - 1) * pageSize, current * pageSize).map((row, index) => {
          const validDuration = row.durationMinutes !== null && row.durationMinutes > 0 && row.durationMinutes <= 1440;
          const cells = arrival
            ? [[row.agendaDate, row.agendaTime].filter(Boolean).join(' '), row.checkInDateObj ? row.checkInTime : '—', row.checkInDateObj && !row.agendaDateObj ? 'Jadwal belum tersedia' : arrivalStatus[row.punctualityStatus]]
            : [row.checkOutDateObj ? row.checkOutTime : '—', validDuration ? formatDuration(row.durationMinutes) : '—', row.checkOutDateObj ? 'Sudah check-out' : 'Belum check-out'];
          return <tr key={row.ticketId + index} className="border-t border-slate-100">{[row.ticketId, row.outletName, row.supportName, ...cells].map((value, column) => <td key={column} className="p-2">{value || '—'}</td>)}</tr>;
        })}</tbody>
      </table>
    </div>
    {!filtered.length && <p className="text-sm text-slate-500">Tidak ada kunjungan sesuai filter.</p>}
    {pages > 1 && <nav aria-label="Halaman kunjungan" className="flex justify-end gap-3 text-sm">
      <button disabled={current === 1} onClick={() => setPage(current - 1)}>Sebelumnya</button>
      <span>{current} / {pages}</span>
      <button disabled={current === pages} onClick={() => setPage(current + 1)}>Berikutnya</button>
    </nav>}
  </section>;
}
