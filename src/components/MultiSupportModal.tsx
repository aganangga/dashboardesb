import React, { useState } from 'react';
import { ProcessedRecord } from '../types';
import { X, Users, CheckCircle2, Building, Calendar, Info, ShieldCheck } from 'lucide-react';

interface MultiSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ProcessedRecord[];
}

export const MultiSupportModal: React.FC<MultiSupportModalProps> = ({ isOpen, onClose, records }) => {
  const [activeTab, setActiveTab] = useState<'supportTeam' | 'outletJoin'>('supportTeam');

  if (!isOpen) return null;

  // 1. Tickets with Support Team (Line 2 Separator)
  const supportTeamRecords = records.filter((r) => r.hasSupportTeam);

  // 2. Group by uniqueVisitKey where there are >= 2 different support names
  const groupMap = new Map<string, ProcessedRecord[]>();
  records.forEach((r) => {
    if (!groupMap.has(r.uniqueVisitKey)) {
      groupMap.set(r.uniqueVisitKey, []);
    }
    groupMap.get(r.uniqueVisitKey)!.push(r);
  });

  const multiSupportGroups = Array.from(groupMap.entries())
    .map(([key, group]) => {
      const distinctSupports = Array.from(new Set(group.map((g) => g.supportName).filter(Boolean)));
      return {
        key,
        outletName: group[0].outletName,
        date: group[0].agendaDate,
        area: group[0].area,
        supervisor: group[0].supervisor,
        records: group,
        distinctSupports,
      };
    })
    .filter((g) => g.distinctSupports.length > 1);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Rincian Support Team &amp; Multi-Support Tiket
              </h2>
              <p className="text-xs text-slate-500">
                Primary Key: Tiket ID + Date Visit = Total Visit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 bg-white px-6 pt-2 text-xs">
          <button
            onClick={() => setActiveTab('supportTeam')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'supportTeam'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Support Team ({supportTeamRecords.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('outletJoin')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'outletJoin'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Join Outlet Multi-Support ({multiSupportGroups.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/40">
          {activeTab === 'supportTeam' ? (
            <div>
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  Kunjungan dengan tim 2-3 orang. Karakter nama di kolom support otomatis dipisah menjadi:
                  <strong> Line 1 (Nama Support Utama)</strong> dan <strong>Line 2 (Support Team)</strong>.
                </div>
              </div>

              {supportTeamRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ada tiket dengan Support Team pada filter saat ini.
                </div>
              ) : (
                supportTeamRecords.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 mb-2 hover:border-slate-300 transition-all text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="font-mono font-bold text-indigo-600">{r.ticketId}</span>
                      <span className="text-slate-500">{r.dateVisit} • {r.area}</span>
                    </div>
                    <div className="font-semibold text-slate-900 text-sm mb-2">{r.outletName}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                          Nama Support (Line 1):
                        </span>
                        <span className="text-slate-900 font-bold">{r.supportName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block uppercase font-semibold">
                          Support Team (Line 2):
                        </span>
                        <span className="text-emerald-700 font-bold">{r.supportTeam}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div>
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  Ditemukan {multiSupportGroups.length} outlet/hari dengan multiple staff support. Sesuai aturan deduplikasi dihitung sebagai 1 visit.
                </div>
              </div>

              {multiSupportGroups.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ditemukan outlet dengan multi-support pada filter saat ini.
                </div>
              ) : (
                multiSupportGroups.map((grp) => (
                  <div
                    key={grp.key}
                    className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                      <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                        <Building className="w-4 h-4 text-indigo-600" />
                        <span>{grp.outletName}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {grp.date}
                        </span>
                        <span>•</span>
                        <span className="text-indigo-600 font-sans font-medium">{grp.area}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-slate-500">Support Bertugas ({grp.distinctSupports.length}):</span>
                      {grp.distinctSupports.map((sup) => (
                        <span
                          key={sup}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          {sup}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span>
                        Jumlah Tiket: <strong className="text-slate-900">{grp.records.length} tiket</strong>
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        → Dihitung sebagai 1 Visit
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
