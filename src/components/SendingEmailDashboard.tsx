import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import React, { useEffect, useMemo, useState } from 'react';
import type { RawDataRow } from '../types';
import { buildTeamRoster, isSameSupportMember, parseCustomDate, resolveSpvAndConsultant } from '../utils/dataProcessor';
import { matchSendingEmailRows } from '../utils/sendingEmail';

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const panel = 'rounded-2xl border border-slate-200 bg-white p-4';

export function SendingEmailDashboard({ rows, refresh, teamMasterRows }: { rows: RawDataRow[]; refresh: number; teamMasterRows: RawDataRow[] }) {
  const [timeline, setTimeline] = useState<RawDataRow[] | null>(null);
  const [error, setError] = useState(false);
  const [supervisor, setSupervisor] = useState('');
  const [implementor, setImplementor] = useState('');
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
  const teamRoster = useMemo(() => buildTeamRoster(teamMasterRows), [teamMasterRows]);
  const assignedRows = useMemo(() => data.map(item => ({
    ...item,
    ...resolveSpvAndConsultant(
      item.row['Nama Support'], item.row['Nama Consultant'], item.row.Supervisor,
      parseCustomDate(item.row['Jadwal Agenda']), teamRoster,
    ),
  })), [data, teamRoster]);
  const uniqueNames = (names: string[]) => [...new Set(names)].sort((a, b) => a.localeCompare(b, 'id'));
  const supervisors = uniqueNames(teamRoster.map(member => member.spv));
  const roster = teamRoster.filter(member => !supervisor || member.spv === supervisor);
  const consultants = uniqueNames(roster.map(member => member.l2));
  const selectedRoster = roster.filter(member => !consultant || member.l2 === consultant);
  const implementors = uniqueNames(selectedRoster.flatMap(member =>
    member.l2 === 'ERP Advisor' ? [member.l1FullName] : [member.l2, member.l1FullName]
  ));
  const filtered = assignedRows.filter(({ row, scheduled, supervisor: rowSpv, consultantName }) =>
    (!supervisor || rowSpv === supervisor) && (!consultant || consultantName === consultant) &&
    (!month || scheduled.startsWith(month)) &&
    (!implementor || (row['Nama Support'] || '').split(/[,;\r\n/]+/).some(value =>
      isSameSupportMember(value.trim(), implementor, teamRoster) || isSameSupportMember(implementor, value.trim(), teamRoster))) &&
    [row['Ticket ID'], row['Nama Consultant'], row['Nama Support'], row['Nama Outlet']]
      .some(value => (value || '').toLowerCase().includes(query.trim().toLowerCase())));
  const sent = filtered.filter(item => item.emailDays !== null && item.emailDays <= 1).length;
  const completed = filtered.filter(item => item.completed && item.completed === item.scheduled).length;
  const knownSent = filtered.filter(item => item.sent).length;
  const knownCompleted = filtered.filter(item => item.completed).length;
  const rate = (n: number, denominator: number) => denominator ? number.format(n / denominator * 100) + '%' : '—';
  const buckets = new Map<string, { sent: number; knownSent: number; completed: number; knownCompleted: number }>();
  for (const item of filtered) {
    if (!item.scheduled) continue;
    const period = month ? item.scheduled : item.scheduled.slice(0, 7);
    const bucket = buckets.get(period) ?? { sent: 0, knownSent: 0, completed: 0, knownCompleted: 0 };
    bucket.sent += Number(item.emailDays !== null && item.emailDays <= 1);
    bucket.knownSent += Number(!!item.sent);
    bucket.completed += Number(item.completed === item.scheduled);
    bucket.knownCompleted += Number(!!item.completed);
    buckets.set(period, bucket);
  }
  const trend = [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([period, bucket]) => ({
    period,
    email: bucket.knownSent ? bucket.sent / bucket.knownSent * 100 : null,
    completion: bucket.knownCompleted ? bucket.completed / bucket.knownCompleted * 100 : null,
  }));
  const statusCounts = [
    { name: 'SEND EMAIL', onTime: sent, other: knownSent - sent, unknown: filtered.length - knownSent },
    { name: 'COMPLETED', onTime: completed, other: knownCompleted - completed, unknown: filtered.length - knownCompleted },
  ];
  const lastPage = Math.max(1, Math.ceil(filtered.length / 15));
  const currentPage = Math.min(page, lastPage);

  return <div className="space-y-4">
    <div className={panel + ' flex flex-wrap gap-3'}>
      <label className="text-sm">Bulan jadwal
        <select className="ml-2 rounded border p-2" value={month} onChange={event => { setMonth(event.target.value); setPage(1); }}>
          <option value="">Semua bulan</option>{months.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="text-sm">SPV
        <select aria-label="SPV" className="ml-2 rounded border p-2" value={supervisor} onChange={event => { setSupervisor(event.target.value); setConsultant(''); setImplementor(''); setPage(1); }}>
          <option value="">Semua SPV</option>{supervisors.map(name => <option key={name}>{name}</option>)}
        </select>
      </label>
      <label className="text-sm">Konsultan
        <select className="ml-2 rounded border p-2" value={consultant} onChange={event => { setConsultant(event.target.value); setImplementor(''); setPage(1); }}>
          <option value="">Semua konsultan</option>{consultants.map(name => <option key={name}>{name}</option>)}
        </select>
      </label>
      <label className="text-sm">Implementor
        <select aria-label="Implementor" className="ml-2 rounded border p-2" value={implementor} onChange={event => { setImplementor(event.target.value); setPage(1); }}>
          <option value="">Semua implementor</option>{implementors.map(name => <option key={name}>{name}</option>)}
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
        ['Email terkirim paling lambat H+1', rate(sent, knownSent), timeline ? `${number.format(sent)}/${number.format(knownSent)} tepat waktu · ${number.format(knownSent)}/${number.format(filtered.length)} berjejak` : 'Menunggu data timeline'],
        ['Status COMPLETED di hari jadwal', rate(completed, knownCompleted), timeline ? `${number.format(completed)}/${number.format(knownCompleted)} selesai H+0 · ${number.format(knownCompleted)}/${number.format(filtered.length)} berjejak` : 'Menunggu data timeline'],
      ].map(([label, value, note]) => <article key={label} className={panel}>
        <h2 className="text-sm font-semibold">{label}</h2><p className="my-2 text-2xl font-bold">{value}</p><p className="text-xs text-slate-600">{note}</p>
      </article>)}
    </div>
    <p className="text-sm text-slate-600">Target form selesai di hari jadwal adalah 100%. Sheet sumber belum menyediakan waktu submit form, sehingga status COMPLETED ditampilkan sebagai indikator terpisah. Tiket tanpa jejak status tidak masuk pembagi KPI terkait.</p>
    {timeline && filtered.length > 0 && <div className="grid gap-3 xl:grid-cols-2">
      <section className={panel + ' min-w-0'}>
        <h2 className="font-semibold">Tren ketepatan {month ? 'harian' : 'bulanan'}</h2>
        <p className="mb-3 text-xs text-slate-600">Berdasarkan tanggal jadwal. Persentase memakai tiket berjejak pada masing-masing status.</p>
        {trend.some(item => item.email !== null || item.completion !== null) ? <div className="h-64">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ right: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="period" tickFormatter={value => month ? value.slice(8) : value} minTickGap={18} tick={{ fontSize: 11 }}/>
            <YAxis domain={[0, 100]} tickFormatter={value => value + '%'} tick={{ fontSize: 11 }}/>
            <Tooltip formatter={value => number.format(Number(value)) + '%'}/><Legend/>
            <Line dataKey="email" name="Email ≤ H+1" stroke="#4338ca" strokeWidth={2} dot={{ r: 2 }}/>
            <Line dataKey="completion" name="COMPLETED H+0" stroke="#0f766e" strokeWidth={2} dot={{ r: 2 }}/>
          </LineChart></ResponsiveContainer>
        </div> : <p className="py-16 text-center text-sm text-slate-500">Belum ada jejak status pada periode ini.</p>}
      </section>
      <section className={panel + ' min-w-0'}>
        <h2 className="font-semibold">Cakupan dan hasil timeline</h2>
        <p className="mb-3 text-xs text-slate-600">Tepat waktu berarti email maksimal H+1 dan COMPLETED pada hari jadwal.</p>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusCounts} margin={{ right: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{ fontSize: 11 }}/>
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><Tooltip/><Legend/>
            <Bar dataKey="onTime" name="Tepat waktu" stackId="timeline" fill="#0f766e" maxBarSize={64}/>
            <Bar dataKey="other" name="Di luar target waktu" stackId="timeline" fill="#d97706" maxBarSize={64}/>
            <Bar dataKey="unknown" name="Tanpa jejak" stackId="timeline" fill="#94a3b8" maxBarSize={64}/>
          </BarChart>
        </ResponsiveContainer></div>
      </section>
    </div>}
    <section className={panel}>
      <h2 className="font-semibold">Rincian Sending Email</h2>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50"><tr>{['Tiket', 'Nama Support', 'Status tiket', 'Jadwal', 'COMPLETED', 'SEND EMAIL', 'Selisih email', 'Keterangan'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{filtered.slice((currentPage - 1) * 15, currentPage * 15).map((item, index) =>
          <tr key={index} className="border-t border-slate-100">{[
            item.row['Ticket ID'], item.row['Nama Support'], item.row.Status, item.scheduled, item.completed, item.sent,
            item.emailDays === null ? '' : 'H+' + item.emailDays,
            !item.scheduled ? 'Jadwal belum tercatat' : !timeline ? 'Timeline belum tersedia' : [
              item.emailDays === null ? 'Email: belum ada jejak kirim' : item.emailDays <= 1 ? 'Email: tepat waktu' : 'Email: lewat H+1',
              !item.completed ? 'COMPLETED: belum ada jejak' : item.completed === item.scheduled ? 'COMPLETED: di hari jadwal' : 'COMPLETED: beda hari',
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
