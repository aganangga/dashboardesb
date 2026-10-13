import type { ProcessedRecord } from '../types';

export interface VisitCheckInMetrics {
  totalVisits: number;
  anomalyVisits: number;
  nonAnomalousVisits: number;
  // Diagnostic count only: separate from the user-defined Check-In Rate KPI.
  checkedInVisits: number;
  missingCheckInVisits: number;
  checkInRate: number;
}

/**
 * User-approved Check-In KPI formula:
 *   (Total Visit - Anomali Menginap) / Total Visit * 100%
 *
 * Both quantities use the same unique primaryVisitKey (Ticket ID + Date Visit)
 * and the globally filtered visit dataset. A duplicate ticket/day is counted
 * once, with anomaly=true if ANY of its rows is classified 'overnight'.
 *
 * Categories 'missing_checkout' and 'no_checkin' are NOT anomalies for this
 * particular KPI, even though they remain visible in Check In/Out Comparison.
 */
export function calculateVisitCheckInMetrics(
  records: ReadonlyArray<Pick<ProcessedRecord, 'primaryVisitKey' | 'checkInDateObj' | 'durationCategory'>>
): VisitCheckInMetrics {
  const grouped = new Map<string, { anomaly: boolean; checkedIn: boolean }>();

  for (const record of records) {
    const previous = grouped.get(record.primaryVisitKey);
    const checkedIn = record.checkInDateObj instanceof Date &&
      !Number.isNaN(record.checkInDateObj.getTime());
    grouped.set(record.primaryVisitKey, {
      anomaly: (previous?.anomaly ?? false) || record.durationCategory === 'overnight',
      checkedIn: (previous?.checkedIn ?? false) || checkedIn,
    });
  }

  const totalVisits = grouped.size;
  const values = [...grouped.values()];
  const anomalyVisits = values.filter((item) => item.anomaly).length;
  const nonAnomalousVisits = totalVisits - anomalyVisits;
  const checkedInVisits = values.filter((item) => item.checkedIn).length;

  return {
    totalVisits,
    anomalyVisits,
    nonAnomalousVisits,
    checkedInVisits,
    missingCheckInVisits: totalVisits - checkedInVisits,
    checkInRate: totalVisits ? Math.round((nonAnomalousVisits / totalVisits) * 100) : 0,
  };
}
