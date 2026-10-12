import React, { useState } from 'react';
import {
  Globe,
  Copy,
  Check,
  ExternalLink,
  Users,
  ShieldAlert,
  ShieldCheck,
  Download,
  X,
  Share2,
  Sparkles,
  Info
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadHtml: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onDownloadHtml,
}) => {
  const [copied, setCopied] = useState(false);

  // The public URL provided by AI Studio environment
  const publicUrl = 'https://ais-pre-vfi2bhap3ilkj64eh3b456-117944600269.asia-east1.run.app';
  const devUrl = 'https://ais-dev-vfi2bhap3ilkj64eh3b456-117944600269.asia-east1.run.app';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Share2 className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Bagikan Akses Dashboard &amp; Kolaborasi Tim</h3>
              <p className="text-xs text-indigo-100/90">
                Akses publik untuk semua orang &amp; panduan akses edit tim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Public URL for Anyone */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4.5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded-md bg-emerald-600 text-white">
                  <Globe className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    URL Akses Publik (Dapat Diakses Siapapun Tanpa Login)
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Gunakan tautan resmi <code className="font-semibold bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">ais-pre</code> berikut agar publik dan rekan tim dapat membuka dashboard:
                  </p>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                Publik Aktif
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-lg border border-emerald-300 shadow-2xs">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 text-xs sm:text-sm font-mono text-slate-800 px-2 py-1.5 bg-transparent border-none outline-none select-all truncate"
              />
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    copied
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-white" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Salin Link
                    </>
                  )}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Buka
                </a>
              </div>
            </div>
          </div>

          {/* Explanation on why ais-dev fails vs ais-pre */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
            <h5 className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Mengapa link <code className="bg-slate-200 px-1 py-0.5 rounded text-rose-700 font-mono">ais-dev</code> tidak bisa dibuka publik?</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200">
                <div className="flex items-center space-x-1.5 text-rose-800 font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>URL Internal: <code className="text-[11px]">ais-dev-...</code></span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Link ini adalah server sesi sandbox development yang terkunci hanya untuk akun Google pemilik proyek saat sedang mengedit di AI Studio. Orang lain yang membuka akan mendapat <em>403 Forbidden / Access Denied</em>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center space-x-1.5 text-emerald-800 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>URL Publik: <code className="text-[11px]">ais-pre-...</code></span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Link ini adalah endpoint resmi Google AI Studio untuk berbagi (preview/shared). <strong>Siapapun yang memiliki link ini dapat membuka, melihat, dan berinteraksi dengan dashboard secara bebas tanpa perlu login.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Giving Edit Access to Team Members */}
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-indigo-600 text-white">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-indigo-950">
                  Cara Memberikan Akses Edit Proyek ke Anggota Tim
                </h4>
                <p className="text-xs text-indigo-700">
                  Untuk mengizinkan rekan tim ikut mengeksplorasi, mengedit kode, dan mengubah prompt di Google AI Studio:
                </p>
              </div>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 bg-white p-3.5 rounded-lg border border-indigo-100">
              <li className="leading-relaxed">
                Di jendela platform <strong>Google AI Studio Build</strong> (halaman tempat Anda saat ini mengetik prompt), lihat ke pojok kanan atas layar.
              </li>
              <li className="leading-relaxed">
                Klik tombol <strong>"Share"</strong> atau <strong>"Bagikan"</strong>.
              </li>
              <li className="leading-relaxed">
                Ketikkan email Google rekan tim Anda yang ingin diberikan akses edit.
              </li>
              <li className="leading-relaxed">
                Pilih peran sebagai <strong>"Editor"</strong> (agar tim dapat mengedit kode, data, dan konfigurasi) lalu klik <strong>Send / Simpan</strong>.
              </li>
            </ol>
          </div>

          {/* Section 3: Standalone Offline HTML File */}
          <div className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Opsi File Mandiri: Unduh HTML Offline</span>
              </h4>
              <p className="text-xs text-slate-500">
                Anda juga dapat mengunduh 1 file HTML mandiri dan mengirimkannya via WhatsApp/Email. File ini dapat dibuka langsung di browser manapun tanpa koneksi server.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onDownloadHtml();
              }}
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Unduh HTML Mandiri
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
