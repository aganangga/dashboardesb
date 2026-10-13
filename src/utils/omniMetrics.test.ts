import test from 'node:test';
import assert from 'node:assert/strict';
import type {ProcessedRecord} from '../types';
import {omniForPicMonth,omniForTicketRows,attachOmniColumns,matchesOmniPicMonth} from './omniMetrics';
const visit=(extra:Partial<ProcessedRecord>={})=>({status:'DONE',dateVisit:'01/09/2026',rawSupportName:'Alex Smith',checkInTime:'01/09/2026 09:00:00',checkOutTime:'01/09/2026 10:00:00',...extra}) as ProcessedRecord;

test('Omni follows PIC first word, month, cancel exclusion and calendar-day completion',()=>{
 const rows=[visit(),visit({checkOutTime:'01/09/2026 11:00:00'}),visit({checkInTime:'01/09/2026 23:40:00',checkOutTime:'02/09/2026 00:20:00'}),visit({checkOutTime:''}),visit({checkInTime:''}),visit({checkInTime:'null',checkOutTime:'null'}),visit({status:'Cancel'}),visit({dateVisit:'01/08/2026'}),visit({rawSupportName:'Alexander Smith'})];
 const m=omniForPicMonth('Alex Jones','09. Sep',rows);
 assert.equal(m.visitOmni,6);assert.equal(m.h0,2);assert.equal(m.h1,1);
 assert.equal(m.missingCheckout,2);assert.equal(m.missingCheckin,2);
 assert.equal(m.h0Rate,2/6*100);assert.equal(m.averageH0Minutes,90);assert.equal(m.h0DurationDays,1.5/24);
});
test('Omni matches a support cell containing multiple people and never empty PICs',()=>{
 assert.equal(matchesOmniPicMonth(visit({rawSupportName:'Mira, ALEX Smith'}),'Alex Jones','09. Sep'),true);
 assert.equal(matchesOmniPicMonth(visit(),'','09. Sep'),false);
 assert.equal(matchesOmniPicMonth(visit({status:'CANCELLED'}),'Alex','09. Sep'),false);
});
test('Omni overall KPI does not double count overlapping PIC queries but keeps duplicate report rows',()=>{
 const rows=[visit(),visit()];const selected=[{Pic:'Alex Smith',Month:'09. Sep'},{Pic:'Alex Jones',Month:'09. Sep'}];
 assert.equal(omniForTicketRows(selected,rows).visitOmni,2);
 assert.equal(attachOmniColumns(selected[0],rows)['Visit Omni'],'2');
 assert.equal(omniForPicMonth('Nobody','09. Sep',rows).h0Rate,0);
});
test('invalid checkout chronology is retained in denominator and excluded from duration average',()=>{
 const m=omniForPicMonth('Alex','09. Sep',[visit({checkOutTime:'31/08/2026 10:00:00'})]);
 assert.equal(m.visitOmni,1);assert.equal(m.h0,0);assert.equal(m.h1,0);assert.equal(m.invalidTimes,1);assert.equal(m.averageH0Minutes,null);
});
