import React from 'react';
import { ProcessedRecord } from '../types';
import { Users, Building2, Clock, CheckCircle, CalendarCheck, UserX, UserCheck } from 'lucide-react';
import { formatDuration } from '../utils/dataProcessor';

interface SummaryCardsProps {
  records: ProcessedRecord[];
  uniqueVisitsCount: number;
  deduplicateEnabled: boolean;
  onOpenMultiSupportDetails?: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  records,
  uniqueVisitsCount,
  deduplicateEnabled,
  onOpenMultiSupportDetails,
}) => {
  // Calculations
  const totalRecords = records.length;

  // Primary Key (Ticket ID + Date Visit) visits count
  const visitsCount = deduplicateEnabled ? uniqueVisitsCount : totalRecords;

  // Support Team count (records where hasSupportTeam is true)
  const supportTeamVisitsCount = new Set(
    records.filter((r) => r.hasSupportTeam).map((r) => r.primaryVisitKey)
  ).size;

  // Multi-support on same ticket/outlet
  const multiSupportRecords = records.filter((r) => r.jointSupportNames.length > 1 || r.hasSupportTeam);
  const uniqueMultiSupportVisits = new Set(multiSupportRecords.map((r) => r.primaryVisitKey)).size;

  // Completed & Cancelled
  const completedCount = records.filter((r) => r.status.toUpperCase() === 'COMPLETED').length;
  const cancelledCount = records.filter((r) => r.status.toUpperCase() === 'CANCEL').length;

  // Check In and Check Out rates
  const checkedInRecords = records.filter((r) => r.checkInDateObj !== null);
  const checkedInCount = checkedInRecords.length;
  const checkInRate = totalRecords > 0 ? Math.round((checkedInCount / totalRecords) * 100) : 0;

  // Duration
  const recordsWithDuration = records.filter((r) => r.durationMinutes !== null && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60);
  const totalDurationMinutes = recordsWithDuration.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  const avgDurationMinutes = recordsWithDuration.length > 0 ? Math.round(totalDurationMinutes / recordsWithDuration.length) : null;

  // Supervisor & Consultant unname count
  const unnameSpvCount = records.filter((r) => r.supervisor.toLowerCase() === 'unname').length;
  const unnameConsultantCount = records.filter((r) => r.consultantName.toLowerCase() === 'unname').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {/* 1. Total Visit (Primary Key: Tiket ID + Date Visit) */}
      <div className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 shadow-xs hover:shadow-sm relative overflow-hidden flex flex-col justify-between transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Visit
          </span>
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {visitsCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center">
            {deduplicateEnabled ? (
              <span className="text-emerald-700 font-medium">Primary Key: Tiket + Date</span>
            ) : (
              <span>Deduplikasi nonaktif</span>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/40 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* 2. Total Baris Agenda */}
      <div className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 shadow-xs hover:shadow-sm flex flex-col justify-between transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Baris Data
          </span>
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black text-slate-900 tracking-tight">{totalRecords}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {totalRecords - uniqueVisitsCount > 0 && deduplicateEnabled ? (
              <span className="text-amber-700 font-semibold">
                {totalRecords - uniqueVisitsCount} duplikat tiket/tgl
              </span>
            ) : (
              <span>Total baris penugasan</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Support Team (Duet/Multi-personil) */}
      <div className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-4 shadow-xs hover:shadow-sm flex flex-col justify-between transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Ada Support Team
          </span>
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black text-emerald-700 tracking-tight">{supportTeamVisitsCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            <span>Duet / Multi-staff (line 2)</span>
          </div>
        </div>
      </div>

      {/* 4. Multi Support Detail */}
      <div
        onClick={onOpenMultiSupportDetails}
        className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-4 shadow-xs hover:shadow-sm flex flex-col justify-between cursor-pointer group transition-all"
        title="Klik untuk melihat detail tiket dengan Support Team"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition-colors">
            Detail Support Team
          </span>
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            {uniqueMultiSupportVisits}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            <span>Klik lihat rincian visit tim</span>
          </div>
        </div>
      </div>

      {/* 5. Rata-rata Durasi Visit */}
      <div className="bg-white border border-slate-200/90 hover:border-purple-300 rounded-2xl p-4 shadow-xs hover:shadow-sm flex flex-col justify-between transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Rata-rata Durasi
          </span>
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black text-purple-700 tracking-tight">
            {formatDuration(avgDurationMinutes)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            <span>{recordsWithDuration.length} visit valid</span>
          </div>
        </div>
      </div>

      {/* 6. Tingkat Check In */}
      <div className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-4 shadow-xs hover:shadow-sm flex flex-col justify-between transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Check-In Rate
          </span>
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black text-emerald-700 tracking-tight">{checkInRate}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            <span>{checkedInCount} dari {totalRecords} row</span>
          </div>
        </div>
      </div>

      {/* 7. Supervisor & Konsulting 'unname' */}
      <div className="bg-white border border-slate-200/90 hover:border-rose-300 rounded-2xl p-4 shadow-xs hover:shadow-sm flex flex-col justify-between transition-all group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            SPV &amp; Kns "unname"
          </span>
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <UserX className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-xl font-black text-rose-600 tracking-tight flex items-baseline space-x-1.5">
            <span>{unnameSpvCount} SPV</span>
            <span className="text-slate-400 font-normal">/</span>
            <span className="text-cyan-700 text-sm font-bold">{unnameConsultantCount} Kns</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            <span>Baris kosong = "unname"</span>
          </div>
        </div>
      </div>
    </div>
  );
};

