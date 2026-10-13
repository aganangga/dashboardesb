import { WORKSHEETS, sheetUrl, parseWorksheet } from '../../src/utils/worksheetCsv.mjs';

export async function getWorksheet(id, fetchImpl = fetch) {
  const sheet = WORKSHEETS.find(sheet => sheet.id === id);
  if (!sheet) throw new Error('Unknown worksheet');
  const response = await fetchImpl(sheetUrl(sheet), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Google Sheets export failed (HTTP ${response.status})`);
  const parsed = parseWorksheet(await response.text(), sheet);
  return { id: sheet.id, title: sheet.title, ...parsed, fetchedAt: new Date().toISOString(), source: 'Google Sheets' };
}

export async function handler(event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { ...headers, Allow: 'GET' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  const id = event.queryStringParameters?.sheet;
  if (!WORKSHEETS.some(sheet => sheet.id === id)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Worksheet tidak dikenal' }) };
  try {
    return { statusCode: 200, headers, body: JSON.stringify(await getWorksheet(id)) };
  } catch {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Worksheet belum dapat dimuat. Coba muat ulang; data sebelumnya tetap tersedia.' }) };
  }
}
