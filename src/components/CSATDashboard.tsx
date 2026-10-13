import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MessageSquare, Star, TicketCheck, Users, Link2 } from 'lucide-react';
import { PageListPagination } from './PageListPagination';
import { CSAT_RESPONSES, CsatResponse } from '../data/csatResponses';
import { ProcessedRecord, FilterState } from '../types';
import { getMasterAssignmentsForSupport, isSameSupportMember } from '../utils/dataProcessor';

type CsAtRow = CsatResponse & {
  matched: boolean;
  hasTeamVisit: boolean;
  hasSoloVisit: boolean;
  consultants: string[];
  supervisors: string[];
  areas: string[];
  visitStatuses: string[];
  association: string;
};

interface Props {
  records: ProcessedRecord[];
  filters: FilterState;
}

const ratingValues: Record<string, number> = {
  'Sangat Puas': 5,
  'Puas': 4,
  'Cukup': 3,
  'Tidak Puas': 2,
  'Sangat Tidak Puas': 1,
};
const ratingColors: Record<string, string> = {
  'Sangat Puas': '#16a34a',
  'Puas': '#4ade80',
  'Cukup': '#f59e0b',
  'Tidak Puas': '#f97316',
  'Sangat Tidak Puas': '#ef4444',
};
const lower = (value: string): string => (value || '').trim().toLocaleLowerCase('id-ID');
const unique = (values: string[]): string[] =>
  Array.from(new Set(values.filter((v) => !!v && v !== 'Belum Terpetakan')));

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

export const CSATDashboard: React.FC<Props> = ({ records, filters }) => {
  const [page, setPage] = useState(1);
  const visitsByTicket = useMemo(() => {
    const map = new Map<string, ProcessedRecord[]>();
    records.forEach((visit) => {
      const key = lower(visit.ticketId);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(visit);
    });
    return map;
  }, [records]);

  const sourceRows = useMemo<CsAtRow[]>(() =>
    CSAT_RESPONSES
      .filter((response) => response.createdAt.slice(0, 10) >= '2026-08-01')
      .map((response) => {
        const allVisits = visitsByTicket.get(lower(response.ticketId)) || [];
        const supportVisits = allVisits.filter((visit) =>
          [visit.supportName, ...visit.supportTeamList, ...visit.jointSupportNames].some(
            (person) => isSameSupportMember(person, response.support)
          )
        );
        // A matching Ticket ID establishes the visit association. If multiple visit
        // records exist, prefer one naming the actual CSAT support. Never invent a ticket link.
        const ownerVisits = supportVisits.length ? supportVisits : allVisits;
        const master = getMasterAssignmentsForSupport(response.support);
        const isMatched = allVisits.length > 0;
        return {
          ...response,
          matched: isMatched,
          hasTeamVisit: ownerVisits.some((visit) => visit.hasSupportTeam),
          hasSoloVisit: ownerVisits.some((visit) => !visit.hasSupportTeam),
          consultants: isMatched
            ? unique(ownerVisits.map((v) => v.consultantName))
            : unique(master.map((entry) => entry.consultantName)),
          supervisors: isMatched
            ? unique(ownerVisits.map((v) => v.supervisor))
            : unique(master.map((entry) => entry.supervisor)),
          areas: unique(ownerVisits.map((v) => v.area)),
          visitStatuses: unique(ownerVisits.map((v) => v.status)),
          association: isMatched ? 'Sesuai Ticket ID visit' :
            master.length > 1 ? 'Master tim: lebih dari satu L2' :
            master.length === 1 ? 'Master tim' : 'Belum terpetakan',
        };
      }), [visitsByTicket]
  );

  const filtered = useMemo(() => sourceRows.filter((row) => {
    const date = row.createdAt.slice(0, 10);
    if (filters.selectedMonth && row.createdAt.slice(0, 7) !== filters.selectedMonth) return false;
    if (filters.dateRangeStart && date < filters.dateRangeStart) return false;
    if (filters.dateRangeEnd && date > filters.dateRangeEnd) return false;
    if (filters.search) {
      const term = lower(filters.search);
      if (![row.ticketId, row.rating, row.support, row.visitType, row.bookType,
        ...row.consultants, ...row.supervisors].some((value) => lower(value).includes(term))) return false;
    }
    if (filters.consultants.length && !filters.consultants.some((v) =>
      row.consultants.some((c) => lower(v) === lower(c)))) return false;
    if (filters.supervisors.length && !filters.supervisors.some((v) =>
      row.supervisors.some((c) => lower(v) === lower(c)))) return false;
    if (filters.areas.length && !filters.areas.some((v) =>
      row.areas.some((c) => lower(v) === lower(c)))) return false;
    if (filters.bookTypes.length && !filters.bookTypes.some((v) => lower(v) === lower(row.bookType))) return false;
    if (filters.visitTypes.length && !filters.visitTypes.some((v) => lower(v) === lower(row.visitType))) return false;
    if (filters.statuses.length && !filters.statuses.some((v) =>
      row.visitStatuses.some((c) => lower(v) === lower(c)))) return false;
    if (filters.supportTeamMembers.length && !filters.supportTeamMembers.some((value) => {
      if (value.startsWith('CONS_ALL:')) return row.consultants.some((v) => lower(v) === lower(value.slice(9)));
      const member = value.startsWith('AUTO:') || value.startsWith('MEMBER:')
        ? value.split(':').slice(-1)[0] : value;
      return isSameSupportMember(row.support, member);
    })) return false;
    if (filters.supportTeamFilter === 'with_team' && !row.hasTeamVisit) return false;
    if (filters.supportTeamFilter === 'solo' && !row.hasSoloVisit) return false;
    return true;
  }), [sourceRows, filters]);

  useEffect(() => setPage(1), [filters]);
  const ratingEntries = Object.keys(ratingValues);
  const average = filtered.length
    ? filtered.reduce((sum, response) => sum + (ratingValues[response.rating] || 0), 0) / filtered.length : 0;
  const groupedByTicket = new Map<string, number>();
  filtered.forEach((r) => groupedByTicket.set(lower(r.ticketId), (groupedByTicket.get(lower(r.ticketId)) || 0) + 1));
  const ticketCount = groupedByTicket.size;
  const multiResponseTickets = Array.from(groupedByTicket.values()).filter((count) => count > 1).length;
  const matchedCount = new Set(filtered.filter((r) => r.matched).map((r) => lower(r.ticketId))).size;

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const key = r.createdAt.slice(0, 7);
      map.set(key, (map.get(key) || 0) + 1);
    });
    // Always sort chronological, beginning at August 2026.
    return Array.from(map).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, total]) => ({ month: monthLabel(key), total }));
  }, [filtered]);

  const ratingChart = useMemo(() => ratingEntries.map((rating) => ({
    rating,
    total: filtered.filter((r) => r.rating === rating).length,
  })), [filtered]);

  const supportChart = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => map.set(r.support || 'Tidak tercatat', (map.get(r.support || 'Tidak tercatat') || 0) + 1));
    return Array.from(map).map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const safePage = Math.min(page, pageCount);
  const details = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice((safePage - 1) * 10, safePage * 10);

  const kpis = [
    { title: 'Respons CSAT', value: filtered.length.toLocaleString('id-ID'), Icon: MessageSquare },
    { title: 'Tiket Unik', value: ticketCount.toLocaleString('id-ID'), Icon: TicketCheck },
    { title: 'Tiket >1 Respons', value: multiResponseTickets.toLocaleString('id-ID'), Icon: Users },
    { title: 'Rata-rata Rating', value: average.toFixed(2) + ' / 5', Icon: Star },
    { title: 'Tiket Cocok ke Visit', value: matchedCount + ' / ' + ticketCount, Icon: Link2 },
  ];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">CSAT · Penilaian Client</h2>
          <p className="text-xs text-slate-500 mt-1">
            Periode mulai Agustus 2026 · urut kronologis · tanggal berdasarkan Created At (submit CSAT).
            Filter menggunakan master tim SPV → L2 → L1; visit dan CSAT dihitung terpisah.
          </p>
        </div>
        <span className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
          Data CSAT historis terpulihkan
        </span>
      </header>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {kpis.map(({ title, value, Icon }) => (
          <div key={title} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <Icon className="w-4 h-4 text-blue-600 mb-3" />
            <div className="text-[11px] text-slate-500">{title}</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>
      <p className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-900">
        Tiket yang tidak ada dalam data visit tetap ditampilkan. Support yang terdaftar di beberapa L2 mengikuti semua
        relasi Master Data Team dan tidak dipaksa menjadi milik satu consultant.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4">Jumlah respons per bulan submit</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize: 11}}/><YAxis allowDecimals={false} tick={{fontSize: 11}}/>
                <Tooltip/><Bar dataKey="total" name="Respons" fill="#2563eb" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="text-sm font-bold mb-4">Sebaran rating</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" allowDecimals={false} tick={{fontSize: 11}}/>
                <YAxis type="category" width={105} dataKey="rating" tick={{fontSize: 10}}/>
                <Tooltip/>
                <Bar dataKey="total" name="Respons" radius={[0,5,5,0]}>
                  {ratingChart.map((r) => <Cell key={r.rating} fill={ratingColors[r.rating]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 xl:col-span-2">
          <h3 className="text-sm font-bold mb-4">Respons berdasarkan nama support</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supportChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" allowDecimals={false} tick={{fontSize: 11}}/>
                <YAxis type="category" dataKey="name" width={175} tick={{fontSize: 10}}/>
                <Tooltip/><Bar dataKey="total" name="Respons" fill="#0ea5e9" radius={[0,5,5,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Rincian respons CSAT</h3>
            <p className="text-xs text-slate-500">10 respons per halaman · tanpa data PIC atau komentar</p>
          </div>
          <PageListPagination
            currentPage={safePage}
            pageSize={10}
            totalItems={filtered.length}
            onPageChange={setPage}
            itemLabel="respons"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr><th className="p-3">Ticket ID</th><th className="p-3">Tanggal Submit</th><th className="p-3">Rating</th>
                <th className="p-3">Nama Support</th><th className="p-3">SPV / L2 (Master)</th><th className="p-3">Visit Type</th>
                <th className="p-3">Respons/Tiket</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {details.map((row, index) => (
                <tr key={row.ticketId + '-' + row.createdAt + '-' + index} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-semibold whitespace-nowrap">{row.ticketId}</td>
                  <td className="p-3 whitespace-nowrap">{row.createdAt.slice(0,16).replace('T', ' ')}</td>
                  <td className="p-3"><span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{
                    color: ratingColors[row.rating], backgroundColor: ratingColors[row.rating] + '20'
                  }}>{row.rating}</span></td>
                  <td className="p-3">{row.support}</td>
                  <td className="p-3">
                    <div className="font-medium">{row.supervisors.join(', ') || 'Belum terpetakan'}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{row.consultants.join(', ') || 'Belum terpetakan'}</div>
                  </td>
                  <td className="p-3">{row.visitType}</td>
                  <td className="p-3">{groupedByTicket.get(lower(row.ticketId)) || 1}</td>
                  <td className="p-3 text-[10px] text-slate-600">{row.association}</td>
                </tr>
              ))}
              {!details.length && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Tidak ada respons pada periode/filter ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
