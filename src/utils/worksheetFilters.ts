import type { ProcessedRecord, RawDataRow } from '../types';
import { getMasterAssignmentsForSupport, isSameSupportMember, MASTER_DATA_TEAM } from './dataProcessor';
import { sheetDate } from './worksheetMetrics';

type Assignment = { supervisor: string; consultantName: string; supportName: string };
export type WorksheetFilterRow = { row: RawDataRow; assignments: Assignment[]; person: string; areas: string[]; date: string; period: string };
export type WorksheetFilter = { search: string; supervisor: string; consultant: string; support: string; area: string; bookType: string; period: string; start: string; end: string };
export const emptyWorksheetFilter: WorksheetFilter = { search:'',supervisor:'',consultant:'',support:'',area:'',bookType:'',period:'',start:'',end:'' };
const clean = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g,' ');
export const UNMAPPED = 'Belum terpetakan';

export function assignmentsForPerson(person: string): Assignment[] {
  const exact = getMasterAssignmentsForSupport(person);
  if (exact.length) return exact;
  const key = clean(person);
  if (!key) return [];
  // A shortened name is accepted only when it identifies one canonical person.
  const candidates = [...new Set(MASTER_DATA_TEAM.flatMap(item=>[item.l1FullName,item.l2]))]
    .filter(name=>clean(name).startsWith(key+' ') || key.startsWith(clean(name)+' '));
  return candidates.length===1 ? getMasterAssignmentsForSupport(candidates[0]) : [];
}

export function enrichWorksheetRows(id: string, rows: RawDataRow[], visits: ProcessedRecord[]): WorksheetFilterRow[] {
  const byTicket = new Map<string,ProcessedRecord[]>();
  for (const visit of visits) {
    const key = clean(visit.ticketId);
    byTicket.set(key,[...(byTicket.get(key)||[]),visit]);
  }
  return rows.map(row=> {
    const person = (id==='ticket' ? row.Pic : row['Nama Support'])?.trim() || 'Tidak tercatat';
    const matching = id==='csat' ? byTicket.get(clean(row['Ticket ID']||''))||[] : [];
    const owned = matching.filter(visit=>[visit.supportName,...visit.supportTeamList,...visit.jointSupportNames].some(name=>isSameSupportMember(name,person) || isSameSupportMember(person,name)));
    let assignments = owned.length ? owned.map(visit=>({supervisor:visit.supervisor,consultantName:visit.consultantName,supportName:person})) : assignmentsForPerson(person);
    if(!assignments.length) assignments = [{supervisor:UNMAPPED,consultantName:UNMAPPED,supportName:person}];
    const areas = id==='ticket' ? [row.Area?.trim() || UNMAPPED] : [...new Set((owned.length?owned:matching).map(visit=>visit.area).filter(Boolean))];
    const date = id==='csat' ? sheetDate(row['Created At (Date Created)']) : '';
    return {row,assignments,person,areas:areas.length?areas:[UNMAPPED],date,period:id==='ticket'?row.Month?.trim()||'':date.slice(0,7)};
  });
}

export function matchesWorksheetFilter(item: WorksheetFilterRow, filter: WorksheetFilter, id: string): boolean {
  if (filter.search) {
    const haystack = [...Object.values(item.row),item.person,...item.areas,...item.assignments.flatMap(a=>[a.supervisor,a.consultantName])].join(' ').toLocaleLowerCase();
    if(!haystack.includes(filter.search.toLocaleLowerCase())) return false;
  }
  // Keep SPV and consultant paired so multi-owner records never produce a false relationship.
  if(!item.assignments.some(a=>(!filter.supervisor||a.supervisor===filter.supervisor)&&(!filter.consultant||a.consultantName===filter.consultant))) return false;
  if(filter.support && item.person!==filter.support) return false;
  if(filter.area && !item.areas.includes(filter.area)) return false;
  if(filter.period && item.period!==filter.period) return false;
  if(id==='csat') {
    if(filter.bookType && item.row['Book Type']?.trim()!==filter.bookType) return false;
    if(filter.start && (!item.date || item.date<filter.start)) return false;
    if(filter.end && (!item.date || item.date>filter.end)) return false;
  }
  return true;
}
