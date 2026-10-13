import Papa from 'papaparse';
import { createHash } from 'node:crypto';

export const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1SoNn_O4JurYhG-GFIa7-5XtA-90TgDzqeLTPgehFHmI/export?format=csv&gid=0';

export function parseSheet(csv) {
  if (/^\s*(?:<!doctype\s+html|<html)/i.test(csv)) throw new Error('Google Sheets returned HTML instead of CSV');
  const parsed = Papa.parse(csv.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
  if (parsed.errors.length) throw new Error('CSV parsing failed');
  const [headers, ...rows] = parsed.data;
  if (!headers?.length || headers.some(h => !h.trim()) || new Set(headers).size !== headers.length) {
    throw new Error('CSV headers must be nonempty and unique');
  }
  if (!rows.length) throw new Error('Empty spreadsheet rejected; previous data retained');
  if (rows.some(row => row.length !== headers.length)) throw new Error('CSV row width does not match headers');
  const records = rows.map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
  const checksum = createHash('sha256').update(JSON.stringify({ headers, records })).digest('hex');
  return { headers, records, checksum };
}

export async function syncSheet({ env = process.env, fetchImpl = fetch } = {}) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server configuration is missing');
  const base = new URL(SUPABASE_URL);
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co') || base.username || base.password) {
    throw new Error('SUPABASE_URL must be an HTTPS Supabase project URL');
  }
  const sheetResponse = await fetchImpl(SHEET_URL, { signal: AbortSignal.timeout(10000) });
  if (!sheetResponse.ok) throw new Error(`Google Sheets export failed (HTTP ${sheetResponse.status})`);
  const { headers, records, checksum } = parseSheet(await sheetResponse.text());
  const response = await fetchImpl(new URL('/rest/v1/rpc/import_sheet_snapshot', base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({
      p_source_key: 'dashboardesb-main', p_spreadsheet_url: SHEET_URL,
      p_checksum: checksum, p_headers: headers, p_records: records,
    }),
    signal: AbortSignal.timeout(10000),
  });
  // Do not log response bodies: they can contain database details or spreadsheet records.
  if (!response.ok) throw new Error(`Supabase import failed (HTTP ${response.status})`);
  return response.json();
}

export async function handler() {
  try {
    const result = await syncSheet();
    console.log(JSON.stringify({ event: 'sheet_sync_completed', ...result }));
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    console.error('Sheet sync failed:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Sheet sync failed; existing snapshot retained' }) };
  }
}
