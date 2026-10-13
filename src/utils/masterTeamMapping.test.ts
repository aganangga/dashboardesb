import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_RAW_CSV } from '../data/rawCsv';
import {
  parseCsvString,
  processRawData,
  resolveSpvAndConsultant,
  getDedicatedSupportTeamsForConsultant,
  MASTER_DATA_TEAM,
  SHARED_L2_TEAM_PREFIX,
  DIRECT_SPV_VISIT_PREFIX,
} from './dataProcessor';

const oldRoster = MASTER_DATA_TEAM.filter((row) => row.l1FullName === 'Tegar Rangga');
const teamLabel = SHARED_L2_TEAM_PREFIX + oldRoster.map((row) => row.l2).join(' / ');
const spvLabel = DIRECT_SPV_VISIT_PREFIX + 'Jane Margareth Widjaja';

test('shared L1 maps to verified master team, without choosing Ayu or Dika arbitrarily', () => {
  assert.deepEqual(new Set(oldRoster.map((row) => row.l2)),
    new Set(['Ayu Febrina Sianturi', 'Dika Anugerah Pratama']));
  assert.deepEqual(resolveSpvAndConsultant('Tegar Rangga', '', ''), {
    supervisor: 'Jane Margareth Widjaja',
    consultantName: teamLabel,
  });
  assert.deepEqual(getDedicatedSupportTeamsForConsultant(teamLabel).map((member) => member.fullName),
    ['Tegar Rangga']);
});

test('direct SPV visit maps to SPV master rather than an invented L2', () => {
  assert.deepEqual(resolveSpvAndConsultant('Jane Margareth Widjaja', '', ''), {
    supervisor: 'Jane Margareth Widjaja',
    consultantName: spvLabel,
  });
  assert.deepEqual(getDedicatedSupportTeamsForConsultant(spvLabel).map((member) => member.fullName),
    ['Jane Margareth Widjaja']);
});

test('explicit registered L2 ownership remains authoritative across teams', () => {
  assert.deepEqual(resolveSpvAndConsultant('Tegar Rangga', 'Airlangga Aziz', ''), {
    supervisor: 'M. Iriansyah Suhendar',
    consultantName: 'Airlangga Aziz',
  });
});

test('September baseline: all 885 rows retained and none has unverified consultant group', () => {
  const raw = parseCsvString(DEFAULT_RAW_CSV);
  const visits = processRawData(raw.data);
  assert.equal(visits.length, 1569, 'whole August + September source remains intact');
  const september = visits.filter((visit) => visit.dateVisit.endsWith('/09/2026'));
  assert.equal(september.length, 885);
  const byTicket = new Map(september.map((visit) => [visit.ticketId, visit]));
  assert.equal(byTicket.get('ESB-5M5BBP')?.consultantName, teamLabel);
  assert.equal(byTicket.get('ESB-4NRR2Y')?.consultantName, teamLabel);
  assert.equal(byTicket.get('ESB-S28QBG')?.consultantName, spvLabel);
  assert.ok(september.every((visit) => visit.consultantName !== 'Belum Terpetakan'));
  assert.equal(new Set(september.map((visit) => visit.primaryVisitKey)).size, 885);
});
