import React, { useState } from 'react';
import { ColumnMapping, RawDataRow } from '../types';
import { X, Check, RefreshCcw, HelpCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { DEFAULT_COLUMN_MAPPING } from '../utils/dataProcessor';

interface ColumnMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMapping: ColumnMapping;
  availableHeaders: string[];
  sampleData: RawDataRow[];
  onApplyMapping: (newMapping: ColumnMapping) => void;
}

const FIELD_DESCRIPTIONS: { key: keyof ColumnMapping; label: string; description: string; required?: boolean; category: 'primary' | 'team' | 'detail' }[] = [
  { key: 'ticketId', label: 'Ticket ID (Kunci Utama)', description: 'Nomor identifikasi unik tiket visit per penugasan', required: true, category: 'primary' },
  { key: 'supervisor', label: 'Supervisor (SPV)', description: 'Kolom Supervisor (jika baris kosong otomatis diisi "unname")', required: true, category: 'primary' },
  { key: 'consultantName', label: 'Nama Konsulting (Consultant)', description: 'Nama Konsulting / Penanggung jawab (jika kosong otomatis diisi "unname" seperti SPV)', required: true, category: 'primary' },
  { key: 'outletName', label: 'Nama Outlet', description: 'Digunakan untuk penamaan & deduplikasi 1 visit per outlet per hari', required: true, category: 'primary' },
  { key: 'agendaSchedule', label: 'Jadwal Agenda / Tanggal Visit', description: 'Format tanggal agenda (e.g. DD/MM/YYYY HH:mm:ss)', required: true, category: 'primary' },
  { key: 'supportName', label: 'Nama Support (Staff Utama)', description: 'Nama staff support yang bertugas ke lapangan', required: true, category: 'team' },
  { key: 'meetingParticipants', label: 'Meeting Participants (Team Support)', description: 'Staff support pendamping yang datang 2-3 orang dalam 1 visit tiket ID', required: true, category: 'team' },
  { key: 'bookType', label: 'Book Type', description: 'Tipe booking (Onsite, Online, Business Travel, dll.)', required: true, category: 'primary' },
  { key: 'checkInTime', label: 'Check In Time', description: 'Waktu aktual check in untuk perhitungan durasi visit', required: true, category: 'primary' },
  { key: 'checkOutTime', label: 'Check Out Time', description: 'Waktu aktual check out untuk perhitungan durasi visit', required: true, category: 'primary' },
  { key: 'outletAddress', label: 'Alamat Outlet / Area', description: 'Digunakan untuk ekstraksi otomatis breakdown area & kota', category: 'detail' },
  { key: 'status', label: 'Status', description: 'Status visit (COMPLETED, SEND EMAIL, CANCEL, dll.)', category: 'primary' },
  { key: 'visitType', label: 'Visit Type', description: 'Kategori kegiatan (Meeting, Training, Retraining, dll.)', category: 'detail' },
  { key: 'title', label: 'Title / Judul', description: 'Judul penugasan atau company outlet', category: 'detail' },
  { key: 'companyName', label: 'Nama Company', description: 'Nama PT atau entitas legal outlet', category: 'detail' },
  { key: 'checkInLocation', label: 'Check In Location', description: 'Data koordinat Lat/Lng saat check in', category: 'detail' },
  { key: 'checkOutLocation', label: 'Check Out Location', description: 'Data koordinat Lat/Lng saat check out', category: 'detail' },
  { key: 'picName', label: 'PIC Name', description: 'Nama kontak person outlet', category: 'detail' },
  { key: 'picNumber', label: 'PIC Number', description: 'Nomor telepon PIC', category: 'detail' },
  { key: 'approachNotes', label: 'Approach Notes', description: 'Catatan pendekatan / instruksi kunjungan', category: 'detail' },
  { key: 'csatLink', label: 'CSAT Link', description: 'Tautan formulir survey kepuasan pelanggan', category: 'detail' },
  { key: 'createdAt', label: 'Created At', description: 'Waktu pembuatan tiket penugasan', category: 'detail' },
  { key: 'cancelNotes', label: 'Cancel Notes', description: 'Alasan atau keterangan pembatalan visit', category: 'detail' },
];

export const ColumnMapperModal: React.FC<ColumnMapperModalProps> = ({
  isOpen,
  onClose,
  currentMapping,
  availableHeaders,
  sampleData,
  onApplyMapping,
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>({ ...currentMapping });
  const [activeTab, setActiveTab] = useState<'all' | 'primary' | 'team' | 'detail'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleChange = (key: keyof ColumnMapping, header: string) => {
    setMapping((prev) => ({
      ...prev,
      [key]: header,
    }));
  };

  const handleReset = () => {
    setMapping({ ...DEFAULT_COLUMN_MAPPING });
  };

  const handleSave = () => {
    onApplyMapping(mapping);
    onClose();
  };

  // Quick sample preview for a given column header
  const getSampleValue = (headerName: string): string => {
    if (!headerName || !sampleData.length) return '-';
    for (let i = 0; i < Math.min(sampleData.length, 5); i++) {
      const val = sampleData[i][headerName];
      if (val && val.trim() !== '') {
        return val.length > 40 ? val.slice(0, 40) + '...' : val;
      }
    }
    return '(Kosong pada 5 baris pertama)';
  };

  // Calculate mapped statistics
  const mappedCount = FIELD_DESCRIPTIONS.filter((f) => {
    const assigned = mapping[f.key];
    return assigned && availableHeaders.includes(assigned);
  }).length;

  const filteredFields = FIELD_DESCRIPTIONS.filter((f) => {
    if (activeTab === 'primary' && f.category !== 'primary') return false;
    if (activeTab === 'team' && f.category !== 'team') return false;
    if (activeTab === 'detail' && f.category !== 'detail') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchLabel = f.label.toLowerCase().includes(q);
      const matchKey = f.key.toLowerCase().includes(q);
      const matchHeader = (mapping[f.key] || '').toLowerCase().includes(q);
      return matchLabel || matchKey || matchHeader;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Penyesuaian Kolom Data (Column Mapping)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesuaikan semua {availableHeaders.length} kolom CSV dengan struktur dashboard (Tiket ID, Konsulting, SPV, Meeting Participants)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{mappedCount} / {FIELD_DESCRIPTIONS.length} Kolom Terpetakan</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice box */}
        <div className="px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong className="text-indigo-950 font-bold">Aturan Khusus Aktif:</strong> Baris SPV &amp; Konsulting kosong = <span className="underline font-bold text-amber-800">"unname"</span>, dan Meeting Participants per Tiket ID = <span className="underline font-bold text-emerald-800">2-3 Staff Support</span>.
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Total Kolom CSV: {availableHeaders.length}</span>
        </div>

        {/* Tabs & Search Controls */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Kolom ({FIELD_DESCRIPTIONS.length})
            </button>
            <button
              onClick={() => setActiveTab('primary')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'primary' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kunci &amp; KPI ({FIELD_DESCRIPTIONS.filter(f => f.category === 'primary').length})
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'team' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team Support &amp; Konsulting ({FIELD_DESCRIPTIONS.filter(f => f.category === 'team').length})
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'detail' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detail Tambahan ({FIELD_DESCRIPTIONS.filter(f => f.category === 'detail').length})
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Cari nama kolom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-48"
            />
            <button
              onClick={handleReset}
              className="inline-flex items-center px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all shrink-0 cursor-pointer shadow-2xs"
              title="Kembalikan semua kolom ke nama bawaan CSV"
            >
              <RefreshCcw className="w-3 h-3 mr-1 text-slate-500" />
              Reset Bawaan
            </button>
          </div>
        </div>

        {/* Mapping Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFields.map((field) => {
              const selectedHeader = mapping[field.key] || '';
              const sampleVal = getSampleValue(selectedHeader);
              const isMapped = availableHeaders.includes(selectedHeader);

              return (
                <div
                  key={field.key}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <div className="mb-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                        <span>{field.label}</span>
                        {field.required && <span className="text-rose-500 text-xs">*</span>}
                      </label>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isMapped
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isMapped ? 'Terhubung' : 'Belum Cocok'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{field.description}</p>
                  </div>

                  <div className="space-y-1.5">
                    <select
                      value={selectedHeader}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono cursor-pointer"
                    >
                      <option value="">-- Pilih Kolom dari File CSV --</option>
                      {availableHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>

                    <div className="text-[10px] text-slate-600 bg-slate-50 rounded px-2 py-1 font-mono truncate border border-slate-200/70">
                      <span className="text-slate-400">Contoh data:</span> {sampleVal}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <p className="text-xs text-slate-500 hidden sm:block">
            {availableHeaders.length} kolom terdeteksi dari sumber data CSV.
          </p>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Terapkan Kolom &amp; Update Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
