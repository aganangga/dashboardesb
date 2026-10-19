import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProcessedRecord } from '../types';
import { assignmentsForPerson, enrichWorksheetRows, matchesWorksheetFilter, emptyWorksheetFilter, UNMAPPED, type WorksheetFilterRow } from './worksheetFilters';

test('SPV and consultant filters preserve a real pair for multi-team ownership',()=>{
  const item:WorksheetFilterRow={row:{},person:'A',areas:['Bali'],date:'2026-08-15',period:'2026-08',assignments:[{supervisor:'SPV A',consultantName:'L2 A',supportName:'A'},{supervisor:'SPV B',consultantName:'L2 B',supportName:'A'}]};
  assert.equal(matchesWorksheetFilter(item,{...emptyWorksheetFilter,supervisor:'SPV A',consultant:'L2 A'},'csat'),true);
  assert.equal(matchesWorksheetFilter(item,{...emptyWorksheetFilter,supervisor:'SPV A',consultant:'L2 B'},'csat'),false);
});

test('CSAT combines support, area, book type, submit month, dates and search',()=>{
  const item:WorksheetFilterRow={row:{'Book Type':'Online',Feedback:'Excellent'},person:'Support A',areas:['Bali'],date:'2026-08-15',period:'2026-08',assignments:[{supervisor:'SPV',consultantName:'Consultant',supportName:'Support A'}]};
  const filter={...emptyWorksheetFilter,support:'Support A',area:'Bali',bookType:'Online',period:'2026-08',start:'2026-08-01',end:'2026-08-31',search:'consultant'};
  assert.equal(matchesWorksheetFilter(item,filter,'csat'),true);
  assert.equal(matchesWorksheetFilter(item,{...filter,start:'2026-08-16'},'csat'),false);
  assert.equal(matchesWorksheetFilter(item,{...filter,bookType:'Onsite'},'csat'),false);
});

test('monthly ticket filters never fabricate a daily date or book type',()=>{
  const item=enrichWorksheetRows('ticket',[{Month:'09. Sep',Pic:'unknown staff',Area:'HO'}],[])[0];
  assert.equal(item.date,'');assert.equal(item.assignments[0].supervisor,UNMAPPED);
  assert.equal(matchesWorksheetFilter(item,{...emptyWorksheetFilter,period:'09. Sep',area:'HO'},'ticket'),true);
  assert.equal(matchesWorksheetFilter(item,{...emptyWorksheetFilter,period:'08. Aug'},'ticket'),false);
});

test('unrelated support on a matched ticket does not invent CSAT team ownership',()=>{
  const visit={ticketId:'T1',supportName:'Other person',supportTeamList:[],jointSupportNames:[],supervisor:'Wrong SPV',consultantName:'Wrong owner',area:'Bali'} as ProcessedRecord;
  const item=enrichWorksheetRows('csat',[{'Ticket ID':'T1','Nama Support':'Unmapped person','Created At (Date Created)':'15/08/2026 10:00:00'}],[visit])[0];
  assert.equal(item.assignments[0].supervisor,UNMAPPED);assert.deepEqual(item.areas,['Bali']);
  assert.equal(item.date,'2026-08-15');
});

test('current master ownership is reused for Tegar in worksheet mapping',()=>{
  const assignments=assignmentsForPerson('Tegar');
  assert(assignments.length>0);assert(assignments.every(a=>a.consultantName==='Agung Setiawan'));
});
