import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOmniSyncResponse } from './omniSync';

test('JSON visits with snake_case fields convert to ESB headers and dates', () => {
  const parsed = parseOmniSyncResponse({
    format: 'json', fetchedAt: '2026-10-13T00:00:00Z',
    payload: { data: [{ ticket_id:'ESB-A', date_visit:'2026-10-01', nama_support:'Tegar Rangga', nama_consultant:'Dika Anugerah Pratama' }] },
  });
  assert.equal(parsed.data.length, 1);
  assert.equal(parsed.data[0]['Ticket ID'], 'ESB-A');
  assert.equal(parsed.data[0]['Date Visit'], '01/10/2026');
  assert.equal(parsed.data[0]['Nama Support'], 'Tegar Rangga');
  assert.equal(parsed.data[0]['Nama Consultant'], 'Dika Anugerah Pratama');
});

test('CSV keeps existing exact ESB template columns intact', () => {
  const parsed = parseOmniSyncResponse({
    format:'csv', payload:'Ticket ID,Date Visit,Nama Support\nESB-1,13/10/2026,Alfin',
  });
  assert.equal(parsed.data[0]['Ticket ID'], 'ESB-1');
  assert.equal(parsed.data[0]['Nama Support'], 'Alfin');
});

test('nested Omni JSON responses are accepted when pageless', () => {
  const parsed = parseOmniSyncResponse({
    format:'json', payload:{ data:{ records:[{ 'Ticket ID':'ESB-5', 'Date Visit':'11/10/2026' }] } },
  });
  assert.equal(parsed.data.length, 1);
});

test('invalid, partial or empty API responses never replace dashboard data', () => {
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:{data:[]}}), /tidak mengembalikan visit/);
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:[{foo:'bar'}]}), /Ticket ID/);
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:{data:[{'Ticket ID':'ESB-1','Date Visit':'01/10/2026'}],next:'page2'}}), /berpaginasi/);
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:[{'Ticket ID':'ESB-1','Date Visit':''}]}), /valid/);
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:[{'Ticket ID':'ESB-1','Date Visit':'12/10/2026',person:{id:1}}]}), /mapping API khusus/);
});
