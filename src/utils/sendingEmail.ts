import type { RawDataRow } from '../types';
import { sheetDate } from './worksheetMetrics';

const ticketKey = (value: string | undefined) => (value || '').trim().toUpperCase();
const dayNumber = (value: string) => Date.parse(value + 'T00:00:00Z') / 86_400_000;

export function matchSendingEmailRows(rows: RawDataRow[], timeline: RawDataRow[]) {
  const events = new Map<string, { sent: string[]; completed: string[] }>();
  for (const event of timeline) {
    const ticket = ticketKey(event['Ticket ID']);
    const day = sheetDate(event.Timestamp);
    const status = ticketKey(event['New Value']);
    if (!ticket || !day || ticketKey(event.Field) !== 'STATUS' ||
        !['SEND EMAIL', 'COMPLETED'].includes(status)) continue;
    const dates = events.get(ticket) ?? { sent: [], completed: [] };
    dates[status === 'SEND EMAIL' ? 'sent' : 'completed'].push(day);
    events.set(ticket, dates);
  }

  return rows.filter(row => ticketKey(row['Ticket ID']) && ticketKey(row.Status) !== 'CANCEL').map(row => {
    const scheduled = sheetDate(row['Jadwal Agenda']);
    const dates = events.get(ticketKey(row['Ticket ID']));
    const sent = dates?.sent.filter(day => scheduled && day >= scheduled).sort()[0] ?? '';
    const completed = dates?.completed.filter(day => scheduled && day >= scheduled).sort()[0] ?? '';
    const emailDays = sent ? dayNumber(sent) - dayNumber(scheduled) : null;
    return { row, scheduled, sent, completed, emailDays };
  });
}
