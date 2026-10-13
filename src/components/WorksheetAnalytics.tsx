import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Ticket, Star, Users } from 'lucide-react';
import { CsatAgendaTable } from './CsatAgendaTable';
import { summarizeCsatAgendas } from '../utils/csatAgenda';
import { attachOmniColumns, buildOmniIndex, formatOmniDuration, omniForTicketRows } from '../utils/omniMetrics';
import { displayTeamName } from '../utils/teamDirectory';
import { WorksheetFilterBar } from './WorksheetFilterBar';
import { enrichWorksheetRows, matchesWorksheetFilter, emptyWorksheetFilter } from '../utils/worksheetFilters';
import type { ProcessedRecord, RawDataRow } from '../types';
import { csatScore, csatSummary, groupCounts, groupTickets, sheetDate, teamRole, ticketDataRows, ticketSummary, uniqueTeam } from '../utils/worksheetMetrics';

const number = (value: number) => value.toLocaleString('id-ID', {maximumFractionDigits:1});
const percentage = (value: number | null) => value === null ? '—' : number(value)+'%';
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const colors = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#f43f5e'];
type Metric = { title: string; value: string; note?: string };

function Metrics({ items }: { items: Metric[] }) {
  return <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">{items.map(item => <div key={item.title} className={panel}>
    <p className="text-xs font-semibold text-slate-500">{item.title}</p>
    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{item.value}</p>
    {item.note && <p className="mt-2 text-xs text-slate-500">{item.note}</p>}
  </div>)}</div>;
}

function Chart({ title, data, stacked = false, horizontal = false }: { title: string; data: {name:string;total:number;h0?:number;h1?:number}[]; stacked?:boolean; horizontal?:boolean }) {
  return <section className={panel}><h3 className="mb-4 font-semibold text-slate-900">{title}</h3>
    {!data.length ? <p className="py-20 text-center text-sm text-slate-500">Tidak ada data sesuai filter.</p> :
    <div className="h-72"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal?'vertical':'horizontal'} margin={{left:0,right:16,bottom:8}}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis type={horizontal?'number':'category'} dataKey={horizontal?undefined:'name'} tick={{fontSize:10}} allowDecimals={false} />
        <YAxis type={horizontal?'category':'number'} dataKey={horizontal?'name':undefined} width={horizontal?130:45} tick={{fontSize:10}} allowDecimals={false} />
        <Tooltip />
        {stacked ? <><Bar dataKey="h0" name="Tiket H+0" stackId="tickets" fill="#2563eb"/><Bar dataKey="h1" name="Tiket H+1" stackId="tickets" fill="#10b981" radius={[4,4,0,0]}/></> :
        <Bar dataKey="total" name="Jumlah" radius={[4,4,4,4]}>{data.map((item,index) => <Cell key={item.name} fill={colors[index%colors.length]}/>)}</Bar>}
      </BarChart>
    </ResponsiveContainer></div>}
    {stacked && <p className="mt-2 text-xs text-slate-500"><span className="text-blue-600">● H+0</span> · <span className="text-emerald-600">● H+1</span></p>}
  </section>;
}

const filterLabels: Record<string,string> = {Month:'Bulan',Department:'Departemen',Area:'Area',Pic:'PIC',Rating:'Rating','Nama Support':'Support','Visit Type':'Jenis kunjungan','Book Type':'Jenis booking','Job Tittle':'Jabatan'};

export function WorksheetAnalytics({ id, rows, renderDetails, visits = [], omniVisits = visits, teamMasterRows = [] }: { id:string; rows:RawDataRow[]; visits?:ProcessedRecord[]; omniVisits?:ProcessedRecord[]; teamMasterRows?:RawDataRow[]; renderDetails:(rows:RawDataRow[])=>React.ReactNode }) {
  const [search,setSearch] = useState('');
  const [choices,setChoices] = useState<Record<string,string>>({});
  const [primary,setPrimary] = useState({...emptyWorksheetFilter});
  useEffect(() => {setSearch('');setChoices({});setPrimary({...emptyWorksheetFilter});},[id]);
  const omniIndex = useMemo(()=>buildOmniIndex(omniVisits),[omniVisits]);
  const source = useMemo(() => id==='ticket' ? ticketDataRows(rows).map(row=>attachOmniColumns(row,omniVisits,omniIndex)) : id==='team' ? uniqueTeam(rows) : rows,[rows,id,omniVisits,omniIndex]);
  const fields = id==='ticket' ? ['Department'] : id==='csat' ? ['Rating','Visit Type'] : ['Job Tittle'];
  const enriched = useMemo(()=>enrichWorksheetRows(id,source,visits,teamMasterRows),[id,source,visits,teamMasterRows]);
  const primaryRows = useMemo(()=>id==='team'?source:enriched.filter(item=>matchesWorksheetFilter(item,primary,id)).map(item=>item.row),[id,source,enriched,primary]);
  const filtered = useMemo(() => primaryRows.filter(row => {
    if(search && !Object.values(row).some(value => String(value || '').toLocaleLowerCase().includes(search.toLocaleLowerCase()))) return false;
    return !Object.entries(choices).some(([key,value])=>value && row[key]?.trim()!==value);
  }),[primaryRows,search,choices]);
  const ticket = ticketSummary(filtered);
  const csat = csatSummary(filtered);
  const agenda = useMemo(()=>summarizeCsatAgendas(id==='csat'?filtered:[],omniVisits),[id,filtered,omniVisits]);
  const omni = useMemo(()=>omniForTicketRows(id==='ticket'?filtered:[],omniVisits,omniIndex),[id,filtered,omniVisits,omniIndex]);
  const roles = groupCounts(filtered,row=>teamRole(row['Job Tittle']));
  const roleCount = (name:string)=>roles.find(role=>role.name===name)?.total || 0;
  const metrics:Metric[] = id==='ticket' ? [
    {title:'Total tiket',value:number(ticket.total),note:'Jumlah Total Ticket pada baris PIC-periode'},
    {title:'Tiket H+0',value:number(ticket.h0)},
    {title:'Tiket H+1',value:number(ticket.h1)},
    {title:'Proporsi H+0',value:percentage(ticket.h0Rate),note:'H+0 ÷ (H+0 + H+1)'},
    {title:'Jumlah visit',value:number(ticket.visits),note:'Kolom Visit Qty pada worksheet tiket'},
    {title:'PIC terlibat',value:number(ticket.pics),note:`${ticket.rows} baris PIC-periode sesuai filter`},
  ] : id==='csat' ? [
    {title:'Respons CSAT',value:number(csat.responses)},
    {title:'Agenda terhubung',value:agenda.agendaCount?number(agenda.agendaCount):agenda.unresolved?'—':'0',note:agenda.unresolved?`${agenda.unresolved} respons belum memiliki kaitan agenda yang pasti`:`${csat.tickets} tiket unik pada respons sesuai filter`},
    {title:'Rata-rata CSAT',value:agenda.average===null?'—':agenda.average.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2})+' / 5'},
    {title:'Tingkat kepuasan',value:percentage(agenda.satisfaction),note:'Nilai ≥ 4; agenda yang sama dirata-ratakan dahulu'},
    {title:'Feedback tertulis',value:number(csat.feedback)},
    {title:'Agenda >1 respons',value:agenda.agendaCount?number(agenda.multipleResponses):agenda.unresolved?'—':'0',note:`${csat.rated} respons memiliki rating valid`},
  ] : [
    {title:'Total karyawan',value:number(filtered.length),note:'Karyawan unik berdasarkan email atau nama'},
    {title:'Supervisor',value:number(roleCount('Supervisor'))},
    {title:'Consultant',value:number(roleCount('Consultant'))},
    {title:'Implementor',value:number(roleCount('Implementor'))},
    {title:'Jenis jabatan',value:number(new Set(filtered.map(row=>row['Job Tittle']).filter(Boolean)).size)},
    {title:'Email tercatat',value:number(filtered.filter(row=>!!row['Email User']?.trim()).length)},
  ];
  const monthlyCSAT = useMemo(() => groupCounts(filtered.filter(row=>sheetDate(row['Created At (Date Created)'])),row=>sheetDate(row['Created At (Date Created)']).slice(0,7)).sort((a,b)=>a.name.localeCompare(b.name)),[filtered]);
  const ratingData = ['5 · Sangat Puas','4–<5 · Puas','3–<4 · Cukup','2–<3 · Tidak Puas','1–<2 · Sangat Tidak Puas'].map((name,index)=>({name,total:agenda.agendas.filter(item=>item.score!==null&&Math.floor(item.score)===5-index).length}));
  const team = useMemo(()=>[...filtered].sort((a,b)=>(a['Nama Karyawan']||'').localeCompare(b['Nama Karyawan']||'')),[filtered]);
  const Icon = id==='csat' ? Star : id==='ticket' ? Ticket : Users;
  return <div className="space-y-5">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon className="h-6 w-6"/></div><div>
      <h2 className="text-xl font-bold text-slate-900">{id==='ticket'?'Performa Tiket':id==='csat'?'Kepuasan Pelanggan':'Struktur & Direktori Tim'}</h2>
      <p className="mt-1 text-sm text-slate-500">{id==='ticket'?'Pantau volume tiket dan penyelesaian per periode, departemen, area, dan PIC.':id==='csat'?'Pantau penilaian pelanggan, tren respons, dan feedback layanan.':'Kenali komposisi jabatan dan temukan anggota tim.'}</p>
    </div></div>
    {id !== 'team' && <WorksheetFilterBar id={id} items={enriched} filter={primary} onChange={setPrimary} count={filtered.length} displayName={name=>displayTeamName(name,teamMasterRows)}/>}
    <div className={panel+' flex flex-wrap items-end gap-3'}>
      {id==='team' && <label className="flex-1 min-w-48 text-xs font-semibold text-slate-500">{id==='team'?'Cari anggota tim':'Cari di subdashboard'}
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={id==='team'?'Nama, email, atau jabatan…':'Cari PIC, tiket, atau data lainnya…'} className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm font-normal text-slate-900"/>
      </label>}
      {fields.map(field=><label key={field} className="text-xs font-semibold text-slate-500">{filterLabels[field]}
        <select aria-label={filterLabels[field]} value={choices[field]||''} onChange={e=>setChoices(previous=>({...previous,[field]:e.target.value}))} className="mt-1 block max-w-52 rounded-lg border border-slate-200 p-2 text-sm font-normal text-slate-900"><option value="">Semua {filterLabels[field].toLocaleLowerCase()}</option>{[...new Set(source.map(row=>row[field]?.trim()).filter(Boolean))].sort().map(value=><option key={value} value={value}>{value}</option>)}</select>
      </label>)}
      <button onClick={()=>{setSearch('');setChoices({});setPrimary({...emptyWorksheetFilter});}} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Reset filter</button>
    </div>
    <Metrics items={metrics}/>
    {id==='ticket' && <section className="space-y-3" aria-label="Perhitungan Omni"><h3 className="font-semibold text-slate-900">Omni · Report Visit</h3><Metrics items={[
      {title:'Visit Omni',value:number(omni.visitOmni),note:'Status Cancel dikecualikan'},
      {title:'H+0 Omni',value:number(omni.h0),note:'Tanggal check-out = tanggal check-in'},
      {title:'H+0 % OMNI',value:percentage(omni.h0Rate),note:'H+0 ÷ Visit Omni'},
      {title:'H+1 Omni',value:number(omni.h1),note:'Tanggal check-out > tanggal check-in'},
      {title:'Belum Check Out',value:number(omni.missingCheckout)},
      {title:'Belum Check In',value:number(omni.missingCheckin)},
      {title:'Durasi H+0 Omni',value:formatOmniDuration(omni.averageH0Minutes),note:'Rata-rata durasi H+0; nilai sheet disimpan sebagai pecahan hari'},
    ]}/><p className="text-xs text-slate-500">Dicocokkan memakai kata pertama PIC dan bulan Date Visit. Setiap baris report dihitung sekali pada KPI keseluruhan; rincian per PIC tetap mengikuti pencocokan masing-masing. Baris tanpa check-in dan check-out masuk kedua indikator belum check. {omni.invalidTimes>0?`${omni.invalidTimes} baris memiliki waktu yang tidak valid; durasi tersebut tidak dirata-ratakan.`:''}</p></section>}
    {id==='csat' && <><p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">CSAT dirata-ratakan per agenda: 4 dan 5 menjadi 4,5. Rata-rata dashboard memberikan bobot yang sama ke tiap agenda yang teridentifikasi. {agenda.unresolved>0?`${agenda.unresolved} respons belum dapat dikaitkan ke agenda dengan pasti; respons tersebut tetap dinilai terpisah.`:''}</p><CsatAgendaTable agendas={agenda.agendas}/></>}
    {id==='ticket' && <><div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Chart title="Tren Tiket H+0 & H+1 per Bulan" data={groupTickets(filtered,'Month').sort((a,b)=>a.name.localeCompare(b.name))} stacked/>
      <Chart title="Volume Tiket per Departemen" data={groupTickets(filtered,'Department').sort((a,b)=>b.total-a.total)} horizontal/>
      <Chart title="Volume Tiket per Area" data={groupTickets(filtered,'Area').sort((a,b)=>b.total-a.total)} horizontal/>
      <Chart title="10 PIC dengan Volume Tiket Terbesar" data={groupTickets(filtered,'Pic').sort((a,b)=>b.total-a.total).slice(0,10)} horizontal/>
    </div><p className="text-xs text-slate-500">Perhitungan memakai baris berisi bulan dan PIC. Baris formula tanpa identitas PIC-periode tidak ikut dihitung. Visit Qty adalah data worksheet tiket, terpisah dari metrik dashboard visit.</p></>}
    {id==='csat' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Chart title="Tren Respons CSAT per Bulan Submit" data={monthlyCSAT}/>
      <Chart title="Distribusi Nilai CSAT" data={ratingData} horizontal/>
      <Chart title="Respons CSAT per Support" data={groupCounts(filtered,row=>row['Nama Support']||'').slice(0,10)} horizontal/>
      <Chart title="Respons per Jenis Kunjungan" data={groupCounts(filtered,row=>row['Visit Type']||'')} horizontal/>
    </div>}
    {id==='team' && <><Chart title="Komposisi Jabatan Tim" data={roles} horizontal/>
      <section className={panel}><h3 className="mb-4 text-base font-semibold text-slate-900">Direktori Anggota Tim</h3>
        {!team.length && <p className="text-sm text-slate-500">Tidak ada anggota tim sesuai filter.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{team.map(row=><article key={row['Email User']||row['Nama Karyawan']} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600">{(row['Nama Karyawan']||'?').split(' ').slice(0,2).map(name=>name[0]).join('')}</span><p className="text-sm font-semibold text-slate-900">{row['Nama Karyawan']}</p></div>
          <span className="mt-3 inline-block rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{teamRole(row['Job Tittle'])}</span>
          <p className="mt-2 text-xs text-slate-500">{row['Job Tittle']}</p><p className="mt-2 break-all text-xs text-slate-600">{row['Email User']||'Email belum tercatat'}</p>
        </article>)}</div>
      </section></>}
    <details className={panel}><summary className="cursor-pointer font-semibold text-slate-900">Rincian {id==='ticket'?'Tiket':id==='csat'?'Respons CSAT':'Team Master'} · {filtered.length.toLocaleString('id-ID')} baris</summary><div className="mt-5">{renderDetails(filtered)}</div></details>
  </div>;
}
