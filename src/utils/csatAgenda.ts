import type { ProcessedRecord, RawDataRow } from '../types';
import { isSameSupportMember } from './dataProcessor';
import { csatScore, sheetDate } from './worksheetMetrics';
const clean=(value:string)=>value.trim().toLocaleLowerCase();
function scheduleKey(value:string):string {
  const date=sheetDate(value);if(!date)return '';
  const time=value.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return date+(time?'T'+time[1].padStart(2,'0')+':'+time[2]+':'+(time[3]||'00'):'');
}
export type AgendaRating={key:string;ticketId:string;responses:number;validResponses:number;score:number|null;resolved:boolean};
export function csatAgendaKey(row:RawDataRow,index:number,visits:ProcessedRecord[],byTicket?:Map<string,ProcessedRecord[]>):{key:string;resolved:boolean} {
  const id=row['Agenda ID']||row['ID Agenda'];if(id?.trim())return {key:'id:'+clean(id),resolved:true};
  const ticket=clean(row['Ticket ID']||'');
  if(!ticket)return {key:'unresolved:'+index,resolved:false};
  const schedule=scheduleKey(row['Jadwal Agenda']||'');
  if(schedule)return {key:ticket+'|'+schedule,resolved:true};
  const matching=byTicket?.get(ticket)||visits.filter(visit=>clean(visit.ticketId)===ticket);
  const owned=matching.filter(visit=>[visit.supportName,...visit.supportTeamList,...visit.jointSupportNames].some(name=>isSameSupportMember(name,row['Nama Support']||'')||isSameSupportMember(row['Nama Support']||'',name)));
  const dates=[...new Set((owned.length?owned:matching).map(visit=>scheduleKey(visit.raw?.['Jadwal Agenda']||'')||sheetDate(visit.dateVisit)).filter(Boolean))];
  if(dates.length===1)return {key:ticket+'|'+dates[0],resolved:true};
  return {key:'unresolved:'+index,resolved:false};
}
export function aggregateCsatAgendas(rows:RawDataRow[],visits:ProcessedRecord[]):AgendaRating[] {
  const byTicket=new Map<string,ProcessedRecord[]>();
  for(const visit of visits){const key=clean(visit.ticketId);byTicket.set(key,[...(byTicket.get(key)||[]),visit]);}
  const knownTimes=new Map<string,Set<string>>();
  const register=(ticket:string,schedule:string)=>{
    const key=scheduleKey(schedule);if(!key.includes('T'))return;
    const dateKey=clean(ticket)+'|'+key.slice(0,10);const set=knownTimes.get(dateKey)||new Set<string>();set.add(clean(ticket)+'|'+key);knownTimes.set(dateKey,set);
  };
  for(const row of rows)register(row['Ticket ID']||'',row['Jadwal Agenda']||'');
  for(const visit of visits)register(visit.ticketId,visit.raw?.['Jadwal Agenda']||'');
  const groups=new Map<string,{ticketId:string;responses:number;scores:number[];resolved:boolean}>();
  rows.forEach((row,index)=>{
    let {key,resolved}=csatAgendaKey(row,index,visits,byTicket);
    if(resolved&&/\|\d{4}-\d{2}-\d{2}$/.test(key)){
      const times=knownTimes.get(key);
      if(times?.size===1)key=[...times][0];
      else if(times&&times.size>1){key='unresolved:'+index;resolved=false;}
    }
    const score=csatScore(row.Rating);
    const group=groups.get(key)||{ticketId:row['Ticket ID']||'',responses:0,scores:[],resolved};
    group.responses++;if(score!==null)group.scores.push(score);groups.set(key,group);
  });
  return [...groups].map(([key,g])=>({key,ticketId:g.ticketId,responses:g.responses,validResponses:g.scores.length,score:g.scores.length?g.scores.reduce((a,b)=>a+b,0)/g.scores.length:null,resolved:g.resolved}));
}
export function summarizeCsatAgendas(rows:RawDataRow[],visits:ProcessedRecord[]) {
  const agendas=aggregateCsatAgendas(rows,visits);const valid=agendas.filter(a=>a.score!==null);
  return {agendas,agendaCount:agendas.filter(a=>a.resolved).length,ratedAgendas:valid.filter(a=>a.resolved).length,ratedUnits:valid.length,multipleResponses:agendas.filter(a=>a.resolved&&a.responses>1).length,unresolved:agendas.filter(a=>!a.resolved).length,
    average:valid.length?valid.reduce((sum,a)=>sum+a.score!,0)/valid.length:null,
    satisfaction:valid.length?valid.filter(a=>a.score!>=4).length/valid.length*100:null};
}
