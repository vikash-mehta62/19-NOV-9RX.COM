const fs = require('fs');

function readEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

async function callRpc(baseUrl, anonKey, fn, body) {
  const res = await fetch(`${baseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { fn, status: res.status, body: json ?? text };
}

(async () => {
  const env = readEnv('.env');
  const baseUrl = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;

  const tests = [
    { fn: 'apply_referral_code', body: { p_new_user_id: '00000000-0000-0000-0000-000000000000', p_referral_code: 'TEST1234' } },
    { fn: 'complete_referral', body: { p_user_id: '00000000-0000-0000-0000-000000000000', p_order_id: '00000000-0000-0000-0000-000000000000' } },
    { fn: 'issue_credit_memo', body: {} },
    { fn: 'apply_credit_memo', body: {} },
    { fn: 'process_credit_payment', body: {} },
    { fn: 'generate_order_number', body: {} },
    { fn: 'generate_purchase_order_number', body: {} },
    { fn: 'generate_invoice_number', body: {} },
    { fn: 'check_email_verification', body: { user_email: 'nobody@example.com' } },
    { fn: 'current_user_is_admin', body: {} },
    { fn: 'current_user_role', body: {} },
    { fn: 'current_user_group_id', body: {} },
    { fn: 'get_order_status_counts', body: {} },
    { fn: 'get_low_stock_products', body: {} },
    { fn: 'decrement_stock', body: { product_id: '00000000-0000-0000-0000-000000000000', quantity: 1 } },
    { fn: 'update_batch_quantity', body: { p_batch_id: '00000000-0000-0000-0000-000000000000', p_quantity_change: 1 } },
    { fn: 'deduct_batch_quantity', body: { p_batch_id: '00000000-0000-0000-0000-000000000000', p_quantity: 1 } },
    { fn: 'record_terms_acceptance', body: {} },
    { fn: 'validate_promo_code', body: { p_code: 'TEST', p_user_id: '00000000-0000-0000-0000-000000000000', p_order_amount: 100 } },
  ];

  const out = [];
  for (const t of tests) {
    try {
      const res = await callRpc(baseUrl, anon, t.fn, t.body);
      out.push(res);
    } catch (e) {
      out.push({ fn: t.fn, status: -1, body: String(e) });
    }
  }

  fs.writeFileSync('.tmp/supabase_post_phase3_rpc_probe.json', JSON.stringify(out, null, 2));
  for (const r of out) {
    const code = r.body && typeof r.body === 'object' ? (r.body.code || '') : '';
    const msg = r.body && typeof r.body === 'object' ? (r.body.message || '') : '';
    console.log(`${r.fn}|${r.status}|${code}|${msg}`);
  }
})();
