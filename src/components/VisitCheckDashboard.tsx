import { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProcessedRecord } from '../types';
import { formatDuration } from '../utils/dataProcessor';
import { sheetDate } from '../utils/worksheetMetrics';

type Mode = 'check-in' | 'check-out';
type Status = 'all' | 'recorded' | 'missing' | 'on_time' | 'late' | 'h0' | 'different_day' | 'duration';
const number = new Intl.NumberFormat('id-ID');
const percent = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 1 });
const fraction = (count: number, total: number) => total ? percent.format(count / total) : '—';
const panel = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const pageSize = 15;

function describeVisit(row: ProcessedRecord) {
  const day = sheetDate(row.dateVisit);
  const hasIn = !!row.checkInDateObj;
  const hasOut = !!row.checkOutDateObj;
  const scheduleDay = row.agendaDateObj ? sheetDate(row.agendaDate) : '';
  const arrivalDay = sheetDate(row.checkInTime);
  const duration = row.durationMinutes;
  return {
    row, day, hasIn, hasOut,
    sameDayIn: !!day && hasIn && arrivalDay === day,
    sameDayOut: !!day && hasOut && sheetDate(row.checkOutTime) === day,
    differentDay: !!scheduleDay && !!arrivalDay && scheduleDay !== arrivalDay,
    comparable: hasIn && row.punctualityMinutes !== null,
    onTime: hasIn && row.punctualityStatus === 'on_time',
    late: hasIn && row.punctualityStatus === 'late',
    duration: hasIn && hasOut && duration !== null && duration > 0 && duration <= 1440 ? duration : null,
  };
}

function formatDelay(minutes: number | null) {
  if (minutes === null) return '—';
  const absolute = Math.round(Math.abs(minutes));
  const days = Math.floor(absolute / 1440);
  const hours = Math.floor(absolute % 1440 / 60);
  const remainder = absolute % 60;
  if (!absolute) return '0 menit';
  return (minutes < 0 ? '−' : '+') + [days && days + ' hari', hours && hours + ' jam', remainder && remainder + ' menit'].filter(Boolean).join(' ');
}

export function VisitCheckDashboard({ records }: { records: ProcessedRecord[] }) {
  const [mode, setMode] = useState<Mode>('check-in');
  const [status, setStatus] = useState<Status>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const details = useRef<HTMLElement>(null);
  const rows = useMemo(() => records.map(describeVisit), [records]);
  const arriving = mode === 'check-in';
  const total = rows.length;
  const checkedIn = rows.filter(item => item.hasIn).length;
  const checkedOut = rows.filter(item => item.hasOut).length;
  const pendingOut = rows.filter(item => item.hasIn && !item.hasOut).length;
  const comparable = rows.filter(item => item.comparable).length;
  const onTime = rows.filter(item => item.onTime).length;
  const late = rows.filter(item => item.late).length;
  const sameIn = rows.filter(item => item.sameDayIn).length;
  const sameOut = rows.filter(item => item.sameDayOut).length;
  const durations = rows.flatMap(item => item.duration === null ? [] : [item.duration]);
  const average = durations.length ? formatDuration(Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)) : '—';

  const daily = useMemo(() => {
    const days = new Map<string, { day: string; CheckIn: number; CheckOut: number }>();
    for (const item of rows) {
      if (!item.day) continue;
      const count = days.get(item.day) ?? { day: item.day, CheckIn: 0, CheckOut: 0 };
      count.CheckIn += Number(item.hasIn);
      count.CheckOut += Number(item.hasOut);
      days.set(item.day, count);
    }
    return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [rows]);
  const statuses = [
    { label: 'Check-in', Tercatat: checkedIn, Belum: total - checkedIn },
    { label: 'Check-out', Tercatat: checkedOut, Belum: total - checkedOut },
  ];

  function select(nextMode: Mode, nextStatus: Status = 'all', scroll = false) {
    setMode(nextMode);
    setStatus(nextStatus);
    setPage(1);
    if (scroll) {
      setQuery('');
      details.current?.scrollIntoView({ block: 'start' });
    }
  }

  const filtered = rows.filter(item => {
    const recorded = arriving ? item.hasIn : item.hasOut;
    const matches: Record<Status, boolean> = {
      all: true, recorded, missing: arriving ? !item.hasIn : item.hasIn && !item.hasOut,
      on_time: item.onTime, late: item.late, h0: arriving ? item.sameDayIn : item.sameDayOut,
      different_day: item.differentDay, duration: item.duration !== null,
    };
    return matches[status] && [item.row.ticketId, item.row.outletName, item.row.supportName]
      .some(value => value.toLowerCase().includes(query.trim().toLowerCase()));
  }).sort((a, b) => {
    const time = (item: typeof a) => (arriving ? item.row.checkInDateObj : item.row.checkOutDateObj) ?? item.row.agendaDateObj;
    return (time(b)?.getTime() ?? 0) - (time(a)?.getTime() ?? 0);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const headers = arriving
    ? ['Tiket', 'Outlet', 'Support', 'Jadwal', 'Check-in aktual', 'Selisih jadwal', 'Ketepatan']
    : ['Tiket', 'Outlet', 'Support', 'Check-in aktual', 'Check-out aktual', 'Durasi', 'Status'];
  const commonOptions: Array<[Status, string]> = [
    ['all', 'Semua status'], ['recorded', 'Tercatat'], ['missing', arriving ? 'Belum check-in' : 'Sudah check-in, belum check-out'], ['h0', 'H+0'],
  ];
  const options: Array<[Status, string]> = [...commonOptions, ...(arriving
    ? [['on_time', 'Tepat waktu'], ['late', 'Terlambat'], ['different_day', 'Beda hari dari jadwal']] as const
    : [['duration', 'Durasi valid']] as const)].map(([value, label]) => [value, label]);

  const cards: Array<{ mode: Mode; title: string; items: Array<[string, string, string, Status]> }> = [
    { mode: 'check-in', title: 'Check-in', items: [
      ['Tercatat', fraction(checkedIn, total), number.format(checkedIn) + ' dari ' + number.format(total) + ' baris visit', 'recorded'],
      ['Belum check-in', number.format(total - checkedIn), 'Check-in belum tercatat', 'missing'],
      ['Tepat waktu', fraction(onTime, comparable), number.format(onTime) + ' dari ' + number.format(comparable) + ' dengan jadwal · ±15 menit', 'on_time'],
      ['Check-in H+0', fraction(sameIn, total), number.format(sameIn) + ' dari ' + number.format(total) + ' pada Date Visit', 'h0'],
    ] },
    { mode: 'check-out', title: 'Check-out', items: [
      ['Tercatat', fraction(checkedOut, total), number.format(checkedOut) + ' dari ' + number.format(total) + ' baris visit', 'recorded'],
      ['Belum check-out', number.format(pendingOut), 'Sudah check-in, belum check-out', 'missing'],
      ['Check-out H+0', fraction(sameOut, total), number.format(sameOut) + ' dari ' + number.format(total) + ' pada Date Visit', 'h0'],
      ['Rata-rata durasi', average, number.format(durations.length) + ' pasangan waktu valid', 'duration'],
    ] },
  ];

  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map(group => <section key={group.mode} className={panel}>
        <h2 className="mb-3 text-lg font-semibold">{group.title}</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {group.items.map(([label, value, note, filter]) => <button key={label} type="button"
            onClick={() => select(group.mode, filter, true)}
            className={'rounded-xl border p-3 text-left transition hover:border-indigo-400 ' + (filter === 'missing' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50')}>
            <span className="block text-sm font-medium">{label}</span>
            <strong className="block text-xl sm:text-2xl">{value}</strong>
            <span className="text-xs text-slate-600">{note}</span>
          </button>)}
        </div>
      </section>)}
    </div>

    {total > 0 && <div className="grid gap-4 lg:grid-cols-5">
      <section className={panel + ' min-w-0 lg:col-span-3'}>
        <h2 className="mb-3 font-semibold">Tren harian · jumlah tercatat per Date Visit</h2>
        {daily.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily} margin={{ left: -18, right: 12 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="day" tickFormatter={day => day.slice(5)} minTickGap={24} tick={{ fontSize: 11 }}/>
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><Tooltip/><Legend/>
            <Line type="monotone" dataKey="CheckIn" name="Check-in" stroke="#4338ca" strokeWidth={2} dot={daily.length === 1}/>
            <Line type="monotone" dataKey="CheckOut" name="Check-out" stroke="#0f766e" strokeWidth={2} dot={daily.length === 1}/>
          </LineChart>
        </ResponsiveContainer></div> : <p className="text-sm text-slate-500">Belum ada Date Visit untuk grafik.</p>}
      </section>
      <section className={panel + ' min-w-0 lg:col-span-2'}>
        <h2 className="mb-3 font-semibold">Status pencatatan</h2>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={statuses} margin={{ left: -18, right: 12 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize: 12 }}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><Tooltip/><Legend/>
            <Bar dataKey="Tercatat" stackId="status" fill="#4338ca" maxBarSize={56}/>
            <Bar dataKey="Belum" name="Belum tercatat" stackId="status" fill="#f59e0b" maxBarSize={56}/>
          </BarChart>
        </ResponsiveContainer></div>
      </section>
    </div>}

    <section ref={details} className={panel + ' scroll-mt-4 space-y-4'}>
      <h2 className="text-lg font-semibold">Rincian kunjungan</h2>
      <div className="flex flex-wrap items-center gap-2">
        <div aria-label="Jenis rincian" role="group" className="inline-flex rounded-lg bg-slate-100 p-1">
          {(['check-in', 'check-out'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => select(value)}
            className={'rounded-md px-3 py-2 text-sm font-semibold ' + (mode === value ? 'bg-indigo-600 text-white' : 'text-slate-700')}>
            {value === 'check-in' ? 'Check-in' : 'Check-out'}
          </button>)}
        </div>
        <input className="min-w-52 rounded-lg border border-slate-200 p-2 text-sm" aria-label="Cari tiket, outlet, atau support" placeholder="Cari tiket, outlet, atau support" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/>
        <select className="rounded-lg border border-slate-200 p-2 text-sm" aria-label="Status rincian" value={status} onChange={event => { setStatus(event.target.value as Status); setPage(1); }}>
          {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className="text-sm text-slate-600">{number.format(filtered.length)} baris</span>
      </div>
      {arriving && late > 0 && <button type="button" className="text-sm font-medium text-indigo-700 hover:underline" onClick={() => select('check-in', 'late', true)}>{number.format(late)} terlambat</button>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50"><tr>{headers.map(label => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr></thead>
          <tbody>{filtered.slice((current - 1) * pageSize, current * pageSize).map((item, index) => {
            const { row } = item;
            const statusLabel = arriving
              ? !item.hasIn ? 'Belum check-in' : !item.comparable ? 'Jadwal belum tersedia' : item.onTime ? 'Tepat waktu' : item.late ? 'Terlambat' : 'Lebih awal'
              : item.hasOut ? item.sameDayOut ? 'H+0' : item.day ? 'Beda hari dari Date Visit' : 'Tercatat' : 'Belum check-out';
            const cells = arriving
              ? [[row.agendaDate, row.agendaTime].filter(Boolean).join(' '), item.hasIn ? row.checkInTime : '—', formatDelay(row.punctualityMinutes)]
              : [item.hasIn ? row.checkInTime : '—', item.hasOut ? row.checkOutTime : '—', item.duration === null ? '—' : formatDuration(item.duration)];
            const attention = arriving ? item.late || !item.hasIn : !item.hasOut || !item.sameDayOut;
            return <tr key={row.ticketId + index} className="border-t border-slate-100">
              {[row.ticketId, row.outletName, row.supportName, ...cells].map((value, column) => <td key={column} className="px-3 py-2">{value || '—'}</td>)}
              <td className="px-3 py-2"><span className={'inline-block rounded-full px-2 py-1 text-xs font-medium ' + (attention ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800')}>{statusLabel}</span>
                {arriving && item.differentDay && <span className="ml-1 inline-block rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-900">Beda hari</span>}
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {!filtered.length && <p className="text-sm text-slate-500">Tidak ada kunjungan sesuai filter.</p>}
      {pages > 1 && <nav aria-label="Halaman kunjungan" className="flex justify-end gap-3 text-sm">
        <button disabled={current === 1} onClick={() => setPage(current - 1)}>Sebelumnya</button>
        <span>{current} / {pages}</span>
        <button disabled={current === pages} onClick={() => setPage(current + 1)}>Berikutnya</button>
      </nav>}
    </section>
  </div>;
}
