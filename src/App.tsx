import React, { useState, useMemo, useEffect } from 'react';
import { DEFAULT_RAW_CSV } from './data/rawCsv';
import { buildTeamRoster, DEFAULT_COLUMN_MAPPING, parseCsvString, processRawData, resolveColumnMapping, buildConsultantTeamGroupings, isSameSupportMember, getAvailableMonthsFromRecords, isIncludedDashboardVisit } from './utils/dataProcessor';
import { ColumnMapping, FilterState, ProcessedRecord, RawDataRow, ConsultantGrouping } from './types';
import { displayTeamName } from './utils/teamDirectory';
import { WorksheetDashboard } from './components/WorksheetDashboard';
import { Navbar } from './components/Navbar';
import { ModernSidebar, type DashboardTab } from './components/ModernSidebar';
import { FilterBar } from './components/FilterBar';
import { OutletVisitSummary } from './components/OutletVisitSummary';
import { SummaryCards } from './components/SummaryCards';
import { DailyVisitTrendChart } from './components/DailyVisitTrendChart';
import { PlannedVsActualBarChart } from './components/PlannedVsActualBarChart';
import { BreakdownSection } from './components/BreakdownSection';
import { MonthlyView } from './components/MonthlyView';
import { VisitCheckDashboard } from './components/VisitCheckDashboard';
import { OkrCalculator } from './components/OkrCalculator';
import { VisitTable } from './components/VisitTable';
import { VisitQualityInsights } from './components/VisitQualityInsights';
import { AIInsightPanel } from './components/AIInsightPanel';
import { ColumnMapperModal } from './components/ColumnMapperModal';
import { UploadModal } from './components/UploadModal';
import { OmniSyncModal } from './components/OmniSyncModal';
import type { OmniSyncDataset } from './utils/omniSync';
import { MultiSupportModal } from './components/MultiSupportModal';
import { ShareModal } from './components/ShareModal';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [selectedWorksheet, setSelectedWorksheet] = useState('visit');
  const [teamMasterRows, setTeamMasterRows] = useState<RawDataRow[]>((window as any).__CUSTOM_TEAM_MASTER__ || []);
  const [teamMasterError, setTeamMasterError] = useState('');
  useEffect(() => {
    if (window.location.protocol === 'file:') return;
    const controller = new AbortController();
    fetch('/api/worksheets?sheet=team', {signal:controller.signal})
      .then(async response => { if (!response.ok) throw new Error('Team Master belum dapat dimuat; nama filter memakai mapping yang tersedia.'); return response.json(); })
      .then(data => { if (!Array.isArray(data.records) || !data.records.length) throw new Error('Team Master kosong.'); setTeamMasterRows(data.records); })
      .catch(error => { if (!controller.signal.aborted) setTeamMasterError(error.message); });
    return () => controller.abort();
  }, []);
  const teamRoster = useMemo(() => buildTeamRoster(teamMasterRows), [teamMasterRows]);
  const nameFromTeamMaster = (value: string) => displayTeamName(value, teamMasterRows);
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
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Modals state
  const [isColumnMapperOpen, setIsColumnMapperOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isOmniSyncOpen, setIsOmniSyncOpen] = useState<boolean>(false);
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
  const reportRecords: ProcessedRecord[] = useMemo(() => processRawData(rawData, mapping, teamRoster), [rawData, mapping, teamRoster]);
  const allRecords: ProcessedRecord[] = useMemo(() => reportRecords.filter(isIncludedDashboardVisit), [reportRecords]);

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
    return buildConsultantTeamGroupings(allRecords, teamRoster);
  }, [allRecords, teamRoster]);

  // Available months from all records
  const availableMonths = useMemo(() => {
    return getAvailableMonthsFromRecords(allRecords);
  }, [allRecords]);

  function findSearchedConsultant(search: string) {
    const query = search.trim().toLowerCase();
    if (!query) return '';
    const matches = availableConsultants.filter(name => name !== 'unname' && name.toLowerCase().includes(query));
    return matches.find(name => name.toLowerCase() === query) ?? (matches.length === 1 ? matches[0] : '');
  }

  const consultantSearch = findSearchedConsultant(filters.search);
  const effectiveFilters = useMemo(() => consultantSearch && !filters.consultants.length
    ? { ...filters, consultants: [consultantSearch] }
    : filters, [consultantSearch, filters]);

  // Run the same filter predicate for visit totals and team-person counts.
  const filterRecords = (activeFilters: FilterState): ProcessedRecord[] => {
    return allRecords.filter((rec) => {
      // 1. Search
      if (activeFilters.search) {
        const q = activeFilters.search.trim().toLowerCase();
        const match = consultantSearch
          ? rec.consultantName === consultantSearch
          : rec.outletName.toLowerCase().includes(q) ||
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
          return participants.some((person) => isSameSupportMember(person, cleanTarget, teamRoster));
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

  const filteredRecords = useMemo(() => filterRecords(effectiveFilters), [allRecords, effectiveFilters]);
  // Counts stay scoped to the current consultant, dates, area and book type,
  // but ignore an already-selected visitor so other options remain stable.
  const teamCountRecords = useMemo(
    () => filterRecords({ ...effectiveFilters, supportTeamMembers: [], selectedSupportTeam: '' }),
    [allRecords, effectiveFilters]
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
    setFilters(prev => {
      const next = { ...prev, ...partial };
      if (partial.search !== undefined && (consultantSearch || findSearchedConsultant(partial.search))) {
        next.consultants = [];
        next.supportTeamMembers = [];
        next.selectedSupportTeam = '';
      }
      if (consultantSearch && partial.consultants) {
        if (partial.consultants[0] !== consultantSearch) next.search = '';
        else if (!prev.consultants.length && partial.supportTeamMembers?.length) next.consultants = [];
      }
      return next;
    });
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

  const handleWorksheetSelect = (id: string) => {
    setSelectedWorksheet(id);
  };

  const handleWorksheetVisitLoaded = (newData: RawDataRow[], newHeaders: string[]) => {
    setRawData(newData);
    setHeaders(newHeaders);
    setMapping(resolveColumnMapping(newHeaders));
  };

  // Omni payload is only accepted after endpoint + schema validation and user review.
  // All other existing processing, exclusion rules and KPI calculations stay intact.
  const handleOmniDataLoaded = (dataset: OmniSyncDataset) => {
    setRawData(dataset.data);
    setHeaders(dataset.headers);
    setMapping(resolveColumnMapping(dataset.headers));
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
    window.__CUSTOM_TEAM_MASTER__ = ${JSON.stringify(teamMasterRows).replace(/</g, '\\u003c')};
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
      <ModernSidebar activeTab={activeTab} selectedWorksheet={selectedWorksheet} onSelectWorksheet={handleWorksheetSelect} onSelect={setActiveTab} />

      {/* Top Navigation */}
      {selectedWorksheet === 'visit' && <Navbar
        onOpenColumnMapper={() => setIsColumnMapperOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenOmniSync={() => setIsOmniSyncOpen(true)}
        onResetData={handleResetToDefault}
        onExportCsv={handleExportCsv}
        onDownloadSingleHtml={handleDownloadSingleHtml}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />}

      {/* Main Container */}
      <main className="modern-main flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <WorksheetDashboard selected={selectedWorksheet} onSelect={handleWorksheetSelect} onVisitLoaded={handleWorksheetVisitLoaded} visits={allRecords} omniVisits={reportRecords} teamMasterRows={teamMasterRows} onTeamLoaded={rows => { setTeamMasterRows(rows); setTeamMasterError(''); }} />
        {selectedWorksheet === 'visit' && <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Ringkasan kunjungan mengikuti filter di bawah.</p>
          <button type="button" onClick={() => setIsAIInsightOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800">
            <Sparkles className="h-4 w-4" /> AI Insight
          </button>
        </div>

        {teamMasterError && <p role="status" className="text-xs text-amber-700">{teamMasterError}</p>}
        {/* Global Filter Bar */}
        <FilterBar
          displayName={nameFromTeamMaster}
          roster={teamRoster}
          filters={effectiveFilters}
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

        {activeTab === 'overview' && (
          <SummaryCards
            records={filteredRecords}
            uniqueVisitsCount={uniqueVisitsCount}
            deduplicateEnabled={filters.deduplicateVisits}
            onOpenMultiSupportDetails={() => setIsMultiSupportOpen(true)}
          />
        )}
        {activeTab === 'outlets' && <OutletVisitSummary records={filteredRecords} />}
        {activeTab === 'trend' && (
          <DailyVisitTrendChart records={filteredRecords} deduplicateEnabled={filters.deduplicateVisits}
            dateRangeStart={filters.dateRangeStart} dateRangeEnd={filters.dateRangeEnd} />
        )}
        {activeTab === 'planned' && (
          <PlannedVsActualBarChart records={filteredRecords} deduplicateEnabled={filters.deduplicateVisits}
            dateRangeStart={filters.dateRangeStart} dateRangeEnd={filters.dateRangeEnd} />
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
            roster={teamRoster}
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

        {activeTab === 'check-in' && <VisitCheckDashboard records={filteredRecords} mode="check-in" />}
        {activeTab === 'check-out' && <VisitCheckDashboard records={filteredRecords} mode="check-out" />}
        {activeTab === 'okr' && <OkrCalculator />}

        {activeTab === 'table' && (
          <VisitTable records={filteredRecords} deduplicateEnabled={filters.deduplicateVisits} />
        )}

        {activeTab === 'quality' && (
          <VisitQualityInsights records={filteredRecords} />
        )}
        </>}
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

      <OmniSyncModal
        isOpen={isOmniSyncOpen}
        onClose={() => setIsOmniSyncOpen(false)}
        onApply={handleOmniDataLoaded}
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
