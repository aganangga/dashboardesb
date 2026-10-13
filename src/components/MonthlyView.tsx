import React, { useState, useMemo } from 'react';
import { ProcessedRecord, ConsultantGrouping } from '../types';
import {
  AvailableMonthInfo,
  getAvailableMonthsFromRecords,
  formatDuration,
} from '../utils/dataProcessor';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  MapPin,
  Filter,
  BarChart2,
  Award,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface MonthlyViewProps {
  records: ProcessedRecord[];
  allRecords: ProcessedRecord[];
  deduplicateEnabled: boolean;
  consultantGroupings?: ConsultantGrouping[];
  onApplyMonthFilter?: (startDate: string, endDate: string, monthKey: string) => void;
  onSelectConsultantTeam?: (consultant: string, supportMember?: string) => void;
}

export const MonthlyView: React.FC<MonthlyViewProps> = ({
  records,
  allRecords,
  deduplicateEnabled,
  consultantGroupings = [],
  onApplyMonthFilter,
  onSelectConsultantTeam,
}) => {
  // Extract all available months from the full dataset
  const availableMonths = useMemo(() => {
    return getAvailableMonthsFromRecords(allRecords).filter((item) => item.key >= '2026-08');
  }, [allRecords]);

  // Selected month key ('all' or 'YYYY-MM')
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    // Default to the first available month if exists, or 'all'
    return availableMonths.length > 0 ? availableMonths[0].key : 'all';
  });

  // Active month info object
  const activeMonthInfo = useMemo(() => {
    return availableMonths.find((m) => m.key === selectedMonthKey) || null;
  }, [availableMonths, selectedMonthKey]);

  // Current records filtered by selected month (or all records if 'all')
  const monthRecords = useMemo(() => {
    if (selectedMonthKey === 'all') {
      return records;
    }
    return records.filter((r) => {
      if (!r.agendaDateObj) return false;
      const y = r.agendaDateObj.getFullYear();
      const m = String(r.agendaDateObj.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}` === selectedMonthKey;
    });
  }, [records, selectedMonthKey]);

  // Countable records taking deduplication into account
  const countableRecords = useMemo(() => {
    return deduplicateEnabled ? monthRecords.filter((r) => !r.isDuplicateOnSameDay) : monthRecords;
  }, [monthRecords, deduplicateEnabled]);

  // Total unique visits for this month selection
  const totalVisitsCount = useMemo(() => {
    const keys = new Set<string>();
    monthRecords.forEach((r) => keys.add(r.primaryVisitKey));
    return keys.size;
  }, [monthRecords]);

  // Completed & Cancelled counts
  const completedVisits = useMemo(() => {
    const completedSet = new Set<string>();
    monthRecords.forEach((r) => {
      if (r.status.toUpperCase() === 'COMPLETED') {
        completedSet.add(r.primaryVisitKey);
      }
    });
    return completedSet.size;
  }, [monthRecords]);

  const cancelledVisits = useMemo(() => {
    const cancelSet = new Set<string>();
    monthRecords.forEach((r) => {
      if (r.status.toUpperCase() === 'CANCEL') {
        cancelSet.add(r.primaryVisitKey);
      }
    });
    return cancelSet.size;
  }, [monthRecords]);

  const completionRate = totalVisitsCount > 0 ? Math.round((completedVisits / totalVisitsCount) * 100) : 0;

  // Average visit duration in this month
  const avgDurationMinutes = useMemo(() => {
    let totalMins = 0;
    let count = 0;
    countableRecords.forEach((r) => {
      if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
        totalMins += r.durationMinutes;
        count += 1;
      }
    });
    return count > 0 ? Math.round(totalMins / count) : 0;
  }, [countableRecords]);

  // Unique outlets in this month
  const uniqueOutletsCount = useMemo(() => {
    const set = new Set<string>();
    monthRecords.forEach((r) => {
      if (r.outletName && r.outletName.trim()) set.add(r.outletName.trim().toLowerCase());
    });
    return set.size;
  }, [monthRecords]);

  // Unique support agents active in this month
  const activeSupportCount = useMemo(() => {
    const set = new Set<string>();
    monthRecords.forEach((r) => {
      if (r.supportName && r.supportName !== '-' && r.supportName.toLowerCase() !== 'unname') {
        set.add(r.supportName.trim().toLowerCase());
      }
      r.supportTeamList.forEach((stm) => {
        if (stm && stm.trim() && stm.toLowerCase() !== 'unname') {
          set.add(stm.trim().toLowerCase());
        }
      });
    });
    return set.size;
  }, [monthRecords]);

  // Month-over-Month Overview Data for all available months
  const monthlyComparisonData = useMemo(() => {
    const dataByMonth = new Map<
      string,
      {
        key: string;
        label: string;
        shortLabel: string;
        totalTickets: number;
        visitKeys: Set<string>;
        completedKeys: Set<string>;
        cancelKeys: Set<string>;
        totalDuration: number;
        durationCount: number;
      }
    >();

    allRecords.forEach((r) => {
      if (!r.agendaDateObj) return;
      const y = r.agendaDateObj.getFullYear();
      const m = String(r.agendaDateObj.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;

      if (!dataByMonth.has(key)) {
        const monthIdx = r.agendaDateObj.getMonth();
        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
        ];
        const monthName = monthNames[monthIdx] || String(monthIdx + 1);
        dataByMonth.set(key, {
          key,
          label: `${monthName} ${y}`,
          shortLabel: `${monthName.slice(0, 3)} ${y}`,
          totalTickets: 0,
          visitKeys: new Set<string>(),
          completedKeys: new Set<string>(),
          cancelKeys: new Set<string>(),
          totalDuration: 0,
          durationCount: 0,
        });
      }

      const item = dataByMonth.get(key)!;
      item.totalTickets += 1;
      item.visitKeys.add(r.primaryVisitKey);
      if (r.status.toUpperCase() === 'COMPLETED') item.completedKeys.add(r.primaryVisitKey);
      if (r.status.toUpperCase() === 'CANCEL') item.cancelKeys.add(r.primaryVisitKey);

      if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
        item.totalDuration += r.durationMinutes;
        item.durationCount += 1;
      }
    });

    return Array.from(dataByMonth.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => {
        const totalVisits = item.visitKeys.size;
        const completed = item.completedKeys.size;
        const cancelled = item.cancelKeys.size;
        const compRate = totalVisits > 0 ? Math.round((completed / totalVisits) * 100) : 0;
        const avgDur = item.durationCount > 0 ? Math.round(item.totalDuration / item.durationCount) : 0;
        return {
          monthKey: item.key,
          name: item.label,
          shortName: item.shortLabel,
          Tiket: item.totalTickets,
          TotalVisit: totalVisits,
          Completed: completed,
          Cancelled: cancelled,
          CompletionRate: compRate,
          AvgDurationMinutes: avgDur,
          AvgDurationFormatted: formatDuration(avgDur),
        };
      });
  }, [allRecords]);

  // Breakdown by Day within the selected month
  const dailyDataInSelectedMonth = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        date: string;
        dateObj: Date | null;
        visits: Set<string>;
        completed: Set<string>;
        cancelled: Set<string>;
      }
    >();

    countableRecords.forEach((r) => {
      const d = r.agendaDate || 'No Date';
      if (!dayMap.has(d)) {
        dayMap.set(d, {
          date: d,
          dateObj: r.agendaDateObj,
          visits: new Set<string>(),
          completed: new Set<string>(),
          cancelled: new Set<string>(),
        });
      }
      const item = dayMap.get(d)!;
      item.visits.add(r.primaryVisitKey);
      if (r.status.toUpperCase() === 'COMPLETED') item.completed.add(r.primaryVisitKey);
      if (r.status.toUpperCase() === 'CANCEL') item.cancelled.add(r.primaryVisitKey);
    });

    return Array.from(dayMap.values())
      .sort((a, b) => {
        if (!a.dateObj) return -1;
        if (!b.dateObj) return 1;
        return a.dateObj.getTime() - b.dateObj.getTime();
      })
      .map((item) => ({
        name: item.date.slice(0, 5), // DD/MM
        fullDate: item.date,
        Visits: item.visits.size,
        Completed: item.completed.size,
        Cancelled: item.cancelled.size,
      }));
  }, [countableRecords]);

  // Breakdown by Consultant in this month
  const consultantMonthlyStats = useMemo(() => {
    const map = new Map<
      string,
      {
        consultant: string;
        primaryArea: string;
        totalVisits: Set<string>;
        completedVisits: Set<string>;
        totalMinutes: number;
        countMinutes: number;
        supportMembers: Set<string>;
      }
    >();

    monthRecords.forEach((r) => {
      const cons = r.consultantName || 'unname';
      if (!map.has(cons)) {
        map.set(cons, {
          consultant: cons,
          primaryArea: r.area || 'Lainnya',
          totalVisits: new Set<string>(),
          completedVisits: new Set<string>(),
          totalMinutes: 0,
          countMinutes: 0,
          supportMembers: new Set<string>(),
        });
      }
      const item = map.get(cons)!;
      item.totalVisits.add(r.primaryVisitKey);
      if (r.status.toUpperCase() === 'COMPLETED') item.completedVisits.add(r.primaryVisitKey);

      if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
        item.totalMinutes += r.durationMinutes;
        item.countMinutes += 1;
      }

      if (r.supportName && r.supportName !== '-' && r.supportName.toLowerCase() !== 'unname') {
        item.supportMembers.add(r.supportName);
      }
      r.supportTeamList.forEach((stm) => {
        if (stm && stm.trim() && stm.toLowerCase() !== 'unname') {
          item.supportMembers.add(stm.trim());
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalVisits.size - a.totalVisits.size)
      .map((item) => {
        const total = item.totalVisits.size;
        const comp = item.completedVisits.size;
        const rate = total > 0 ? Math.round((comp / total) * 100) : 0;
        const avg = item.countMinutes > 0 ? Math.round(item.totalMinutes / item.countMinutes) : 0;
        return {
          consultant: item.consultant,
          primaryArea: item.primaryArea,
          totalVisits: total,
          completedVisits: comp,
          completionRate: rate,
          avgDuration: formatDuration(avg),
          avgMinutes: avg,
          supportCount: item.supportMembers.size,
          supportList: Array.from(item.supportMembers).slice(0, 4),
        };
      });
  }, [monthRecords]);

  // Top Area Breakdown in this month
  const areaMonthlyStats = useMemo(() => {
    const map = new Map<string, { area: string; visits: Set<string>; completed: Set<string> }>();
    monthRecords.forEach((r) => {
      const a = r.area || 'Lainnya';
      if (!map.has(a)) {
        map.set(a, { area: a, visits: new Set<string>(), completed: new Set<string>() });
      }
      const item = map.get(a)!;
      item.visits.add(r.primaryVisitKey);
      if (r.status.toUpperCase() === 'COMPLETED') item.completed.add(r.primaryVisitKey);
    });

    return Array.from(map.values())
      .sort((a, b) => b.visits.size - a.visits.size)
      .slice(0, 8)
      .map((item) => ({
        name: item.area,
        Visits: item.visits.size,
        Completed: item.completed.size,
      }));
  }, [monthRecords]);

  // Navigate to previous / next month
  const handlePrevMonth = () => {
    if (selectedMonthKey === 'all') {
      if (availableMonths.length > 0) setSelectedMonthKey(availableMonths[0].key);
      return;
    }
    const idx = availableMonths.findIndex((m) => m.key === selectedMonthKey);
    if (idx > 0) {
      setSelectedMonthKey(availableMonths[idx - 1].key);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthKey === 'all') {
      if (availableMonths.length > 0) setSelectedMonthKey(availableMonths[availableMonths.length - 1].key);
      return;
    }
    const idx = availableMonths.findIndex((m) => m.key === selectedMonthKey);
    if (idx < availableMonths.length - 1) {
      setSelectedMonthKey(availableMonths[idx + 1].key);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Month Switcher Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Opsi Tampilan Bulanan (By Month)</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">Analisis Kinerja Periodik</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {selectedMonthKey === 'all'
                ? 'Seluruh Periode Bulan (Rekap Akumulasi)'
                : `Laporan & Kinerja Bulan ${activeMonthInfo?.label || selectedMonthKey}`}
            </h2>
            <p className="text-xs text-slate-500">
              Pilih bulan tertentu di bawah untuk memfokuskan metrik, atau klik &quot;Semua Bulan&quot; untuk melihat komparasi antar bulan secara berdampingan.
            </p>
          </div>

          {/* Month Stepper Navigation */}
          {availableMonths.length > 1 && (
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handlePrevMonth}
                disabled={selectedMonthKey === availableMonths[0]?.key}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                disabled={selectedMonthKey === availableMonths[availableMonths.length - 1]?.key}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Month Selector Pills Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Pilih Bulan:
          </span>

          {/* Option: Semua Bulan */}
          <button
            onClick={() => setSelectedMonthKey('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMonthKey === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            Semua Bulan ({allRecords.length} tiket)
          </button>

          {/* List of detected months */}
          {availableMonths.map((m) => {
            const isSelected = selectedMonthKey === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setSelectedMonthKey(m.key)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span>{m.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-indigo-500/80 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {m.visitCount} visit
                </span>
              </button>
            );
          })}

          {/* Quick Apply to FilterBar button */}
          {activeMonthInfo && onApplyMonthFilter && (
            <button
              onClick={() => onApplyMonthFilter(activeMonthInfo.startDate, activeMonthInfo.endDate, activeMonthInfo.key)}
              className="ml-auto text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
              title="Terapkan rentang tanggal bulan ini ke seluruh filter dashboard"
            >
              <span>Kunci Filter Dashboard ke Bulan Ini</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Monthly KPI Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Total Visits */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Visit Riil</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalVisitsCount}</div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center">
            <span>Deduplikasi Tiket ID + Tanggal</span>
          </div>
        </div>

        {/* Completed Visits */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Kunjungan Selesai</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{completedVisits}</div>
          <div className="text-[10px] text-emerald-800 font-semibold mt-1">
            {completionRate}% Completion Rate
          </div>
        </div>

        {/* Cancelled Visits */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Kunjungan Batal</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">{cancelledVisits}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            {totalVisitsCount > 0 ? Math.round((cancelledVisits / totalVisitsCount) * 100) : 0}% dari total
          </div>
        </div>

        {/* Rata-rata Durasi */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rata-Rata Durasi</span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{formatDuration(avgDurationMinutes)}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">{avgDurationMinutes} menit/visit</div>
        </div>

        {/* Unique Outlets */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Outlet Terlayani</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{uniqueOutletsCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Lokasi unik bulan ini</div>
        </div>

        {/* Active Support Agents */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Personil Aktif</span>
            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-800">{activeSupportCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Support bertugas</div>
        </div>
      </div>

      {/* 3. Visual Charts: Month-over-Month OR Daily Velocity within Selected Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Chart: Tren Volume Kunjungan */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedMonthKey === 'all'
                    ? 'Komparasi Volume Kunjungan Antar Bulan'
                    : `Kecepatan Kunjungan Harian (${activeMonthInfo?.label || selectedMonthKey})`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedMonthKey === 'all'
                    ? 'Perbandingan Total Visit, Selesai (Completed), dan Batal (Cancelled) per bulan'
                    : 'Aktivitas kunjungan riil per tanggal agenda di bulan ini'}
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {selectedMonthKey === 'all' ? (
                <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="shortName" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any, name: string) => [`${val} visit`, name === 'TotalVisit' ? 'Total Visit' : name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="TotalVisit" name="Total Visit" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" name="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cancelled" name="Batal" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={dailyDataInSelectedMonth} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Visits" name="Total Visit" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" name="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Sebaran Area / Wilayah di Bulan Ini */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedMonthKey === 'all'
                    ? 'Distribusi Area Utama (Seluruh Bulan)'
                    : `Distribusi Area di Bulan ${activeMonthInfo?.label || selectedMonthKey}`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Volume kunjungan berdasarkan wilayah operasional
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaMonthlyStats} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="Visits" name="Total Visit" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Rekap Performa Tim Konsulting di Bulan Ini */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Kinerja Tim Konsultan &amp; Dedicated Support
                {selectedMonthKey !== 'all' && ` — Bulan ${activeMonthInfo?.label || selectedMonthKey}`}
              </h3>
              <p className="text-[11px] text-slate-500">
                Total kunjungan, tingkat penyelesaian, dan rata-rata durasi penanganan per konsultan
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/90">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nama Konsultan</th>
                <th className="px-4 py-3">Wilayah Utama</th>
                <th className="px-4 py-3 text-center">Total Visit</th>
                <th className="px-4 py-3 text-center">Selesai (Completed)</th>
                <th className="px-4 py-3 text-center">% Selesai</th>
                <th className="px-4 py-3 text-center">Rata-Rata Durasi</th>
                <th className="px-4 py-3">Personil Support yang Bertugas</th>
                {onSelectConsultantTeam && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consultantMonthlyStats.map((item) => (
                <tr key={item.consultant} className="hover:bg-indigo-50/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {item.consultant === 'unname' ? (
                      <span className="text-slate-400 italic font-normal">unname (Baris Kosong)</span>
                    ) : (
                      item.consultant
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.primaryArea}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                    {item.totalVisits}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700">
                    {item.completedVisits}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.completionRate >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.completionRate >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.completionRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-700">
                    {item.avgDuration}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.supportList.map((sup, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700 border border-slate-200"
                        >
                          {sup}
                        </span>
                      ))}
                      {item.supportCount > item.supportList.length && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{item.supportCount - item.supportList.length} lainnya
                        </span>
                      )}
                    </div>
                  </td>
                  {onSelectConsultantTeam && (
                    <td className="px-4 py-3 text-right">
                      {item.consultant !== 'unname' && (
                        <button
                          onClick={() => onSelectConsultantTeam(item.consultant)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Pilih Tim
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {consultantMonthlyStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    Tidak ada data kunjungan pada periode ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Tabel Rekap Seluruh Bulan (MoM Summary Table) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tabel Komparasi Seluruh Bulan</h3>
              <p className="text-[11px] text-slate-500">
                Ringkasan komparasi performa bulan demi bulan untuk keperluan pelaporan manajemen
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/90">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Bulan</th>
                <th className="px-4 py-3 text-center">Total Tiket Baris</th>
                <th className="px-4 py-3 text-center">Total Visit Riil (Deduplikasi)</th>
                <th className="px-4 py-3 text-center">Kunjungan Selesai</th>
                <th className="px-4 py-3 text-center">Tingkat Selesai (% Rate)</th>
                <th className="px-4 py-3 text-center">Kunjungan Batal</th>
                <th className="px-4 py-3 text-center">Rata-Rata Durasi</th>
                <th className="px-4 py-3 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyComparisonData.map((row) => {
                const isActive = selectedMonthKey === row.monthKey;
                return (
                  <tr
                    key={row.monthKey}
                    className={`transition-colors ${
                      isActive ? 'bg-indigo-50/60 font-semibold' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{row.name}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800 font-bold">
                            Aktif
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">{row.Tiket}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                      {row.TotalVisit}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700">
                      {row.Completed}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {row.CompletionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-rose-600">{row.Cancelled}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {row.AvgDurationFormatted}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedMonthKey(row.monthKey)}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        {isActive ? 'Sedang Dilihat' : 'Lihat Detail Bulan Ini'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {monthlyComparisonData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    Tidak ada data bulan yang terdeteksi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
