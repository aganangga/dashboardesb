import Papa from 'papaparse';

export const WORKSHEETS = [
  { id: 'visit', title: 'RAW DATA VISIT', gid: '0', headerRow: 0, dataRow: 1, sourceKey: 'dashboardesb-main' },
  { id: 'ticket', title: 'RAW DATA TIKET', gid: '1220387159', headerRow: 0, dataRow: 4, sourceKey: 'dashboardesb-ticket' },
  { id: 'team', title: 'TEAM MASTER', gid: '2104832140', headerRow: 2, dataRow: 3, sourceKey: 'dashboardesb-team' },
  { id: 'csat', title: 'CSAT', gid: '1457583822', headerRow: 0, dataRow: 1, sourceKey: 'dashboardesb-csat' },
];
export const spreadsheetId = '1SoNn_O4JurYhG-GFIa7-5XtA-90TgDzqeLTPgehFHmI';
export const sheetUrl = sheet => `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheet.gid}`;

export function parseWorksheet(csv, sheet) {
  if (/^\s*(?:<!doctype\s+html|<html)/i.test(csv)) throw new Error('Google Sheets returned HTML instead of CSV');
  const parsed = Papa.parse(csv.replace(/^\uFEFF/, ''));
  if (parsed.errors.length) throw new Error('CSV parsing failed');
  const rawHeaders = parsed.data[sheet.headerRow];
  if (!rawHeaders?.some(value => value.trim())) throw new Error('Worksheet header not found');
  const rows = parsed.data.slice(sheet.dataRow).filter(row => row.some(value => value.trim()));
  if (!rows.length) throw new Error('Empty worksheet rejected; previous data retained');
  if (rows.some(row => row.length !== rawHeaders.length)) throw new Error('CSV row width does not match headers');
  const used = new Set();
  const columns = rawHeaders.flatMap((value, index) => {
    if (!value.trim() && rows.every(row => !row[index].trim())) return [];
    const base = value.trim() || `Kolom ${index + 1}`;
    let header = base; let suffix = 2;
    while (used.has(header)) header = `${base} (${suffix++})`;
    used.add(header);
    return [{ index, header }];
  });
  return {
    headers: columns.map(column => column.header),
    records: rows.map(row => Object.fromEntries(columns.map(column => [column.header, row[column.index]]))),
  };
}
