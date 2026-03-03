const fs=require('fs');
function env(file){const o={};for(const l of fs.readFileSync(file,'utf8').split(/\r?\n/)){if(!l||l.startsWith('#')||!l.includes('='))continue;const i=l.indexOf('=');o[l.slice(0,i).trim()]=l.slice(i+1).trim();}return o}
(async()=>{
  const e1=env('.env'); const e2=env('server/.env');
  const url=e1.VITE_SUPABASE_URL||e2.SUPABASE_URL;
  const anon=e1.VITE_SUPABASE_ANON_KEY||e2.SUPABASE_ANON_KEY;
  const srv=e2.SUPABASE_SERVICE_ROLE_KEY;
  const q='?select=id,category_name,display_order&order=display_order.asc.nullslast&limit=20';
  async function hit(label,key){
    const r=await fetch(`${url}/rest/v1/category_configs${q}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    const t=await r.text(); let j; try{j=JSON.parse(t)}catch{j=t}
    console.log(label, r.status, Array.isArray(j)?`rows=${j.length}`:j.code||'');
    if(Array.isArray(j)) console.log(label+'_sample', JSON.stringify(j.slice(0,3)));
  }
  await hit('anon',anon);
  await hit('service',srv);
})();
