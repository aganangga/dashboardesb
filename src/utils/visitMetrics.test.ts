import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateVisitCheckInMetrics } from './visitMetrics';

const visit = (primaryVisitKey: string, checkInDateObj: Date | null) => ({
  primaryVisitKey, checkInDateObj,
});

test('empty dataset is 0 percent', () => {
  assert.deepEqual(calculateVisitCheckInMetrics([]), {
    totalVisits: 0, checkedInVisits: 0, missingCheckInVisits: 0, checkInRate: 0,
  });
});

test('duplicate staff rows count as one visit; any valid check-in marks success', () => {
  assert.deepEqual(calculateVisitCheckInMetrics([
    visit('ESB-001_01/08/2026', null),
    visit('ESB-001_01/08/2026', new Date('2026-08-01T09:00:00+08:00')),
    visit('ESB-002_02/08/2026', null),
  ]), { totalVisits: 2, checkedInVisits: 1, missingCheckInVisits: 1, checkInRate: 50 });
});

test('same ticket on different dates is two visits', () => {
  const value = calculateVisitCheckInMetrics([
    visit('ESB-001_01/08/2026', new Date('2026-08-01T09:00:00+08:00')),
    visit('ESB-001_02/08/2026', null),
  ]);
  assert.equal(value.totalVisits, 2);
  assert.equal(value.checkInRate, 50);
});

test('invalid timestamp and two check-in rows still count only one visit', () => {
  const value = calculateVisitCheckInMetrics([
    visit('ESB-003_01/09/2026', new Date('invalid')),
    visit('ESB-003_01/09/2026', null),
    visit('ESB-004_01/09/2026', new Date('2026-09-01T09:00:00+08:00')),
    visit('ESB-004_01/09/2026', new Date('2026-09-01T10:00:00+08:00')),
  ]);
  assert.equal(value.checkedInVisits, 1);
  assert.equal(value.totalVisits, 2);
  assert.equal(value.checkInRate, 50);
});
