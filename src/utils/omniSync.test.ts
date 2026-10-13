import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOmniSyncResponse } from './omniSync';

test('JSON visits with snake_case fields convert to ESB headers and dates', () => {
  const parsed = parseOmniSyncResponse({
    format: 'json', fetchedAt: '2026-10-13T00:00:00Z',
    payload: { data: [{ ticket_id:'ESB-A', date_visit:'2026-10-01', nama_support:'Tegar Rangga', nama_consultant:'Dika Anugerah Pratama', status:'COMPLETED', jadwal_agenda:'01/10/2026 09:00:00', check_in_time:'01/10/2026 09:10:00', check_out_time:'01/10/2026 11:10:00' }] },
  });
  assert.equal(parsed.data.length, 1);
  assert.equal(parsed.data[0]['Ticket ID'], 'ESB-A');
  assert.equal(parsed.data[0]['Date Visit'], '01/10/2026');
  assert.equal(parsed.data[0]['Nama Support'], 'Tegar Rangga');
  assert.equal(parsed.data[0]['Nama Consultant'], 'Dika Anugerah Pratama');
});

test('CSV keeps existing exact ESB template columns intact', () => {
  const parsed = parseOmniSyncResponse({
    format:'csv', payload:'Ticket ID,Date Visit,Nama Support,Status,Jadwal Agenda,Check In Time,Check Out Time\nESB-1,13/10/2026,Alfin,COMPLETED,13/10/2026 09:00:00,13/10/2026 09:10:00,13/10/2026 10:00:00',
  });
  assert.equal(parsed.data[0]['Ticket ID'], 'ESB-1');
  assert.equal(parsed.data[0]['Nama Support'], 'Alfin');
});

test('nested Omni JSON responses are accepted when pageless', () => {
  const parsed = parseOmniSyncResponse({
    format:'json', payload:{ data:{ records:[{ 'Ticket ID':'ESB-5', 'Date Visit':'11/10/2026', Status:'COMPLETED', 'Nama Support':'Alfin', 'Jadwal Agenda':'11/10/2026 09:00:00', 'Check In Time':'11/10/2026 09:10:00', 'Check Out Time':'11/10/2026 10:00:00' }] } },
  });
  assert.equal(parsed.data.length, 1);
});

test('invalid, partial or empty API responses never replace dashboard data', () => {
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:{data:[]}}), /tidak mengembalikan visit/);
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:[{foo:'bar'}]}), /Kolom Omni belum lengkap/);
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:{data:[{'Ticket ID':'ESB-1','Date Visit':'01/10/2026'}],next:'page2'}}), /berpaginasi/);
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:[{'Ticket ID':'ESB-1','Date Visit':'12/10/2026'}]}), /Kolom Omni belum lengkap/);
  assert.throws(() => parseOmniSyncResponse({format:'json',payload:[{'Ticket ID':'ESB-1','Date Visit':'12/10/2026',person:{id:1}}]}), /mapping API khusus/);
});

test('incomplete operational columns cannot replace the dashboard or distort anomaly KPI', () => {
  assert.throws(() => parseOmniSyncResponse({
    format: 'json', payload: [{ 'Ticket ID': 'ESB-2', 'Date Visit': '13/10/2026' }],
  }), /Status, Nama Support, Jadwal Agenda, Check In Time, Check Out Time/);
});
