import React, { useState, useMemo } from 'react';
import { ProcessedRecord } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Users,
  Briefcase,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';

interface PlannedVsActualBarChartProps {
  records: ProcessedRecord[];
  deduplicateEnabled: boolean;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

type GroupingDimension = 'date' | 'month' | 'area' | 'support' | 'consultant';
type ActualMetricMode = 'checkin' | 'completed';

interface ComparisonDataPoint {
  id: string;
  name: string;
  shortName: string;
  planned: number;
  actual: number;
  gap: number;
  achievementRate: number;
  completedCount: number;
  cancelledCount: number;
  rawDate?: Date | null;
}

export const PlannedVsActualBarChart: React.FC<PlannedVsActualBarChartProps> = ({
  records,
  deduplicateEnabled,
  dateRangeStart,
  dateRangeEnd,
}) => {
  const [dimension, setDimension] = useState<GroupingDimension>('date');
  const [actualMode, setActualMode] = useState<ActualMetricMode>('checkin');
  const [chartLayout, setChartLayout] = useState<'grouped' | 'stacked'>('grouped');
  const [showTable, setShowTable] = useState<boolean>(false);

  // Apply deduplication filter consistently
  const countableRecords = useMemo(() => {
    return deduplicateEnabled ? records.filter((r) => !r.isDuplicateOnSameDay) : records;
  }, [records, deduplicateEnabled]);

  // Aggregate comparison data based on selected dimension and actual mode
  const comparisonData: ComparisonDataPoint[] = useMemo(() => {
    if (countableRecords.length === 0) return [];

    const isActual = (r: ProcessedRecord): boolean => {
      if (actualMode === 'checkin') {
        return r.checkInDateObj !== null || (Boolean(r.checkInTime) && r.checkInTime !== '-');
      }
      return (r.status || '').toUpperCase() === 'COMPLETED';
    };

    // Helper map
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        shortName: string;
        planned: number;
        actual: number;
        completedCount: number;
        cancelledCount: number;
        rawDate?: Date | null;
        sortKey?: string | number;
      }
    >();

    const indonesianDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const indonesianMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    countableRecords.forEach((r) => {
      let groupKey = '';
      let groupName = '';
      let shortName = '';
      let rawDate: Date | null = null;
      let sortKey: string | number = '';

      if (dimension === 'date') {
        groupKey = r.agendaDate || r.dateVisit || 'Tanpa Tanggal';
        rawDate = r.agendaDateObj;
        if (rawDate) {
          const d = rawDate.getDate();
          const dayName = indonesianDays[rawDate.getDay()];
          const m = indonesianMonths[rawDate.getMonth()];
          const y = rawDate.getFullYear();
          shortName = `${d} ${m}`;
          groupName = `${dayName}, ${d} ${m} ${y}`;
          sortKey = rawDate.getTime();
        } else {
          shortName = groupKey;
          groupName = groupKey;
          sortKey = groupKey;
        }
      } else if (dimension === 'month') {
        if (r.agendaDateObj) {
          const y = r.agendaDateObj.getFullYear();
          const mIdx = r.agendaDateObj.getMonth();
          const mStr = String(mIdx + 1).padStart(2, '0');
          groupKey = `${y}-${mStr}`;
          shortName = `${indonesianMonths[mIdx]} ${y}`;
          groupName = `${indonesianMonths[mIdx]} ${y}`;
          sortKey = `${y}-${mStr}`;
          rawDate = new Date(y, mIdx, 1);
        } else {
          groupKey = 'Tanpa Bulan';
          shortName = 'Tanpa Bulan';
          groupName = 'Tanpa Bulan';
          sortKey = '0000-00';
        }
      } else if (dimension === 'area') {
        groupKey = r.area || 'Lainnya';
        shortName = groupKey;
        groupName = groupKey;
        sortKey = groupKey;
      } else if (dimension === 'support') {
        groupKey = r.supportName || 'Support Unnamed';
        if (groupKey.toLowerCase() === 'unname') groupKey = 'Support Unnamed';
        // Nicer short name
        shortName = groupKey.split(' ')[0] || groupKey;
        groupName = groupKey;
        sortKey = groupKey;
      } else if (dimension === 'consultant') {
        groupKey = r.consultantName || 'unname';
        shortName = groupKey;
        groupName = groupKey;
        sortKey = groupKey;
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          id: groupKey,
          name: groupName,
          shortName,
          planned: 0,
          actual: 0,
          completedCount: 0,
          cancelledCount: 0,
          rawDate,
          sortKey,
        });
      }

      const item = map.get(groupKey)!;
      // Every record in this dataset represents a planned agenda/visit
      item.planned += 1;

      if (isActual(r)) {
        item.actual += 1;
      }

      const statusUpper = (r.status || '').toUpperCase();
      if (statusUpper === 'COMPLETED') item.completedCount += 1;
      if (statusUpper === 'CANCEL') item.cancelledCount += 1;
    });

    // Convert map to sorted array
    let items = Array.from(map.values());

    if (dimension === 'date') {
      items.sort((a, b) => {
        if (!a.rawDate) return -1;
        if (!b.rawDate) return 1;
        return a.rawDate.getTime() - b.rawDate.getTime();
      });
    } else if (dimension === 'month') {
      items.sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
    } else {
      // By planned visits descending
      items.sort((a, b) => b.planned - a.planned);
    }

    // Cap display for areas, support, and consultant if too many
    if (dimension === 'support' && items.length > 15) {
      items = items.slice(0, 15);
    } else if (dimension === 'area' && items.length > 12) {
      items = items.slice(0, 12);
    }

    return items.map((item) => {
      const gap = Math.max(0, item.planned - item.actual);
      const achievementRate = item.planned > 0 ? Math.round((item.actual / item.planned) * 100) : 0;
      return {
        id: item.id,
        name: item.name,
        shortName: item.shortName,
        planned: item.planned,
        actual: item.actual,
        gap,
        achievementRate,
        completedCount: item.completedCount,
        cancelledCount: item.cancelledCount,
        rawDate: item.rawDate,
      };
    });
  }, [countableRecords, dimension, actualMode]);

  // Overall statistics
  const summary = useMemo(() => {
    const totalPlanned = countableRecords.length;
    let totalActual = 0;
    let totalCompleted = 0;
    let totalCancelled = 0;

    countableRecords.forEach((r) => {
      const isAct =
        actualMode === 'checkin'
          ? r.checkInDateObj !== null || (Boolean(r.checkInTime) && r.checkInTime !== '-')
          : (r.status || '').toUpperCase() === 'COMPLETED';

      if (isAct) totalActual += 1;
      if ((r.status || '').toUpperCase() === 'COMPLETED') totalCompleted += 1;
      if ((r.status || '').toUpperCase() === 'CANCEL') totalCancelled += 1;
    });

    const gap = Math.max(0, totalPlanned - totalActual);
    const achievementRate = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

    // Best performing category
    let bestGroup: ComparisonDataPoint | null = null;
    let lowestGroup: ComparisonDataPoint | null = null;

    if (comparisonData.length > 0) {
      // filter groups with at least 2 planned visits for meaningful rate
      const validGroups = comparisonData.filter((g) => g.planned >= 2);
      const listToCheck = validGroups.length > 0 ? validGroups : comparisonData;

      bestGroup = listToCheck.reduce((prev, curr) => (curr.achievementRate > prev.achievementRate ? curr : prev), listToCheck[0]);
      lowestGroup = listToCheck.reduce((prev, curr) => (curr.achievementRate < prev.achievementRate ? curr : prev), listToCheck[0]);
    }

    return {
      totalPlanned,
      totalActual,
      gap,
      achievementRate,
      totalCompleted,
      totalCancelled,
      bestGroup,
      lowestGroup,
    };
  }, [countableRecords, actualMode, comparisonData]);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ComparisonDataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl p-3.5 shadow-xl text-xs space-y-2.5 min-w-56 z-50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900 truncate max-w-44">
              {data.name}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                data.achievementRate >= 85
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : data.achievementRate >= 60
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {data.achievementRate}% Realisasi
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 mr-2 inline-block"></span>
                Planned Visits:
              </span>
              <span className="font-bold text-slate-900">{data.planned}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-2 inline-block"></span>
                Actual Visits:
              </span>
              <span className="font-bold text-emerald-600">{data.actual}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-500">Selisih (Unfulfilled):</span>
              <span className="font-semibold text-rose-600">
                {data.gap > 0 ? `-${data.gap}` : '0'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Selesai / Batal:</span>
              <span>
                {data.completedCount} selesai, {data.cancelledCount} batal
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      {/* Top Header & Dimension Switches */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Perbandingan Planned Visits vs Actual Visits
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                  Bar Chart
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Komparasi jumlah kunjungan yang dijadwalkan (Planned) terhadap kunjungan yang telah dilakukan (Actual)
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Dimension Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dimension Selector */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setDimension('date')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                dimension === 'date'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              <span>Harian</span>
            </button>
            <button
              type="button"
              onClick={() => setDimension('month')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                dimension === 'month'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>Bulanan</span>
            </button>
            <button
              type="button"
              onClick={() => setDimension('area')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                dimension === 'area'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 mr-1" />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setDimension('support')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                dimension === 'support'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              <span>Support</span>
            </button>
            <button
              type="button"
              onClick={() => setDimension('consultant')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                dimension === 'consultant'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 mr-1" />
              <span>Konsultan</span>
            </button>
          </div>

          {/* Actual Definition Mode */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActualMode('checkin')}
              title="Actual dihitung bila Check-In terisi (kunjungan lapangan berlangsung)"
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                actualMode === 'checkin'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Check-In Terdata
            </button>
            <button
              type="button"
              onClick={() => setActualMode('completed')}
              title="Actual dihitung hanya jika status bertanda COMPLETED"
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                actualMode === 'completed'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Status Completed
            </button>
          </div>

          {/* Grouped vs Stacked */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setChartLayout('grouped')}
              className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                chartLayout === 'grouped'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setChartLayout('stacked')}
              className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                chartLayout === 'stacked'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stacked
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Planned */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Planned Visits</span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.totalPlanned}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Jadwal agenda kunjungan
            </div>
          </div>
        </div>

        {/* Actual */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>Total Actual Visits</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              {summary.totalActual}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">
              {actualMode === 'checkin' ? 'Check-in tercatat di outlet' : 'Tiket bertatus Selesai'}
            </div>
          </div>
        </div>

        {/* Realization Rate */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Fulfillment Rate</span>
            <Percent className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
              <span>{summary.achievementRate}%</span>
              <span className="text-xs font-semibold text-slate-500">terealisasi</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.achievementRate >= 80
                    ? 'bg-emerald-500'
                    : summary.achievementRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, summary.achievementRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Gap (Unfulfilled) */}
        <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200/70 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-800 font-medium">
            <span>Selisih / Belum Selesai</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-700 tracking-tight">
              {summary.gap}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">
              {summary.gap === 0 ? 'Semua kunjungan terlaksana!' : 'Kunjungan belum terealisasi'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="pt-2">
        {comparisonData.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">Tidak ada data untuk rentang filter saat ini</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter tanggal atau pencarian</p>
          </div>
        ) : (
          <div className="h-80 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 15, left: -10, bottom: dimension === 'date' || dimension === 'support' ? 45 : 20 }}
                barGap={chartLayout === 'grouped' ? 4 : 0}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="shortName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  angle={comparisonData.length > 8 ? -30 : 0}
                  textAnchor={comparisonData.length > 8 ? 'end' : 'middle'}
                  interval={0}
                  dy={comparisonData.length > 8 ? 5 : 0}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '14px', fontSize: '12px' }}
                />

                {chartLayout === 'grouped' ? (
                  <>
                    <Bar
                      dataKey="planned"
                      name="Planned Visits"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={42}
                    />
                    <Bar
                      dataKey="actual"
                      name="Actual Visits"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={42}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="actual"
                      name="Actual Visits"
                      stackId="visits"
                      fill="#10b981"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey="gap"
                      name="Unfulfilled / Gap"
                      stackId="visits"
                      fill="#cbd5e1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Explanatory Info & Toggle Detail Table */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {actualMode === 'checkin'
              ? 'Actual = Kunjungan dengan waktu Check-In terdata (lapangan). Planned = Jadwal penugasan agenda.'
              : 'Actual = Kunjungan dengan status COMPLETED. Planned = Jadwal penugasan agenda.'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center space-x-1.5 font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer self-start sm:self-auto"
        >
          <span>{showTable ? 'Sembunyikan Tabel Rincian' : 'Lihat Rincian Planned vs Actual'}</span>
          {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expandable Comparison Table */}
      {showTable && comparisonData.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 animate-fadeIn">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-700">
              Tabel Rincian Planned vs Actual ({comparisonData.length} entri)
            </span>
            <span className="text-[11px] text-slate-500">
              Dimensi:{' '}
              {dimension === 'date'
                ? 'Harian'
                : dimension === 'month'
                ? 'Bulanan'
                : dimension === 'area'
                ? 'Area'
                : dimension === 'support'
                ? 'Support'
                : 'Konsultan'}
            </span>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-2.5 pl-4 border-b border-slate-200">Kategori / Entitas</th>
                  <th className="p-2.5 text-right border-b border-slate-200">Planned</th>
                  <th className="p-2.5 text-right border-b border-slate-200">Actual</th>
                  <th className="p-2.5 text-right border-b border-slate-200">Selisih</th>
                  <th className="p-2.5 text-center border-b border-slate-200">Realisasi</th>
                  <th className="p-2.5 text-center pr-4 border-b border-slate-200">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonData.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 pl-4 font-medium text-slate-900 truncate max-w-48">
                      {item.name}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-700">
                      {item.planned}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-600">
                      {item.actual}
                    </td>
                    <td className="p-2.5 text-right font-semibold text-rose-600">
                      {item.gap > 0 ? `-${item.gap}` : '0'}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="font-semibold">{item.achievementRate}%</span>
                        <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden inline-block">
                          <div
                            className={`h-full rounded-full ${
                              item.achievementRate >= 80
                                ? 'bg-emerald-500'
                                : item.achievementRate >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, item.achievementRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 text-center pr-4">
                      {item.achievementRate >= 100 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          100% Tercapai
                        </span>
                      ) : item.achievementRate >= 75 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Baik
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Kurang
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
