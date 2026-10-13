import type { ProcessedRecord, RawDataRow } from '../types';
import { sheetDate } from './worksheetMetrics';
import { parseCustomDate } from './dataProcessor';

export type OmniMetrics={visitOmni:number;h0:number;h1:number;missingCheckout:number;missingCheckin:number;h0Rate:number;averageH0Minutes:number|null;h0DurationDays:number|null;invalidTimes:number};
const words=(value:string):string[]=>value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
const missing=(value:string)=>/^(?:-|null|undefined|n\/a)?$/i.test(value.trim());
export function ticketMonth(value:string):number|null {
  const numeric=value.trim().match(/^(\d{1,2})(?:[.\s]|$)/);
  if(numeric){const month=Number(numeric[1]);return month>=1&&month<=12?month:null;}
  const names=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const label=value.trim().toLocaleLowerCase().slice(-3);
  const index=names.indexOf(label);return index>=0?index+1:null;
}
export function matchesOmniPicMonth(visit:ProcessedRecord,pic:string,month:string):boolean {
  if(/\bcancel(?:led|ed)?\b/i.test(visit.status||''))return false;
  const first=words(pic)[0];if(!first)return false;
  const support=visit.rawSupportName || visit.raw?.['Nama Support'] || visit.supportName || '';
  if(!words(support).includes(first))return false;
  const date=sheetDate(visit.dateVisit);
  return !!date&&Number(date.slice(5,7))===ticketMonth(month);
}
export function calculateOmniMetrics(visits:ProcessedRecord[]):OmniMetrics {
  let h0=0,h1=0,missingCheckout=0,missingCheckin=0,invalidTimes=0;
  const durations:number[]=[];
  for(const visit of visits){
    const noIn=missing(visit.checkInTime||'');const noOut=missing(visit.checkOutTime||'');
    if(noIn)missingCheckin++;
    if(noOut)missingCheckout++;
    if(noIn||noOut)continue;
    const inDay=sheetDate(visit.checkInTime);const outDay=sheetDate(visit.checkOutTime);
    const start=parseCustomDate(visit.checkInTime);const end=parseCustomDate(visit.checkOutTime);
    if(!inDay||!outDay||!start||!end){invalidTimes++;continue;}
    const minutes=(end.getTime()-start.getTime())/60000;
    if(outDay===inDay){h0++;if(minutes>=0)durations.push(minutes);else invalidTimes++;}
    else if(outDay>inDay)h1++;
    else invalidTimes++;
  }
  const averageH0Minutes=durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:null;
  return {visitOmni:visits.length,h0,h1,missingCheckout,missingCheckin,h0Rate:visits.length?h0/visits.length*100:0,averageH0Minutes,h0DurationDays:averageH0Minutes===null?null:averageH0Minutes/1440,invalidTimes};
}
export type OmniIndex=Map<string,ProcessedRecord[]>;
export function buildOmniIndex(visits:ProcessedRecord[]):OmniIndex {
  const index:OmniIndex=new Map();
  for(const visit of visits){
    if(/\bcancel(?:led|ed)?\b/i.test(visit.status||''))continue;
    const date=sheetDate(visit.dateVisit);if(!date)continue;
    const month=Number(date.slice(5,7));
    const support=visit.rawSupportName||visit.raw?.['Nama Support']||visit.supportName||'';
    for(const token of new Set(words(support))){const key=token+'|'+month;index.set(key,[...(index.get(key)||[]),visit]);}
  }
  return index;
}
const queryKey=(pic:string,month:string)=>(words(pic)[0]||'')+'|'+ticketMonth(month);
export function omniForPicMonth(pic:string,month:string,visits:ProcessedRecord[],index=buildOmniIndex(visits)):OmniMetrics {
  return calculateOmniMetrics(index.get(queryKey(pic,month))||[]);
}
export function omniForTicketRows(rows:RawDataRow[],visits:ProcessedRecord[],index=buildOmniIndex(visits)):OmniMetrics {
  // Count each report row once across selected PIC queries, preserving actual duplicate source rows.
  const matching=new Set<ProcessedRecord>();
  for(const row of rows)for(const visit of index.get(queryKey(row.Pic||'',row.Month||''))||[])matching.add(visit);
  return calculateOmniMetrics([...matching]);
}
export function attachOmniColumns(row:RawDataRow,visits:ProcessedRecord[],index=buildOmniIndex(visits)):RawDataRow {
  const m=omniForPicMonth(row.Pic||'',row.Month||'',visits,index);
  return {...row,'Visit Omni':String(m.visitOmni),'H+0':String(m.h0),'H+0 % OMNI':String(m.h0Rate/100),'H+1':String(m.h1),'Belum Check Out':String(m.missingCheckout),'Belum Check In':String(m.missingCheckin),'Durasi H+0 OmnI':m.h0DurationDays===null?'':String(m.h0DurationDays)};
}
export function formatOmniDuration(minutes:number|null):string {
  if(minutes===null)return '—';const rounded=Math.round(minutes);
  return `${Math.floor(rounded/60)}j ${rounded%60}m`;
}
