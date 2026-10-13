import type { RawDataRow } from '../types';

export function sheetNumber(value: string | undefined): number | null {
  let text = (value || '').trim();
  if (!text || text === '-' || text.startsWith('#')) return null;
  const percent = text.endsWith('%');
  text = text.replace(/%$/, '').replace(/\s/g, '');
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const result = Number(text);
  return Number.isFinite(result) ? result / (percent ? 100 : 1) : null;
}

export function sheetDate(value: string | undefined): string {
  const text = (value || '').trim();
  const local = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/);
  const parts = local ? [local[3], local[2].padStart(2,'0'), local[1].padStart(2,'0')] : iso?.slice(1);
  if (!parts) return '';
  const [year, month, day] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? parts.join('-') : '';
}

export function csatScore(value: string | undefined): number | null {
  const scores: Record<string, number> = { 'sangat puas':5, puas:4, cukup:3, 'tidak puas':2, 'sangat tidak puas':1 };
  const text = (value || '').trim().toLocaleLowerCase();
  if (Object.hasOwn(scores,text)) return scores[text];
  const numeric = sheetNumber(text);
  return numeric !== null && Number.isInteger(numeric) && numeric >= 1 && numeric <= 5 ? numeric : null;
}

export function ticketDataRows(rows: RawDataRow[]): RawDataRow[] {
  return rows.filter(row => /^\d{2}\./.test((row.Month || '').trim()) && !!row.Pic?.trim());
}

export function sumColumn(rows: RawDataRow[], column: string): number {
  return rows.reduce((total, row) => total + (sheetNumber(row[column]) ?? 0), 0);
}

export function ticketSummary(rows: RawDataRow[]) {
  const data = ticketDataRows(rows);
  const h0 = sumColumn(data,'Total H+0');
  const h1 = sumColumn(data,'Total H+1');
  return { rows: data.length, total: sumColumn(data,'Total Ticket'), h0, h1,
    h0Rate: h0 + h1 ? h0 / (h0 + h1) * 100 : null, visits: sumColumn(data,'Visit Qty'),
    pics: new Set(data.map(row => row.Pic!.trim().toLocaleLowerCase())).size };
}

export function csatSummary(rows: RawDataRow[]) {
  const scores = rows.map(row => csatScore(row.Rating)).filter((score): score is number => score !== null);
  return { responses: rows.length, rated: scores.length, unknown: rows.length - scores.length,
    tickets: new Set(rows.map(row => row['Ticket ID']?.trim()).filter(Boolean)).size,
    average: scores.length ? scores.reduce((a,b) => a+b,0)/scores.length : null,
    satisfaction: scores.length ? scores.filter(score => score >= 4).length/scores.length*100 : null,
    feedback: rows.filter(row => !!row.Feedback?.trim() && row.Feedback.trim() !== '-').length };
}

export function teamRole(value: string | undefined): string {
  const title = (value || '').toLocaleLowerCase();
  if (title.includes('supervisor')) return 'Supervisor';
  if (title.includes('consultant')) return 'Consultant';
  if (title.includes('implementor')) return 'Implementor';
  return 'Jabatan lainnya';
}

export function uniqueTeam(rows: RawDataRow[]): RawDataRow[] {
  const map = new Map<string, RawDataRow>();
  for (const row of rows) {
    const name = row['Nama Karyawan']?.trim();
    if (!name) continue;
    const key = (row['Email User']?.trim() || name).toLocaleLowerCase();
    if (!map.has(key)) map.set(key,row);
  }
  return [...map.values()];
}

export function groupCounts(rows: RawDataRow[], value: (row: RawDataRow) => string) {
  const map = new Map<string, number>();
  for (const row of rows) { const name = value(row) || 'Tidak tercatat'; map.set(name,(map.get(name) || 0)+1); }
  return [...map].map(([name,total]) => ({name,total})).sort((a,b) => b.total-a.total);
}

export function groupTickets(rows: RawDataRow[], column: string) {
  const map = new Map<string,{name:string;total:number;h0:number;h1:number}>();
  for (const row of ticketDataRows(rows)) {
    const name = row[column]?.trim() || 'Tidak tercatat';
    const item = map.get(name) || {name,total:0,h0:0,h1:0};
    item.total += sheetNumber(row['Total Ticket']) ?? 0;
    item.h0 += sheetNumber(row['Total H+0']) ?? 0;
    item.h1 += sheetNumber(row['Total H+1']) ?? 0;
    map.set(name,item);
  }
  return [...map.values()];
}
