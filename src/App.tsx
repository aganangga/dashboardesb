import React, { useState, useMemo } from 'react';
import { DEFAULT_RAW_CSV } from './data/rawCsv';
import { DEFAULT_COLUMN_MAPPING, parseCsvString, processRawData, resolveColumnMapping, buildConsultantTeamGroupings, isSameSupportMember, getAvailableMonthsFromRecords, isIncludedDashboardVisit } from './utils/dataProcessor';
import { ColumnMapping, FilterState, ProcessedRecord, RawDataRow, ConsultantGrouping } from './types';
import { Navbar } from './components/Navbar';
import { ModernSidebar } from './components/ModernSidebar';
import { FilterBar } from './components/FilterBar';
import { SummaryCards } from './components/SummaryCards';
import { DailyVisitTrendChart } from './components/DailyVisitTrendChart';
import { PlannedVsActualBarChart } from './components/PlannedVsActualBarChart';
import { BreakdownSection } from './components/BreakdownSection';
import { MonthlyView } from './components/MonthlyView';
import { CheckInOutComparison } from './components/CheckInOutComparison';
import { VisitTable } from './components/VisitTable';
import { CSATDashboard } from './components/CSATDashboard';
import { AIInsightPanel } from './components/AIInsightPanel';
import { ColumnMapperModal } from './components/ColumnMapperModal';
import { UploadModal } from './components/UploadModal';
import { MultiSupportModal } from './components/MultiSupportModal';
import { ShareModal } from './components/ShareModal';
import { SlidersHorizontal, Layers, Clock, Table, BarChart2, CheckCircle2, Calendar, Share2, Sparkles } from 'lucide-react';

export default function App() {
  // Parse initial dataset (or load pre-injected custom data if running inside downloaded singlefile HTML)
  const initialParsed = useMemo(() => {
    const customData = (window as any).__CUSTOM_INITIAL_DATA__;
    const customHeaders = (window as any).__CUSTOM_INITIAL_HEADERS__;
    if (customData && customHeaders) {
      return { data: customData, headers: customHeaders };
    }
    return parseCsvString(DEFAULT_RAW_CSV);
  }, []);

  const [rawData, setRawData] = useState<RawDataRow[]>(initialParsed.data);
  const [headers, setHeaders] = useState<string[]>(initialParsed.headers);
  const [mapping, setMapping] = useState<ColumnMapping>(
    (window as any).__CUSTOM_INITIAL_MAPPING__ || resolveColumnMapping(initialParsed.headers)
  );

  // Active view tab: 'overview' | 'monthly' | 'breakdowns' | 'comparison' | 'table'
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'breakdowns' | 'comparison' | 'table' | 'csat'>('overview');

  // Modals state
  const [isColumnMapperOpen, setIsColumnMapperOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isMultiSupportOpen, setIsMultiSupportOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isAIInsightOpen, setIsAIInsightOpen] = useState<boolean>(false);

  // Filters state (deduplication enabled by default as requested)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    dateRangeStart: '2026-08-01',
    dateRangeEnd: '',
    areas: [],
    supervisors: [],
    consultants: [],
    bookTypes: [],
    statuses: [],
    visitTypes: [],
    durationCategories: [],
    punctualityFilter: '',
    teamSizeFilter: 'all',
    supportTeamFilter: 'all',
    supportTeamMembers: [],
    deduplicateVisits: true, // Primary key: tiket ID + date visit = total visit
  });

  // Process data with active column mapping
  const allRecords: ProcessedRecord[] = useMemo(() => {
    return processRawData(rawData, mapping).filter(isIncludedDashboardVisit);
  }, [rawData, mapping]);

  // Unique filter dropdown options derived from processed records
  const availableSupervisors = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => set.add(r.supervisor));
    return Array.from(set).sort();
  }, [allRecords]);

  const availableConsultants = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => set.add(r.consultantName));
    return Array.from(set).sort();
  }, [allRecords]);

  const availableSupportTeams = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      r.supportTeamList.forEach((m) => {
        if (m && m.trim()) set.add(m.trim());
      });
    });
    return Array.from(set).sort();
  }, [allRecords]);

  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => set.add(r.area));
    return Array.from(set).sort();
  }, [allRecords]);

  const availableBookTypes = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => set.add(r.bookType));
    return Array.from(set).sort();
  }, [allRecords]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => set.add(r.status));
    return Array.from(set).sort();
  }, [allRecords]);

  // Structured hierarchical grouping: Nama Consulting -> Area -> Support Team
  const consultantGroupings = useMemo(() => {
    return buildConsultantTeamGroupings(allRecords);
  }, [allRecords]);

  // Available months from all records
  const availableMonths = useMemo(() => {
    return getAvailableMonthsFromRecords(allRecords);
  }, [allRecords]);

  // Run the same filter predicate for visit totals and team-person counts.
  const filterRecords = (activeFilters: FilterState): ProcessedRecord[] => {
    return allRecords.filter((rec) => {
      // 1. Search
      if (activeFilters.search) {
        const q = activeFilters.search.toLowerCase();
        const match =
          rec.outletName.toLowerCase().includes(q) ||
          rec.supportName.toLowerCase().includes(q) ||
          rec.supportTeam.toLowerCase().includes(q) ||
          rec.supportTeamList.some((p) => p.toLowerCase().includes(q)) ||
          rec.supervisor.toLowerCase().includes(q) ||
          rec.consultantName.toLowerCase().includes(q) ||
          rec.ticketId.toLowerCase().includes(q) ||
          rec.area.toLowerCase().includes(q) ||
          rec.outletAddress.toLowerCase().includes(q) ||
          rec.title.toLowerCase().includes(q) ||
          rec.meetingParticipantsList.some((p) => p.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 2. Supervisor
      if (activeFilters.supervisors && activeFilters.supervisors.length > 0) {
        if (!activeFilters.supervisors.includes(rec.supervisor)) return false;
      }

      // 3. Consultant ownership follows the raw Consultant column (or a uniquely verified mapping).
      // Never exclude a valid visit only because a different team's support carried it out.
      if (activeFilters.consultants.length > 0 &&
          !activeFilters.consultants.some((cons) => rec.consultantName.toLowerCase() === cons.toLowerCase())) {
        return false;
      }

      // 4. Area
      if (activeFilters.areas.length > 0) {
        if (!activeFilters.areas.includes(rec.area)) return false;
      }

      // 5. Book Type
      if (activeFilters.bookTypes.length > 0) {
        if (!activeFilters.bookTypes.includes(rec.bookType)) return false;
      }

      // 6. Status
      if (activeFilters.statuses.length > 0) {
        if (!activeFilters.statuses.includes(rec.status)) return false;
      }

      // 7. Support Team Filter (Pengganti Team Support Tiket sebelumnya)
      if (activeFilters.supportTeamFilter === 'with_team') {
        if (!rec.hasSupportTeam) return false;
      } else if (activeFilters.supportTeamFilter === 'solo') {
        if (rec.hasSupportTeam) return false;
      }

      // Specific Support Team Members or Grouping Filter
      if (activeFilters.supportTeamMembers && activeFilters.supportTeamMembers.length > 0) {
        const matchesMember = activeFilters.supportTeamMembers.some((mem) => {
          if (!mem) return true;
          if (mem.startsWith('CONS_ALL:')) {
            const targetConsultant = mem.replace('CONS_ALL:', '').toLowerCase();
            return rec.consultantName.toLowerCase() === targetConsultant;
          }
          let cleanTarget = mem.trim();
          if (cleanTarget.startsWith('AUTO:')) {
            cleanTarget = cleanTarget.split(':')[2] || cleanTarget;
          } else if (cleanTarget.startsWith('MEMBER:')) {
            const parts = cleanTarget.split(':');
            cleanTarget = parts[2] || cleanTarget;
          }
          const participants = [
            rec.supportName,
            ...rec.supportTeamList,
            ...rec.teamParticipants,
            ...rec.jointSupportNames,
          ];
          return participants.some((person) => isSameSupportMember(person, cleanTarget));
        });
        if (!matchesMember) return false;
      }

      // 8. Legacy team size filter compatibility
      if (activeFilters.teamSizeFilter === 'solo') {
        if (rec.teamSize !== 1 && !rec.hasSupportTeam) return false;
      } else if (activeFilters.teamSizeFilter === 'team_multi') {
        if (rec.teamSize < 2 && !rec.hasSupportTeam) return false;
      } else if (activeFilters.teamSizeFilter === 'team_3') {
        if (rec.teamSize < 3) return false;
      }

      // 9. Date range and monthly filter (compared against rec.agendaDateObj)
      if (activeFilters.selectedMonth) {
        if (!rec.agendaDateObj) return false;
        const y = rec.agendaDateObj.getFullYear();
        const m = String(rec.agendaDateObj.getMonth() + 1).padStart(2, '0');
        if (`${y}-${m}` !== activeFilters.selectedMonth) return false;
      } else if (activeFilters.dateRangeStart || activeFilters.dateRangeEnd) {
        if (!rec.agendaDateObj) return false;
        const recTime = rec.agendaDateObj.getTime();
        if (activeFilters.dateRangeStart) {
          const startTime = new Date(activeFilters.dateRangeStart).getTime();
          if (recTime < startTime) return false;
        }
        if (activeFilters.dateRangeEnd) {
          // end of day
          const endTime = new Date(`${activeFilters.dateRangeEnd}T23:59:59`).getTime();
          if (recTime > endTime) return false;
        }
      }

      return true;
    });

  };

  const filteredRecords = useMemo(() => filterRecords(filters), [allRecords, filters]);
  // Counts stay scoped to the current consultant, dates, area and book type,
  // but ignore an already-selected visitor so other options remain stable.
  const teamCountRecords = useMemo(
    () => filterRecords({ ...filters, supportTeamMembers: [], selectedSupportTeam: '' }),
    [allRecords, filters]
  );

  // Calculate unique visits count (Total Visit) based on Primary Key: Tiket ID + Date Visit
  const uniqueVisitsCount = useMemo(() => {
    const uniqueKeys = new Set<string>();
    filteredRecords.forEach((r) => {
      uniqueKeys.add(r.primaryVisitKey);
    });
    return uniqueKeys.size;
  }, [filteredRecords]);

  // Calculate count of visits with Support Team
  const supportTeamVisitsCount = useMemo(() => {
    const keys = new Set<string>();
    filteredRecords.forEach((r) => {
      if (r.hasSupportTeam) {
        keys.add(r.primaryVisitKey);
      }
    });
    return keys.size;
  }, [filteredRecords]);

  // Handler for partial filter updates
  const handleFilterChange = (partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      dateRangeStart: '2026-08-01',
      dateRangeEnd: '',
      selectedMonth: '',
      areas: [],
      supervisors: [],
      consultants: [],
      bookTypes: [],
      statuses: [],
      visitTypes: [],
      durationCategories: [],
      punctualityFilter: '',
      teamSizeFilter: 'all',
      supportTeamFilter: 'all',
      supportTeamMembers: [],
      selectedSupportTeam: '',
      deduplicateVisits: true,
    });
  };

  // Handler when a new CSV file is uploaded
  const handleDataLoaded = (newData: RawDataRow[], newHeaders: string[]) => {
    setRawData(newData);
    setHeaders(newHeaders);
    // Open column mapper automatically so user can inspect or adjust their specific data columns
    setIsColumnMapperOpen(true);
  };

  const handleResetToDefault = () => {
    const defaultParsed = parseCsvString(DEFAULT_RAW_CSV);
    setRawData(defaultParsed.data);
    setHeaders(defaultParsed.headers);
    setMapping(DEFAULT_COLUMN_MAPPING);
    handleResetFilters();
  };

  // Export filtered records to CSV
  const handleExportCsv = () => {
    const countable = filters.deduplicateVisits
      ? filteredRecords.filter((r) => !r.isDuplicateOnSameDay)
      : filteredRecords;

    const headersList = [
      'Ticket ID',
      'Nama Outlet',
      'Tanggal Agenda',
      'Area',
      'Supervisor',
      'Support Bertugas',
      'Book Type',
      'Check In Time',
      'Check Out Time',
      'Durasi Menit',
      'Durasi Format',
      'Status',
    ];

    const rows = countable.map((r) => [
      `"${r.ticketId}"`,
      `"${r.outletName.replace(/"/g, '""')}"`,
      `"${r.agendaDate}"`,
      `"${r.area}"`,
      `"${r.supervisor}"`,
      `"${r.supportName}"`,
      `"${r.bookType}"`,
      `"${r.checkInTime || '-'}"`,
      `"${r.checkOutTime || '-'}"`,
      `"${r.durationMinutes || 0}"`,
      `"${r.durationFormatted}"`,
      `"${r.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headersList.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Visit_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export standalone single-file HTML for offline usage
  const handleDownloadSingleHtml = async () => {
    try {
      const response = await fetch('/api/download-singlefile');
      if (response.ok) {
        let htmlContent = await response.text();

        // Inject active data and column mapping so the offline file starts with the current state
        const injection = `
  <script id="__custom_initial_state__">
    window.__CUSTOM_INITIAL_DATA__ = ${JSON.stringify(rawData)};
    window.__CUSTOM_INITIAL_HEADERS__ = ${JSON.stringify(headers)};
    window.__CUSTOM_INITIAL_MAPPING__ = ${JSON.stringify(mapping)};
  </script>
`;
        if (htmlContent.includes('</body>')) {
          htmlContent = htmlContent.replace('</body>', `${injection}</body>`);
        } else {
          htmlContent += injection;
        }

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-monitoring-visit-offline-${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Gagal mengambil file HTML mandiri.');
      }
    } catch (err: any) {
      alert('Gagal mengunduh file HTML mandiri: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  return (
    <div className="modern-shell min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <ModernSidebar activeTab={activeTab} onSelect={setActiveTab} />

      {/* Top Navigation */}
      <Navbar
        totalRecords={rawData.length}
        uniqueVisits={uniqueVisitsCount}
        deduplicateEnabled={filters.deduplicateVisits}
        onOpenColumnMapper={() => setIsColumnMapperOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onResetData={handleResetToDefault}
        onExportCsv={handleExportCsv}
        onDownloadSingleHtml={handleDownloadSingleHtml}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Main Container */}
      <main className="modern-main flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner with user options callout */}
        <div className="modern-welcome bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 border border-indigo-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                Aturan Khusus Terpasang
              </span>
              <span className="text-xs text-slate-500">Data ter-update secara interaktif</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Primary Key: Tiket ID + Date Visit (Total Visit) &bull; Separator Support Team (Line 2) &bull; Master Data Team (SPV - L2 - L1)
            </h2>
            <p className="text-xs text-slate-600">
              Total Visit riil dihitung berdasarkan Tiket ID + Tanggal Visit. Mapping seluruh tim operasional tersinkronisasi per SPV &rarr; L2 &rarr; L1 tanpa missing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAIInsightOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 flex items-center gap-1.5 shadow-2xs"
              title="Analisis agregat sesuai filter dashboard"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Insight</span>
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Buka URL publik dan panduan akses tim"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Link Publik</span>
            </button>
            <button
              onClick={() => setIsColumnMapperOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sesuaikan Kolom Data</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          availableSupervisors={availableSupervisors}
          availableConsultants={availableConsultants}
          availableSupportTeams={availableSupportTeams}
          availableAreas={availableAreas}
          availableBookTypes={availableBookTypes}
          availableStatuses={availableStatuses}
          availableMonths={availableMonths}
          consultantGroupings={consultantGroupings}
          teamCountRecords={teamCountRecords}
          totalFilteredRecords={filteredRecords.length}
          totalFilteredVisits={uniqueVisitsCount}
          supportTeamVisitsCount={supportTeamVisitsCount}
        />

        {/* Top Summary Metrics */}
        <SummaryCards
          records={filteredRecords}
          uniqueVisitsCount={uniqueVisitsCount}
          deduplicateEnabled={filters.deduplicateVisits}
          onOpenMultiSupportDetails={() => setIsMultiSupportOpen(true)}
        />

        {/* View Switcher Tabs */}
        <div className="modern-view-switcher flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="modern-tab-buttons flex bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ringkasan Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'monthly' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tampilan Bulanan (By Month)</span>
            </button>
            <button
              onClick={() => setActiveTab('breakdowns')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'breakdowns' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Breakdown (Date, Area, SPV, Book, Grouping)</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'comparison' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Komparasi Check In - Out &amp; Durasi</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Rincian Data</span>
            </button>
            <button
              onClick={() => setActiveTab('csat')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'csat' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CSAT · Penilaian Client</span>
            </button>
          </div>

          <button
            onClick={() => setIsMultiSupportOpen(true)}
            className="text-xs text-amber-700 hover:text-amber-800 underline font-medium flex items-center space-x-1 cursor-pointer"
          >
            <span>Lihat Kasus Multi-Support Outlet</span>
          </button>
        </div>

        {/* Content sections based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Grafik Garis Tren Kunjungan Harian (Daily Visit Trend Line Chart) */}
            <DailyVisitTrendChart
              records={filteredRecords}
              deduplicateEnabled={filters.deduplicateVisits}
              dateRangeStart={filters.dateRangeStart}
              dateRangeEnd={filters.dateRangeEnd}
            />

            {/* Grafik Batang Perbandingan Planned Visits vs Actual Visits */}
            <PlannedVsActualBarChart
              records={filteredRecords}
              deduplicateEnabled={filters.deduplicateVisits}
              dateRangeStart={filters.dateRangeStart}
              dateRangeEnd={filters.dateRangeEnd}
            />

            {/* 1. Breakdowns */}
            <BreakdownSection
              records={filteredRecords}
              deduplicateEnabled={filters.deduplicateVisits}
              consultantGroupings={consultantGroupings}
              selectedConsultant={filters.consultants[0] || ''}
              onSelectConsultantTeam={(cons, member) => {
                if (member) {
                  setFilters((prev) => ({
                    ...prev,
                    consultants: [cons],
                    supportTeamMembers: [member],
                    selectedSupportTeam: `MEMBER:${cons}:${member}`,
                  }));
                } else {
                  setFilters((prev) => ({
                    ...prev,
                    consultants: [cons],
                    supportTeamMembers: [`CONS_ALL:${cons}`],
                    selectedSupportTeam: `CONS_ALL:${cons}`,
                  }));
                }
              }}
            />

            {/* 2. Tempat Khusus Komparasi Check In - Check Out */}
            <CheckInOutComparison records={filteredRecords} />

            {/* 3. Data Table */}
            <VisitTable records={filteredRecords} deduplicateEnabled={filters.deduplicateVisits} />
          </div>
        )}

        {/* Dedicated Monthly View (Tampilan By Month) */}
        {activeTab === 'monthly' && (
          <MonthlyView
            records={filteredRecords}
            allRecords={allRecords}
            deduplicateEnabled={filters.deduplicateVisits}
            consultantGroupings={consultantGroupings}
            onApplyMonthFilter={(startDate, endDate, monthKey) => {
              setFilters((prev) => ({
                ...prev,
                dateRangeStart: startDate,
                dateRangeEnd: endDate,
                selectedMonth: monthKey,
              }));
            }}
            onSelectConsultantTeam={(cons, member) => {
              if (member) {
                setFilters((prev) => ({
                  ...prev,
                  consultants: [cons],
                  supportTeamMembers: [member],
                  selectedSupportTeam: `MEMBER:${cons}:${member}`,
                }));
              } else {
                setFilters((prev) => ({
                  ...prev,
                  consultants: [cons],
                  supportTeamMembers: [`CONS_ALL:${cons}`],
                  selectedSupportTeam: `CONS_ALL:${cons}`,
                }));
              }
            }}
          />
        )}

        {activeTab === 'breakdowns' && (
          <BreakdownSection
            records={filteredRecords}
            deduplicateEnabled={filters.deduplicateVisits}
            consultantGroupings={consultantGroupings}
            selectedConsultant={filters.consultants[0] || ''}
            onSelectConsultantTeam={(cons, member) => {
              if (member) {
                setFilters((prev) => ({
                  ...prev,
                  consultants: [cons],
                  supportTeamMembers: [member],
                  selectedSupportTeam: `MEMBER:${cons}:${member}`,
                }));
              } else {
                setFilters((prev) => ({
                  ...prev,
                  consultants: [cons],
                  supportTeamMembers: [`CONS_ALL:${cons}`],
                  selectedSupportTeam: `CONS_ALL:${cons}`,
                }));
              }
            }}
            onSelectSpvGrouping={(spv, l2, l1) => {
              setFilters((prev) => {
                const next = { ...prev };
                if (spv) {
                  next.supervisors = [spv];
                }
                if (l1) {
                  next.supportTeamMembers = [l1];
                } else if (l2) {
                  next.supportTeamMembers = [l2];
                }
                return next;
              });
            }}
          />
        )}

        {activeTab === 'comparison' && (
          <CheckInOutComparison records={filteredRecords} />
        )}

        {activeTab === 'table' && (
          <VisitTable records={filteredRecords} deduplicateEnabled={filters.deduplicateVisits} />
        )}

        {activeTab === 'csat' && (
          <CSATDashboard records={allRecords} filters={filters} />
        )}
      </main>

      {/* Modals */}
      <ColumnMapperModal
        isOpen={isColumnMapperOpen}
        onClose={() => setIsColumnMapperOpen(false)}
        currentMapping={mapping}
        availableHeaders={headers}
        sampleData={rawData}
        onApplyMapping={(newMapping) => setMapping(newMapping)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDataLoaded={handleDataLoaded}
      />

      <MultiSupportModal
        isOpen={isMultiSupportOpen}
        onClose={() => setIsMultiSupportOpen(false)}
        records={filteredRecords}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onDownloadHtml={handleDownloadSingleHtml}
      />

      <AIInsightPanel isOpen={isAIInsightOpen} onClose={() => setIsAIInsightOpen(false)} records={filteredRecords} />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>Field Operations &amp; Visit Analytics Dashboard &bull; Penyesuaian Kolom &amp; Deduplikasi Visit Terintegrasi</p>
      </footer>
    </div>
  );
}
