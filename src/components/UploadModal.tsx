import React, { useState } from 'react';
import { UploadCloud, FileText, Check, AlertCircle, X, Link as LinkIcon, Loader2, ExternalLink, HelpCircle, FileSpreadsheet } from 'lucide-react';
import { parseCsvString } from '../utils/dataProcessor';
import { RawDataRow } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: RawDataRow[], headers: string[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onDataLoaded }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'sheets'>('upload');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [sheetsUrl, setSheetsUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { data, headers } = parseCsvString(text);
        if (data.length === 0) {
          setError('File CSV kosong atau tidak memiliki baris data.');
          return;
        }
        onDataLoaded(data, headers);
        onClose();
      } catch (err: any) {
        setError(`Gagal membaca file CSV: ${err.message || 'Format tidak valid'}`);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setError('Silakan paste data CSV terlebih dahulu.');
      return;
    }
    try {
      const { data, headers } = parseCsvString(pasteText);
      if (data.length === 0) {
        setError('Data CSV kosong atau tidak memiliki baris data.');
        return;
      }
      onDataLoaded(data, headers);
      onClose();
    } catch (err: any) {
      setError(`Gagal memproses data CSV: ${err.message}`);
    }
  };

  const handleSheetsUrlFetch = async () => {
    if (!sheetsUrl.trim()) {
      setError('Masukkan tautan Google Spreadsheet terlebih dahulu.');
      return;
    }

    setError(null);
    setIsLoadingUrl(true);

    try {
      let exportUrl = sheetsUrl.trim();

      // Extract Sheet ID and GID if standard Google Sheets URL
      const idMatch = exportUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = exportUrl.match(/[#&?]gid=([0-9]+)/);

      if (idMatch && idMatch[1]) {
        const sheetId = idMatch[1];
        const gid = gidMatch ? gidMatch[1] : '0';
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      }

      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error(`Gagal mengambil data dari Google Sheets (HTTP ${res.status}). Pastikan spreadsheet diset "Siapa saja yang memiliki link dapat melihat" atau dipublikasikan ke web.`);
      }

      const csvText = await res.text();
      const { data, headers } = parseCsvString(csvText);

      if (data.length === 0) {
        throw new Error('Data spreadsheet kosong atau tidak berisi baris yang valid.');
      }

      onDataLoaded(data, headers);
      onClose();
    } catch (err: any) {
      setError(
        `${err.message || 'Gagal memuat link'}. Jika spreadsheet bersifat privat, buka Google Sheet > File > Download > CSV (.csv), lalu upload file CSV pada tab "Upload CSV".`
      );
    } finally {
      setIsLoadingUrl(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Perbarui &amp; Sinkron Data Master</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2 gap-2 text-xs">
          <button
            onClick={() => { setActiveTab('upload'); setError(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File CSV</span>
          </button>
          <button
            onClick={() => { setActiveTab('sheets'); setError(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-emerald-600" />
            <span>Link Google Sheets</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Sinkron
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('paste'); setError(null); }}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tempel Teks (Paste)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* TAB 1: UPLOAD CSV */}
          {activeTab === 'upload' && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60'
                }`}
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <UploadCloud className="w-9 h-9 text-indigo-600 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-900">
                  Klik untuk memilih file CSV atau drag &amp; drop di sini
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung file .csv update terbaru periode Agustus &amp; September dari Wulan
                </p>
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start space-x-2">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tips Unduh dari Google Sheets:</strong> Buka master spreadsheet &gt; klik <em>File &gt; Download &gt; Comma Separated Values (.csv)</em>, lalu drag &amp; drop file tersebut ke area di atas.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SHEETS LINK */}
          {activeTab === 'sheets' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Tautan Google Sheets (Publik / Published to Web)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/1.../edit..."
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <button
                  onClick={handleSheetsUrlFetch}
                  disabled={isLoadingUrl || !sheetsUrl.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {isLoadingUrl ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Tarik Data</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <span>Petunjuk Akses Google Sheets:</span>
                </div>
                <p>
                  1. Di Google Sheets, klik <strong>Share</strong> &gt; ubah General Access menjadi <strong>"Anyone with the link can view"</strong>.
                </p>
                <p>
                  2. Atau klik <strong>File &gt; Share &gt; Publish to web</strong> &gt; pilih format <strong>CSV</strong> &gt; Publish &gt; salin link tersebut ke sini.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div>
              <textarea
                rows={7}
                placeholder="Paste baris data CSV Anda di sini (termasuk baris header kolom)..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Kolom baru (Supervisor, L2, L1) akan otomatis dipetakan setelah dimuat.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            {activeTab === 'paste' && (
              <button
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Proses Teks CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
