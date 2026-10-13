import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('approved dashboard modules survive legacy HTML migration', () => {
  const app = read('src/App.tsx');
  for (const module of ['CSATDashboard', 'AIInsightPanel', 'ModernSidebar', 'VisitTable', 'CheckInOutComparison']) {
    assert.ok(app.includes('<' + module), module + ' must be rendered');
  }

  const visit = read('src/components/VisitTable.tsx');
  assert.ok(visit.includes('VisitParticipationChart'), 'restore table/chart view');
  assert.ok(visit.includes('PageListPagination'), 'keep list paging');
  assert.ok(visit.includes('sortableHeading'), 'restore legacy header sorting');

  const filter = read('src/components/FilterBar.tsx');
  assert.ok(filter.includes('teamCountRecords'), 'member counts must follow active filters');
  assert.ok(filter.includes('Konsultan L2 · ikut visit'), 'L2 must count as actual visitor');
});

test('Check-In Rate is derived from the unique-visit shared metric', () => {
  const summary = read('src/components/SummaryCards.tsx');
  assert.ok(summary.includes('calculateVisitCheckInMetrics(records)'));
  assert.ok(summary.includes('{checkInTotalVisits} − {anomalyVisits} anomali'));
  assert.ok(read('src/utils/visitMetrics.ts').includes('nonAnomalousVisits / totalVisits'));
  assert.ok(!summary.includes('checkedInCount / totalRecords'));
});

test('AI endpoint does not expose secret key through the Vite client', () => {
  const server = read('netlify/functions/insights.mjs');
  assert.ok(server.includes('process.env.GEMINI_API_KEY'));
  assert.ok(server.includes('breakdowns'));
  assert.ok(!read('src/components/AIInsightPanel.tsx').includes('process.env.GEMINI_API_KEY'));
  assert.ok(read('netlify.toml').includes('"/api/insights"'));
});

test('August and September visit baseline and CSAT modules are present', () => {
  const csv = read('src/data/rawCsv.ts');
  assert.ok(csv.includes('08/2026') && csv.includes('09/2026'));
  assert.ok(read('src/components/CSATDashboard.tsx').includes('CSAT_RESPONSES'));
  assert.ok(read('src/data/csatResponses.ts').includes('CSAT_RESPONSES'));
});
