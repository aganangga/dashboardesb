import test from 'node:test';
import assert from 'node:assert/strict';
import {displayTeamName} from './teamDirectory';

test('filter display follows exact, email and uniquely shortened Team Master names',()=>{
 const roster=[{'Nama Karyawan':'Yoga Astita Ade Pratama','Email User':'yoga@example.test'}];
 assert.equal(displayTeamName('Yoga Astita Ade',roster),'Yoga Astita Ade Pratama');
 assert.equal(displayTeamName('yoga@example.test',roster),'Yoga Astita Ade Pratama');
});
test('ambiguous first-name matches retain their source identity',()=>{
 const roster=[{'Nama Karyawan':'Alex Smith'},{'Nama Karyawan':'Alex Jones'}];
 assert.equal(displayTeamName('Alex',roster),'Alex');assert.equal(displayTeamName('Unknown',roster),'Unknown');
});
