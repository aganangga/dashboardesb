import React, { useState } from 'react';
import { ProcessedRecord } from '../types';
import { ChevronLeft, ChevronRight, Eye, MapPin, User, Calendar, X, Building, Clock, Users, Briefcase } from 'lucide-react';

interface VisitTableProps {
  records: ProcessedRecord[];
  deduplicateEnabled: boolean;
}

export const VisitTable: React.FC<VisitTableProps> = ({ records, deduplicateEnabled }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRecord, setSelectedRecord] = useState<ProcessedRecord | null>(null);
  const pageSize = 15;

  // Filter records if deduplication is active
  const displayedRecords = deduplicateEnabled ? records.filter((r) => !r.isDuplicateOnSameDay) : records;

  const totalPages = Math.ceil(displayedRecords.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = displayedRecords.slice(startIndex, startIndex + pageSize);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SEND EMAIL':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'DRAFT EMAIL':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'CANCEL':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'SCHEDULED':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'ON VISIT':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Daftar Rincian Total Visit &amp; Penugasan Tiket</h3>
          <p className="text-xs text-slate-500">
            Total <strong className="text-slate-900 font-bold">{displayedRecords.length}</strong> Total Visit {deduplicateEnabled ? '(Primary Key: Tiket ID + Date Visit)' : '(semua baris data)'}
          </p>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Ticket ID</th>
              <th className="py-2.5 px-3">Outlet &amp; Company</th>
              <th className="py-2.5 px-3">Date Visit (Agenda)</th>
              <th className="py-2.5 px-3">Supervisor</th>
              <th className="py-2.5 px-3">Nama Konsulting</th>
              <th className="py-2.5 px-3">Nama Support</th>
              <th className="py-2.5 px-3">Support Team</th>
              <th className="py-2.5 px-3">Book Type</th>
              <th className="py-2.5 px-3">Durasi</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {paginatedData.map((rec) => {
              const isSpvUnname = rec.supervisor.toLowerCase() === 'unname';
              const isConsultantUnname = rec.consultantName.toLowerCase() === 'unname';

              return (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Ticket ID */}
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                    {rec.ticketId}
                  </td>

                  {/* Outlet & Company */}
                  <td className="py-2.5 px-3 max-w-[180px]">
                    <div className="font-semibold text-slate-900 truncate" title={rec.outletName}>{rec.outletName}</div>
                    <div className="text-[10px] text-slate-500 truncate" title={rec.companyName || rec.title}>{rec.companyName || rec.title}</div>
                    <div className="text-[10px] text-slate-400 flex items-center mt-0.5">
                      <MapPin className="w-2.5 h-2.5 mr-0.5 shrink-0 text-slate-400" />
                      <span className="truncate">{rec.area}</span>
                    </div>
                  </td>

                  {/* Jadwal Agenda & Date Visit */}
                  <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                    <div className="text-slate-900 font-semibold">{rec.dateVisit}</div>
                    <div className="text-[10px] text-slate-500">{rec.agendaTime} WIB</div>
                  </td>

                  {/* Supervisor (unname rule) */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {isSpvUnname ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        unname
                      </span>
                    ) : (
                      <span className="text-slate-800 font-medium">{rec.supervisor}</span>
                    )}
                  </td>

                  {/* Nama Konsulting (unname rule like SPV) */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {isConsultantUnname ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        unname
                      </span>
                    ) : (
                      <span className="text-indigo-700 font-semibold">{rec.consultantName}</span>
                    )}
                  </td>

                  {/* Nama Support (Line 1 / Utama) */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="text-slate-900 font-semibold flex items-center">
                      <User className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                      <span>{rec.supportName}</span>
                    </div>
                  </td>

                  {/* Kolom Tambahan: Support Team (Line 2 / Separator dari Nama Support) */}
                  <td className="py-2.5 px-3 max-w-[170px]">
                    {rec.hasSupportTeam ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 truncate"
                        title={`Support Team: ${rec.supportTeam}`}
                      >
                        <Users className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                        <span className="truncate">{rec.supportTeam}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-mono">-</span>
                    )}
                  </td>

                  {/* Book Type */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="capitalize text-slate-800 font-medium">{rec.bookType}</span>
                    <span className="block text-[10px] text-slate-500">{rec.visitType}</span>
                  </td>

                  {/* Durasi */}
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                    {rec.durationMinutes !== null && rec.durationMinutes > 0 && rec.durationMinutes <= 24 * 60 ? (
                      <span className="font-bold text-slate-900">{rec.durationFormatted}</span>
                    ) : rec.durationCategory === 'overnight' ? (
                      <span className="text-rose-700 text-[10px] font-bold">Anomali &gt; 24 Jam</span>
                    ) : rec.durationCategory === 'missing_checkout' ? (
                      <span className="text-amber-700 text-[10px] font-medium">Check-In Saja</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(
                        rec.status
                      )}`}
                    >
                      {rec.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedRecord(rec)}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Lihat Detail Lengkap"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <div className="text-[10px] uppercase font-bold text-indigo-700 font-mono">
                  {selectedRecord.ticketId}
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedRecord.outletName}</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Core Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Supervisor (SPV)</span>
                  <span className={`font-bold ${selectedRecord.supervisor === 'unname' ? 'text-amber-700' : 'text-slate-900'}`}>
                    {selectedRecord.supervisor}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Nama Konsulting</span>
                  <span className={`font-bold ${selectedRecord.consultantName === 'unname' ? 'text-slate-500' : 'text-indigo-700'}`}>
                    {selectedRecord.consultantName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Book Type</span>
                  <span className="font-semibold text-slate-900">
                    {selectedRecord.bookType} ({selectedRecord.visitType})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Status Kunjungan</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getStatusBadgeClass(selectedRecord.status)}`}>
                    {selectedRecord.status}
                  </span>
                </div>
              </div>

              {/* Support & Support Team (Separated Line 1 & Line 2) */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Petugas Kunjungan (Nama Support &amp; Support Team)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Primary Key: {selectedRecord.primaryVisitKey}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                      Nama Support (Line 1 / Utama):
                    </span>
                    <span className="text-slate-900 font-bold text-xs">{selectedRecord.supportName}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                      Support Team (Line 2 Separator / Pendamping):
                    </span>
                    {selectedRecord.hasSupportTeam ? (
                      <span className="text-emerald-800 font-bold text-xs">
                        {selectedRecord.supportTeam}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">Solo (Tidak ada tim pendamping)</span>
                    )}
                  </div>
                </div>

                {selectedRecord.supportTeamList.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold mb-1">
                      Anggota Support Team ({selectedRecord.supportTeamList.length} Personil):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecord.supportTeamList.map((tm, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          <Users className="w-3 h-3 mr-1 text-emerald-600" />
                          {tm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRecord.rawSupportName && selectedRecord.rawSupportName.includes(',') && (
                  <div className="text-[10px] text-slate-400 font-mono truncate pt-1">
                    Sumber Raw Support: {selectedRecord.rawSupportName}
                  </div>
                )}
              </div>

              {/* Timing details */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center space-x-1.5 mb-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Komparasi Waktu &amp; Durasi Check In - Check Out</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">JADWAL AGENDA</span>
                    <span className="text-slate-900 text-xs font-semibold">{selectedRecord.agendaFull || '-'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-emerald-700 block">CHECK IN TIME</span>
                    <span className="text-slate-900 text-xs font-semibold">{selectedRecord.checkInTime || '-'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-purple-700 block">CHECK OUT TIME</span>
                    <span className="text-slate-900 text-xs font-semibold">{selectedRecord.checkOutTime || '-'}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between mt-2">
                  <span className="text-slate-600 font-medium">Total Durasi Lapangan:</span>
                  <span className="font-mono text-sm font-black text-purple-700">
                    {selectedRecord.durationFormatted} ({selectedRecord.durationMinutes || 0} menit)
                  </span>
                </div>
              </div>

              {/* Outlet details & PIC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Alamat Outlet &amp; Area</span>
                  <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedRecord.outletAddress || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">PIC Outlet</span>
                  <div className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                    <div className="font-medium">{selectedRecord.picName || '-'}</div>
                    <div className="text-slate-500 text-[11px] font-mono">{selectedRecord.picNumber || '-'}</div>
                  </div>
                </div>
              </div>

              {selectedRecord.approachNotes && (
                <div className="space-y-1">
                  <span className="text-indigo-700 text-[10px] uppercase font-semibold">Approach Notes</span>
                  <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-sans">
                    {selectedRecord.approachNotes}
                  </p>
                </div>
              )}

              {selectedRecord.csatLink && (
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">CSAT Link</span>
                  <a
                    href={selectedRecord.csatLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline block truncate"
                  >
                    {selectedRecord.csatLink}
                  </a>
                </div>
              )}

              {selectedRecord.cancelNotes && (
                <div className="space-y-1">
                  <span className="text-rose-700 text-[10px] uppercase font-semibold">Catatan Pembatalan (Cancel Notes)</span>
                  <p className="text-rose-900 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-sans">
                    {selectedRecord.cancelNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
