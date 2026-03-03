const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l&&l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('='); return [l.slice(0,i),l.slice(i+1)]}));
(async()=>{
const url=env.VITE_SUPABASE_URL; const k=env.VITE_SUPABASE_ANON_KEY;
const body={p_profile_id:'00000000-0000-0000-0000-000000000000',p_terms_type:'terms_of_service',p_terms_version:'1.0',p_ip_address:null,p_user_agent:'x',p_acceptance_method:'web_form',p_document_url:null,p_notes:'x',p_digital_signature:'x',p_signature_method:'typed_name'};
const r=await fetch(`${url}/rest/v1/rpc/record_terms_acceptance`,{method:'POST',headers:{apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
const t=await r.text(); let j; try{j=JSON.parse(t);}catch{j=t}; console.log(r.status, j.code||'', j.message||t);
})();
