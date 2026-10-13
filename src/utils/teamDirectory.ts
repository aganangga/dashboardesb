import type { RawDataRow } from '../types';
import { getMasterAssignmentsForSupport } from './dataProcessor';
const normalize = (value:string)=>value.trim().toLocaleLowerCase().replace(/\s+/g,' ');

export function displayTeamName(value:string, roster:RawDataRow[]):string {
  const key=normalize(value);
  if(!key)return value;
  const people=roster.filter(row=>row['Nama Karyawan']?.trim());
  const exact=people.find(row=>normalize(row['Nama Karyawan']||'')===key || normalize(row['Email User']||'')===key);
  if(exact)return exact['Nama Karyawan']!.trim();
  const aliases=[value,...getMasterAssignmentsForSupport(value).map(a=>a.supportName)];
  const matches=people.filter(row=>aliases.some(alias=>{
    const left=normalize(alias);const right=normalize(row['Nama Karyawan']||'');
    return left===right || right.startsWith(left+' ') || left.startsWith(right+' ');
  }));
  const names=[...new Set(matches.map(row=>row['Nama Karyawan']!.trim()))];
  return names.length===1?names[0]:value;
}
