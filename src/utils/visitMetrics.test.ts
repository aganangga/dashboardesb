import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateVisitCheckInMetrics } from './visitMetrics';

type Category = 'less_30m' | '30m_to_1h' | '1h_to_2h' | '2h_to_4h' |
  'more_4h' | 'missing_checkout' | 'no_checkin' | 'overnight';

const visit = (
  primaryVisitKey: string,
  durationCategory: Category,
  checkInDateObj: Date | null = null,
) => ({ primaryVisitKey, checkInDateObj, durationCategory });

test('empty dataset returns 0% with no division by zero', () => {
  assert.deepEqual(calculateVisitCheckInMetrics([]), {
    totalVisits: 0, anomalyVisits: 0, nonAnomalousVisits: 0,
    checkedInVisits: 0, missingCheckInVisits: 0, checkInRate: 0,
  });
});

test('10 unique visits and 2 overnight anomalies means exactly 80%', () => {
  const rows = Array.from({ length: 10 }, (_, i) =>
    visit('ESB-' + i + '_01/09/2026', i < 2 ? 'overnight' : '1h_to_2h')
  );
  const result = calculateVisitCheckInMetrics(rows);
  assert.equal(result.totalVisits, 10);
  assert.equal(result.anomalyVisits, 2);
  assert.equal(result.nonAnomalousVisits, 8);
  assert.equal(result.checkInRate, 80);
});

test('multiple staff lines for one ticket/day never double count anomaly', () => {
  const result = calculateVisitCheckInMetrics([
    visit('ESB-A_01/09/2026', 'overnight'),
    visit('ESB-A_01/09/2026', 'overnight'),
    visit('ESB-A_01/09/2026', '1h_to_2h'),
    visit('ESB-B_01/09/2026', 'less_30m'),
  ]);
  assert.equal(result.totalVisits, 2);
  assert.equal(result.anomalyVisits, 1);
  assert.equal(result.checkInRate, 50);
});

test('same ticket on two dates is two visits; one anomalous = 50%', () => {
  const result = calculateVisitCheckInMetrics([
    visit('ESB-A_01/09/2026', 'overnight'),
    visit('ESB-A_02/09/2026', '1h_to_2h'),
  ]);
  assert.equal(result.totalVisits, 2);
  assert.equal(result.anomalyVisits, 1);
  assert.equal(result.checkInRate, 50);
});

test('no check-in and no check-out do not count as anomaly by this requested formula', () => {
  const result = calculateVisitCheckInMetrics([
    visit('ESB-A_01/08/2026', 'no_checkin'),
    visit('ESB-B_01/08/2026', 'missing_checkout',
      new Date('2026-08-01T09:00:00+08:00')),
    visit('ESB-C_01/08/2026', '1h_to_2h'),
  ]);
  assert.equal(result.totalVisits, 3);
  assert.equal(result.anomalyVisits, 0);
  assert.equal(result.checkedInVisits, 1);
  assert.equal(result.checkInRate, 100);
});

test('all visits anomalous => 0%; filtered subset uses only supplied visits', () => {
  const all = calculateVisitCheckInMetrics([
    visit('ESB-A_01/08/2026', 'overnight'),
    visit('ESB-B_01/08/2026', 'overnight'),
  ]);
  assert.equal(all.checkInRate, 0);
  const filtered = calculateVisitCheckInMetrics([
    visit('ESB-B_01/08/2026', 'overnight'),
    visit('ESB-C_01/08/2026', 'less_30m'),
  ]);
  assert.equal(filtered.totalVisits, 2);
  assert.equal(filtered.checkInRate, 50);
});
