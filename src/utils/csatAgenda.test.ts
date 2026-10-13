import test from 'node:test';
import assert from 'node:assert/strict';
import type {ProcessedRecord} from '../types';
import {aggregateCsatAgendas,summarizeCsatAgendas} from './csatAgenda';
const visit=(ticketId:string,dateVisit:string)=>({ticketId,dateVisit,raw:{},supportName:'A',supportTeamList:[],jointSupportNames:[]}) as ProcessedRecord;

test('CSAT ratings 4 and 5 in one agenda become 4.5 and each agenda has equal weight',()=>{
 const rows=[{'Ticket ID':'T1','Jadwal Agenda':'01/09/2026 10:00:00',Rating:'Puas'},{'Ticket ID':'T1','Jadwal Agenda':'01/09/2026 10:00:00',Rating:'Sangat Puas'},{'Ticket ID':'T2','Jadwal Agenda':'02/09/2026 10:00:00',Rating:'Cukup'}];
 const s=summarizeCsatAgendas(rows,[]);
 assert.equal(s.agendas[0].score,4.5);assert.equal(s.agendaCount,2);assert.equal(s.average,3.75);assert.equal(s.satisfaction,50);assert.equal(s.multipleResponses,1);
});
test('same ticket on two dates or two times remains separate agendas',()=>{
 const rows=[{'Ticket ID':'T1','Jadwal Agenda':'01/09/2026 10:00:00',Rating:'Puas'},{'Ticket ID':'T1','Jadwal Agenda':'02/09/2026 10:00:00',Rating:'Sangat Puas'},{'Ticket ID':'T1','Jadwal Agenda':'01/09/2026 14:00:00',Rating:'Cukup'}];
 assert.equal(aggregateCsatAgendas(rows,[]).length,3);
});
test('blank schedule can link only to a unique visit agenda; submit date is not used to guess',()=>{
 const rows=[{'Ticket ID':'T1',Rating:'Puas','Created At (Date Created)':'05/09/2026'},{'Ticket ID':'T1',Rating:'Sangat Puas','Created At (Date Created)':'06/09/2026'}];
 assert.equal(summarizeCsatAgendas(rows,[visit('T1','01/09/2026')]).average,4.5);
 const ambiguous=summarizeCsatAgendas(rows,[visit('T1','01/09/2026'),visit('T1','02/09/2026')]);
 assert.equal(ambiguous.average,4.5);assert.equal(ambiguous.agendaCount,0);assert.equal(ambiguous.multipleResponses,0);assert.equal(ambiguous.unresolved,2);
});
test('explicit schedule and unique date-only fallback join the same confirmed agenda',()=>{
 const rows=[{'Ticket ID':'T1','Jadwal Agenda':'01/09/2026 10:00:00',Rating:'Puas'},{'Ticket ID':'T1',Rating:'Sangat Puas'}];
 const s=summarizeCsatAgendas(rows,[visit('T1','01/09/2026')]);assert.equal(s.agendaCount,1);assert.equal(s.average,4.5);
});
test('unknown rating does not become zero in an agenda average and explicit IDs are accepted',()=>{
 const s=summarizeCsatAgendas([{'Agenda ID':'A',Rating:'Puas'},{'Agenda ID':'A',Rating:'unknown'}],[]);
 assert.equal(s.average,4);assert.equal(s.agendas[0].responses,2);assert.equal(s.agendas[0].validResponses,1);
});
