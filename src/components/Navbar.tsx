import React from 'react';
import { SlidersHorizontal, UploadCloud, RefreshCw, Download, FileCode, ShieldCheck, Share2, CloudDownload } from 'lucide-react';

interface NavbarProps {
  totalRecords: number;
  uniqueVisits: number;
  deduplicateEnabled: boolean;
  onOpenColumnMapper: () => void;
  onOpenUpload: () => void;
  onOpenOmniSync: () => void;
  dataSource: 'csv' | 'omni';
  onResetData: () => void;
  onExportCsv: () => void;
  onDownloadSingleHtml: () => void;
  onOpenShareModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalRecords,
  uniqueVisits,
  deduplicateEnabled,
  onOpenColumnMapper,
  onOpenUpload,
  onOpenOmniSync,
  dataSource,
  onResetData,
  onExportCsv,
  onDownloadSingleHtml,
  onOpenShareModal,
}) => {
  return (
    <header className="modern-topbar bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      <div className="modern-navbar-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="modern-brandmark w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm font-black text-lg tracking-wider">
              ESB
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="modern-navbar-title text-lg font-bold tracking-tight text-slate-900">
                  Dashboard Monitoring Visit &amp; Check In-Out
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {dataSource === 'omni' ? 'Omni API' : 'Data CSV'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Breakdown Tanggal, Area, SPV, Konsulting, Support &amp; Team, Book Type &amp; Komparasi Check In-Out
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200 text-xs space-x-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Row Data</span>
                <span className="font-bold text-slate-900 text-sm">{totalRecords}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-emerald-700 block text-[10px] uppercase font-semibold">
                  Total Visit (Riil)
                </span>
                <span className="font-bold text-emerald-600 text-sm">{uniqueVisits}</span>
              </div>
            </div>

            {/* Action buttons */}
            <button
              id="btn-column-mapping"
              onClick={onOpenColumnMapper}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
              title="Atur & sesuaikan kolom data spesifik Anda"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              Sesuaikan Kolom Data
            </button>

            <button
              id="btn-share-modal"
              onClick={onOpenShareModal}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
              title="Buka tautan publik dan panduan akses tim"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Bagikan / Link Publik
            </button>

            <button
              id="btn-omni-sync"
              type="button"
              onClick={onOpenOmniSync}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition-all"
              title="Tarik dan verifikasi data visit dari Omni Internal (API)">
              <CloudDownload className="w-3.5 h-3.5 mr-1.5"/>
              Sync Omni
            </button>

            <button
              id="btn-upload-csv"
              onClick={onOpenUpload}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Unggah CSV
            </button>

            <button
              id="btn-download-single-html"
              onClick={onDownloadSingleHtml}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
              title="Unduh file HTML mandiri (bisa dibuka offline di browser tanpa server atau internet)"
            >
              <FileCode className="w-3.5 h-3.5 mr-1.5 text-emerald-100" />
              Unduh HTML (Offline)
            </button>

            <button
              id="btn-export-csv"
              onClick={onExportCsv}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-all"
              title="Export data terfilter ke CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Export
            </button>

            <button
              id="btn-reset-data"
              onClick={onResetData}
              className="inline-flex items-center px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              title="Reset ke data bawaan"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
