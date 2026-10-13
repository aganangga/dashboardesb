import React, { useRef, useState } from 'react';
import { CheckCircle2, CloudDownload, KeyRound, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import type { OmniSyncDataset } from '../utils/omniSync';
import { parseOmniSyncResponse } from '../utils/omniSync';

interface OmniSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (dataset: OmniSyncDataset) => void;
}

export const OmniSyncModal: React.FC<OmniSyncModalProps> = ({ isOpen, onClose, onApply }) => {
  // Never persist a dashboard key in localStorage, cookies, URLs, or GitHub source.
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<OmniSyncDataset | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const close = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setKey('');
    setPreview(null);
    setError('');
    setBusy(false);
    onClose();
  };

  const pullOmni = async () => {
    if (!key.trim() || busy) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError('');
    setPreview(null);

    try {
      const response = await fetch('/api/omni/visits', {
        method: 'POST',
        headers: {
          'x-dashboard-access-key': key.trim(),
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const serverMessage = result && typeof result === 'object' && 'error' in result
          ? String((result as { error?: string }).error || '')
          : '';
        throw Error(serverMessage || 'Omni API belum dapat dihubungi.');
      }
      const candidate = parseOmniSyncResponse(result);
      if (controller.signal.aborted) return;
      setPreview(candidate);
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : 'Sinkronisasi Omni gagal.');
      }
    } finally {
      setKey(''); // Discard even the separate dashboard access key after every attempt.
      if (!controller.signal.aborted) setBusy(false);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="omni-dialog-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <header className="flex justify-between items-start gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><CloudDownload className="w-5 h-5"/></span>
            <div>
              <h2 id="omni-dialog-title" className="font-bold text-slate-900">Sinkronisasi Omni Internal</h2>
              <p className="mt-1 text-xs text-slate-500">Ambil data visit melalui API server-side yang aman</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup Omni" onClick={close}
            className="rounded-lg p-2 hover:bg-slate-100 text-slate-500"><X className="h-5 w-5"/></button>
        </header>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-3 flex gap-2.5 text-xs text-slate-700 leading-5">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600"/>
            <span>Token API Omni tersimpan di Netlify, bukan di browser. Masukkan kunci akses dashboard yang diberikan admin. Data lama tidak akan berubah sampai kamu menekan Terapkan Data.</span>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void pullOmni(); }} className="space-y-2">
            <label htmlFor="omni-dashboard-access" className="block text-xs font-semibold text-slate-700">
              Kunci akses sinkronisasi dashboard
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                <input id="omni-dashboard-access" type="password" autoComplete="off"
                  value={key} onChange={(event) => setKey(event.target.value)}
                  placeholder="Kunci akses dari admin" disabled={busy}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"/>
              </div>
              <button type="submit" disabled={busy || !key.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-indigo-700">
                {busy ? <LoaderCircle className="w-4 h-4 animate-spin"/> : <CloudDownload className="w-4 h-4"/>}
                Ambil Data
              </button>
            </div>
          </form>

          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
          {preview && (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-800 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4"/> Data Omni siap ditinjau
              </div>
              <p className="text-xs text-slate-700"><strong>{preview.data.length.toLocaleString('id-ID')}</strong> baris visit, {preview.headers.length} kolom terdeteksi.</p>
              <p className="text-[11px] text-slate-600">Kolom utama: Ticket ID dan Date Visit. Mapping consultant/master, pengecualian visit Jane, serta rumus KPI tetap memakai logika dashboard yang sudah disetujui.</p>
              <button type="button" onClick={() => { onApply(preview); close(); }}
                className="w-full rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800">
                Terapkan {preview.data.length.toLocaleString('id-ID')} Baris ke Dashboard
              </button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            Sinkronisasi manual saat tombol Ambil Data ditekan. Jika format/pagination API Omni berbeda, sistem membatalkan penggantian data hingga mapping diverifikasi.
          </p>
        </div>
      </section>
    </div>
  );
};
