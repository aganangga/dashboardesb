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
  buildSpvL2L1Groupings,
} from './dataProcessor';

const tegarRoster = MASTER_DATA_TEAM.filter((row) => row.l1FullName === 'Tegar Rangga');

test('Tegar belongs to Agung from August 2026 while historical ownership is retained', () => {
  assert.equal(tegarRoster.length, 1);
  assert.equal(tegarRoster[0].l2, 'Agung Setiawan');
  assert.equal(tegarRoster[0].spv, 'M. Iriansyah Suhendar');
  assert.deepEqual(resolveSpvAndConsultant('Tegar Rangga', '', ''), {
    supervisor: 'M. Iriansyah Suhendar',
    consultantName: 'Agung Setiawan',
  });
  assert.ok(getDedicatedSupportTeamsForConsultant('Agung Setiawan')
    .some((row) => row.fullName === 'Tegar Rangga'));
  assert.deepEqual(resolveSpvAndConsultant('Tegar Rangga', '', '', new Date(2026, 6, 31)), {
    supervisor: 'Jane Margareth Widjaja',
    consultantName: 'Dika Anugerah Pratama',
  });
  assert.deepEqual(resolveSpvAndConsultant('Tegar Rangga', '', '', new Date(2026, 7, 1)), {
    supervisor: 'M. Iriansyah Suhendar',
    consultantName: 'Agung Setiawan',
  });
  assert.ok(!getDedicatedSupportTeamsForConsultant('Dika Anugerah Pratama')
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
  assert.equal(byTicket.get('ESB-5M5BBP')?.consultantName, 'Agung Setiawan');
  assert.equal(byTicket.get('ESB-4NRR2Y')?.consultantName, 'Agung Setiawan');
  assert.equal(byTicket.has('ESB-S28QBG'), false);
  assert.ok(september.every((rec) => rec.consultantName !== 'Belum Terpetakan'));
  assert.equal(new Set(september.map((rec) => rec.primaryVisitKey)).size, 884);
});


test('blank raw SPV uses canonical Master Team hierarchy instead of unname or solo', () => {
  const sample = { supportName: 'Tegar Rangga', consultantName: '', supervisor: 'unname', dateVisit: '15/08/2026', supportTeamList: [], ticketId: 'TEAM-TEST' };
  const groups = buildSpvL2L1Groupings([sample] as Parameters<typeof buildSpvL2L1Groupings>[0]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].supervisor, 'M. Iriansyah Suhendar');
  assert.equal(groups[0].l2Groups[0].l2Name, 'Agung Setiawan');
  assert.equal(groups[0].l2Groups[0].isSolo, false);
  assert.equal(groups[0].l2Groups[0].l1Members[0].fullName, 'Tegar Rangga');
});

test('unknown blank identities never fabricate an SPV or L2 grouping', () => {
  const unknown = { supportName: '', consultantName: '', supervisor: 'unname', dateVisit: '15/08/2026', supportTeamList: [], ticketId: 'EMPTY-TEST' };
  const groups = buildSpvL2L1Groupings([unknown] as Parameters<typeof buildSpvL2L1Groupings>[0]);
  assert.equal(groups.length, 0);
});
