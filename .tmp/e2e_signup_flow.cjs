const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const BASE_URL = 'http://localhost:4001';
const TEST_TIMEOUT_MS = 120000;

const steps = [];
const record = (name, pass, details) => {
  steps.push({ name, pass, details });
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}: ${details}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isServerUp = async () => {
  try {
    const resp = await axios.get(`${BASE_URL}/`, { timeout: 2500, validateStatus: () => true });
    return resp.status < 500;
  } catch (_) {
    return false;
  }
};

const waitForServer = async (maxMs = 45000) => {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isServerUp()) return true;
    await sleep(1000);
  }
  return false;
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractOtpFromLogs = (logs, email) => {
  const safeEmail = escapeRegExp(email);
  const regex = new RegExp(`OTP sent to ${safeEmail} after password verification: (\\d{6})`, 'g');
  let match;
  let otp = null;
  while ((match = regex.exec(logs)) !== null) {
    otp = match[1];
  }
  return otp;
};

(async () => {
  const startTs = Date.now();
  let serverProcess = null;
  let startedByScript = false;
  let serverStdout = '';
  let serverStderr = '';

  let adminUserId = null;
  let signupUserId = null;

  const logPath = path.join(__dirname, 'e2e_signup_flow_server.log');
  const resultPath = path.join(__dirname, 'e2e_signup_flow_result.json');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const runId = Date.now();
  const signupEmail = `e2e.signup.${runId}@example.com`;
  const signupPassword = `E2eUser#${runId % 1000000}Aa`;
  const adminEmail = `e2e.admin.${runId}@example.com`;
  const adminPassword = `E2eAdmin#${runId % 1000000}Bb`;

  const http = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    validateStatus: () => true,
  });

  const cleanup = async () => {
    try {
      if (signupUserId) {
        await supabaseAdmin.from('profiles').delete().eq('id', signupUserId);
        await supabaseAdmin.auth.admin.deleteUser(signupUserId);
      }
    } catch (_) {}

    try {
      if (adminUserId) {
        await supabaseAdmin.from('profiles').delete().eq('id', adminUserId);
        await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      }
    } catch (_) {}
  };

  try {
    const alreadyUp = await isServerUp();

    if (!alreadyUp) {
      serverProcess = spawn('node', ['app.js'], {
        cwd: path.join(__dirname, '..', 'server'),
        env: { ...process.env, PORT: '4001' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      startedByScript = true;

      serverProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        serverStdout += text;
        fs.appendFileSync(logPath, text);
      });
      serverProcess.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        serverStderr += text;
        fs.appendFileSync(logPath, text);
      });
    }

    const ready = await waitForServer(50000);
    record('Backend Reachable on :4001', ready, ready ? 'Server responded successfully' : 'Server did not become reachable');
    if (!ready) throw new Error('Backend startup failed');

    // 1) Create temp admin user and profile, then login for bearer token
    const adminCreate = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { first_name: 'E2E', last_name: 'Admin' },
    });

    if (adminCreate.error || !adminCreate.data?.user?.id) {
      record('Temp Admin Setup', false, adminCreate.error?.message || 'Failed to create admin auth user');
      throw new Error('Cannot continue without admin user');
    }

    adminUserId = adminCreate.data.user.id;

    const adminProfile = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: adminUserId,
        email: adminEmail,
        first_name: 'E2E',
        last_name: 'Admin',
        display_name: 'E2E Admin',
        role: 'admin',
        type: 'admin',
        status: 'active',
        account_status: 'approved',
        portal_access: true,
      }, { onConflict: 'id' });

    if (adminProfile.error) {
      record('Temp Admin Setup', false, `Profile upsert failed: ${adminProfile.error.message}`);
      throw new Error('Cannot continue without admin profile');
    }

    const adminSignIn = await supabasePublic.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    const adminToken = adminSignIn.data?.session?.access_token;
    const adminReady = !adminSignIn.error && !!adminToken;
    record('Temp Admin Setup', adminReady, adminReady ? 'Admin created and authenticated' : (adminSignIn.error?.message || 'Admin login failed'));
    if (!adminReady) throw new Error('Cannot continue without admin token');

    // 2) Signup auth user
    const signupResp = await supabasePublic.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { first_name: 'E2E', last_name: 'User', phone: '5550001234' },
      },
    });

    signupUserId = signupResp.data?.user?.id || null;
    const signupOk = !signupResp.error && !!signupUserId;
    record('Signup Auth User Created', signupOk, signupOk ? `Auth user created (${signupUserId})` : (signupResp.error?.message || 'No user id from signUp'));
    if (!signupOk) throw new Error('Cannot continue without signup user');

    // 3) Create signup profile
    const createProfileResp = await http.post('/create-signup-profile', {
      userId: signupUserId,
      email: signupEmail,
      firstName: 'E2E',
      lastName: 'User',
      phone: '5550001234',
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: '1.0',
    });

    const profileFromDb = await supabaseAdmin
      .from('profiles')
      .select('id, status, account_status, portal_access')
      .eq('id', signupUserId)
      .maybeSingle();

    const pendingStateOk =
      createProfileResp.status === 200 &&
      createProfileResp.data?.success === true &&
      !profileFromDb.error &&
      profileFromDb.data?.status === 'pending' &&
      profileFromDb.data?.account_status === 'pending' &&
      profileFromDb.data?.portal_access === false;

    record(
      'Signup Profile Pending State',
      pendingStateOk,
      pendingStateOk
        ? 'Profile is pending with portal_access=false'
        : `status=${profileFromDb.data?.status}, account_status=${profileFromDb.data?.account_status}, portal_access=${profileFromDb.data?.portal_access}`
    );

    // 4) Trigger verification email workflow
    const verifyResp = await http.post('/user-verification', {
      name: 'E2E User',
      email: signupEmail,
      userId: signupUserId,
    });

    const verifyOk = verifyResp.status === 200 && verifyResp.data?.success === true;
    record('Verification Email Trigger', verifyOk, verifyOk ? 'Endpoint returned success' : `HTTP ${verifyResp.status} - ${verifyResp.data?.message || 'Unknown error'}`);

    // 5) Pre-approval login should be blocked
    const preLoginResp = await http.post('/api/otp/send', {
      email: signupEmail,
      password: signupPassword,
    });

    const preLoginBlocked = !(preLoginResp.status === 200 && preLoginResp.data?.success === true);
    record('Pre-Approval Login Blocked', preLoginBlocked, `HTTP ${preLoginResp.status} - ${preLoginResp.data?.message || 'No message'}`);

    // 6) Admin approve access
    const approveResp = await http.post(
      `/api/users/approve-access/${signupUserId}`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const approveOk = approveResp.status === 200 && approveResp.data?.success === true;
    record('Admin Approval Action', approveOk, approveOk ? 'Approve endpoint success' : `HTTP ${approveResp.status} - ${approveResp.data?.message || 'Unknown error'}`);

    // 7) Validate approved profile state
    const approvedProfile = await supabaseAdmin
      .from('profiles')
      .select('id, status, account_status, portal_access')
      .eq('id', signupUserId)
      .maybeSingle();

    const approvedStateOk =
      !approvedProfile.error &&
      approvedProfile.data?.status === 'active' &&
      approvedProfile.data?.account_status === 'approved' &&
      approvedProfile.data?.portal_access === true;

    record('Post-Approval Profile State', approvedStateOk, approvedStateOk ? 'Profile active + portal_access=true' : `status=${approvedProfile.data?.status}, account_status=${approvedProfile.data?.account_status}, portal_access=${approvedProfile.data?.portal_access}`);

    // 8) OTP send should succeed after approval
    const otpSendResp = await http.post('/api/otp/send', {
      email: signupEmail,
      password: signupPassword,
    });

    const otpSendOk = otpSendResp.status === 200 && otpSendResp.data?.success === true;
    record('Post-Approval OTP Send', otpSendOk, otpSendOk ? 'OTP send succeeded' : `HTTP ${otpSendResp.status} - ${otpSendResp.data?.message || 'Unknown error'}`);

    // 9) OTP verify should succeed (extract OTP from server logs)
    await sleep(1200);
    const combinedLogs = `${serverStdout}\n${serverStderr}`;
    const otp = extractOtpFromLogs(combinedLogs, signupEmail);

    let otpVerifyOk = false;
    let otpVerifyDetails = 'OTP not found in captured logs';

    if (otp) {
      const otpVerifyResp = await http.post('/api/otp/verify', { email: signupEmail, otp });
      otpVerifyOk = otpVerifyResp.status === 200 && otpVerifyResp.data?.success === true && !!otpVerifyResp.data?.session?.access_token;
      otpVerifyDetails = otpVerifyOk
        ? 'OTP verify returned session token'
        : `HTTP ${otpVerifyResp.status} - ${otpVerifyResp.data?.message || 'Unknown error'}`;
    }

    record('OTP Verify Login Success', otpVerifyOk, otpVerifyDetails);

    // Score
    const scoredSteps = steps.slice(0, 10);
    const passed = scoredSteps.filter((s) => s.pass).length;
    const score = Math.round((passed / scoredSteps.length) * 100);

    const result = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      startedByScript,
      score,
      passed,
      total: scoredSteps.length,
      steps,
      durationMs: Date.now() - startTs,
      testData: {
        signupEmail,
        adminEmail,
      },
    };

    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`RESULT_JSON=${resultPath}`);
    console.log(`FINAL_SCORE=${score}`);
  } catch (err) {
    const partialScored = steps.slice(0, 10);
    const passed = partialScored.filter((s) => s.pass).length;
    const score = partialScored.length ? Math.round((passed / partialScored.length) * 100) : 0;

    const failResult = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      startedByScript,
      score,
      passed,
      total: partialScored.length,
      steps,
      fatalError: err.message,
      durationMs: Date.now() - startTs,
    };

    fs.writeFileSync(resultPath, JSON.stringify(failResult, null, 2));
    console.error(`FATAL: ${err.message}`);
    console.log(`RESULT_JSON=${resultPath}`);
    console.log(`FINAL_SCORE=${score}`);
    process.exitCode = 1;
  } finally {
    await cleanup();

    if (startedByScript && serverProcess && !serverProcess.killed) {
      try {
        serverProcess.kill('SIGTERM');
      } catch (_) {}
    }
  }
})();
