import React, { useState, useMemo } from 'react';
import { ProcessedRecord } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { formatDuration } from '../utils/dataProcessor';

interface DailyVisitTrendChartProps {
  records: ProcessedRecord[];
  deduplicateEnabled: boolean;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

interface DailyDataPoint {
  dateKey: string;
  displayDate: string;
  fullDateLabel: string;
  rawDate: Date | null;
  visits: number;
  completed: number;
  cancelled: number;
  avgDurationMins: number;
  avgDurationFormatted: string;
  completionRate: number;
}

export const DailyVisitTrendChart: React.FC<DailyVisitTrendChartProps> = ({
  records,
  deduplicateEnabled,
  dateRangeStart,
  dateRangeEnd,
}) => {
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [showCancelled, setShowCancelled] = useState<boolean>(false);
  const [chartStyle, setChartStyle] = useState<'line' | 'area'>('area');
  const [showDailyBreakdownTable, setShowDailyBreakdownTable] = useState<boolean>(false);

  // Filter records based on deduplication setting
  const countableRecords = useMemo(() => {
    return deduplicateEnabled ? records.filter((r) => !r.isDuplicateOnSameDay) : records;
  }, [records, deduplicateEnabled]);

  // Aggregate daily records
  const dailyData: DailyDataPoint[] = useMemo(() => {
    const map = new Map<
      string,
      {
        dateKey: string;
        rawDate: Date | null;
        total: number;
        completed: number;
        cancelled: number;
        totalDurationMins: number;
        countDuration: number;
      }
    >();

    countableRecords.forEach((r) => {
      const dateKey = r.agendaDate || r.dateVisit || 'Tanpa Tanggal';
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          rawDate: r.agendaDateObj,
          total: 0,
          completed: 0,
          cancelled: 0,
          totalDurationMins: 0,
          countDuration: 0,
        });
      }

      const item = map.get(dateKey)!;
      item.total += 1;
      const statusUpper = (r.status || '').toUpperCase();
      if (statusUpper === 'COMPLETED') item.completed += 1;
      if (statusUpper === 'CANCEL') item.cancelled += 1;

      if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
        item.totalDurationMins += r.durationMinutes;
        item.countDuration += 1;
      }
    });

    const indonesianDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const indonesianMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    return Array.from(map.values())
      .sort((a, b) => {
        if (!a.rawDate) return -1;
        if (!b.rawDate) return 1;
        return a.rawDate.getTime() - b.rawDate.getTime();
      })
      .map((item) => {
        let displayDate = item.dateKey;
        let fullDateLabel = item.dateKey;

        if (item.rawDate) {
          const d = item.rawDate.getDate();
          const dayName = indonesianDays[item.rawDate.getDay()];
          const m = indonesianMonths[item.rawDate.getMonth()];
          const y = item.rawDate.getFullYear();
          displayDate = `${d} ${m}`;
          fullDateLabel = `${dayName}, ${d} ${m} ${y}`;
        }

        const avgMins = item.countDuration > 0 ? Math.round(item.totalDurationMins / item.countDuration) : 0;
        const completionRate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;

        return {
          dateKey: item.dateKey,
          displayDate,
          fullDateLabel,
          rawDate: item.rawDate,
          visits: item.total,
          completed: item.completed,
          cancelled: item.cancelled,
          avgDurationMins: avgMins,
          avgDurationFormatted: avgMins > 0 ? formatDuration(avgMins) : '-',
          completionRate,
        };
      });
  }, [countableRecords]);

  // Overall Statistics for this trend
  const stats = useMemo(() => {
    if (dailyData.length === 0) {
      return {
        totalDays: 0,
        totalVisits: 0,
        avgVisitsPerDay: 0,
        peakDay: null as DailyDataPoint | null,
        lowestDay: null as DailyDataPoint | null,
        totalCompleted: 0,
        overallCompletionRate: 0,
      };
    }

    const totalDays = dailyData.length;
    const totalVisits = dailyData.reduce((acc, curr) => acc + curr.visits, 0);
    const totalCompleted = dailyData.reduce((acc, curr) => acc + curr.completed, 0);
    const avgVisitsPerDay = totalDays > 0 ? Math.round((totalVisits / totalDays) * 10) / 10 : 0;
    const overallCompletionRate = totalVisits > 0 ? Math.round((totalCompleted / totalVisits) * 100) : 0;

    let peakDay = dailyData[0];
    let lowestDay = dailyData[0];

    for (const d of dailyData) {
      if (d.visits > peakDay.visits) peakDay = d;
      if (d.visits < lowestDay.visits) lowestDay = d;
    }

    return {
      totalDays,
      totalVisits,
      avgVisitsPerDay,
      peakDay,
      lowestDay,
      totalCompleted,
      overallCompletionRate,
    };
  }, [dailyData]);

  // Date Range formatted subtitle
  const dateRangeLabel = useMemo(() => {
    if (dateRangeStart && dateRangeEnd) {
      return `${dateRangeStart} s/d ${dateRangeEnd}`;
    }
    if (dateRangeStart) return `Mulai ${dateRangeStart}`;
    if (dateRangeEnd) return `Sampai ${dateRangeEnd}`;
    if (dailyData.length > 0) {
      const first = dailyData[0]?.displayDate;
      const last = dailyData[dailyData.length - 1]?.displayDate;
      return `${first} — ${last}`;
    }
    return 'Semua Periode';
  }, [dateRangeStart, dateRangeEnd, dailyData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DailyDataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-56 z-50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              {data.fullDateLabel}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {data.completionRate}% Selesai
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mr-2 inline-block"></span>
                Total Kunjungan:
              </span>
              <span className="font-bold text-slate-900 text-sm">{data.visits}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 inline-block"></span>
                Kunjungan Selesai:
              </span>
              <span className="font-semibold text-emerald-700">{data.completed}</span>
            </div>

            {data.cancelled > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2 inline-block"></span>
                  Dibatalkan:
                </span>
                <span className="font-semibold text-rose-600">{data.cancelled}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
              <span className="text-slate-500 flex items-center">
                <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                Rata-rata Durasi:
              </span>
              <span className="font-medium text-slate-700">{data.avgDurationFormatted}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title and date info */}
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0 mt-0.5">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Tren Jumlah Kunjungan Per Hari (Daily Visits Trend)
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100/70 text-indigo-700 border border-indigo-200/60">
                  {dateRangeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Visualisasi grafik garis fluktuasi volume kunjungan harian dalam rentang filter aktif
                {deduplicateEnabled && (
                  <span className="ml-1 text-emerald-700 font-medium">
                    (Primary Key: Tiket ID + Tanggal Visit)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Filter & Style Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Chart Style Toggle: Line vs Area */}
            <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setChartStyle('area')}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                  chartStyle === 'area'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan grafik garis dengan arsiran gradien"
              >
                Grafik Area
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('line')}
                className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                  chartStyle === 'line'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan grafik garis minimalis"
              >
                Garis Murni
              </button>
            </div>

            {/* Toggle Completed Line */}
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                showCompleted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showCompleted ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span>Garis Selesai</span>
            </button>

            {/* Toggle Cancelled Line */}
            <button
              type="button"
              onClick={() => setShowCancelled(!showCancelled)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                showCancelled
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showCancelled ? 'bg-rose-500' : 'bg-slate-300'}`} />
              <span>Garis Batal</span>
            </button>

            {/* Toggle Table Breakdown */}
            <button
              type="button"
              onClick={() => setShowDailyBreakdownTable(!showDailyBreakdownTable)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-semibold transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              <span>{showDailyBreakdownTable ? 'Tutup Rincian' : 'Rincian Hari'}</span>
            </button>
          </div>
        </div>

        {/* Highlight KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-slate-200/70">
          {/* Total Days */}
          <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center space-x-2.5 shadow-2xs">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Rentang Aktif</div>
              <div className="text-sm font-black text-slate-900">
                {stats.totalDays} <span className="text-xs font-medium text-slate-500">Hari</span>
              </div>
            </div>
          </div>

          {/* Average per Day */}
          <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center space-x-2.5 shadow-2xs">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Rata-Rata / Hari</div>
              <div className="text-sm font-black text-slate-900">
                {stats.avgVisitsPerDay}{' '}
                <span className="text-xs font-medium text-slate-500">visit/hari</span>
              </div>
            </div>
          </div>

          {/* Peak Day */}
          <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center space-x-2.5 shadow-2xs">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-500">Hari Tertinggi</div>
              <div className="text-sm font-black text-slate-900 truncate">
                {stats.peakDay ? (
                  <>
                    {stats.peakDay.visits}{' '}
                    <span className="text-[11px] font-semibold text-slate-500">
                      ({stats.peakDay.displayDate})
                    </span>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>

          {/* Lowest Day */}
          <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center space-x-2.5 shadow-2xs">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-500">Hari Terendah</div>
              <div className="text-sm font-black text-slate-900 truncate">
                {stats.lowestDay ? (
                  <>
                    {stats.lowestDay.visits}{' '}
                    <span className="text-[11px] font-semibold text-slate-500">
                      ({stats.lowestDay.displayDate})
                    </span>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Body */}
      <div className="p-4 sm:p-5">
        {dailyData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Calendar className="w-8 h-8 text-slate-400 mb-2" />
            <div className="text-sm font-bold text-slate-700">Tidak ada data kunjungan pada filter ini</div>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Silakan sesuaikan filter tanggal atau pilih filter bulan untuk melihat grafik tren harian.
            </p>
          </div>
        ) : (
          <div>
            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartStyle === 'area' ? (
                  <AreaChart data={dailyData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorVisitsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorCancelledGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />

                    <XAxis
                      dataKey="displayDate"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      dy={6}
                    />

                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                    />

                    <Area
                      type="monotone"
                      dataKey="visits"
                      name="Total Kunjungan"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorVisitsGrad)"
                      activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                      dot={{ r: 3.5, fill: '#ffffff', stroke: '#4f46e5', strokeWidth: 2 }}
                    />

                    {showCompleted && (
                      <Area
                        type="monotone"
                        dataKey="completed"
                        name="Kunjungan Selesai"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        fillOpacity={1}
                        fill="url(#colorCompletedGrad)"
                        activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                        dot={{ r: 3, fill: '#ffffff', stroke: '#10b981', strokeWidth: 1.5 }}
                      />
                    )}

                    {showCancelled && (
                      <Area
                        type="monotone"
                        dataKey="cancelled"
                        name="Kunjungan Dibatalkan"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCancelledGrad)"
                        activeDot={{ r: 5, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
                        dot={{ r: 3, fill: '#ffffff', stroke: '#f43f5e', strokeWidth: 1.5 }}
                      />
                    )}
                  </AreaChart>
                ) : (
                  <LineChart data={dailyData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />

                    <XAxis
                      dataKey="displayDate"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      dy={6}
                    />

                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                    />

                    <Line
                      type="monotone"
                      dataKey="visits"
                      name="Total Kunjungan"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                      dot={{ r: 4, fill: '#ffffff', stroke: '#4f46e5', strokeWidth: 2 }}
                    />

                    {showCompleted && (
                      <Line
                        type="monotone"
                        dataKey="completed"
                        name="Kunjungan Selesai"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                        dot={{ r: 3, fill: '#ffffff', stroke: '#10b981', strokeWidth: 1.5 }}
                      />
                    )}

                    {showCancelled && (
                      <Line
                        type="monotone"
                        dataKey="cancelled"
                        name="Kunjungan Dibatalkan"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        activeDot={{ r: 5, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
                        dot={{ r: 3, fill: '#ffffff', stroke: '#f43f5e', strokeWidth: 1.5 }}
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Collapsible Mini Breakdown Table */}
            {showDailyBreakdownTable && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center">
                    <Layers className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Rincian Rekap Kunjungan Per Tanggal
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {dailyData.length} tanggal tercatat
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-slate-600">Tanggal</th>
                        <th className="px-3 py-2 text-center font-bold text-indigo-700">Total Kunjungan</th>
                        <th className="px-3 py-2 text-center font-bold text-emerald-700">Selesai (Completed)</th>
                        <th className="px-3 py-2 text-center font-bold text-rose-700">Batal (Cancel)</th>
                        <th className="px-3 py-2 text-center font-bold text-slate-600">Persentase Selesai</th>
                        <th className="px-3 py-2 text-right font-bold text-slate-600">Rata-rata Durasi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {dailyData.map((d) => (
                        <tr key={d.dateKey} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">
                            {d.fullDateLabel}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-indigo-600 whitespace-nowrap">
                            {d.visits} visit
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-emerald-700 whitespace-nowrap">
                            {d.completed}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-rose-600 whitespace-nowrap">
                            {d.cancelled}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {d.completionRate}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 font-medium whitespace-nowrap">
                            {d.avgDurationFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
