import { useEffect, useMemo, useState } from 'react';
import type { MasterDataTeamItem, ProcessedRecord, RawDataRow } from '../types';
import { isSameSupportMember } from '../utils/dataProcessor';
import { ticketMonth } from '../utils/omniMetrics';
import { matchSendingEmailRows } from '../utils/sendingEmail';
import { sheetDate, ticketSummary } from '../utils/worksheetMetrics';

const metrics = [
  { label: 'Tiket H+0', weight: 25, target: 100 },
  { label: 'Send Mail Omni H+1', weight: 25, target: 100 },
  { label: 'CSAT Go App', weight: 10, target: 5 },
  { label: 'CSAT Omni', weight: 10, target: 5 },
  { label: 'Check-in Omni H+0', weight: 10, target: 100 },
  { label: 'Check-out Omni H+0', weight: 10, target: 100 },
  { label: 'FAQ', weight: 10, target: 6 },
];
const yogaExample = ['100', '94', '4,74', '4,6', '100', '100', '9'];
const format = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const blankValues = () => metrics.map((): string | null => null);

const sources = ['ticket', 'sending-email', 'timeline-omni'] as const;
type Source = typeof sources[number];
type Report = { rows: RawDataRow[] } | { error: true };
const ratio = (numerator: number, denominator: number) => denominator ? numerator / denominator * 100 : null;
const countNote = (numerator: number, denominator: number) => `${numerator}/${denominator}`;

export function OkrCalculator({ visits, roster }: { visits: ProcessedRecord[]; roster: MasterDataTeamItem[] }) {
  const [person, setPerson] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [reports, setReports] = useState<Partial<Record<Source, Report>>>({});
  useEffect(() => {
    if (window.location.protocol === 'file:') return;
    const controller = new AbortController();
    for (const source of sources) {
      fetch('/api/worksheets?sheet=' + source, { signal: controller.signal })
        .then(async response => {
          if (!response.ok) throw new Error('Report gagal dimuat');
          const result = await response.json();
          if (!Array.isArray(result.records)) throw new Error('Report tidak valid');
          if (!controller.signal.aborted) setReports(previous => ({ ...previous, [source]: { rows: result.records } }));
        })
        .catch(() => {
          if (!controller.signal.aborted) setReports(previous => ({ ...previous, [source]: { error: true } }));
        });
    }
    return () => controller.abort();
  }, []);
  const periods = useMemo(() => [...new Set(visits.map(row => sheetDate(row.dateVisit).slice(0, 7)).filter(Boolean))].sort().reverse(), [visits]);
  const period = selectedPeriod || periods[0] || '';
  const people = useMemo(() => [...new Set(roster.map(row => row.l1FullName))].sort((a, b) => a.localeCompare(b, 'id')), [roster]);
  const reportRows = (source: Source) => {
    const report = reports[source];
    return report && 'rows' in report ? report.rows : [];
  };
  const matchesSupport = (name: string) => name.split(/[,;\r\n/]+/).some(value =>
    isSameSupportMember(value.trim(), person, roster));
  const monthlyTickets = person && period
    ? ticketSummary(reportRows('ticket').filter(row => matchesSupport(row.Pic || '') && ticketMonth(row.Month || '') === Number(period.slice(5))))
    : null;
  const email = reports['sending-email'];
  const timeline = reports['timeline-omni'];
  const emailRows = person && period && email && 'rows' in email && timeline && 'rows' in timeline
    ? matchSendingEmailRows(email.rows.filter(row => matchesSupport(row['Nama Support'] || '') && sheetDate(row['Jadwal Agenda']).startsWith(period)), timeline.rows)
    : [];
  const emailTraced = emailRows.filter(row => row.emailDays !== null);
  const emailOnTime = emailTraced.filter(row => row.emailDays !== null && row.emailDays <= 1).length;
  const supportVisits = new Map<string, { checkIn: boolean; checkOut: boolean }>();
  if (person && period) for (const visit of visits) {
    const day = sheetDate(visit.dateVisit);
    if (!day.startsWith(period) || /\bcancel(?:led|ed)?\b/i.test(visit.status) ||
        ![visit.rawSupportName, visit.supportName, ...visit.supportTeamList, ...visit.jointSupportNames].some(matchesSupport)) continue;
    const previous = supportVisits.get(visit.primaryVisitKey);
    supportVisits.set(visit.primaryVisitKey, {
      checkIn: !!previous?.checkIn || sheetDate(visit.checkInTime) === day,
      checkOut: !!previous?.checkOut || sheetDate(visit.checkOutTime) === day,
    });
  }
  const checkIn = [...supportVisits.values()].filter(row => row.checkIn).length;
  const checkOut = [...supportVisits.values()].filter(row => row.checkOut).length;
  const suggestions = [
    { value: monthlyTickets?.h0Rate ?? null, note: monthlyTickets ? `RAW DATA TIKET · ${countNote(monthlyTickets.h0, monthlyTickets.h0 + monthlyTickets.h1)} · sheet memakai bulan tanpa tahun` : 'RAW DATA TIKET' },
    { value: ratio(emailOnTime, emailTraced.length), note: `SEND EMAIL + TIMELINE OMNI · ${countNote(emailOnTime, emailTraced.length)} tepat waktu · ${countNote(emailTraced.length, emailRows.length)} berjejak` },
    { value: null, note: 'Isi manual dari report CSAT Go App' },
    { value: null, note: 'Isi manual dari report CSAT Omni terverifikasi' },
    { value: ratio(checkIn, supportVisits.size), note: `RAW DATA VISIT · ${countNote(checkIn, supportVisits.size)} check-in pada Date Visit` },
    { value: ratio(checkOut, supportVisits.size), note: `RAW DATA VISIT · ${countNote(checkOut, supportVisits.size)} check-out pada Date Visit` },
    { value: null, note: 'Isi manual dari report FAQ' },
  ];
  const [useReport, setUseReport] = useState(true);
  const [values, setValues] = useState(blankValues);
  const suggestedValues = suggestions.map(row => row.value === null ? '' : String(Math.round(row.value * 100) / 100));
  const actualValues = values.map((value, index) => value ?? (useReport ? suggestedValues[index] : ''));
  const points = metrics.map(({ weight, target }, index) => {
    const input = actualValues[index].trim();
    const value = Number(input.replace(',', '.'));
    return /^\d+(?:[,.]\d+)?$/.test(input) && Number.isFinite(value)
      ? Math.round(value / target * weight * 100) / 100
      : null;
  });
  const total = points.every(point => point !== null)
    ? points.reduce<number>((sum, point) => sum + (point ?? 0), 0)
    : null;
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Simulasi OKR</h2>
      <div className="flex gap-3 text-sm">
        <button className="rounded-lg border px-3 py-2" onClick={() => { setUseReport(false); setValues(yogaExample); }}>Isi contoh Yoga</button>
        <button className="rounded-lg border px-3 py-2" onClick={() => { setUseReport(false); setValues(blankValues()); }}>Kosongkan</button>
      </div>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Nama Support<select className="mt-1 block rounded-lg border p-2" value={person} onChange={event => { setPerson(event.target.value); setUseReport(true); setValues(blankValues()); }}>
        <option value="">Pilih support</option>{people.map(name => <option key={name}>{name}</option>)}
      </select></label>
      <label className="text-sm">Periode<select className="mt-1 block rounded-lg border p-2" value={period} onChange={event => { setSelectedPeriod(event.target.value); setUseReport(true); setValues(blankValues()); }}>
        {periods.map(month => <option key={month}>{month}</option>)}
      </select></label>
      <button disabled={!person || !period} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={() => { setUseReport(true); setValues(blankValues()); }}>Pakai nilai report</button>
    </div>
    {person && sources.some(source => !reports[source]) && window.location.protocol !== 'file:' && <p role="status" className="text-sm">Memuat report OKR…</p>}
    {person && sources.some(source => reports[source] && 'error' in reports[source]!) && <p role="status" className="text-sm">Sebagian report gagal dimuat. Nilai yang belum tersedia dapat diisi manual.</p>}
    <p className="text-sm text-slate-600">Realisasi dari report bisa disesuaikan. Total muncul setelah semua KPI terisi. Poin OKR = realisasi ÷ target × bobot. Poin dapat melebihi bobot.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50"><tr>{['KPI', 'Bobot', 'Realisasi', 'Target', 'Poin OKR', 'Sumber report'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
      <tbody>{metrics.map(({ label, weight, target }, index) => <tr key={label} className="border-t border-slate-100">
        <th scope="row" className="p-2 font-medium">{label}</th>
        <td className="p-2">{weight}%</td>
        <td className="p-2"><input aria-label={'Realisasi ' + label} inputMode="decimal" className="w-24 rounded border p-2" value={actualValues[index]} onChange={event => { const value = event.target.value; setValues(previous => previous.map((old, i) => i === index ? value : old)); }} /></td>
        <td className="p-2">{target}</td>
        <td className="p-2">{points[index] === null ? '—' : format.format(points[index]!) + '%'}</td>
        <td className="p-2 text-xs text-slate-600">{suggestions[index].note}</td>
      </tr>)}</tbody>
      <tfoot><tr className="border-t font-semibold"><th scope="row" className="p-2">Total pencapaian</th><td className="p-2">100%</td><td colSpan={2}/><td className="p-2">{total === null ? '—' : format.format(total) + '%'}</td><td/></tr></tfoot>
    </table></div>
  </section>;
}
