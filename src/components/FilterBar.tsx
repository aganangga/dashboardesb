import React from 'react';
import { FilterState, ConsultantGrouping, DedicatedSupportMember } from '../types';
import {
  Search,
  Calendar,
  RotateCcw,
  CheckSquare,
  Square,
  Users,
  Briefcase,
  MapPin,
  Check,
  Sparkles,
  UserCheck,
  ChevronDown,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  User,
} from 'lucide-react';
import {
  getDedicatedSupportTeamsForConsultant,
  findConsultantForSupportMember,
  CONSULTANT_DEDICATED_TEAMS,
  AvailableMonthInfo,
} from '../utils/dataProcessor';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  availableSupervisors: string[];
  availableConsultants: string[];
  availableSupportTeams: string[];
  availableAreas: string[];
  availableBookTypes: string[];
  availableStatuses: string[];
  availableMonths?: AvailableMonthInfo[];
  consultantGroupings?: ConsultantGrouping[];
  totalFilteredRecords: number;
  totalFilteredVisits: number;
  supportTeamVisitsCount: number;
}

type TeamSortOption = 'visit_desc' | 'visit_asc' | 'name_asc' | 'name_desc';

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableSupervisors,
  availableConsultants,
  availableAreas,
  availableBookTypes,
  availableMonths = [],
  consultantGroupings = [],
  totalFilteredRecords,
  totalFilteredVisits,
  supportTeamVisitsCount,
}) => {
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = React.useState(false);
  const [teamSortBy, setTeamSortBy] = React.useState<TeamSortOption>('visit_desc');
  const [teamSearchQuery, setTeamSearchQuery] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
    }
    if (isTeamDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTeamDropdownOpen]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.dateRangeStart !== '' ||
    filters.dateRangeEnd !== '' ||
    filters.supervisors.length > 0 ||
    filters.consultants.length > 0 ||
    filters.areas.length > 0 ||
    filters.bookTypes.length > 0 ||
    filters.statuses.length > 0 ||
    filters.supportTeamFilter !== 'all' ||
    filters.supportTeamMembers.length > 0 ||
    Boolean(filters.selectedSupportTeam) ||
    filters.durationCategories.length > 0;

  // Selected Consultant
  const selectedConsultant = filters.consultants[0] || '';

  // Dedicated support team members for the selected consultant
  const dedicatedMembers: DedicatedSupportMember[] = React.useMemo(() => {
    if (selectedConsultant) {
      return getDedicatedSupportTeamsForConsultant(selectedConsultant);
    }
    return [];
  }, [selectedConsultant]);

  // Selected Support Member (single selection for dependent dropdown)
  const currentSelectedSupportMember = React.useMemo(() => {
    if (filters.supportTeamMembers && filters.supportTeamMembers.length > 0) {
      const mem = filters.supportTeamMembers[0];
      if (mem.startsWith('AUTO:')) {
        return mem.split(':')[2] || mem;
      }
      if (mem.startsWith('MEMBER:')) {
        return mem.split(':')[2] || mem;
      }
      return mem;
    }
    return '';
  }, [filters.supportTeamMembers]);

  // Find grouping info (area, total visits) for the selected consultant
  const activeGroup = React.useMemo(() => {
    if (selectedConsultant) {
      return consultantGroupings.find(
        (g) => g.consultant.toLowerCase() === selectedConsultant.toLowerCase()
      );
    }
    return undefined;
  }, [selectedConsultant, consultantGroupings]);

  // Mapping of member visit counts from consultant group
  const memberVisitCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (activeGroup?.supportMembers) {
      activeGroup.supportMembers.forEach((sm) => {
        map.set(sm.fullName.toLowerCase(), sm.count);
        if (sm.nickname) {
          map.set(sm.nickname.toLowerCase(), sm.count);
        }
      });
    }
    return map;
  }, [activeGroup]);

  // Detailed support team members with visits count, percentage, sorting, and search
  const detailedTeamList = React.useMemo(() => {
    const totalConsultantVisits = activeGroup?.totalVisits || totalFilteredVisits || 1;

    const list = dedicatedMembers.map((m) => {
      const count =
        memberVisitCountMap.get(m.fullName.toLowerCase()) ||
        memberVisitCountMap.get(m.nickname.toLowerCase()) ||
        0;
      const percentage = totalConsultantVisits > 0 ? Math.round((count / totalConsultantVisits) * 100) : 0;
      return {
        ...m,
        count,
        percentage,
      };
    });

    // Filter by search query if user types in dropdown search
    const filtered = teamSearchQuery.trim()
      ? list.filter(
          (m) =>
            m.nickname.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
            m.fullName.toLowerCase().includes(teamSearchQuery.toLowerCase())
        )
      : list;

    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (teamSortBy === 'visit_desc') {
        if (b.count !== a.count) return b.count - a.count;
        return a.nickname.localeCompare(b.nickname);
      }
      if (teamSortBy === 'visit_asc') {
        if (a.count !== b.count) return a.count - b.count;
        return a.nickname.localeCompare(b.nickname);
      }
      if (teamSortBy === 'name_asc') {
        return a.nickname.localeCompare(b.nickname);
      }
      if (teamSortBy === 'name_desc') {
        return b.nickname.localeCompare(a.nickname);
      }
      return 0;
    });
  }, [dedicatedMembers, memberVisitCountMap, activeGroup, totalFilteredVisits, teamSearchQuery, teamSortBy]);

  // Currently selected member detail object
  const selectedMemberObj = React.useMemo(() => {
    if (!currentSelectedSupportMember) return null;
    const cleanTarget = currentSelectedSupportMember.toLowerCase().trim();
    return (
      detailedTeamList.find(
        (m) =>
          m.fullName.toLowerCase() === cleanTarget ||
          m.nickname.toLowerCase() === cleanTarget ||
          cleanTarget.includes(m.fullName.toLowerCase()) ||
          cleanTarget.includes(m.nickname.toLowerCase())
      ) || null
    );
  }, [currentSelectedSupportMember, detailedTeamList]);

  // Handle Consultant Selection Change
  const handleConsultantChange = (newConsultant: string) => {
    if (!newConsultant) {
      onFilterChange({
        consultants: [],
        supportTeamMembers: [],
        selectedSupportTeam: '',
      });
      setIsTeamDropdownOpen(false);
      return;
    }

    // When consultant changes, verify if the currently selected support member belongs to this consultant
    const membersForNew = getDedicatedSupportTeamsForConsultant(newConsultant);
    const isStillValid =
      currentSelectedSupportMember &&
      membersForNew.some(
        (m) =>
          m.fullName.toLowerCase() === currentSelectedSupportMember.toLowerCase() ||
          m.nickname.toLowerCase() === currentSelectedSupportMember.toLowerCase()
      );

    onFilterChange({
      consultants: [newConsultant],
      supportTeamMembers: isStillValid ? [currentSelectedSupportMember] : [],
      selectedSupportTeam: isStillValid ? currentSelectedSupportMember : '',
    });
    setIsTeamDropdownOpen(false);
  };

  // Handle Support Team Selection Change
  const handleSupportSelectChange = (val: string) => {
    if (!val) {
      onFilterChange({
        supportTeamMembers: [],
        selectedSupportTeam: '',
        supportTeamFilter: 'all',
      });
      setIsTeamDropdownOpen(false);
      return;
    }

    // Auto selection format: "AUTO:ConsultantName:MemberFullName"
    if (val.startsWith('AUTO:')) {
      const parts = val.split(':');
      const consName = parts[1];
      const memberName = parts[2];
      onFilterChange({
        consultants: consName ? [consName] : filters.consultants,
        supportTeamMembers: [memberName],
        selectedSupportTeam: memberName,
        supportTeamFilter: 'all',
      });
      setIsTeamDropdownOpen(false);
      return;
    }

    // Normal selection within selected consultant's team
    let targetConsultants = filters.consultants;
    if (targetConsultants.length === 0) {
      const foundCons = findConsultantForSupportMember(val);
      if (foundCons) {
        targetConsultants = [foundCons];
      }
    }

    onFilterChange({
      consultants: targetConsultants,
      supportTeamMembers: [val],
      selectedSupportTeam: val,
      supportTeamFilter: 'all',
    });
    setIsTeamDropdownOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3.5">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari outlet, support (line 1), support team (line 2), konsulting, SPV, alamat, atau tiket ID..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Primary Key / Deduplication & Reset */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => onFilterChange({ deduplicateVisits: !filters.deduplicateVisits })}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filters.deduplicateVisits
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/80 shadow-2xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Primary Key: Tiket ID + Date Visit. Jika diaktifkan, menghitung total visit riil unik."
          >
            {filters.deduplicateVisits ? (
              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>Primary Key: Tiket ID + Date Visit (Total Visit)</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center px-2.5 py-2 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 rounded-xl transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1 border-t border-slate-100">
        {/* 1. Supervisor Filter */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
            Supervisor (SPV)
          </label>
          <select
            value={filters.supervisors[0] || ''}
            onChange={(e) => onFilterChange({ supervisors: e.target.value ? [e.target.value] : [] })}
            className="w-full bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Semua Supervisor (SPV)</option>
            {availableSupervisors
              .filter((spv) => spv && spv.toLowerCase() !== 'unname')
              .map((spv) => (
                <option key={spv} value={spv}>
                  {spv}
                </option>
              ))}
          </select>
        </div>

        {/* 2. Nama Konsulting Filter */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center">
            <Briefcase className="w-3 h-3 mr-1 text-indigo-600" />
            Nama Konsulting
          </label>
          <select
            value={selectedConsultant}
            onChange={(e) => handleConsultantChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
          >
            <option value="">Semua Konsulting</option>
            {availableConsultants
              .filter((c) => c && c.toLowerCase() !== 'unname')
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </div>

        {/* 3. Support Team Filter (DEPENDENT SELECTION berdasarkan Nama Konsulting) */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center justify-between">
            <span className="flex items-center">
              <Users className="w-3 h-3 mr-1 text-amber-600" />
              Support Team
            </span>
            {selectedConsultant && (
              <span className="text-[9px] text-amber-800 font-semibold px-1 rounded bg-amber-50 border border-amber-200">
                Tim {selectedConsultant.split(' ')[0]}
              </span>
            )}
          </label>

          {selectedConsultant ? (
            /* Saat Konsultan Dipilih */
            <select
              value={currentSelectedSupportMember}
              onChange={(e) => handleSupportSelectChange(e.target.value)}
              className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-amber-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
            >
              <option value="">
                Semua Tim {selectedConsultant.split(' ')[0]} ({dedicatedMembers.map((m) => m.nickname).join(', ') || 'Semua'})
              </option>
              {dedicatedMembers.map((m) => {
                const cnt = memberVisitCountMap.get(m.fullName.toLowerCase()) || memberVisitCountMap.get(m.nickname.toLowerCase()) || 0;
                return (
                  <option key={m.fullName} value={m.fullName}>
                    {m.nickname} ({m.fullName}) {cnt > 0 ? `— ${cnt} visit` : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            /* Saat Belum Ada Konsultan Dipilih */
            <select
              value={currentSelectedSupportMember}
              onChange={(e) => handleSupportSelectChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Semua Support Team (Pilih Konsulting dahulu)</option>
              {Object.entries(CONSULTANT_DEDICATED_TEAMS).map(([consName, members]) => (
                <optgroup key={consName} label={`Tim Konsultan: ${consName}`}>
                  {members.map((m) => (
                    <option key={`${consName}-${m.fullName}`} value={`AUTO:${consName}:${m.fullName}`}>
                      {m.nickname} ({m.fullName}) — Tim {consName.split(' ')[0]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>

        {/* 4. Area / Wilayah Filter */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
            Area / Wilayah
          </label>
          <select
            value={filters.areas[0] || ''}
            onChange={(e) => onFilterChange({ areas: e.target.value ? [e.target.value] : [] })}
            className="w-full bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Semua Area</option>
            {availableAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Book Type Filter */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
            Book Type
          </label>
          <select
            value={filters.bookTypes[0] || ''}
            onChange={(e) => onFilterChange({ bookTypes: e.target.value ? [e.target.value] : [] })}
            className="w-full bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Semua Book Type</option>
            {availableBookTypes.map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Date & Month Filter */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center">
              <Calendar className="w-3 h-3 mr-1 text-slate-500" />
              Bulan / Tanggal
            </label>
            {filters.selectedMonth && (
              <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded font-bold">
                Bulan Aktif
              </span>
            )}
          </div>

          {availableMonths && availableMonths.length > 0 ? (
            <div className="space-y-1">
              <select
                value={filters.selectedMonth || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    onFilterChange({ selectedMonth: '', dateRangeStart: '', dateRangeEnd: '' });
                  } else {
                    const found = availableMonths.find((m) => m.key === val);
                    if (found) {
                      onFilterChange({
                        selectedMonth: found.key,
                        dateRangeStart: found.startDate,
                        dateRangeEnd: found.endDate,
                      });
                    }
                  }
                }}
                className={`w-full border rounded-lg px-2 py-1 text-xs focus:bg-white focus:outline-none transition-all ${
                  filters.selectedMonth
                    ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 border-slate-200/90 text-slate-800'
                }`}
              >
                <option value="">Semua Bulan (mulai Agustus 2026)</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.visitCount} visit)
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-1">
                <input
                  type="date" min="2026-08-01"
                  value={filters.dateRangeStart}
                  onChange={(e) => onFilterChange({ dateRangeStart: e.target.value, selectedMonth: '' })}
                  className="w-1/2 bg-slate-50 border border-slate-200/90 rounded-lg px-1 py-0.5 text-[10px] text-slate-800 focus:bg-white focus:outline-none"
                  title="Mulai"
                />
                <span className="text-slate-400 text-[10px]">-</span>
                <input
                  type="date" min="2026-08-01"
                  value={filters.dateRangeEnd}
                  onChange={(e) => onFilterChange({ dateRangeEnd: e.target.value, selectedMonth: '' })}
                  className="w-1/2 bg-slate-50 border border-slate-200/90 rounded-lg px-1 py-0.5 text-[10px] text-slate-800 focus:bg-white focus:outline-none"
                  title="Selesai"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <input
                type="date" min="2026-08-01"
                value={filters.dateRangeStart}
                onChange={(e) => onFilterChange({ dateRangeStart: e.target.value })}
                className="w-1/2 bg-slate-50 border border-slate-200/90 rounded-lg px-1.5 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-none"
                title="Mulai"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date" min="2026-08-01"
                value={filters.dateRangeEnd}
                onChange={(e) => onFilterChange({ dateRangeEnd: e.target.value })}
                className="w-1/2 bg-slate-50 border border-slate-200/90 rounded-lg px-1.5 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-none"
                title="Selesai"
              />
            </div>
          )}
        </div>
      </div>

      {/* Interactive Selection Bar: Ketika Konsultan Dipilih (Dengan Sorting List Dropdown yang Detail) */}
      {selectedConsultant && (
        <div className="bg-gradient-to-r from-indigo-50/90 via-slate-50 to-amber-50/70 border border-indigo-100 rounded-xl p-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left side: Info Konsultan & Area */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-500 mr-1" />
                <span>Tim Konsulting Terpilih</span>
              </span>
              <div className="text-slate-800 font-semibold flex items-center text-xs">
                <Briefcase className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                <span>
                  Konsultan: <span className="text-indigo-700 font-bold">{selectedConsultant}</span>
                </span>
              </div>
              {activeGroup?.primaryArea && (
                <>
                  <span className="text-slate-300">•</span>
                  <div className="text-slate-700 flex items-center text-xs">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>
                      Area: <span className="text-emerald-700 font-bold">{activeGroup.primaryArea}</span>
                    </span>
                    {filters.areas[0] !== activeGroup.primaryArea && activeGroup.primaryArea !== 'Lainnya' && (
                      <button
                        onClick={() => onFilterChange({ areas: [activeGroup.primaryArea] })}
                        className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] hover:bg-emerald-200 transition-colors font-semibold"
                        title={`Klik untuk mengunci filter Area ke ${activeGroup.primaryArea}`}
                      >
                        + Set Area {activeGroup.primaryArea}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right side: Sorting List Dropdown untuk Seleksi Tim */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-semibold flex items-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Seleksi Tim:
                </span>

                {/* Dropdown Button Trigger */}
                <button
                  type="button"
                  onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                  className={`flex items-center justify-between space-x-2 px-3 py-1.5 rounded-xl border text-xs transition-all shadow-2xs cursor-pointer ${
                    selectedMemberObj
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-300/60 hover:bg-amber-100/80'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                  title="Klik untuk membuka daftar personil tim dan opsi pengurutan"
                >
                  {selectedMemberObj ? (
                    <div className="flex items-center space-x-2 text-left">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                      <div>
                        <span className="font-bold text-amber-900">
                          {selectedMemberObj.nickname}
                        </span>
                        <span className="text-[11px] font-normal text-amber-800 ml-1">
                          ({selectedMemberObj.fullName.split(' ')[0]})
                        </span>
                      </div>
                      <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-100 border border-amber-300 text-[10px] font-mono text-amber-900 font-bold">
                        {selectedMemberObj.count} visit ({selectedMemberObj.percentage}%)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-left">
                      <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        Semua Tim {selectedConsultant.split(' ')[0]}
                      </span>
                      <span className="ml-1 px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-mono text-indigo-700 font-medium">
                        {dedicatedMembers.length} Personil • {activeGroup?.totalVisits || totalFilteredVisits} Visit
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-200 ml-1.5">
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isTeamDropdownOpen ? 'rotate-180 text-amber-600' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Clear Button if a specific member is filtered */}
                {selectedMemberObj && (
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({
                        supportTeamMembers: [],
                        selectedSupportTeam: '',
                      });
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors"
                    title="Reset ke Semua Tim"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Floating Popover */}
              {isTeamDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  {/* Popover Header with Sorting Controls */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Urutkan Personil
                      </span>
                    </div>

                    {/* Sorting Tabs / Pills */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setTeamSortBy('visit_desc')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          teamSortBy === 'visit_desc'
                            ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Urutkan dari Kunjungan Terbanyak ke Tersedikit"
                      >
                        Visit ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamSortBy('name_asc')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          teamSortBy === 'name_asc'
                            ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Urutkan berdasarkan Nama A-Z"
                      >
                        Nama A-Z
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamSortBy('visit_asc')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          teamSortBy === 'visit_asc'
                            ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Urutkan dari Kunjungan Paling Sedikit"
                      >
                        Visit ↑
                      </button>
                    </div>
                  </div>

                  {/* Search inside dropdown if more than 3 members */}
                  {dedicatedMembers.length > 3 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama personil tim..."
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                      {teamSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTeamSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-[10px]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}

                  {/* Detailed List */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {/* Option 0: Semua Tim Konsultan */}
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange({
                          supportTeamMembers: [],
                          selectedSupportTeam: '',
                        });
                        setIsTeamDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        !selectedMemberObj
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-200'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            !selectedMemberObj ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center">
                            Semua Tim {selectedConsultant.split(' ')[0]}
                            {!selectedMemberObj && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 ml-1.5 stroke-[3]" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Semua kunjungan tim {selectedConsultant.split(' ')[0]} ({dedicatedMembers.length} personil)
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 border border-indigo-200 text-[10px] font-mono text-indigo-800 font-bold">
                          {activeGroup?.totalVisits || totalFilteredVisits} Visit
                        </span>
                      </div>
                    </button>

                    <div className="px-1 pt-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Daftar Personil ({detailedTeamList.length})</span>
                      <span className="text-slate-400 text-[9px] lowercase">
                        diurutkan: {teamSortBy === 'visit_desc' ? 'visit terbanyak' : teamSortBy === 'visit_asc' ? 'visit terendah' : 'nama a-z'}
                      </span>
                    </div>

                    {/* Personil Items */}
                    {detailedTeamList.map((m) => {
                      const isSelected = selectedMemberObj?.fullName.toLowerCase() === m.fullName.toLowerCase();
                      const initials = m.nickname.slice(0, 2).toUpperCase();

                      return (
                        <button
                          key={m.fullName}
                          type="button"
                          onClick={() => {
                            onFilterChange({
                              supportTeamMembers: [m.fullName],
                              selectedSupportTeam: m.fullName,
                            });
                            setIsTeamDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-950 ring-1 ring-amber-300 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50/50 hover:border-indigo-200 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {/* Avatar Initials */}
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 text-white font-extrabold'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {initials}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className={`text-xs font-bold truncate ${
                                    isSelected ? 'text-amber-900' : 'text-slate-800'
                                  }`}
                                >
                                  {m.nickname}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3] shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[170px] sm:max-w-[190px]">
                                {m.fullName}
                              </div>
                            </div>
                          </div>

                          {/* Right stats: Visit count + Percentage Progress Bar */}
                          <div className="text-right shrink-0 pl-2">
                            <div className="flex items-center justify-end space-x-1">
                              <span
                                className={`text-xs font-bold font-mono ${
                                  isSelected ? 'text-amber-800' : 'text-slate-900'
                                }`}
                              >
                                {m.count}
                              </span>
                              <span className="text-[10px] text-slate-500">visit</span>
                            </div>
                            <div className="flex items-center justify-end space-x-1 mt-0.5">
                              <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isSelected ? 'bg-amber-500' : 'bg-indigo-500'
                                  }`}
                                  style={{ width: `${Math.min(100, m.percentage)}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono w-6 text-right">
                                {m.percentage}%
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {detailedTeamList.length === 0 && (
                      <div className="text-center py-3 text-slate-400 text-xs">
                        Tidak ada personil yang sesuai pencarian
                      </div>
                    )}
                  </div>

                  {/* Popover Footer Info */}
                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>{dedicatedMembers.length} Personil Dedicated Team</span>
                    <span className="text-amber-700 font-semibold">
                      {selectedMemberObj
                        ? `Filter Aktif: ${selectedMemberObj.nickname}`
                        : `Filter Aktif: Semua Tim`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result Indicator Banner */}
      <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <span>
          Menampilkan <strong className="text-slate-900 font-semibold">{totalFilteredVisits}</strong> Total Visit
          <span className="text-slate-600 font-mono text-[10px] ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Primary Key: Tiket ID + Date Visit
          </span>
          {filters.deduplicateVisits && totalFilteredRecords !== totalFilteredVisits && (
            <span> (dari total <strong className="text-indigo-700">{totalFilteredRecords}</strong> baris tiket)</span>
          )}
        </span>
        <div className="flex items-center space-x-3">
          {supportTeamVisitsCount > 0 && (
            <span className="text-emerald-700 font-medium flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{supportTeamVisitsCount} visit didampingi Support Team</span>
            </span>
          )}
          {filters.deduplicateVisits && (
            <span className="text-emerald-700 font-medium">✓ Total Visit Real per Period per Day Aktif</span>
          )}
        </div>
      </div>
    </div>
  );
};
