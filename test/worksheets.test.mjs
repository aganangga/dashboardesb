import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSHEETS, parseWorksheet } from '../src/utils/worksheetCsv.mjs';
import { getWorksheet, handler } from '../netlify/functions/worksheets.mjs';
import { syncAllSheets } from '../netlify/functions/sync-google-sheet.mjs';

const fixtures = {
  visit: 'Ticket ID,Status\n001,Done',
  ticket: 'L2,L2,Phase\n,,\n,,\nL2,L2,Phase\nfirst,second,Training',
  team: ',,\n,,\n,Nama Karyawan,Email User\n,A,a@example.test',
  csat: 'Ticket ID,Rating\n001,5',
};

test('all four worksheet identities map to their confirmed source tabs', () => {
  assert.deepEqual(WORKSHEETS.map(s => [s.title, s.gid]), [['RAW DATA VISIT','0'],['RAW DATA TIKET','1220387159'],['TEAM MASTER','2104832140'],['CSAT','1457583822']]);
});

test('ticket repeated headers retain both columns and skip header metadata rows', () => {
  const p = parseWorksheet(fixtures.ticket, WORKSHEETS[1]);
  assert.deepEqual(p.headers, ['L2','L2 (2)','Phase']);
  assert.deepEqual(p.records, [{ L2:'first', 'L2 (2)':'second', Phase:'Training' }]);
});

test('team skips blank preamble and completely empty columns', () => {
  const p = parseWorksheet(fixtures.team, WORKSHEETS[2]);
  assert.deepEqual(p.headers, ['Nama Karyawan','Email User']);
  assert.equal(p.records.length, 1);
});

test('worksheet endpoint fetches only the selected approved sheet', async () => {
  const calls=[];
  const result=await getWorksheet('csat', async url => {calls.push(url);return new Response(fixtures.csat);});
  assert.equal(result.title,'CSAT');
  assert.equal(calls.length,1);
  assert.match(calls[0],/gid=1457583822$/);
  assert.equal(result.records[0].Rating,'5');
  await assert.rejects(getWorksheet('https://attacker.example',()=>assert.fail('Must not fetch unknown input')));
  assert.equal((await handler({httpMethod:'GET',queryStringParameters:{sheet:'invalid'}})).statusCode,400);
  assert.equal((await handler({httpMethod:'POST'})).statusCode,405);
});

test('scheduled sync imports distinct sources and preserves other sheets on one failure', async () => {
  const imports=[];
  const results=await syncAllSheets({
    env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-key'},
    fetchImpl:async (url,options) => {
      if(String(url).includes('docs.google.com')) {
        const gid=new URL(url).searchParams.get('gid');
        const sheet=WORKSHEETS.find(s=>s.gid===gid);
        return sheet.id==='team' ? new Response('denied',{status:403}) : new Response(fixtures[sheet.id]);
      }
      const payload=JSON.parse(options.body);imports.push(payload.p_source_key);
      return Response.json({changed:true,row_count:payload.p_records.length});
    },
  });
  assert.deepEqual(results.filter(r=>r.ok).map(r=>r.sheet),['visit','ticket','csat']);
  assert.equal(results.find(r=>r.sheet==='team').ok,false);
  assert.deepEqual(new Set(imports),new Set(['dashboardesb-main','dashboardesb-ticket','dashboardesb-csat']));
});
