import { LIVE_WORKSHEETS, sheetUrl, parseWorksheet } from '../../src/utils/worksheetCsv.mjs';

export async function getWorksheet(id, fetchImpl = fetch) {
  const sheet = LIVE_WORKSHEETS.find(sheet => sheet.id === id);
  if (!sheet) throw new Error('Unknown worksheet');
  const response = await fetchImpl(sheetUrl(sheet), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Google Sheets export failed (HTTP ${response.status})`);
  const parsed = parseWorksheet(await response.text(), sheet);
  if (id === 'timeline-omni') {
    const fields = ['Ticket ID', 'Timestamp', 'Field', 'New Value'];
    parsed.headers = fields;
    parsed.records = parsed.records
      .filter(row => row.Field?.trim().toUpperCase() === 'STATUS' && ['SEND EMAIL', 'COMPLETED'].includes(row['New Value']?.trim().toUpperCase()))
      .map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
  }
  if (id === 'sending-email') {
    const fields = ['Ticket ID', 'Status', 'Jadwal Agenda', 'Nama Consultant', 'Nama Support', 'Nama Outlet'];
    parsed.headers = fields;
    parsed.records = parsed.records.map(row => Object.fromEntries(fields.map(field => [field, row[field]])));
  }
  return { id: sheet.id, title: sheet.title, ...parsed, fetchedAt: new Date().toISOString(), source: 'Google Sheets' };
}

export async function handler(event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { ...headers, Allow: 'GET' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  const id = event.queryStringParameters?.sheet;
  if (!LIVE_WORKSHEETS.some(sheet => sheet.id === id)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Worksheet tidak dikenal' }) };
  try {
    return { statusCode: 200, headers, body: JSON.stringify(await getWorksheet(id)) };
  } catch {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Worksheet belum dapat dimuat. Coba muat ulang; data sebelumnya tetap tersedia.' }) };
  }
}
