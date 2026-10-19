import { timingSafeEqual } from 'node:crypto';
const headers = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' };
const reply = (statusCode, body) => ({statusCode,headers,body:JSON.stringify(body)});
const safeEqual = (a,b) => {
  const left=Buffer.from(a||''); const right=Buffer.from(b||'');
  return left.length>0 && left.length===right.length && timingSafeEqual(left,right);
};
export async function handler(event) {
  if (!['GET','POST'].includes(event.httpMethod)) return reply(405,{error:'Method not allowed'});
  const editorToken=process.env.TEAM_EDITOR_TOKEN;
  const received=(event.headers?.authorization||event.headers?.Authorization||'').replace(/^Bearer\s+/i,'');
  if (!editorToken || !safeEqual(received,editorToken)) return reply(401,{error:'Akses editor tidak valid / belum dikonfigurasi'});
  const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) return reply(503,{error:'Koneksi database belum tersedia'});
  const base=url.replace(/\/$/,'');
  const auth={apikey:key,Authorization:`Bearer ${key}`};
  try {
    if (event.httpMethod==='GET') {
      const resp=await fetch(`${base}/rest/v1/testing_studio_team_assignment_history?select=id,employee_name,l2_name,supervisor_name,effective_from,effective_until&order=employee_name.asc,effective_from.asc&limit=1000`,{headers:auth,signal:AbortSignal.timeout(10000)});
      if(!resp.ok) return reply(502,{error:'Gagal mengambil histori mapping'});
      return reply(200,{records:await resp.json()});
    }
    let data;
    try { data=JSON.parse(event.body||'{}'); } catch {return reply(400,{error:'JSON tidak valid'});}
    const {employee_name,supervisor_name,l2_name,effective_from}=data;
    if ([employee_name,supervisor_name,l2_name].some(v=>typeof v!=='string'||!v.trim()||v.length>150) ||
        typeof effective_from!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(effective_from) ||
        Number.isNaN(Date.parse(effective_from))) return reply(400,{error:'Nama, L2, SPV, tanggal efektif wajib valid'});
    const resp=await fetch(`${base}/rest/v1/rpc/save_testing_studio_team_assignment`,{
      method:'POST',headers:{...auth,'Content-Type':'application/json'},
      body:JSON.stringify({p_employee_name:employee_name,p_supervisor_name:supervisor_name,p_l2_name:l2_name,p_effective_from:effective_from}),
      signal:AbortSignal.timeout(10000)
    });
    if (!resp.ok) return reply(resp.status===400?400:502,{error:'Gagal menyimpan. Tanggal efektif harus setelah histori terakhir, atau database belum memiliki migration editor.'});
    return reply(200,{saved:await resp.json()});
  } catch {return reply(502,{error:'Tidak dapat menghubungi database'});}
}
