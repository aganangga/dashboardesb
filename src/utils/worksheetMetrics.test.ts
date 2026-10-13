import test from 'node:test';
import assert from 'node:assert/strict';
import { csatScore, csatSummary, sheetDate, sheetNumber, ticketSummary, uniqueTeam, teamRole } from './worksheetMetrics';

test('ticket totals exclude formula-only rows and derive H+0 percentage from counts', () => {
  const result = ticketSummary([
    {Month:'01. Jan', Pic:'A', 'Total Ticket':'100', 'Total H+0':'90', 'Total H+1':'10', 'Visit Qty':'5'},
    {Month:'02. Feb', Pic:'B', 'Total Ticket':'10', 'Total H+0':'1', 'Total H+1':'9', 'Visit Qty':'2'},
    {Month:'', Pic:'', 'Total Ticket':'999999', 'Total H+0':'999999'},
    {Month:'Month', Pic:'Pic', 'Total Ticket':'Total Ticket'},
  ]);
  assert.equal(result.total,110);assert.equal(result.h0,91);assert.equal(result.h1,19);
  assert.equal(result.h0Rate,91/110*100);assert.equal(result.visits,7);assert.equal(result.pics,2);
  assert.equal(ticketSummary([]).h0Rate,null);
});

test('numeric values retain Indonesian decimals and reject formula errors', () => {
  assert.equal(sheetNumber('1.234,50'),1234.5);
  assert.equal(sheetNumber('0,79'),0.79);
  assert.equal(sheetNumber('75%'),0.75);
  assert.equal(sheetNumber('#DIV/0!'),null);assert.equal(sheetNumber(''),null);
});

test('CSAT uses only recognized scores for average and satisfaction denominator', () => {
  const result=csatSummary([
    {'Ticket ID':'1',Rating:'Sangat Puas',Feedback:'Good'},
    {'Ticket ID':'1',Rating:'Puas',Feedback:''},
    {'Ticket ID':'2',Rating:'Tidak Puas'},
    {'Ticket ID':'3',Rating:'unknown'},
  ]);
  assert.equal(result.responses,4);assert.equal(result.tickets,3);assert.equal(result.rated,3);
  assert.equal(result.average,11/3);assert.equal(result.satisfaction,2/3*100);
  assert.equal(result.feedback,1);assert.equal(csatSummary([]).average,null);
  assert.equal(csatScore('constructor'),null);assert.equal(csatScore('1.5'),null);
});

test('CSAT dates preserve source dates and reject invalid calendar values', () => {
  assert.equal(sheetDate('09/07/2026 11:53:15'),'2026-07-09');
  assert.equal(sheetDate('2026-10-13T01:00:00Z'),'2026-10-13');
  assert.equal(sheetDate('31/02/2026'),'');assert.equal(sheetDate(''),'');
});

test('team metrics deduplicate emails and distinguish consultant supervisors', () => {
  const people=uniqueTeam([
    {'Nama Karyawan':'A','Email User':'A@example.test','Job Tittle':'Product Consultant Supervisor'},
    {'Nama Karyawan':'A','Email User':'a@example.test','Job Tittle':'Product Consultant Supervisor'},
    {'Nama Karyawan':'B','Email User':'b@example.test','Job Tittle':'Product Implementor'},
    {'Nama Karyawan':''},
  ]);
  assert.equal(people.length,2);assert.equal(teamRole(people[0]['Job Tittle']),'Supervisor');
  assert.equal(teamRole(people[1]['Job Tittle']),'Implementor');
  assert.equal(teamRole('Product Consultant'),'Consultant');
});
