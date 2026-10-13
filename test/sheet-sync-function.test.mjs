import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSheet, syncSheet, SHEET_URL } from '../netlify/functions/sync-google-sheet.mjs';

test('preserves duplicate visits, phone formatting, quoted cells, and new columns', () => {
  const csv = '\uFEFFTicket ID,PIC Number,Catatan Baru\r\n001,081234,"a,b"\r\n001,081234,"a,b"\r\n';
  const p = parseSheet(csv);
  assert.equal(p.records.length, 2);
  assert.deepEqual(p.records[0], { 'Ticket ID': '001', 'PIC Number': '081234', 'Catatan Baru': 'a,b' });
  assert.deepEqual(p.records[0], p.records[1]);
  assert.equal(p.checksum, parseSheet(csv.replaceAll('\r\n', '\n')).checksum);
});

test('rejects empty, malformed, duplicate-header, and HTML responses', () => {
  for (const csv of ['Ticket ID,Status\n', 'ID,ID\n1,2', 'ID,\n1,2', 'ID,Status\n1', 'ID,Status\n1,"broken', '<!DOCTYPE html><html>Login</html>']) {
    assert.throws(() => parseSheet(csv));
  }
});

test('imports all rows atomically with an RPC and server-only credentials', async () => {
  const calls = [];
  const result = await syncSheet({
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (calls.length === 1) return new Response('ID,Status\n1,Done\n1,Done');
      return Response.json({ changed: true, row_count: 2 });
    },
  });
  assert.equal(calls[0].url, SHEET_URL);
  assert.equal(calls[1].url, 'https://example.supabase.co/rest/v1/rpc/import_sheet_snapshot');
  assert.equal(calls[1].options.headers.apikey, 'test-only-key');
  assert.equal(JSON.parse(calls[1].options.body).p_records.length, 2);
  assert.deepEqual(result, { changed: true, row_count: 2 });
});

test('does not write to the database when export fails or CSV is empty', async () => {
  for (const response of [new Response('Denied', { status: 403 }), new Response('ID,Status\n')]) {
    let calls = 0;
    await assert.rejects(syncSheet({
      env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only-key' },
      fetchImpl: async () => { calls++; return response; },
    }));
    assert.equal(calls, 1);
  }
});

test('fails safely on database errors without exposing response content', async () => {
  let calls = 0;
  await assert.rejects(syncSheet({
    env: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only-key' },
    fetchImpl: async () => ++calls === 1 ? new Response('ID,Status\n1,Done') : new Response('sensitive detail', { status: 500 }),
  }), /^Error: Supabase import failed \(HTTP 500\)$/);
});

test('rejects missing configuration and credential forwarding to arbitrary hosts', async () => {
  for (const env of [{}, { SUPABASE_URL: 'http://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'x' }, { SUPABASE_URL: 'https://attacker.example', SUPABASE_SERVICE_ROLE_KEY: 'x' }]) {
    await assert.rejects(syncSheet({ env, fetchImpl: () => assert.fail('No network call expected') }));
  }
});
