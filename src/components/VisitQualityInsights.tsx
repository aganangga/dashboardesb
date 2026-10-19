import React, { useMemo } from 'react';
import type { ProcessedRecord } from '../types';

interface Props { records: ProcessedRecord[] }
const uniqueVisits = (records: ProcessedRecord[]) =>
  [...new Map(records.map((record) => [record.primaryVisitKey, record])).values()];
const companyKey = (record: ProcessedRecord) =>
  (record.companyName || record.outletName || '').trim().toLocaleLowerCase();

export const VisitQualityInsights: React.FC<Props> = ({ records }) => {
  const { visits, onTime, late, unchecked, repeatCompanies } = useMemo(() => {
    const visits = uniqueVisits(records);
    const onTime = visits.filter((r) => r.punctualityStatus === 'on_time' || r.punctualityStatus === 'early').length;
    const late = visits.filter((r) => r.punctualityStatus === 'late').length;
    const unchecked = visits.filter((r) => r.punctualityStatus === 'not_checked_in').length;
    const groups = new Map<string, { name: string; count: number; areas: Set<string> }>();
    visits.forEach((r) => {
      const key = companyKey(r);
      if (!key) return;
      const entry = groups.get(key) || { name: r.companyName || r.outletName, count: 0, areas: new Set<string>() };
      entry.count += 1;
      if (r.area) entry.areas.add(r.area);
      groups.set(key, entry);
    });
    const repeatCompanies = [...groups.values()].filter((v) => v.count > 1)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 15);
    return { visits, onTime, late, unchecked, repeatCompanies };
  }, [records]);
  const checked = onTime + late;
  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-bold text-slate-900">SLA / D+0 · Ketepatan Check-in</h3>
        <p className="mt-1 text-xs text-slate-500">Analisis tambahan berdasarkan jadwal dan timestamp check-in. Ini bukan SLA penyelesaian tiket.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Visit unik', visits.length],
            ['On-Time / Early', onTime],
            ['Delay', late],
            ['Belum Check-in', unchecked],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-slate-700">Ketepatan check-in dari visit yang sudah check-in: <strong>{checked ? (onTime / checked * 100).toFixed(1) : '0.0'}%</strong></div>
        <p className="mt-1 text-xs text-slate-500">KPI ini terpisah dari Check-in Rate utama (Total Visit − Anomali) / Total Visit. Status kosong tidak dihitung sebagai tepat waktu.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-bold text-slate-900">Repeat Company Analysis</h3>
        <p className="mt-1 text-xs text-slate-500">Klien dengan lebih dari satu visit unik pada filter aktif. Repeat visit belum tentu berarti masalah berulang.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="p-3">Company / Outlet</th><th className="p-3">Area</th><th className="p-3 text-right">Visit</th></tr>
            </thead>
            <tbody>
              {repeatCompanies.map((item) => <tr key={item.name} className="border-b border-slate-100"><td className="p-3 font-medium">{item.name}</td><td className="p-3">{[...item.areas].join(', ') || '-'}</td><td className="p-3 text-right font-semibold">{item.count}</td></tr>)}
              {!repeatCompanies.length && <tr><td colSpan={3} className="p-5 text-center text-slate-500">Tidak ada kunjungan berulang pada filter aktif.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
