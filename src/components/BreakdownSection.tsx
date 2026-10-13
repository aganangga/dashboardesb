import React, { useState, useMemo } from 'react';
import { ProcessedRecord, ConsultantGrouping, SpvL2L1Grouping } from '../types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Calendar, MapPin, UserCheck, BookOpen, BarChart3, PieChartIcon, Briefcase, Users, Sparkles, ExternalLink, Check, TrendingUp, GitFork, Network, Layers, ShieldCheck, Search, FileSpreadsheet, CheckCircle2, Download } from 'lucide-react';
import { formatDuration, buildSpvL2L1Groupings, MASTER_DATA_TEAM } from '../utils/dataProcessor';
import { SpvL1Analytics } from './SpvL1Analytics';

interface BreakdownSectionProps {
  records: ProcessedRecord[];
  deduplicateEnabled: boolean;
  consultantGroupings?: ConsultantGrouping[];
  spvGroupings?: SpvL2L1Grouping[];
  selectedConsultant?: string;
  onSelectConsultantTeam?: (consultant: string, supportMember?: string) => void;
  onSelectSpvGrouping?: (spv: string, l2?: string, l1?: string) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#f43f5e', '#14b8a6', '#64748b'];

export const BreakdownSection: React.FC<BreakdownSectionProps> = ({
  records,
  deduplicateEnabled,
  consultantGroupings = [],
  spvGroupings,
  selectedConsultant = '',
  onSelectConsultantTeam,
  onSelectSpvGrouping,
}) => {
  const [activeTab, setActiveTab] = useState<'masterTeam' | 'spvGroup' | 'grouping' | 'date' | 'support' | 'area' | 'spv' | 'consultant' | 'bookType'>('masterTeam');
  const [dateViewMode, setDateViewMode] = useState<'daily' | 'monthly'>('daily');
  const [dateChartType, setDateChartType] = useState<'line' | 'bar'>('line');
  const [spvSearchQuery, setSpvSearchQuery] = useState<string>('');
  const [masterSearchQuery, setMasterSearchQuery] = useState<string>('');
  const [selectedSpvFilter, setSelectedSpvFilter] = useState<string>('all');

  // Filter records based on deduplication setting for counting visits
  const countableRecords = deduplicateEnabled ? records.filter((r) => !r.isDuplicateOnSameDay) : records;

  // Hierarchical grouping: Supervisor -> L2 -> L1
  const computedSpvGroupings = useMemo(() => {
    if (spvGroupings && spvGroupings.length > 0) return spvGroupings;
    return buildSpvL2L1Groupings(countableRecords);
  }, [spvGroupings, countableRecords]);

  const filteredSpvGroupings = useMemo(() => {
    if (!spvSearchQuery.trim()) return computedSpvGroupings;
    const q = spvSearchQuery.toLowerCase().trim();
    return computedSpvGroupings.filter((spv) => {
      if (spv.supervisor.toLowerCase().includes(q)) return true;
      if (spv.l2Groups.some((l2) => l2.l2Name.toLowerCase().includes(q) || l2.l2Nickname.toLowerCase().includes(q))) return true;
      if (spv.allL1Members.some((l1) => l1.fullName.toLowerCase().includes(q) || l1.nickname.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [computedSpvGroupings, spvSearchQuery]);

  // Master Data Team: mapping visit counts per member
  const memberVisitsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    countableRecords.forEach((r) => {
      if (r.supportName && r.supportName !== 'Support Unnamed') {
        const key = r.supportName.toLowerCase().trim();
        map.set(key, (map.get(key) || 0) + 1);
      }
      r.supportTeamList.forEach((m) => {
        if (m) {
          const key = m.toLowerCase().trim();
          map.set(key, (map.get(key) || 0) + 1);
        }
      });
    });
    return map;
  }, [countableRecords]);

  // Filtered Master Data Team
  const filteredMasterDataTeam = useMemo(() => {
    return MASTER_DATA_TEAM.filter((item) => {
      if (selectedSpvFilter !== 'all' && item.spv !== selectedSpvFilter) {
        return false;
      }
      if (!masterSearchQuery.trim()) return true;
      const q = masterSearchQuery.toLowerCase().trim();
      return (
        item.spv.toLowerCase().includes(q) ||
        item.l2.toLowerCase().includes(q) ||
        item.l1FullName.toLowerCase().includes(q) ||
        item.l1Nickname.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q)
      );
    });
  }, [masterSearchQuery, selectedSpvFilter]);

  const handleExportMasterDataTeamCsv = () => {
    const headers = ['No', 'Supervisor (SPV)', 'Tim Konsultan (L2)', 'Nama Lengkap Support (L1)', 'Panggilan', 'Peran', 'Total Visit', 'Status'];
    const rows = MASTER_DATA_TEAM.map((item) => {
      const visits = memberVisitsCountMap.get(item.l1FullName.toLowerCase().trim()) || 0;
      return [
        item.no,
        `"${item.spv}"`,
        `"${item.l2}"`,
        `"${item.l1FullName}"`,
        `"${item.l1Nickname}"`,
        `"${item.role}"`,
        visits,
        `"Terpetakan 100%"`
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'master_data_team_spv_l2_l1.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. BREAKDOWN DATE (DAILY)
  const dateMap = new Map<string, { date: string; rawDate: Date | null; total: number; completed: number; cancelled: number; totalMins: number; countMins: number }>();
  // 1B. BREAKDOWN DATE (MONTHLY)
  const monthMap = new Map<string, { key: string; label: string; rawDate: Date | null; total: number; completed: number; cancelled: number; totalMins: number; countMins: number }>();

  countableRecords.forEach((r) => {
    const d = r.agendaDate || 'No Date';
    if (!dateMap.has(d)) {
      dateMap.set(d, {
        date: d,
        rawDate: r.agendaDateObj,
        total: 0,
        completed: 0,
        cancelled: 0,
        totalMins: 0,
        countMins: 0,
      });
    }
    const item = dateMap.get(d)!;
    item.total += 1;
    if (r.status.toUpperCase() === 'COMPLETED') item.completed += 1;
    if (r.status.toUpperCase() === 'CANCEL') item.cancelled += 1;
    if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
      item.totalMins += r.durationMinutes;
      item.countMins += 1;
    }

    // Monthly grouping
    if (r.agendaDateObj) {
      const y = r.agendaDateObj.getFullYear();
      const m = String(r.agendaDateObj.getMonth() + 1).padStart(2, '0');
      const monthKey = `${y}-${m}`;
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const monthLabel = `${monthNames[r.agendaDateObj.getMonth()] || m} ${y}`;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          key: monthKey,
          label: monthLabel,
          rawDate: new Date(y, r.agendaDateObj.getMonth(), 1),
          total: 0,
          completed: 0,
          cancelled: 0,
          totalMins: 0,
          countMins: 0,
        });
      }
      const mItem = monthMap.get(monthKey)!;
      mItem.total += 1;
      if (r.status.toUpperCase() === 'COMPLETED') mItem.completed += 1;
      if (r.status.toUpperCase() === 'CANCEL') mItem.cancelled += 1;
      if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
        mItem.totalMins += r.durationMinutes;
        mItem.countMins += 1;
      }
    }
  });

  // Sort dates chronologically
  const dateData = Array.from(dateMap.values())
    .sort((a, b) => {
      if (!a.rawDate) return -1;
      if (!b.rawDate) return 1;
      return a.rawDate.getTime() - b.rawDate.getTime();
    })
    .map((item) => ({
      name: item.date,
      Visits: item.total,
      Completed: item.completed,
      Cancelled: item.cancelled,
      AvgMinutes: item.countMins > 0 ? Math.round(item.totalMins / item.countMins) : 0,
      AvgDurationFormatted: item.countMins > 0 ? formatDuration(Math.round(item.totalMins / item.countMins)) : '-',
    }));

  // Sort months chronologically
  const monthData = Array.from(monthMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      name: item.label,
      Visits: item.total,
      Completed: item.completed,
      Cancelled: item.cancelled,
      AvgMinutes: item.countMins > 0 ? Math.round(item.totalMins / item.countMins) : 0,
      AvgDurationFormatted: item.countMins > 0 ? formatDuration(Math.round(item.totalMins / item.countMins)) : '-',
    }));

  // 2. BREAKDOWN AREA
  const areaMap = new Map<string, { area: string; count: number; completed: number; avgMins: number; countMins: number; totalMins: number }>();
  countableRecords.forEach((r) => {
    const area = r.area || 'Lainnya';
    if (!areaMap.has(area)) {
      areaMap.set(area, { area, count: 0, completed: 0, avgMins: 0, countMins: 0, totalMins: 0 });
    }
    const item = areaMap.get(area)!;
    item.count += 1;
    if (r.status.toUpperCase() === 'COMPLETED') item.completed += 1;
    if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
      item.totalMins += r.durationMinutes;
      item.countMins += 1;
    }
  });

  const areaData = Array.from(areaMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      name: item.area,
      Visits: item.count,
      Completed: item.completed,
      AvgDuration: item.countMins > 0 ? formatDuration(Math.round(item.totalMins / item.countMins)) : '-',
    }));

  // 3. BREAKDOWN SPV (Supervisors including "unname")
  const spvMap = new Map<string, { spv: string; count: number; completed: number; cancelled: number; countMins: number; totalMins: number }>();
  countableRecords.forEach((r) => {
    // Empty supervisor is displayed as "unname"
    const spv = r.supervisor || 'unname';
    if (!spvMap.has(spv)) {
      spvMap.set(spv, { spv, count: 0, completed: 0, cancelled: 0, countMins: 0, totalMins: 0 });
    }
    const item = spvMap.get(spv)!;
    item.count += 1;
    if (r.status.toUpperCase() === 'COMPLETED') item.completed += 1;
    if (r.status.toUpperCase() === 'CANCEL') item.cancelled += 1;
    if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
      item.totalMins += r.durationMinutes;
      item.countMins += 1;
    }
  });

  const spvData = Array.from(spvMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      name: item.spv,
      Visits: item.count,
      Completed: item.completed,
      Cancelled: item.cancelled,
      AvgDuration: item.countMins > 0 ? formatDuration(Math.round(item.totalMins / item.countMins)) : '-',
    }));

  // 4. BREAKDOWN NAMA KONSULTING (Consultants including "unname")
  const consultantMap = new Map<string, { consultant: string; count: number; completed: number; cancelled: number; countMins: number; totalMins: number }>();
  countableRecords.forEach((r) => {
    const c = r.consultantName || 'unname';
    if (!consultantMap.has(c)) {
      consultantMap.set(c, { consultant: c, count: 0, completed: 0, cancelled: 0, countMins: 0, totalMins: 0 });
    }
    const item = consultantMap.get(c)!;
    item.count += 1;
    if (r.status.toUpperCase() === 'COMPLETED') item.completed += 1;
    if (r.status.toUpperCase() === 'CANCEL') item.cancelled += 1;
    if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
      item.totalMins += r.durationMinutes;
      item.countMins += 1;
    }
  });

  const consultantData = Array.from(consultantMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      name: item.consultant,
      Visits: item.count,
      Completed: item.completed,
      Cancelled: item.cancelled,
      AvgDuration: item.countMins > 0 ? formatDuration(Math.round(item.totalMins / item.countMins)) : '-',
    }));

  // 5. BREAKDOWN BOOK TYPE
  const bookTypeMap = new Map<string, { bookType: string; count: number; completed: number; countMins: number; totalMins: number }>();
  countableRecords.forEach((r) => {
    const bt = r.bookType || 'Unknown';
    if (!bookTypeMap.has(bt)) {
      bookTypeMap.set(bt, { bookType: bt, count: 0, completed: 0, countMins: 0, totalMins: 0 });
    }
    const item = bookTypeMap.get(bt)!;
    item.count += 1;
    if (r.status.toUpperCase() === 'COMPLETED') item.completed += 1;
    if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
      item.totalMins += r.durationMinutes;
      item.countMins += 1;
    }
  });

  const bookTypeData = Array.from(bookTypeMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      name: item.bookType,
      value: item.count,
      Completed: item.completed,
      AvgDuration: item.countMins > 0 ? formatDuration(Math.round(item.totalMins / item.countMins)) : '-',
    }));

  // 6. BREAKDOWN SUPPORT & SUPPORT TEAM (Line 1 vs Line 2 Separator)
  const supportMap = new Map<string, { support: string; total: number; withTeam: number; solo: number; completed: number; avgMins: number; countMins: number; totalMins: number }>();
  countableRecords.forEach((r) => {
    const s = r.supportName || 'unname';
    // Include all actual primary support staff on visits attributed to this consultant.
    // Cross-team visitors stay visible without being placed in the wrong permanent roster.
    if (!supportMap.has(s)) {
      supportMap.set(s, { support: s, total: 0, withTeam: 0, solo: 0, completed: 0, avgMins: 0, countMins: 0, totalMins: 0 });
    }
    const item = supportMap.get(s)!;
    item.total += 1;
    if (r.hasSupportTeam) {
      item.withTeam += 1;
    } else {
      item.solo += 1;
    }
    if (r.status.toUpperCase() === 'COMPLETED') item.completed += 1;
    if (r.durationMinutes && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60) {
      item.totalMins += r.durationMinutes;
      item.countMins += 1;
    }
  });

  const supportData = Array.from(supportMap.values())
    .sort((a, b) => b.total - a.total)
    .map((item) => ({
      name: item.support,
      Visits: item.total,
      WithTeam: item.withTeam,
      Solo: item.solo,
      Completed: item.completed,
      AvgDuration: item.countMins > 0 ? formatDuration(Math.round(item.totalMins / item.countMins)) : '-',
    }));

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      {/* Section Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Breakdown Operasional</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis sebaran data berdasarkan Tanggal, Area, SPV, Konsulting, Support &amp; Support Team, dan Book Type
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start sm:self-auto gap-0.5">
          <button
            onClick={() => setActiveTab('masterTeam')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'masterTeam' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sheet Master Data Team</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              SPV - L2 - L1
            </span>
          </button>
          <button
            onClick={() => setActiveTab('spvGroup')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'spvGroup' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-indigo-600" />
            <span>Grouping SPV - L2 - L1</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
              Hirarki
            </span>
          </button>
          <button
            onClick={() => setActiveTab('grouping')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'grouping' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Grouping Konsulting &amp; Tim</span>
          </button>
          <button
            onClick={() => setActiveTab('date')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'date' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Tanggal</span>
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'support' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Support &amp; Team</span>
          </button>
          <button
            onClick={() => setActiveTab('area')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'area' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Area</span>
          </button>
          <button
            onClick={() => setActiveTab('spv')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'spv' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Supervisor</span>
          </button>
          <button
            onClick={() => setActiveTab('consultant')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'consultant' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Konsulting</span>
          </button>
          <button
            onClick={() => setActiveTab('bookType')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'bookType' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Book Type</span>
          </button>
        </div>
      </div>

      {/* Tab: Master Data Team (Mapping SPV - L2 - L1) */}
      {activeTab === 'masterTeam' && (
        <div className="space-y-5">
          {/* Header Info Banner */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 text-white shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Sheet Master Data Team: Mapping Resmi Tim per SPV &rarr; L2 &rarr; L1
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    100% Terpetakan
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Mapping resmi seluruh tim operasional: <strong>3 Supervisor</strong>, <strong>9 Tim Konsultan (L2)</strong>, dan seluruh personil <strong>L1 Support</strong>. Seluruh entri yang sebelumnya tercatat <em>unname</em> telah diperbarui dan dipetakan tuntas tanpa missing.
                </p>
              </div>
            </div>

            {/* Action Buttons & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, SPV, atau L2..."
                  value={masterSearchQuery}
                  onChange={(e) => setMasterSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={handleExportMasterDataTeamCsv}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
                title="Download file CSV master mapping"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Supervisor (SPV)</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">3 SPV</div>
              <span className="text-[11px] text-slate-500">Jane, Rimad, Iriansyah</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tim Konsultan (L2)</span>
              <div className="text-xl font-bold text-indigo-600 mt-0.5">9 Lead Konsultan</div>
              <span className="text-[11px] text-slate-500">L2 Lapangan</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Personil Support (L1)</span>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">{MASTER_DATA_TEAM.length} Anggota</div>
              <span className="text-[11px] text-emerald-600 font-medium">Terpetakan Penuh</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Consultant Belum Terpetakan</span>
              <div className="text-xl font-bold text-amber-600 mt-0.5">
                {countableRecords.filter((record) => record.consultantName === 'Belum Terpetakan').length} Perlu Review
              </div>
              <span className="text-[11px] text-amber-700 font-medium">Tidak ditebak jika raw data ambigu</span>
            </div>
          </div>

          {/* Filter per SPV */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-slate-500 mr-1">Filter SPV:</span>
            {[
              { id: 'all', label: 'Semua Supervisor' },
              { id: 'Jane Margareth Widjaja', label: 'Jane Margareth Widjaja' },
              { id: 'Muhamad Rimaduddin', label: 'Muhamad Rimaduddin' },
              { id: 'M. Iriansyah Suhendar', label: 'M. Iriansyah Suhendar' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedSpvFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedSpvFilter === f.id
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Master Data Team Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Supervisor (SPV)</th>
                    <th className="py-2.5 px-3">Tim Konsultan (L2)</th>
                    <th className="py-2.5 px-3">Nama Lengkap Support (L1)</th>
                    <th className="py-2.5 px-3">Panggilan</th>
                    <th className="py-2.5 px-3 text-center">Total Visit</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMasterDataTeam.map((item, idx) => {
                    const visits = memberVisitsCountMap.get(item.l1FullName.toLowerCase().trim()) || 0;
                    const spvColor =
                      item.spv === 'Jane Margareth Widjaja'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : item.spv === 'Muhamad Rimaduddin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <tr key={`${item.spv}-${item.l2}-${item.l1FullName}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">{item.no}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] border ${spvColor}`}>
                            {item.spv}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                            <span>{item.l2}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.l1FullName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                            {item.l1Nickname}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                          {visits > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {visits} visit
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">0 visit</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            Terpetakan
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              if (onSelectSpvGrouping) {
                                onSelectSpvGrouping(item.spv, item.l2, item.l1FullName);
                              } else if (onSelectConsultantTeam) {
                                onSelectConsultantTeam(item.l2, item.l1FullName);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                          >
                            <span>Filter</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredMasterDataTeam.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                Tidak ada data master team yang cocok dengan pencarian "{masterSearchQuery}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Hierarchical Grouping: Supervisor -> L2 -> L1 */}
      {activeTab === 'spvGroup' && (
        <div className="space-y-5">
          {/* Header Info Banner */}
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 text-white shadow-xs">
                <GitFork className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Hirarki Grouping: Supervisor &rarr; L2 (Support Team) &rarr; L1 (Support Utama)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Struktur Lapangan
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Struktur relasi penugasan operasional: <strong>Supervisor (SPV)</strong> memimpin penugasan &bull; <strong>L2 (Line 2 / Support Team)</strong> mendampingi &bull; <strong>L1 (Line 1 / Support Utama)</strong> mengeksekusi kunjungan di outlet.
                </p>
              </div>
            </div>

            {/* Search within hierarchy */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari SPV, L2, atau L1..."
                value={spvSearchQuery}
                onChange={(e) => setSpvSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Supervisor</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{computedSpvGroupings.length}</div>
              <span className="text-[11px] text-slate-400">Aktif tercatat</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Kunjungan</span>
              <div className="text-xl font-bold text-indigo-600 mt-0.5">
                {computedSpvGroupings.reduce((acc, s) => acc + s.totalVisits, 0)}
              </div>
              <span className="text-[11px] text-slate-400">Visit terlaksana</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Duet Bersama L2</span>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">
                {computedSpvGroupings.reduce((acc, s) => acc + s.teamVisits, 0)}
              </div>
              <span className="text-[11px] text-slate-400">Didampingi Support Team</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mandiri (L1 Solo)</span>
              <div className="text-xl font-bold text-amber-600 mt-0.5">
                {computedSpvGroupings.reduce((acc, s) => acc + s.soloVisits, 0)}
              </div>
              <span className="text-[11px] text-slate-400">Tanpa L2 pendamping</span>
            </div>
          </div>

          {/* Cards for each Supervisor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSpvGroupings.map((grp) => {
              const isUnname = grp.supervisor.toLowerCase() === 'unname';
              return (
                <div
                  key={grp.supervisor}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* SPV Card Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isUnname ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supervisor (SPV)</span>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {isUnname ? 'unname (Baris Kosong)' : grp.supervisor}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <span className="text-xs font-bold text-indigo-700">{grp.totalVisits} Visit</span>
                          <div className="text-[10px] text-slate-400">
                            {grp.teamVisits} Tim &bull; {grp.soloVisits} Solo
                          </div>
                        </div>
                        <button
                          onClick={() => onSelectSpvGrouping?.(grp.supervisor)}
                          title="Filter semua kunjungan supervisor ini"
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                        >
                          Filter SPV
                        </button>
                      </div>
                    </div>

                    {/* L2 & L1 Tree Representation */}
                    <div className="mt-3.5 space-y-3">
                      <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Level 2: Support Team Pendamping ({grp.l2Groups.filter(l => !l.isSolo).length} Personil)</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Klik nama untuk filter</span>
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {grp.l2Groups.map((l2) => (
                          <div
                            key={l2.l2Name}
                            className={`p-2.5 rounded-xl border transition-all ${
                              l2.isSolo
                                ? 'bg-slate-50/70 border-slate-200'
                                : 'bg-indigo-50/40 border-indigo-100 hover:border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${l2.isSolo ? 'bg-amber-400' : 'bg-indigo-600'}`} />
                                <button
                                  onClick={() => onSelectSpvGrouping?.(grp.supervisor, l2.isSolo ? undefined : l2.l2Name)}
                                  className="text-xs font-bold text-slate-800 hover:text-indigo-600 cursor-pointer flex items-center space-x-1 text-left"
                                >
                                  <span>{l2.l2Name}</span>
                                  {l2.l2Nickname && !l2.isSolo && (
                                    <span className="text-[10px] font-normal text-indigo-600">({l2.l2Nickname})</span>
                                  )}
                                </button>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-700 shrink-0">
                                {l2.totalVisits} visit
                              </span>
                            </div>

                            {/* L1 Staff under this L2 */}
                            <div className="mt-2 pl-4 border-l-2 border-indigo-200 space-y-1">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Level 1 (Staff Utama L1):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {l2.l1Members.map((l1) => (
                                  <button
                                    key={l1.fullName}
                                    onClick={() => onSelectSpvGrouping?.(grp.supervisor, l2.isSolo ? undefined : l2.l2Name, l1.fullName)}
                                    title={`Klik filter L1: ${l1.fullName}`}
                                    className="px-2 py-0.5 rounded-md text-[11px] bg-white hover:bg-indigo-100 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 transition-all cursor-pointer flex items-center space-x-1 shadow-2xs"
                                  >
                                    <span className="font-semibold">{l1.nickname}</span>
                                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                                      {l1.count}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <SpvL1Analytics
            records={records}
            visibleSupervisors={filteredSpvGroupings.map((group) => group.supervisor)}
            onSelectSpvGrouping={onSelectSpvGrouping}
          />

          {/* Detailed Tabular Matrix: SPV - L2 - L1 */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs mt-4">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Tabel Rinci Matriks Penugasan (Supervisor - L2 - L1)</h4>
                <p className="text-[11px] text-slate-500">Daftar kombinasi penugasan lengkap yang dapat diklik langsung untuk memfilter dashboard</p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/90 text-slate-600 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Supervisor (SPV)</th>
                    <th className="py-2.5 px-3">Level 2: Team Pendamping (L2)</th>
                    <th className="py-2.5 px-3">Level 1: Staff Utama (L1)</th>
                    <th className="py-2.5 px-3 text-right">Total Visit</th>
                    <th className="py-2.5 px-3 text-center">Aksi Filter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSpvGroupings.flatMap((spv) =>
                    spv.l2Groups.flatMap((l2) =>
                      l2.l1Members.map((l1) => (
                        <tr key={`${spv.supervisor}-${l2.l2Name}-${l1.fullName}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {spv.supervisor}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                              l2.isSolo ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {l2.l2Name}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {l1.fullName}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                            {l1.count}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => onSelectSpvGrouping?.(spv.supervisor, l2.isSolo ? undefined : l2.l2Name, l1.fullName)}
                              className="px-2.5 py-1 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer transition-colors"
                            >
                              Filter Kombinasi Ini
                            </button>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 0: Hierarchical Grouping: Nama Konsulting -> Area -> Support Team */}
      {activeTab === 'grouping' && (
        <div className="space-y-5">
          {/* Explanation Header */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600 mt-0.5 sm:mt-0">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Grouping Konsulting &rarr; Area &rarr; Support Team</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Contoh: Airlangga &bull; Bali &bull; Febri, Alfin
                  </span>
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Setiap baris konsulting dikelompokkan dengan area operasional dan daftar support team lapangan yang mendampingi kunjungan.
                </p>
              </div>
            </div>
            <span className="text-xs text-indigo-700 font-mono bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shrink-0 font-bold shadow-2xs">
              {consultantGroupings.length} Grup Konsulting Terdeteksi
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {consultantGroupings.map((grp) => {
              const isUnname = grp.consultant.toLowerCase() === 'unname';
              return (
                <div
                  key={grp.consultant}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    isUnname
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Top Row: Consultant & Area */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Nama Konsulting
                        </span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          {isUnname ? (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              unname (Baris Kosong)
                            </span>
                          ) : (
                            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{grp.consultant}</span>
                            </h4>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Area Utama
                        </span>
                        <div className="flex items-center justify-end space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-700">
                            {grp.primaryArea || 'Tidak Diketahui'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Support Team Members List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-indigo-600" />
                          <span>Support Team Terkait ({grp.supportMembers.length})</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          Total {grp.totalVisits} Visit
                        </span>
                      </div>

                      {grp.supportMembers.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2">
                          Tidak ada support team khusus tercatat
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {grp.supportMembers.map((mem) => (
                            <button
                              key={mem.fullName}
                              onClick={() => onSelectConsultantTeam?.(grp.consultant, mem.fullName)}
                              title={`Klik untuk memfilter: ${mem.fullName} (${mem.count} visit)`}
                              className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
                            >
                              <span className="font-bold text-indigo-700 group-hover:text-amber-800">
                                {mem.nickname}
                              </span>
                              {mem.nickname !== mem.fullName && (
                                <span className="text-[10px] text-slate-500 max-w-[100px] truncate hidden sm:inline">
                                  ({mem.fullName.split(' ')[0]})
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white border border-slate-200 group-hover:bg-indigo-100 text-slate-700 font-bold">
                                {mem.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {grp.allAreas && grp.allAreas.length > 1 ? `Mencakup ${grp.allAreas.join(', ')}` : `Fokus area: ${grp.primaryArea}`}
                    </span>
                    <button
                      onClick={() => onSelectConsultantTeam?.(grp.consultant)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Filter Semua Tim</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Grouping Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden mt-4 bg-white shadow-xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Tabel Matriks Konsulting, Area &amp; Support Team</span>
              <span className="text-[11px] text-slate-500">Dapat diklik untuk memfilter langsung</span>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/90 text-slate-600 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nama Konsulting</th>
                    <th className="py-2.5 px-3">Area</th>
                    <th className="py-2.5 px-3">Daftar Support Team (Nickname &amp; Nama Lengkap)</th>
                    <th className="py-2.5 px-3 text-right">Total Visit</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consultantGroupings.map((grp) => {
                    const isUnname = grp.consultant.toLowerCase() === 'unname';
                    return (
                      <tr key={grp.consultant} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {isUnname ? (
                            <span className="text-slate-400 italic">unname</span>
                          ) : (
                            <span className="text-indigo-700 font-bold">{grp.consultant}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {grp.primaryArea}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {grp.supportMembers.map((m) => (
                              <button
                                key={m.fullName}
                                onClick={() => onSelectConsultantTeam?.(grp.consultant, m.fullName)}
                                className="px-2 py-0.5 rounded text-[11px] bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-200 transition-all cursor-pointer"
                              >
                                <span className="font-bold text-indigo-700">{m.nickname}</span>
                                <span className="text-slate-500 text-[10px] ml-1">({m.count})</span>
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 text-right">
                          {grp.totalVisits}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onSelectConsultantTeam?.(grp.consultant)}
                            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-2xs"
                          >
                            Terapkan Filter
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Date Breakdown (Harian & Bulanan) */}
      {activeTab === 'date' && (
        <div className="space-y-4">
          {/* View Mode Toggle: Harian vs Bulanan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800">
                {dateViewMode === 'daily'
                  ? 'Breakdown Kunjungan Harian (Daily)'
                  : 'Breakdown Kunjungan Bulanan (Monthly)'}
              </span>
              <p className="text-[11px] text-slate-500">
                {dateViewMode === 'daily'
                  ? 'Menampilkan tren kunjungan per hari kalender'
                  : 'Menampilkan akumulasi kunjungan per bulan'}
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-1">
              {/* Chart Type: Line vs Bar */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setDateChartType('line')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    dateChartType === 'line'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grafik Garis (Line Chart)"
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Garis</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDateChartType('bar')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    dateChartType === 'bar'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grafik Batang (Bar Chart)"
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Batang</span>
                </button>
              </div>

              {/* Mode: Harian vs Bulanan */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setDateViewMode('daily')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    dateViewMode === 'daily'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Harian (Daily)
                </button>
                <button
                  type="button"
                  onClick={() => setDateViewMode('monthly')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    dateViewMode === 'monthly'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bulanan (By Month)
                </button>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {dateChartType === 'line' ? (
                <LineChart
                  data={dateViewMode === 'daily' ? dateData : monthData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    angle={dateViewMode === 'daily' ? -45 : 0}
                    textAnchor={dateViewMode === 'daily' ? 'end' : 'middle'}
                  />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="Visits"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    name="Total Visit"
                    dot={{ r: 3.5, fill: '#ffffff', stroke: '#4f46e5', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#4f46e5' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    name="Completed"
                    dot={{ r: 3, fill: '#ffffff', stroke: '#10b981', strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: '#10b981' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Cancelled"
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    name="Cancelled"
                    dot={{ r: 2.5, fill: '#ffffff', stroke: '#f43f5e', strokeWidth: 1.5 }}
                    activeDot={{ r: 4, fill: '#f43f5e' }}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={dateViewMode === 'daily' ? dateData : monthData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    angle={dateViewMode === 'daily' ? -45 : 0}
                    textAnchor={dateViewMode === 'daily' ? 'end' : 'middle'}
                  />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Visits" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Visit" />
                  <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                  <Bar dataKey="Cancelled" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Cancelled" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">{dateViewMode === 'daily' ? 'Tanggal' : 'Bulan'}</th>
                  <th className="py-2 px-3">Visits</th>
                  <th className="py-2 px-3">Completed</th>
                  <th className="py-2 px-3">Cancelled</th>
                  <th className="py-2 px-3">Rata-rata Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dateViewMode === 'daily' ? dateData : monthData).map((d) => (
                  <tr key={d.name} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-mono font-medium text-slate-900">{d.name}</td>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-700">{d.Visits}</td>
                    <td className="py-2 px-3 font-mono text-emerald-700 font-semibold">{d.Completed}</td>
                    <td className="py-2 px-3 font-mono text-rose-700">{d.Cancelled}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{d.AvgDurationFormatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Area Breakdown */}
      {activeTab === 'area' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="Visits" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Total Visit" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Area</th>
                  <th className="py-2 px-3">Visits</th>
                  <th className="py-2 px-3">% Total</th>
                  <th className="py-2 px-3">Rata-rata Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {areaData.map((a) => {
                  const total = areaData.reduce((acc, curr) => acc + curr.Visits, 0);
                  const pct = total > 0 ? Math.round((a.Visits / total) * 100) : 0;
                  return (
                    <tr key={a.name} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-semibold text-slate-900">{a.name}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{a.Visits}</td>
                      <td className="py-2 px-3 font-mono">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{a.AvgDuration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Supervisor Breakdown (Mandatory 'unname' displayed for empty rows) */}
      {activeTab === 'spv' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spvData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Visits" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Total Visit" />
                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Supervisor</th>
                  <th className="py-2 px-3">Visits</th>
                  <th className="py-2 px-3">Completed</th>
                  <th className="py-2 px-3">Rata-rata Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spvData.map((s) => {
                  const isUnname = s.name.toLowerCase() === 'unname';
                  return (
                    <tr key={s.name} className={`hover:bg-slate-50/80 ${isUnname ? 'bg-amber-50/40' : ''}`}>
                      <td className="py-2 px-3 font-semibold text-slate-900 flex items-center space-x-2">
                        {isUnname ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            unname (Baris Kosong)
                          </span>
                        ) : (
                          <span>{s.name}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-purple-700">{s.Visits}</td>
                      <td className="py-2 px-3 font-mono text-emerald-700 font-semibold">{s.Completed}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{s.AvgDuration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Nama Konsulting Breakdown (with 'unname' displayed for empty rows) */}
      {activeTab === 'consultant' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consultantData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Visits" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Total Visit" />
                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Nama Konsulting</th>
                  <th className="py-2 px-3">Visits</th>
                  <th className="py-2 px-3">Completed</th>
                  <th className="py-2 px-3">Rata-rata Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consultantData.map((c) => {
                  const isUnname = c.name.toLowerCase() === 'unname';
                  return (
                    <tr key={c.name} className={`hover:bg-slate-50/80 ${isUnname ? 'bg-slate-50' : ''}`}>
                      <td className="py-2 px-3 font-semibold text-slate-900 flex items-center space-x-2">
                        {isUnname ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            unname (Baris Kosong)
                          </span>
                        ) : (
                          <span className="text-cyan-800 font-bold">{c.name}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-cyan-700">{c.Visits}</td>
                      <td className="py-2 px-3 font-mono text-emerald-700 font-semibold">{c.Completed}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{c.AvgDuration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Book Type Breakdown */}
      {activeTab === 'bookType' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {bookTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Book Type</th>
                  <th className="py-2 px-3">Visits</th>
                  <th className="py-2 px-3">Completed</th>
                  <th className="py-2 px-3">Rata-rata Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookTypeData.map((bt, idx) => (
                  <tr key={bt.name} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-medium text-slate-900 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span>{bt.name}</span>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">{bt.value}</td>
                    <td className="py-2 px-3 font-mono text-emerald-700 font-semibold">{bt.Completed}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{bt.AvgDuration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Support & Support Team Breakdown */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supportData.slice(0, 10)} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Visits" fill="#6366f1" radius={[0, 4, 4, 0]} name="Total Visit" />
                  <Bar dataKey="WithTeam" fill="#ec4899" radius={[0, 4, 4, 0]} name="Ada Support Team (Line 2)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Nama Support (Utama)</th>
                    <th className="py-2 px-3">Total Visit</th>
                    <th className="py-2 px-3">Solo</th>
                    <th className="py-2 px-3">Ditemani Team</th>
                    <th className="py-2 px-3">Rata-rata Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supportData.map((s) => (
                    <tr key={s.name} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700">{s.Visits}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{s.Solo}</td>
                      <td className="py-2 px-3 font-mono">
                        {s.WithTeam > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                            {s.WithTeam} visit
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">{s.AvgDuration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

