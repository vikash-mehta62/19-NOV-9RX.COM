const fs=require('fs');
function env(file){const o={}; for(const l of fs.readFileSync(file,'utf8').split(/\r?\n/)){ if(!l||l.startsWith('#')||!l.includes('=')) continue; const i=l.indexOf('='); o[l.slice(0,i).trim()]=l.slice(i+1).trim(); } return o; }
(async()=>{
  const e1=env('.env'); const e2=env('server/.env');
  const url=e1.VITE_SUPABASE_URL||e2.SUPABASE_URL;
  const anon=e1.VITE_SUPABASE_ANON_KEY||e2.SUPABASE_ANON_KEY;
  const srv=e2.SUPABASE_SERVICE_ROLE_KEY;

  async function q(label,key,path){
    const r=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'count=exact'}});
    const t=await r.text(); let j; try{j=JSON.parse(t)}catch{j=t}
    const cnt=r.headers.get('content-range');
    console.log(label, r.status, path, cnt||'');
    if(Array.isArray(j)) console.log(label+'_rows', j.length, JSON.stringify(j.slice(0,5)));
    else console.log(label+'_err', j.code||'', j.message||t);
  }

  await q('service',srv,'blogs?select=id,title,is_published,created_at&order=created_at.desc&limit=20');
  await q('anon',anon,'blogs?select=id,title,is_published,created_at&order=created_at.desc&limit=20');
})();
