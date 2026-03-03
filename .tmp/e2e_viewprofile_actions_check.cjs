const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const BASE_URL = 'http://localhost:4001';

const results = [];
const record = (name, pass, details) => {
  results.push({ name, pass, details });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isServerUp = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/`, { timeout: 2500, validateStatus: () => true });
    return res.status < 500;
  } catch {
    return false;
  }
};

const waitForServer = async (ms = 45000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await isServerUp()) return true;
    await sleep(1000);
  }
  return false;
};

(async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const run = Date.now();
  const adminEmail = `e2e.view.admin.${run}@example.com`;
  const adminPassword = `E2eAdmin#${run % 1000000}Aa`;
  const userEmail = `e2e.view.user.${run}@example.com`;
  const userPassword = `E2eUser#${run % 1000000}Bb`;

  let adminId = null;
  let userId = null;
  let serverProc = null;
  let startedByScript = false;

  const cleanup = async () => {
    try {
      if (userId) {
        await adminClient.from('profiles').delete().eq('id', userId);
        await adminClient.auth.admin.deleteUser(userId);
      }
    } catch {}

    try {
      if (adminId) {
        await adminClient.from('profiles').delete().eq('id', adminId);
        await adminClient.auth.admin.deleteUser(adminId);
      }
    } catch {}

    if (startedByScript && serverProc && !serverProc.killed) {
      try { serverProc.kill('SIGTERM'); } catch {}
    }
  };

  try {
    const alreadyUp = await isServerUp();
    if (!alreadyUp) {
      serverProc = spawn('node', ['app.js'], {
        cwd: path.join(__dirname, '..', 'server'),
        env: { ...process.env, PORT: '4001' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      startedByScript = true;
    }

    const ready = await waitForServer(50000);
    record('Backend reachable', ready, ready ? 'Server responded' : 'Server not reachable');
    if (!ready) throw new Error('Backend unavailable');

    const a = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { first_name: 'View', last_name: 'Admin' },
    });
    if (a.error || !a.data?.user?.id) throw new Error(a.error?.message || 'Admin create failed');
    adminId = a.data.user.id;

    const adminProfile = await adminClient.from('profiles').upsert({
      id: adminId,
      email: adminEmail,
      first_name: 'View',
      last_name: 'Admin',
      display_name: 'View Admin',
      role: 'admin',
      type: 'admin',
      status: 'active',
      account_status: 'approved',
      portal_access: true,
    }, { onConflict: 'id' });
    if (adminProfile.error) throw new Error(adminProfile.error.message);

    const u = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: { first_name: 'View', last_name: 'User' },
    });
    if (u.error || !u.data?.user?.id) throw new Error(u.error?.message || 'User create failed');
    userId = u.data.user.id;

    const userProfile = await adminClient.from('profiles').upsert({
      id: userId,
      email: userEmail,
      first_name: 'View',
      last_name: 'User',
      display_name: 'View User',
      role: 'user',
      type: 'pharmacy',
      status: 'active',
      account_status: 'approved',
      portal_access: true,
      email_notifaction: true,
      terms_and_conditions: { accepted: false },
      privacy_policy: { accepted: false },
      ach_authorization: { accepted: false },
    }, { onConflict: 'id' });
    if (userProfile.error) throw new Error(userProfile.error.message);

    const adminSession = await publicClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    const adminToken = adminSession.data?.session?.access_token;
    record('Admin login', !!adminToken && !adminSession.error, adminSession.error?.message || 'token ready');
    if (!adminToken) throw new Error('Admin token missing');

    const adminSigned = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${adminToken}` } },
    });

    // Button: Suspend (status inactive)
    const suspend = await adminSigned.from('profiles').update({ status: 'inactive' }).eq('id', userId);
    record('Suspend action update', !suspend.error, suspend.error?.message || 'status set inactive');
    if (suspend.error) throw new Error(suspend.error.message);

    // Verify login blocked when suspended
    const otpSuspended = await axios.post(`${BASE_URL}/api/otp/send`, {
      email: userEmail,
      password: userPassword,
    }, { timeout: 10000, validateStatus: () => true });
    record('Suspended login blocked', otpSuspended.status === 403, `HTTP ${otpSuspended.status}`);

    // Button: Activate
    const activate = await adminSigned.from('profiles').update({ status: 'active' }).eq('id', userId);
    record('Activate action update', !activate.error, activate.error?.message || 'status set active');
    if (activate.error) throw new Error(activate.error.message);

    // Button: Credit Status
    const credit = await adminSigned.from('profiles').update({ credit_status: 'warning' }).eq('id', userId);
    if (credit.error) throw new Error(credit.error.message);
    const creditCheck = await adminClient.from('profiles').select('credit_status').eq('id', userId).single();
    record('Credit status saved', creditCheck.data?.credit_status === 'warning', `value=${creditCheck.data?.credit_status}`);

    // Tab: Settings (portal access off blocks login)
    const portalOff = await adminSigned.from('profiles').update({ portal_access: false }).eq('id', userId);
    record('Portal access toggle saved', !portalOff.error, portalOff.error?.message || 'portal_access=false');

    const otpPortalOff = await axios.post(`${BASE_URL}/api/otp/send`, {
      email: userEmail,
      password: userPassword,
    }, { timeout: 10000, validateStatus: () => true });
    record('Portal access block enforced', otpPortalOff.status === 403, `HTTP ${otpPortalOff.status}`);

    // Restore for other checks
    await adminSigned.from('profiles').update({ portal_access: true }).eq('id', userId);

    // Button: Resend terms email endpoint
    const resend = await axios.post(`${BASE_URL}/api/terms/resend-acceptance-email`, {
      userId,
    }, {
      timeout: 15000,
      validateStatus: () => true,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record('Resend terms endpoint', resend.status === 200 && resend.data?.success === true, `HTTP ${resend.status}`);

    // Tabs data sources smoke (queries used by ViewProfileModal fetchAllData)
    const checks = await Promise.all([
      adminSigned.from('profiles').select('*').eq('id', userId).single(),
      adminSigned.from('orders').select('id').eq('profile_id', userId).limit(1),
      adminSigned.from('customer_notes').select('id').eq('customer_id', userId).limit(1),
      adminSigned.from('customer_tasks').select('id').eq('customer_id', userId).limit(1),
      adminSigned.from('locations').select('id').eq('profile_id', userId).limit(1),
      adminSigned.from('customer_documents').select('id').eq('customer_id', userId).limit(1),
    ]);

    const names = ['profile', 'orders', 'notes', 'tasks', 'locations', 'documents'];
    let allTabsOk = true;
    checks.forEach((c, i) => {
      const ok = !c.error;
      if (!ok) allTabsOk = false;
      record(`Tab source ${names[i]}`, ok, c.error?.message || 'ok');
    });

    const score = Math.round((results.filter(r => r.pass).length / results.length) * 100);
    console.log(`FINAL_SCORE=${score}`);

    if (score < 100) process.exitCode = 2;
  } catch (e) {
    console.error('Unhandled error object:', e);
    if (e && e.stack) console.error(e.stack);
    if (e && e.cause) console.error('Cause:', e.cause);
    record('Unhandled error', false, e.message || String(e));
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
})();
