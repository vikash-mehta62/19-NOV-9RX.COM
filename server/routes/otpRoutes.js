const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const mailSender = require("../utils/mailSender");
const otpEmailTemplate = require("../templates/otpEmailTemplate");
const { logSuccessfulLogin, logFailedLogin } = require("../utils/loginLogger");

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const getSupabasePublicClient = () => {
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    throw new Error("SUPABASE_ANON_KEY is not configured");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const buildEligibilityError = (message, extra = {}) => ({
  success: false,
  message,
  ...extra,
});

const isAdminRole = (role) => role === "admin" || role === "superadmin";

const validateLoginEligibility = async (profile) => {
  if (!profile) {
    return { ok: false, status: 404, body: buildEligibilityError("User profile not found") };
  }

  if (profile.requires_password_reset === true && !isAdminRole(profile.role)) {
    return {
      ok: false,
      status: 403,
      body: buildEligibilityError("PASSWORD_RESET_REQUIRED", { requiresPasswordReset: true }),
    };
  }

  if (profile.status !== "active") {
    if (profile.status === "pending") {
      return {
        ok: false,
        status: 403,
        body: buildEligibilityError("Your account is pending admin approval."),
      };
    }
    if (profile.status === "rejected") {
      return {
        ok: false,
        status: 403,
        body: buildEligibilityError("Your account request was rejected. Please contact support."),
      };
    }
    return {
      ok: false,
      status: 403,
      body: buildEligibilityError("Account is not active. Please contact support."),
    };
  }

  if (profile.group_id) {
    const { data: groupProfile, error: groupError } = await supabaseAdmin
      .from("profiles")
      .select("id, status, type")
      .eq("id", profile.group_id)
      .single();

    if (groupError || !groupProfile) {
      return {
        ok: false,
        status: 403,
        body: buildEligibilityError("Your group account no longer exists. Please contact support."),
      };
    }

    if (groupProfile.status !== "active") {
      return {
        ok: false,
        status: 403,
        body: buildEligibilityError("Your group account is not active. Please contact your group administrator."),
      };
    }

    if (groupProfile.type !== "group") {
      return {
        ok: false,
        status: 403,
        body: buildEligibilityError("Invalid group configuration. Please contact support."),
      };
    }
  }

  // Non-admin users need explicit portal access.
  if (profile.type !== "admin" && !isAdminRole(profile.role) && !profile.portal_access) {
    return {
      ok: false,
      status: 403,
      body: buildEligibilityError("Portal access is disabled for your account."),
    };
  }

  return { ok: true };
};

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();
const otpSendRateStore = new Map();
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const OTP_SEND_MAX = parseInt(process.env.OTP_SEND_MAX || "5", 10);

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const maskEmail = (email = "") => {
  const [name, domain] = String(email).toLowerCase().split("@");
  if (!name || !domain) return "unknown";
  if (name.length <= 2) return `**@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

const isOtpSendRateLimited = (email, ip) => {
  const key = `${String(email).toLowerCase().trim()}|${ip || "unknown"}`;
  const now = Date.now();
  const record = otpSendRateStore.get(key);

  if (!record || now > record.resetAt) {
    otpSendRateStore.set(key, { count: 1, resetAt: now + OTP_SEND_WINDOW_MS });
    return false;
  }

  if (record.count >= OTP_SEND_MAX) {
    return true;
  }

  record.count += 1;
  otpSendRateStore.set(key, record);
  return false;
};

/**
 * Send OTP to user's email (after verifying email + password)
 * POST /api/otp/send
 */
router.post("/send", async (req, res) => {
  try {
    const { email, password } = req.body;
    const requestIp = req.headers["x-forwarded-for"] || req.ip || req.connection?.remoteAddress;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    if (isOtpSendRateLimited(email, requestIp)) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Please try again later.",
      });
    }

    // Step 1: Authenticate user with Supabase
    const supabase = getSupabasePublicClient();

    // Verify email and password with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (authError || !authData.user) {
      // Log failed login attempt
      const reason = authError?.message?.toLowerCase().includes('email not confirmed') 
        ? "Email not confirmed" 
        : "Invalid credentials";
      await logFailedLogin(req, email, reason);

      // Check if error is due to unconfirmed email
      if (authError && authError.message && authError.message.toLowerCase().includes('email not confirmed')) {
        return res.status(403).json({ 
          success: false, 
          message: "Email not confirmed. Please contact admin for account verification." 
        });
      }
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    // Additional check: Verify email is confirmed
    if (!authData.user.email_confirmed_at) {
      await logFailedLogin(req, email, "Email not confirmed");

      return res.status(403).json({ 
        success: false, 
        message: "Email not confirmed. Please contact admin for account verification." 
      });
    }

    if (!authData.session) {
      return res.status(500).json({
        success: false,
        message: "Failed to establish login session. Please try again.",
      });
    }

    // Step 2: Check if user profile exists and is active
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, status, portal_access, type, group_id, role, requires_password_reset, admin_permissions")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      await logFailedLogin(req, email, "User profile not found");

      return res.status(404).json({ 
        success: false, 
        message: "User profile not found" 
      });
    }

    const eligibility = await validateLoginEligibility(profile);
    if (!eligibility.ok) {
      await logFailedLogin(req, email, eligibility.body.message || "Account not eligible");

      return res.status(eligibility.status).json(eligibility.body);
    }

    // Step 3: Generate OTP
    const otp = generateOTP();
    console.log(otp,"OTP")
    const expiresAt = Date.now() + OTP_EXPIRY;

    // Store OTP with an already-validated short-lived session.
    // Never store plaintext passwords in memory.
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt,
      attempts: 0,
      userId: profile.id,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in,
      },
      createdAt: Date.now()
    });

    // Step 4: Send OTP email
    const emailBody = otpEmailTemplate(otp, profile.first_name || "User");
    const emailResult = await mailSender(
      email,
      "Your 9RX Login OTP",
      emailBody
    );

    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send OTP email" 
      });
    }

    console.log(`OTP sent for ${maskEmail(email)} after password verification`);

    return res.json({
      success: true,
      message: "Credentials verified. OTP sent successfully to your email",
      expiresIn: OTP_EXPIRY / 1000 // seconds
    });

  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
});

/**
 * Verify OTP and login user
 * POST /api/otp/verify
 */
router.post("/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and OTP are required" 
      });
    }

    const emailKey = email.toLowerCase();
    const storedData = otpStore.get(emailKey);

    if (!storedData) {
      await logFailedLogin(req, email, "OTP not found or expired");

      return res.status(400).json({ 
        success: false, 
        message: "OTP not found or expired. Please request a new OTP." 
      });
    }

    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(emailKey);
      
      await logFailedLogin(req, email, "OTP expired");

      return res.status(400).json({ 
        success: false, 
        message: "OTP has expired. Please request a new OTP." 
      });
    }

    // Check max attempts
    if (storedData.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(emailKey);
      
      await logFailedLogin(req, email, "Maximum OTP attempts exceeded");

      return res.status(429).json({ 
        success: false, 
        message: "Maximum verification attempts exceeded. Please request a new OTP." 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp.trim()) {
      storedData.attempts += 1;
      otpStore.set(emailKey, storedData);
      
      await logFailedLogin(req, email, "Invalid OTP code");

      const remainingAttempts = MAX_ATTEMPTS - storedData.attempts;
      return res.status(400).json({ 
        success: false, 
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.` 
      });
    }

    const session = storedData.session;
    const nowEpoch = Math.floor(Date.now() / 1000);
    if (!session?.access_token || !session?.refresh_token || (session.expires_at && session.expires_at <= nowEpoch)) {
      otpStore.delete(emailKey);
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", storedData.userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ 
        success: false, 
        message: "User profile not found" 
      });
    }

    const eligibility = await validateLoginEligibility(profile);
    if (!eligibility.ok) {
      otpStore.delete(emailKey);
      
      await logFailedLogin(req, email, eligibility.body.message || "Account not eligible");

      return res.status(eligibility.status).json(eligibility.body);
    }

    // Update last login
    await supabaseAdmin
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", profile.id);

    // Log successful login to MongoDB
    await logSuccessfulLogin(req, profile.id, profile.email);

    // Clear OTP from store
    otpStore.delete(emailKey);

    console.log(`OTP verified successfully for ${email}, Supabase session created`);

    return res.json({
      success: true,
      message: "Login successful",
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
      },
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        displayName: profile.display_name,
        type: profile.type,
        role: profile.role,
        adminPermissions: profile.admin_permissions || [],
        status: profile.status,
        companyName: profile.company_name,
        groupId: profile.group_id,
        portalAccess: profile.portal_access,
        freeShipping: profile.freeShipping,
        taxPercantage: profile.taxPercantage,
        order_pay: profile.order_pay,
      }
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP"
    });
  }
});

/**
 * Resend OTP (requires password re-verification)
 * POST /api/otp/resend
 */
router.post("/resend", async (req, res) => {
  try {
    const { email, password } = req.body;
    const requestIp = req.headers["x-forwarded-for"] || req.ip || req.connection?.remoteAddress;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    if (isOtpSendRateLimited(email, requestIp)) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Please try again later.",
      });
    }

    // Clear existing OTP
    otpStore.delete(email.toLowerCase());

    // Re-verify credentials and send new OTP
    // Reuse the send endpoint logic
    const supabase = getSupabasePublicClient();

    // Verify credentials again
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (authError || !authData.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    if (!authData.session) {
      return res.status(500).json({
        success: false,
        message: "Failed to establish login session. Please try again.",
      });
    }

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, status, portal_access, type, group_id, role, requires_password_reset, admin_permissions")
      .eq("id", authData.user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: "User profile not found" 
      });
    }

    const eligibility = await validateLoginEligibility(profile);
    if (!eligibility.ok) {
      await logFailedLogin(req, email, eligibility.body.message || "Account not eligible");
      return res.status(eligibility.status).json(eligibility.body);
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY;

    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt,
      attempts: 0,
      userId: profile.id,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in,
      },
      createdAt: Date.now()
    });

    // Send OTP email
    const emailBody = otpEmailTemplate(otp, profile.first_name || "User");
    const emailResult = await mailSender(
      email,
      "Your 9RX Login OTP",
      emailBody
    );

    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send OTP email" 
      });
    }

    console.log(`OTP resent for ${maskEmail(email)}`);

    return res.json({
      success: true,
      message: "New OTP sent successfully to your email",
      expiresIn: OTP_EXPIRY / 1000
    });

  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP"
    });
  }
});

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      console.log(`Cleaned up expired OTP for ${maskEmail(email)}`);
    }
  }

  for (const [key, data] of otpSendRateStore.entries()) {
    if (now > data.resetAt) {
      otpSendRateStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = router;
