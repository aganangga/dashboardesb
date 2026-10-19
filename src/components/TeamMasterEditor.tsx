import React, { useMemo, useState } from 'react';
import { CONSULTANT_TO_SPV_MAP, MASTER_DATA_TEAM } from '../utils/dataProcessor';

type Assignment = {id:number;employee_name:string;l2_name:string;supervisor_name:string;effective_from:string;effective_until:string|null};
const api='/api/team-assignments';
export function TeamMasterEditor() {
 const [token,setToken]=useState('');
 const [history,setHistory]=useState<Assignment[]>([]);
 const [employee,setEmployee]=useState('Tegar Rangga');
 const [l2,setL2]=useState('Agung Setiawan');
 const [date,setDate]=useState('2026-08-01');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const consultants=Object.keys(CONSULTANT_TO_SPV_MAP).filter(name=>name!=='ERP Advisor');
 const members=useMemo(()=>[...new Set(MASTER_DATA_TEAM.filter(r=>r.role==='L1 Support').map(r=>r.l1FullName))].sort(),[]);
 const supervisor=CONSULTANT_TO_SPV_MAP[l2]||'';
 const current=history.filter(h=>h.employee_name.toLocaleLowerCase()===employee.toLocaleLowerCase())
   .sort((a,b)=>a.effective_from.localeCompare(b.effective_from));
 const request=async(method:'GET'|'POST')=>{
   if(!token.trim()){setMessage('Isi token editor terlebih dahulu.');return;}
   setBusy(true);setMessage('');
   try {
    const resp=await fetch(api,{method,headers:{Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':'application/json'}:{})},
      ...(method==='POST'?{body:JSON.stringify({employee_name:employee,l2_name:l2,supervisor_name:supervisor,effective_from:date})}:{})});
    const result=await resp.json();
    if(!resp.ok)throw new Error(result.error||'Permintaan gagal');
    if(method==='GET'){setHistory(result.records||[]);setMessage('Histori database berhasil dimuat.');}
    else {setMessage('Perubahan tersimpan. Muat histori untuk memeriksa hasil.');await loadHistory();}
   }catch(error){setMessage(error instanceof Error?error.message:'Gagal memproses perubahan');}
   finally{setBusy(false);}
 };
 const loadHistory=async()=>{
   const resp=await fetch(api,{headers:{Authorization:`Bearer ${token}`}});
   if(resp.ok){const data=await resp.json();setHistory(data.records||[]);}
 };
 return <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm space-y-4">
   <div><h3 className="font-bold text-slate-900">Edit Mapping Team · Supabase</h3>
     <p className="text-xs text-slate-500 mt-1">Tambahkan perpindahan L1 dengan tanggal efektif. Histori lama dipertahankan; tidak mengubah sumber Google Sheets.</p></div>
   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
     <label className="text-xs font-semibold text-slate-600">L1
       <select value={employee} onChange={e=>setEmployee(e.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm">
         {members.map(name=><option key={name}>{name}</option>)}</select></label>
     <label className="text-xs font-semibold text-slate-600">L2 Baru
       <select value={l2} onChange={e=>setL2(e.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm">
         {consultants.map(name=><option key={name}>{name}</option>)}</select></label>
     <label className="text-xs font-semibold text-slate-600">SPV (otomatis)
       <input readOnly value={supervisor} className="mt-1 block w-full rounded-lg border bg-slate-50 p-2 text-sm"/></label>
     <label className="text-xs font-semibold text-slate-600">Tanggal efektif
       <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm"/></label>
   </div>
   <div className="flex flex-wrap items-end gap-2">
     <label className="text-xs text-slate-600 flex-1 min-w-52">Token admin editor
       <input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Token dari konfigurasi Netlify" className="mt-1 block w-full rounded-lg border p-2 text-sm"/></label>
     <button type="button" disabled={busy} onClick={()=>void request('GET')} className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-50">Muat histori</button>
     <button type="button" disabled={busy||!supervisor||!date} onClick={()=>{if(window.confirm(`Simpan perpindahan ${employee} ke ${l2} mulai ${date}?`))void request('POST');}} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Simpan perpindahan</button>
   </div>
   {message&&<p role="status" className="text-sm text-indigo-800">{message}</p>}
   <div className="overflow-x-auto"><table className="min-w-full text-xs">
      <thead className="bg-slate-50"><tr><th className="p-2 text-left">L1</th><th className="p-2 text-left">L2</th><th className="p-2 text-left">SPV</th><th className="p-2 text-left">Mulai</th><th className="p-2 text-left">Sampai</th></tr></thead>
      <tbody>{current.map(item=><tr key={item.id} className="border-t"><td className="p-2">{item.employee_name}</td><td className="p-2">{item.l2_name}</td><td className="p-2">{item.supervisor_name}</td><td className="p-2">{item.effective_from}</td><td className="p-2">{item.effective_until||'Aktif'}</td></tr>)}</tbody>
   </table>{!current.length&&<p className="py-3 text-xs text-slate-500">Muat histori untuk melihat catatan dari Supabase.</p>}</div>
 </section>;
}
