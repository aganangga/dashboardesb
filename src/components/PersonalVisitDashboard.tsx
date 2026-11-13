import { useMemo, useState } from 'react';
import type { MasterDataTeamItem, ProcessedRecord } from '../types';
import { getPersonalVisitMonth, getPersonalVisits } from '../utils/personalVisits';

interface Props {
  records: ProcessedRecord[];
  roster: MasterDataTeamItem[];
  initialMonth?: string;
  initialPerson: string;
}

export function PersonalVisitDashboard({ records, roster, initialMonth = '', initialPerson }: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [person, setPerson] = useState(initialPerson);
  const [detail, setDetail] = useState('');

  const months = useMemo(() => [...new Set(records.map(getPersonalVisitMonth).filter(Boolean))].sort().reverse(), [records]);
  const people = useMemo(() => {
    const names = new Set(roster.map(item => item.l1FullName).filter(Boolean));
    for (const record of records) {
      for (const name of record.rawSupportName.split(/[,;\n\r/]+/).map(value => value.trim()).filter(Boolean)) {
        const matches = roster.filter(item => item.l1Nickname.toLowerCase() === name.toLowerCase());
        const fullNames = new Set(matches.map(item => item.l1FullName));
        if (fullNames.size !== 1) names.add(name);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'id'));
  }, [records, roster]);

  const visits = useMemo(() => person ? getPersonalVisits(records, person, month, roster) : [], [records, person, month, roster]);
  const cards = [
    { label: 'Visit unik', count: visits.length },
    { label: 'Tim sendiri', count: visits.filter(visit => visit.team === 'Tim sendiri').length },
    { label: 'Perbantuan', count: visits.filter(visit => visit.team === 'Perbantuan').length },
    { label: 'Belum check-out', count: visits.filter(visit => visit.attendance === 'Belum check-out').length },
  ];
  const visible = visits.filter(visit => detail === 'Visit unik' || detail === visit.team || detail === visit.attendance);
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const choices = month && !months.includes(month) ? [month, ...months] : months;

  return (
    <section className="space-y-5" aria-label="Visit Personal">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap gap-4">
          <label className="grid gap-1 text-sm font-semibold">Nama Support
            <select className="rounded-lg border border-slate-300 bg-white p-2 font-normal" value={person}
              onChange={event => { setPerson(event.target.value); setDetail(''); }}>
              <option value="">Pilih pelaksana</option>
              {person && !people.includes(person) && <option>{person}</option>}
              {people.map(name => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Periode
            <select className="rounded-lg border border-slate-300 bg-white p-2 font-normal" value={month}
              onChange={event => { setMonth(event.target.value); setDetail(''); }}>
              <option value="">Semua periode</option>
              {choices.map(key => <option key={key} value={key}>{monthLabel.format(new Date(`${key}-01T00:00:00Z`))}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-600">Mencakup tiket semua tim berdasarkan Nama Support dan Date Visit. Agenda batal dikeluarkan.</p>
      </div>
      {person && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ label, count }) => (
            <button key={label} type="button" aria-pressed={detail === label} aria-controls="personal-visit-details"
              onClick={() => setDetail(detail === label ? '' : label)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-400 aria-pressed:border-indigo-500 aria-pressed:bg-indigo-50">
              <span className="block text-sm font-semibold text-slate-600">{label}</span>
              <strong className="text-3xl tabular-nums text-slate-900">{count}</strong>
            </button>
          ))}
        </div>
        {detail && <div id="personal-visit-details" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <h2 className="p-4 text-sm font-semibold">{detail} · {visible.length} tiket</h2>
          {visible.length === 0 ? <p className="px-4 pb-4 text-sm text-slate-600">Tidak ada tiket untuk pilihan ini.</p> :
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>{['Date Visit', 'Ticket ID', 'Outlet', 'Konsultan', 'Cakupan', 'Absensi'].map(label =>
                  <th key={label} scope="col" className="px-4 py-2">{label}</th>)}</tr>
              </thead>
              <tbody>{visible.map(({ record, team, attendance }) =>
                <tr key={record.primaryVisitKey} className="border-t border-slate-100">
                  <td className="px-4 py-2">{record.dateVisit}</td>
                  <td className="px-4 py-2 font-mono">{record.ticketId}</td>
                  <td className="px-4 py-2">{record.outletName}</td>
                  <td className="px-4 py-2">{record.consultantName}</td>
                  <td className="px-4 py-2">{team}</td>
                  <td className={`px-4 py-2 ${attendance === 'Lengkap' ? 'text-emerald-700' : 'text-amber-800'}`}>{attendance}</td>
                </tr>)}</tbody>
            </table>}
        </div>}
      </>}
    </section>
  );
}
