import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import type { ProcessedRecord } from '../types';
import { MASTER_DATA_TEAM, isSameSupportMember } from '../utils/dataProcessor';

interface SpvL1AnalyticsProps {
  records: ProcessedRecord[];
  visibleSupervisors: string[];
  onSelectSpvGrouping?: (spv: string, l2?: string, l1?: string) => void;
}

export const SpvL1Analytics: React.FC<SpvL1AnalyticsProps> = ({
  records, visibleSupervisors, onSelectSpvGrouping,
}) => {
  const rows = useMemo(() => {
    const roster = MASTER_DATA_TEAM.filter((row) => visibleSupervisors.includes(row.spv) && row.role === 'L1 Support');
    const uniqueRoster = new Map<string, typeof roster>();
    roster.forEach((r) => {
      const key = r.spv + '::' + r.l1FullName.toLowerCase();
      if (!uniqueRoster.has(key)) uniqueRoster.set(key, []);
      uniqueRoster.get(key)!.push(r);
    });

    return [...uniqueRoster.entries()].map(([key, rosterRows]) => {
      const member = rosterRows[0];
      const relevant = records.filter((record) => {
        if (record.supervisor !== member.spv) return false;
        const participants = [
          record.supportName,
          ...record.supportTeamList,
          ...record.teamParticipants,
          ...record.jointSupportNames,
        ];
        return participants.some((name) => isSameSupportMember(name, member.l1FullName));
      });
      const visits = Array.from(new Map<string, ProcessedRecord>(
        relevant.map((r): [string, ProcessedRecord] => [r.primaryVisitKey, r])
      ).values());
      const clients = new Map<string, number>();
      visits.forEach((visit) => {
        const name = visit.companyName || visit.outletName || 'Belum diisi';
        clients.set(name, (clients.get(name) || 0) + 1);
      });
      return {
        key,
        spv: member.spv,
        l1: member.l1FullName,
        nickname: member.l1Nickname,
        l2: [...new Set(rosterRows.map((r) => r.l2))].join(', '),
        visits: visits.length,
        clients: [...clients].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name).join(', '),
      };
    }).sort((a, b) => b.visits - a.visits || a.l1.localeCompare(b.l1, 'id'));
  }, [records, visibleSupervisors.join('|')]);

  const chartData = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.l1, (counts.get(row.l1) || 0) + row.visits));
    return [...counts].map(([name, visits]) => ({ name, visits }))
      .sort((a, b) => b.visits - a.visits).slice(0, 15);
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-bold text-slate-900">Grafik Kunjungan per L1</h4>
        <p className="mt-1 text-xs text-slate-500">
          15 L1 dengan visit terbanyak pada filter aktif; per personel dihitung unik berdasarkan Ticket ID + Date Visit.
        </p>
        {chartData.some((row) => row.visits > 0) ? (
          <div className="h-72 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 20, left: 18, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{fontSize: 10}}/>
                <YAxis type="category" dataKey="name" width={125} tick={{fontSize: 10}}/>
                <Tooltip />
                <Bar dataKey="visits" name="Total Visit" fill="#2563eb" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">Tidak ada data L1 pada filter ini.</div>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-bold text-slate-900">Tabel Rinci Kunjungan per L1</h4>
          <p className="text-xs text-slate-500 mt-1">
            L1, pendamping L2 di master, jumlah visit unik, dan klien dengan kunjungan terbanyak
          </p>
        </div>
        <div className="max-h-[380px] overflow-auto">
          <table className="min-w-[650px] w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-500 text-[10px] uppercase">
              <tr><th className="px-3 py-2">Support L1</th><th className="px-3 py-2">SPV</th>
                <th className="px-3 py-2">L2 Master</th><th className="px-3 py-2 text-right">Visit</th>
                <th className="px-3 py-2">Klien Teratas</th><th className="px-3 py-2">Filter</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold">{row.nickname} <span className="block font-normal text-slate-500">{row.l1}</span></td>
                  <td className="px-3 py-2">{row.spv}</td>
                  <td className="px-3 py-2">{row.l2}</td>
                  <td className="px-3 py-2 text-right font-bold text-blue-700">{row.visits}</td>
                  <td className="px-3 py-2 text-slate-600">{row.clients || '-'}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => onSelectSpvGrouping?.(row.spv, undefined, row.l1)}
                      className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
                      Filter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
