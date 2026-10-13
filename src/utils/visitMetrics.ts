import type { ProcessedRecord } from '../types';

export interface VisitCheckInMetrics {
  totalVisits: number;
  checkedInVisits: number;
  missingCheckInVisits: number;
  checkInRate: number;
}

/** A visit = one Ticket ID + Date Visit. A valid check-in in any duplicate
 * row marks that visit checked in, without inflating numerator or denominator.
 * Denominator uses all visits under current filters, including cancelled ones,
 * exactly like the Total Visit KPI.
 */
export function calculateVisitCheckInMetrics(
  records: ReadonlyArray<Pick<ProcessedRecord, 'primaryVisitKey' | 'checkInDateObj'>>
): VisitCheckInMetrics {
  const checkInByVisit = new Map<string, boolean>();

  for (const record of records) {
    const validCheckIn = record.checkInDateObj instanceof Date &&
      !Number.isNaN(record.checkInDateObj.getTime());
    checkInByVisit.set(
      record.primaryVisitKey,
      (checkInByVisit.get(record.primaryVisitKey) || false) || validCheckIn
    );
  }

  const totalVisits = checkInByVisit.size;
  const checkedInVisits = Array.from(checkInByVisit.values()).filter(Boolean).length;
  return {
    totalVisits,
    checkedInVisits,
    missingCheckInVisits: totalVisits - checkedInVisits,
    checkInRate: totalVisits ? Math.round((checkedInVisits / totalVisits) * 100) : 0,
  };
}
