import React, { useMemo, useState } from 'react';
import type { ProcessedRecord } from '../types';
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid,
  XAxis, YAxis, Legend, Tooltip,
} from 'recharts';

interface VisitParticipationChartProps {
  records: ProcessedRecord[];
}

const palette = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#f43f5e','#0ea5e9','#14b8a6','#f97316'];

export const VisitParticipationChart: React.FC<VisitParticipationChartProps> = ({ records }) => {
  const [mode, setMode] = useState<'total'|'bookType'>('total');
  const { chartData, series } = useMemo(() => {
    // Baseline parity: one primary visitor for each Ticket ID + Date Visit.
    const visits = Array.from(new Map<string, ProcessedRecord>(
      records.map((r): [string, ProcessedRecord] => [r.primaryVisitKey, r])
    ).values());
    const types = Array.from(new Set(visits.map((r) => r.bookType?.trim() || 'Belum diisi'))).sort();
    const series = types.map((name, i) => ({ name, key: 'bookType' + i }));
    const groups = new Map<string, Record<string, string|number>>();

    visits.forEach((visit) => {
      const name = visit.supportName || 'Support Unnamed';
      if (!groups.has(name)) groups.set(name, { name, visits: 0 });
      const bucket = groups.get(name)!;
      bucket.visits = Number(bucket.visits) + 1;
      const type = visit.bookType?.trim() || 'Belum diisi';
      const key = series[types.indexOf(type)].key;
      bucket[key] = Number(bucket[key] || 0) + 1;
    });
    return {
      chartData: Array.from(groups.values())
        .sort((a, b) => Number(b.visits) - Number(a.visits) || String(a.name).localeCompare(String(b.name), 'id'))
        .slice(0, 20),
      series,
    };
  }, [records]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Pembagian Total Visit per Personil</h4>
          <p className="text-xs text-slate-500 mt-1">
            Berdasarkan support utama. Satu Ticket ID + Date Visit hanya dihitung sekali di grafik ini.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Jenis grafik partisipasi">
          <button type="button" aria-pressed={mode === 'total'} onClick={() => setMode('total')}
            className={'rounded-lg border px-3 py-1.5 text-xs font-medium ' +
              (mode === 'total' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700')}>
            Total Visit
          </button>
          <button type="button" aria-pressed={mode === 'bookType'} onClick={() => setMode('bookType')}
            className={'rounded-lg border px-3 py-1.5 text-xs font-medium ' +
              (mode === 'bookType' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700')}>
            Per Book Type
          </button>
        </div>
      </div>

      {chartData.length ? (
        <div className="h-[380px] min-w-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 75 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={94} tick={{fontSize:10}}/>
              <YAxis allowDecimals={false} tick={{fontSize:10}}/>
              <Tooltip formatter={(value, name) => [String(value) + ' visit', name]} />
              {mode === 'bookType' && <Legend verticalAlign="top" wrapperStyle={{fontSize:11}} />}
              {mode === 'bookType'
                ? series.map((item, i) => (
                    <Bar key={item.key} dataKey={item.key} name={item.name} stackId="visits"
                      fill={palette[i % palette.length]}/>
                  ))
                : <Bar dataKey="visits" name="Total Visit" fill="#2563eb" radius={[4,4,0,0]}/>
              }
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-slate-500 text-center py-12">Tidak ada data partisipasi pada filter ini.</p>
      )}
    </div>
  );
};
