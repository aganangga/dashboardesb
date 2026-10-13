import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RAW_CSV } from '../data/rawCsv';
import {
  parseCsvString,
  processRawData,
  resolveSpvAndConsultant,
  getDedicatedSupportTeamsForConsultant,
  isIncludedDashboardVisit,
  MASTER_DATA_TEAM,
} from './dataProcessor';

const tegarRoster = MASTER_DATA_TEAM.filter((row) => row.l1FullName === 'Tegar Rangga');

test('Tegar is exclusively in Dika master team, not Ayu or shared L2', () => {
  assert.equal(tegarRoster.length, 1);
  assert.equal(tegarRoster[0].l2, 'Dika Anugerah Pratama');
  assert.equal(tegarRoster[0].spv, 'Jane Margareth Widjaja');
  assert.deepEqual(resolveSpvAndConsultant('Tegar Rangga', '', ''), {
    supervisor: 'Jane Margareth Widjaja',
    consultantName: 'Dika Anugerah Pratama',
  });
  assert.ok(getDedicatedSupportTeamsForConsultant('Dika Anugerah Pratama')
    .some((row) => row.fullName === 'Tegar Rangga'));
  assert.ok(!getDedicatedSupportTeamsForConsultant('Ayu Febrina Sianturi')
    .some((row) => row.fullName === 'Tegar Rangga'));
});

test('Jane stays SPV for her teams while direct Jane visit is excluded', () => {
  assert.ok(MASTER_DATA_TEAM.some((row) => row.spv === 'Jane Margareth Widjaja'));
  assert.equal(isIncludedDashboardVisit({ ticketId: 'ESB-S28QBG' }), false);
  assert.equal(isIncludedDashboardVisit({ ticketId: 'ESB-5M5BBP' }), true);
  assert.equal(isIncludedDashboardVisit({ ticketId: 'ESB-4NRR2Y' }), true);
});

test('explicit registered L2 visit owner is preserved across team boundaries', () => {
  assert.deepEqual(resolveSpvAndConsultant('Tegar Rangga', 'Airlangga Aziz', ''), {
    supervisor: 'M. Iriansyah Suhendar',
    consultantName: 'Airlangga Aziz',
  });
});

test('raw CSV intact, dashboard displays 1,568 visits and September displays 884', () => {
  const raw = parseCsvString(DEFAULT_RAW_CSV);
  const records = processRawData(raw.data);
  assert.equal(records.length, 1569);
  assert.equal(records.filter((rec) => rec.dateVisit.endsWith('/09/2026')).length, 885);
  const visible = records.filter(isIncludedDashboardVisit);
  assert.equal(visible.length, 1568);
  const september = visible.filter((rec) => rec.dateVisit.endsWith('/09/2026'));
  assert.equal(september.length, 884);
  const byTicket = new Map(september.map((rec) => [rec.ticketId, rec]));
  assert.equal(byTicket.get('ESB-5M5BBP')?.consultantName, 'Dika Anugerah Pratama');
  assert.equal(byTicket.get('ESB-4NRR2Y')?.consultantName, 'Dika Anugerah Pratama');
  assert.equal(byTicket.has('ESB-S28QBG'), false);
  assert.ok(september.every((rec) => rec.consultantName !== 'Belum Terpetakan'));
  assert.equal(new Set(september.map((rec) => rec.primaryVisitKey)).size, 884);
});
