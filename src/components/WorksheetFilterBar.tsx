import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { emptyWorksheetFilter, type WorksheetFilter, type WorksheetFilterRow } from '../utils/worksheetFilters';

const selectStyle='mt-1.5 block w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-normal text-slate-800 disabled:opacity-60';
const values=(items:string[])=>[...new Set(items.filter(Boolean))].sort();
export function WorksheetFilterBar({id,items,filter,onChange,count,displayName=(name:string)=>name}:{id:string;displayName?:(name:string)=>string;items:WorksheetFilterRow[];filter:WorksheetFilter;onChange:(filter:WorksheetFilter)=>void;count:number}) {
  const supervisor=values(items.flatMap(item=>item.assignments.map(a=>a.supervisor)));
  const consultant=values(items.flatMap(item=>item.assignments.filter(a=>!filter.supervisor||a.supervisor===filter.supervisor).map(a=>a.consultantName)));
  const supporters=values(items.filter(item=>item.assignments.some(a=>(!filter.supervisor||a.supervisor===filter.supervisor)&&(!filter.consultant||a.consultantName===filter.consultant))).map(item=>item.person));
  const areas=values(items.flatMap(item=>item.areas));
  const books=id==='csat'?values(items.map(item=>item.row['Book Type']?.trim()||'')):[];
  const periods=values(items.map(item=>item.period));
  const update=(key:keyof WorksheetFilter,value:string)=>onChange({...filter,[key]:value,...(key==='supervisor'?{consultant:'',support:''}:key==='consultant'?{support:''}:{})});
  const dropdown=(label:string,key:keyof WorksheetFilter,options:string[],disabled=false)=><label className="min-w-0 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}<select aria-label={label} disabled={disabled} value={filter[key]} onChange={e=>update(key,e.target.value)} className={selectStyle}><option value="">{disabled?'Tidak tersedia':'Semua '+label.toLocaleLowerCase()}</option>{options.map(value=><option key={value} value={value}>{displayName(value)}</option>)}</select></label>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm" aria-label={'Filter '+(id==='csat'?'CSAT':'Data Tiket')}>
    <div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input aria-label="Cari di subdashboard" type="search" value={filter.search} onChange={e=>update('search',e.target.value)} placeholder="Cari support / PIC, konsultan, SPV, area, atau tiket…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm"/></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {dropdown('Supervisor (SPV)','supervisor',supervisor)}
      {dropdown('Nama Konsulting','consultant',consultant)}
      {dropdown(id==='ticket'?'Support Team / PIC':'Support Team','support',supporters)}
      {dropdown('Area / Wilayah','area',areas)}
      {dropdown('Book Type','bookType',books,id==='ticket')}
      <div className="min-w-0"><label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{id==='ticket'?'Bulan':'Bulan / Tanggal'}<select aria-label={id==='ticket'?'Bulan':'Bulan submit'} value={filter.period} onChange={e=>update('period',e.target.value)} className={selectStyle}><option value="">Semua bulan</option>{periods.map(value=><option key={value} value={value}>{id==='csat'?new Date(value+'-01T12:00:00').toLocaleDateString('id-ID',{month:'long',year:'numeric'}):value}</option>)}</select></label>
        {id==='csat' && <div className="mt-2 flex min-w-0 items-center gap-1"><input aria-label="Tanggal mulai CSAT" type="date" value={filter.start} max={filter.end||undefined} onChange={e=>update('start',e.target.value)} className="min-w-0 w-1/2 rounded-md border border-slate-200 p-1 text-[10px]"/><span>–</span><input aria-label="Tanggal akhir CSAT" type="date" value={filter.end} min={filter.start||undefined} onChange={e=>update('end',e.target.value)} className="min-w-0 w-1/2 rounded-md border border-slate-200 p-1 text-[10px]"/></div>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>Menampilkan <strong className="text-blue-700">{count.toLocaleString('id-ID')}</strong> {id==='csat'?'respons CSAT':'baris PIC-periode'}</span><button onClick={()=>onChange({...emptyWorksheetFilter})} className="inline-flex items-center gap-1.5 font-semibold text-blue-600"><RotateCcw className="h-3.5 w-3.5"/>Reset filter utama</button></div>
    {id==='ticket' && <p className="mt-2 text-[11px] text-slate-500">Sheet tiket berupa rekap bulanan; tanggal harian dan Book Type belum tersedia.</p>}
  </section>;
}
