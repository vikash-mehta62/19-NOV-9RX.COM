const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const BASE_URL = 'http://localhost:4001';
const RESULT_PATH = path.join(__dirname, 'e2e_profile_completion_result.json');

const steps = [];
const record = (name, pass, details) => {
  steps.push({ name, pass, details });
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}: ${details}`);
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
  const startedAt = Date.now();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = createClient(supabaseUrl, supabaseService, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const supabasePublic = createClient(supabaseUrl, supabaseAnon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const http = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    validateStatus: () => true,
  });

  const run = Date.now();
  const adminEmail = `e2e.profile.admin.${run}@example.com`;
  const adminPassword = `E2eAdmin#${run % 1000000}Aa`;
  const userEmail = `e2e.profile.user.${run}@example.com`;
  const userPassword = `E2eUser#${run % 1000000}Bb`;

  let serverProc = null;
  let startedByScript = false;

  let adminUserId = null;
  let profileUserId = null;
  let uploadedDocPath = null;
  let customerDocId = null;

  const cleanup = async () => {
    try {
      if (customerDocId) {
        await supabaseAdmin.from('customer_documents').delete().eq('id', customerDocId);
      }
    } catch {}

    try {
      if (uploadedDocPath) {
        await supabaseAdmin.storage.from('documents').remove([uploadedDocPath]);
      }
    } catch {}

    try {
      if (profileUserId) {
        await supabaseAdmin.from('profiles').delete().eq('id', profileUserId);
        await supabaseAdmin.auth.admin.deleteUser(profileUserId);
      }
    } catch {}

    try {
      if (adminUserId) {
        await supabaseAdmin.from('profiles').delete().eq('id', adminUserId);
        await supabaseAdmin.auth.admin.deleteUser(adminUserId);
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
    record('Backend Reachable (:4001)', ready, ready ? 'Server responded' : 'Server not reachable');
    if (!ready) throw new Error('Backend not reachable');

    const adminCreate = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { first_name: 'E2E', last_name: 'Admin' },
    });

    if (adminCreate.error || !adminCreate.data?.user?.id) {
      record('Temp Admin Created', false, adminCreate.error?.message || 'Create admin failed');
      throw new Error('Admin creation failed');
    }

    adminUserId = adminCreate.data.user.id;

    const adminProfile = await supabaseAdmin.from('profiles').upsert({
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
      record('Temp Admin Created', false, `Admin profile failed: ${adminProfile.error.message}`);
      throw new Error('Admin profile failed');
    }

    const adminSession = await supabasePublic.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    const adminToken = adminSession.data?.session?.access_token;
    const adminReady = !adminSession.error && !!adminToken;
    record('Temp Admin Authenticated', adminReady, adminReady ? 'Admin token ready' : (adminSession.error?.message || 'No token'));
    if (!adminReady) throw new Error('Admin auth failed');

    const signup = await supabasePublic.auth.signUp({
      email: userEmail,
      password: userPassword,
      options: {
        data: { first_name: 'Flow', last_name: 'User', phone: '5551002000' },
      },
    });

    profileUserId = signup.data?.user?.id || null;
    const signupOk = !signup.error && !!profileUserId;
    record('Signup User Created', signupOk, signupOk ? `User ${profileUserId}` : (signup.error?.message || 'No user id'));
    if (!signupOk) throw new Error('Signup failed');

    const createProfile = await http.post('/create-signup-profile', {
      userId: profileUserId,
      email: userEmail,
      firstName: 'Flow',
      lastName: 'User',
      phone: '5551002000',
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: '1.0',
    });

    const pendingProfile = await supabaseAdmin
      .from('profiles')
      .select('id,status,account_status,portal_access,email,first_name,last_name')
      .eq('id', profileUserId)
      .maybeSingle();

    const pendingOk = createProfile.status === 200
      && createProfile.data?.success === true
      && pendingProfile.data?.status === 'pending'
      && pendingProfile.data?.account_status === 'pending'
      && pendingProfile.data?.portal_access === false;

    record('Pending Profile Seeded', pendingOk, pendingOk
      ? 'pending/account_status pending/portal false'
      : `status=${pendingProfile.data?.status}, account_status=${pendingProfile.data?.account_status}, portal=${pendingProfile.data?.portal_access}`);

    const notify = await http.post('/user-verification', {
      name: 'Flow User',
      email: userEmail,
      userId: profileUserId,
    });
    record('Verification Email Endpoint', notify.status === 200 && notify.data?.success === true, `HTTP ${notify.status}`);

    const linkRes = await http.post(
      '/api/profile/generate-completion-link',
      { userId: profileUserId, email: userEmail },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const link = linkRes.data?.completionLink;
    const tokenHash = link ? new URL(link).searchParams.get('token') : null;
    const linkOk = linkRes.status === 200 && !!tokenHash;
    record('Generate Completion Link (Protected API)', linkOk, linkOk ? 'Received token hash from link' : `HTTP ${linkRes.status}`);
    if (!linkOk) throw new Error('Completion link generation failed');

    const magicClient = createClient(supabaseUrl, supabaseAnon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const verifyOtp = await magicClient.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    });

    const magicSession = verifyOtp.data?.session;
    const magicAccessToken = magicSession?.access_token;

    const magicOk = !verifyOtp.error && !!magicAccessToken;
    record('Magic Link Session Established', magicOk, magicOk ? 'Magic-link session created' : (verifyOtp.error?.message || 'No session'));
    if (!magicOk) throw new Error('Magic link verify failed');

    const verifySessionRes = await http.get('/api/profile/verify-completion-session', {
      headers: { Authorization: `Bearer ${magicAccessToken}` },
    });
    const verifySessionOk = verifySessionRes.status === 200 && verifySessionRes.data?.success === true;
    record('Profile Session Verification Endpoint', verifySessionOk, `HTTP ${verifySessionRes.status}`);

    const invalidUpdate = await http.post('/update-user-profile', {
      id: profileUserId,
      first_name: '',
      last_name: '',
      company_name: '',
      work_phone: '',
      contact_person: '',
      billing_address: { street1: '', city: '', state: '', zip_code: '', countryRegion: '' },
    }, {
      headers: { Authorization: `Bearer ${magicAccessToken}` },
    });

    const requiredEnforced = invalidUpdate.status >= 400;
    record('Required Fields Enforced Server-Side', requiredEnforced, requiredEnforced
      ? `Rejected invalid payload: HTTP ${invalidUpdate.status}`
      : `Accepted invalid payload: HTTP ${invalidUpdate.status}`);

    const validPayload = {
      id: profileUserId,
      first_name: 'Flow',
      last_name: 'Checker',
      email: 'attempt-change@example.com',
      type: 'pharmacy',
      status: 'pending',
      role: 'admin',
      company_name: 'Flow Pharmacy LLC',
      display_name: 'Flow Checker',
      work_phone: '5552223333',
      mobile_phone: '5553334444',
      contact_person: 'Flow Checker',
      billing_address: {
        street1: '100 Main St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75001',
        countryRegion: 'USA',
      },
      shipping_address: {
        street1: '100 Main St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75001',
        countryRegion: 'USA',
      },
      same_as_shipping: true,
      tax_preference: 'Taxable',
      taxPercantage: 7.25,
      tax_id: 'TAX-99',
      state_id: 'STATE-44',
      terms_and_conditions: {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        version: '1.0',
        method: 'web_form',
      },
      privacy_policy: {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        version: '1.0',
        method: 'web_form',
      },
      privacy_policy_accepted: true,
      privacy_policy_accepted_at: new Date().toISOString(),
      ach_authorization_accepted: true,
      ach_authorization_accepted_at: new Date().toISOString(),
      ach_authorization_version: '1.0',
    };

    const validUpdate = await http.post('/update-user-profile', validPayload, {
      headers: { Authorization: `Bearer ${magicAccessToken}` },
    });

    const validUpdateOk = validUpdate.status === 200 && validUpdate.data?.success === true;
    record('Valid Profile Update Save', validUpdateOk, `HTTP ${validUpdate.status}`);

    const persisted = await supabaseAdmin
      .from('profiles')
      .select('id,email,first_name,last_name,company_name,work_phone,mobile_phone,contact_person,billing_address,shipping_address,tax_id,state_id,taxPercantage,privacy_policy_accepted,ach_authorization_accepted')
      .eq('id', profileUserId)
      .single();

    const persistenceOk = !persisted.error
      && persisted.data?.first_name === 'Flow'
      && persisted.data?.last_name === 'Checker'
      && persisted.data?.company_name === 'Flow Pharmacy LLC'
      && persisted.data?.work_phone === '5552223333'
      && persisted.data?.contact_person === 'Flow Checker'
      && persisted.data?.tax_id === 'TAX-99'
      && persisted.data?.state_id === 'STATE-44'
      && Number(persisted.data?.taxPercantage) === 7.25
      && persisted.data?.email === userEmail;

    record('Profile Persistence Check', persistenceOk, persistenceOk
      ? 'All tested profile fields persisted; email immutable for self-update'
      : 'Profile fields mismatch or not saved as expected');

    const approve = await http.post(`/api/users/approve-access/${profileUserId}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const approveOk = approve.status === 200 && approve.data?.success === true;
    record('Admin Approval', approveOk, `HTTP ${approve.status}`);

    const userPasswordLogin = await supabasePublic.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    });
    const userSession = userPasswordLogin.data?.session;
    const userLoginOk = !userPasswordLogin.error && !!userSession?.access_token;
    record('User Password Login After Approval', userLoginOk, userLoginOk ? 'Session created' : (userPasswordLogin.error?.message || 'No session'));

    let docUploadOk = false;
    let docInsertOk = false;
    let docPersistOk = false;

    if (userLoginOk) {
      const docClient = createClient(supabaseUrl, supabaseAnon, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await docClient.auth.setSession({
        access_token: userSession.access_token,
        refresh_token: userSession.refresh_token,
      });

      const fileData = Buffer.from([
        137, 80, 78, 71, 13, 10, 26, 10,
        0, 0, 0, 13, 73, 72, 68, 82,
        0, 0, 0, 1, 0, 0, 0, 1,
        8, 2, 0, 0, 0, 144, 119, 83,
        222, 0, 0, 0, 12, 73, 68, 65,
        84, 8, 153, 99, 0, 1, 0, 0,
        5, 0, 1, 13, 10, 45, 180, 0,
        0, 0, 0, 73, 69, 78, 68, 174,
        66, 96, 130,
      ]);
      const docPath = `customer-documents/${profileUserId}/e2e-${run}.png`;

      const up = await docClient.storage.from('documents').upload(docPath, fileData, {
        contentType: 'image/png',
      });

      if (!up.error && up.data?.path) {
        uploadedDocPath = up.data.path;
        docUploadOk = true;
      }

      record('Document Storage Upload', docUploadOk, docUploadOk ? `Stored at ${uploadedDocPath}` : (up.error?.message || 'Upload failed'));

      if (docUploadOk) {
        const ins = await docClient
          .from('customer_documents')
          .insert({
            customer_id: profileUserId,
            name: `e2e-${run}.png`,
            file_path: uploadedDocPath,
            file_type: 'png',
            file_size: fileData.length,
            uploaded_by: profileUserId,
          })
          .select()
          .single();

        if (!ins.error && ins.data?.id) {
          customerDocId = ins.data.id;
          docInsertOk = true;
        }

        record('customer_documents Insert', docInsertOk, docInsertOk ? `Row ${customerDocId}` : (ins.error?.message || 'Insert failed'));

        if (docInsertOk) {
          const checkDoc = await supabaseAdmin
            .from('customer_documents')
            .select('id,customer_id,file_path,name')
            .eq('id', customerDocId)
            .single();
          docPersistOk = !checkDoc.error
            && checkDoc.data?.customer_id === profileUserId
            && checkDoc.data?.file_path === uploadedDocPath;

          record('Document Persistence Check', docPersistOk, docPersistOk ? 'Document row persisted correctly' : 'Document row mismatch');
        }
      }
    } else {
      record('Document Storage Upload', false, 'Skipped (user login failed)');
      record('customer_documents Insert', false, 'Skipped (user login failed)');
      record('Document Persistence Check', false, 'Skipped (user login failed)');
    }

    const scored = steps;
    const passed = scored.filter((s) => s.pass).length;
    const score = Math.round((passed / scored.length) * 100);

    const result = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      startedByScript,
      score,
      passed,
      total: scored.length,
      requiredValidationServerSide: requiredEnforced ? 'enforced' : 'NOT_ENFORCED',
      steps: scored,
      testAccounts: { adminEmail, userEmail },
      durationMs: Date.now() - startedAt,
    };

    fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2));
    console.log(`RESULT_JSON=${RESULT_PATH}`);
    console.log(`FINAL_SCORE=${score}`);
  } catch (error) {
    const passed = steps.filter((s) => s.pass).length;
    const score = steps.length ? Math.round((passed / steps.length) * 100) : 0;
    const fail = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      startedByScript,
      score,
      passed,
      total: steps.length,
      steps,
      fatalError: error.message,
      durationMs: Date.now() - startedAt,
    };
    fs.writeFileSync(RESULT_PATH, JSON.stringify(fail, null, 2));
    console.error(`FATAL: ${error.message}`);
    console.log(`RESULT_JSON=${RESULT_PATH}`);
    console.log(`FINAL_SCORE=${score}`);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
})();
