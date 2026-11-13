import type { MasterDataTeamItem, ProcessedRecord } from '../types';
import { getMasterAssignmentsForSupport, isSameSupportMember, parseCustomDate } from './dataProcessor';

export function getPersonalVisitMonth(record: ProcessedRecord): string {
  const date = parseCustomDate(record.dateVisit);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '';
}

function attendanceRank(record: ProcessedRecord): number {
  if (!record.checkInDateObj) return 0;
  return record.checkOutDateObj ? 2 : 1;
}

export function getPersonalVisits(
  records: ProcessedRecord[], person: string, month: string, roster: MasterDataTeamItem[],
) {
  const teams = new Set(getMasterAssignmentsForSupport(person, roster).map(assignment => assignment.consultantName));
  const visits = new Map<string, ProcessedRecord>();
  for (const record of records) {
    if (/\bcancel(?:led|ed)?\b/i.test(record.status)) continue;
    if (month && getPersonalVisitMonth(record) !== month) continue;
    const participants = record.rawSupportName.split(/[,;\n\r/]+/);
    if (!participants.some(name => isSameSupportMember(name, person, roster))) continue;

    const existing = visits.get(record.primaryVisitKey);
    if (!existing || attendanceRank(record) > attendanceRank(existing)) {
      visits.set(record.primaryVisitKey, record);
    }
  }
  return [...visits.values()]
    .sort((a, b) => (parseCustomDate(b.dateVisit)?.getTime() ?? 0) - (parseCustomDate(a.dateVisit)?.getTime() ?? 0))
    .map(record => ({
      record,
      team: teams.has(record.consultantName) ? 'Tim sendiri' :
        teams.size && record.consultantName !== 'Belum Terpetakan' ? 'Perbantuan' : 'Belum terpetakan',
      attendance: !record.checkInDateObj ? 'Belum check-in' :
        !record.checkOutDateObj ? 'Belum check-out' : 'Lengkap',
    }));
}
