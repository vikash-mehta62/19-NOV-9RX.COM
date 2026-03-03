const fs = require('fs');
function env(file){const o={}; for(const l of fs.readFileSync(file,'utf8').split(/\r?\n/)){if(!l||l.startsWith('#')||!l.includes('=')) continue; const i=l.indexOf('='); o[l.slice(0,i).trim()]=l.slice(i+1).trim();} return o;}
async function probe(fn, body){
  const e=env('.env');
  const url=e.VITE_SUPABASE_URL; const k=e.VITE_SUPABASE_ANON_KEY;
  const r=await fetch(`${url}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const t=await r.text();
  let j; try{j=JSON.parse(t);}catch{j=t}
  console.log(fn+'|'+r.status+'|'+(j.code||'')+'|'+(j.message||t));
}
(async()=>{
await probe('apply_credit_memo',{p_credit_memo_id:'00000000-0000-0000-0000-000000000000',p_order_id:'00000000-0000-0000-0000-000000000000',p_amount:1,p_applied_by:'00000000-0000-0000-0000-000000000000'});
await probe('issue_credit_memo',{p_customer_id:'00000000-0000-0000-0000-000000000000',p_amount:1,p_reason:'t',p_order_id:null,p_refund_id:null,p_items:[],p_issued_by:'00000000-0000-0000-0000-000000000000'});
await probe('process_credit_payment',{p_invoice_id:'00000000-0000-0000-0000-000000000000',p_amount:1,p_payment_method:'card',p_transaction_id:'x'});
await probe('record_terms_acceptance',{p_profile_id:'00000000-0000-0000-0000-000000000000',p_terms_type:'terms_of_service',p_terms_version:'1.0'});
})();
