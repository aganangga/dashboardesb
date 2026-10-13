import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedRecord } from '../types';
import {
  Clock,
  ArrowRight,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ClockAlert,
  ArrowUpDown,
  Search,
  Filter,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { formatDuration } from '../utils/dataProcessor';
import { PageListPagination } from './PageListPagination';

interface CheckInOutComparisonProps {
  records: ProcessedRecord[];
}

export const CheckInOutComparison: React.FC<CheckInOutComparisonProps> = ({ records }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'duration_desc' | 'duration_asc' | 'time_desc'>('duration_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Stats calculation
  const totalRecords = records.length;
  const checkedInRecords = records.filter((r) => r.checkInDateObj !== null);
  const checkedOutRecords = records.filter((r) => r.checkOutDateObj !== null);
  const validDurationRecords = records.filter((r) => r.durationMinutes !== null && r.durationMinutes > 0 && r.durationMinutes <= 24 * 60);

  const missingCheckoutRecords = records.filter((r) => r.checkInDateObj !== null && r.checkOutDateObj === null);
  const noCheckinRecords = records.filter((r) => r.checkInDateObj === null);
  const overnightRecords = records.filter((r) => r.durationCategory === 'overnight');

  const totalMinutes = validDurationRecords.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
  const avgMinutes = validDurationRecords.length > 0 ? Math.round(totalMinutes / validDurationRecords.length) : 0;

  // Categories count
  const counts = {
    all: totalRecords,
    less_30m: records.filter((r) => r.durationCategory === 'less_30m').length,
    '30m_to_1h': records.filter((r) => r.durationCategory === '30m_to_1h').length,
    '1h_to_2h': records.filter((r) => r.durationCategory === '1h_to_2h').length,
    '2h_to_4h': records.filter((r) => r.durationCategory === '2h_to_4h').length,
    more_4h: records.filter((r) => r.durationCategory === 'more_4h').length,
    missing_checkout: missingCheckoutRecords.length,
    overnight: overnightRecords.length,
    no_checkin: noCheckinRecords.length,
  };

  // Filter and sort list
  const filteredList = useMemo(() => {
    return records
      .filter((r) => {
        if (selectedCategory !== 'all') {
          if (selectedCategory === r.durationCategory) return true;
          return false;
        }
        return true;
      })
      .filter((r) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          r.outletName.toLowerCase().includes(q) ||
          r.supportName.toLowerCase().includes(q) ||
          r.ticketId.toLowerCase().includes(q) ||
          r.supervisor.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortOrder === 'duration_desc') {
          return (b.durationMinutes || 0) - (a.durationMinutes || 0);
        }
        if (sortOrder === 'duration_asc') {
          const aDur = a.durationMinutes === null ? 999999 : a.durationMinutes;
          const bDur = b.durationMinutes === null ? 999999 : b.durationMinutes;
          return aDur - bDur;
        }
        // time_desc
        const aTime = a.checkInDateObj?.getTime() || a.agendaDateObj?.getTime() || 0;
        const bTime = b.checkInDateObj?.getTime() || b.agendaDateObj?.getTime() || 0;
        return bTime - aTime;
      });
  }, [records, selectedCategory, searchTerm, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [records, selectedCategory, searchTerm, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedList = filteredList.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Tempat Khusus Komparasi Check In - Check Out &amp; Durasi Visit
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Analisis waktu kedatangan, kepulangan, durasi di lokasi outlet, serta ketepatan waktu terhadap jadwal agenda
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Urutan:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs"
            >
              <option value="duration_desc">Durasi Terlama</option>
              <option value="duration_asc">Durasi Tercepat</option>
              <option value="time_desc">Waktu Terbaru</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards inside this section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Rata-Rata Durasi</span>
          <div className="text-xl font-bold text-purple-700 mt-1 font-mono">
            {formatDuration(avgMinutes)}
          </div>
          <span className="text-[11px] text-slate-500">Dari {validDurationRecords.length} kunjungan valid</span>
        </div>

        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Check In &amp; Check Out Lengkap</span>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
            {checkedOutRecords.length} <span className="text-xs text-slate-500 font-normal">/ {checkedInRecords.length}</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">
            {Math.round((checkedOutRecords.length / (checkedInRecords.length || 1)) * 100)}% kepatuhan check out
          </span>
        </div>

        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-amber-700 block flex items-center">
            <ClockAlert className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Missing Check-Out
          </span>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
            {missingCheckoutRecords.length}
          </div>
          <span className="text-[11px] text-slate-500">Check in tanpa check out</span>
        </div>

        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] uppercase font-bold text-rose-700 block flex items-center">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Anomali &gt; 24 Jam
          </span>
          <div className="text-xl font-bold text-rose-700 mt-1 font-mono">
            {overnightRecords.length}
          </div>
          <span className="text-[11px] text-slate-500">Check out di hari berikutnya</span>
        </div>
      </div>

      {/* Category Pills / Filters */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 block">
          Filter Berdasarkan Rentang Durasi:
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Semua', count: counts.all },
            { id: 'less_30m', label: '< 30 Menit (Quick)', count: counts.less_30m },
            { id: '30m_to_1h', label: '30m - 1 Jam', count: counts['30m_to_1h'] },
            { id: '1h_to_2h', label: '1 - 2 Jam (Standard)', count: counts['1h_to_2h'] },
            { id: '2h_to_4h', label: '2 - 4 Jam (Training)', count: counts['2h_to_4h'] },
            { id: 'more_4h', label: '> 4 Jam (Full Day)', count: counts.more_4h },
            { id: 'missing_checkout', label: 'Belum Check Out', count: counts.missing_checkout, badgeColor: 'bg-amber-100 text-amber-800' },
            { id: 'overnight', label: 'Anomali Menginap', count: counts.overnight, badgeColor: 'bg-rose-100 text-rose-800' },
            { id: 'no_checkin', label: 'Tidak Ada Check In', count: counts.no_checkin },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                  cat.badgeColor || (selectedCategory === cat.id ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600')
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Menampilkan <strong className="text-slate-900 font-bold">{filteredList.length}</strong> data kunjungan komparasi
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari outlet atau support..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
            />
          </div>
        </div>

        <PageListPagination
          currentPage={safePage}
          pageSize={pageSize}
          totalItems={filteredList.length}
          onPageChange={setCurrentPage}
          itemLabel="kunjungan"
        />
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Outlet &amp; Support</th>
                <th className="py-2.5 px-3">Jadwal Agenda</th>
                <th className="py-2.5 px-3">Check In Time</th>
                <th className="py-2.5 px-3">Check Out Time</th>
                <th className="py-2.5 px-3 text-center">Durasi Visit</th>
                <th className="py-2.5 px-3">Ketepatan Waktu</th>
                <th className="py-2.5 px-3">Area &amp; SPV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedList.map((rec) => {
                const hasDuration = rec.durationMinutes !== null && rec.durationMinutes > 0;
                const isOvernight = rec.durationCategory === 'overnight';
                const isMissingCheckout = rec.durationCategory === 'missing_checkout';

                // Bar percentage relative to 6 hours max
                const progressPct = rec.durationMinutes
                  ? Math.min(100, Math.max(5, (rec.durationMinutes / 360) * 100))
                  : 0;

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Outlet & Support */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{rec.outletName}</div>
                      <div className="text-[11px] text-indigo-700 flex items-center space-x-1 mt-0.5">
                        <span className="font-medium">Staff: {rec.supportName}</span>
                        {rec.jointSupportNames.length > 1 && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            +{rec.jointSupportNames.length - 1} Tim
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{rec.ticketId}</div>
                    </td>

                    {/* Agenda Schedule */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <div className="text-slate-800 font-medium">{rec.agendaDate}</div>
                      <div className="text-slate-500 text-[10px]">{rec.agendaTime} WIB</div>
                      <div className="text-[10px] text-slate-400 capitalize">{rec.bookType}</div>
                    </td>

                    {/* Check In Time */}
                    <td className="py-2.5 px-3">
                      {rec.checkInTime ? (
                        <div>
                          <span className="font-mono text-emerald-700 text-[11px] block font-semibold">
                            {rec.checkInTime}
                          </span>
                          {rec.checkInCoords && (
                            <span className="text-[9px] text-slate-400 font-mono flex items-center mt-0.5">
                              <MapPin className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                              GPS: {rec.checkInCoords.lat.toFixed(4)}, {rec.checkInCoords.lng.toFixed(4)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Tidak check-in</span>
                      )}
                    </td>

                    {/* Check Out Time */}
                    <td className="py-2.5 px-3">
                      {rec.checkOutTime ? (
                        <div>
                          <span className="font-mono text-purple-700 text-[11px] block font-semibold">
                            {rec.checkOutTime}
                          </span>
                          {rec.checkOutCoords && (
                            <span className="text-[9px] text-slate-400 font-mono flex items-center mt-0.5">
                              <MapPin className="w-2.5 h-2.5 mr-0.5 text-purple-600" />
                              GPS: {rec.checkOutCoords.lat.toFixed(4)}, {rec.checkOutCoords.lng.toFixed(4)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Missing Check-Out
                        </span>
                      )}
                    </td>

                    {/* Duration with visual bar */}
                    <td className="py-2.5 px-3 text-center min-w-[130px]">
                      {hasDuration && !isOvernight ? (
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-slate-900 text-xs block">
                            {rec.durationFormatted}
                          </span>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                rec.durationMinutes! > 240
                                  ? 'bg-purple-500'
                                  : rec.durationMinutes! > 120
                                  ? 'bg-indigo-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            {rec.durationMinutes} menit
                          </span>
                        </div>
                      ) : isOvernight ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200" title={`Durasi terhitung: ${rec.durationFormatted}`}>
                          Anomali &gt; 24 Jam
                        </span>
                      ) : isMissingCheckout ? (
                        <span className="text-[10px] text-amber-700 font-mono font-medium">Hanya Check In</span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* Punctuality vs Agenda */}
                    <td className="py-2.5 px-3">
                      {rec.punctualityStatus === 'early' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                          {Math.abs(rec.punctualityMinutes!)}m Lebih Awal
                        </span>
                      )}
                      {rec.punctualityStatus === 'on_time' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Tepat Waktu (±15m)
                        </span>
                      )}
                      {rec.punctualityStatus === 'late' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                          Terlambat {rec.punctualityMinutes}m
                        </span>
                      )}
                      {rec.punctualityStatus === 'not_checked_in' && (
                        <span className="text-[10px] text-slate-400 italic">Tidak Check-In</span>
                      )}
                    </td>

                    {/* Area & Supervisor */}
                    <td className="py-2.5 px-3 text-[11px]">
                      <div className="text-slate-900 font-medium">{rec.area}</div>
                      <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                        <span>SPV:</span>
                        <span className={rec.supervisor === 'unname' ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                          {rec.supervisor}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <PageListPagination
            currentPage={safePage}
            pageSize={pageSize}
            totalItems={filteredList.length}
            onPageChange={setCurrentPage}
            itemLabel="kunjungan"
          />
        </div>
      </div>
    </div>
  );
};
