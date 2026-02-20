const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const mailSender = require("../utils/mailSender");
const otpEmailTemplate = require("../templates/otpEmailTemplate");

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// In-memory OTP storage (use Redis in production)
const otpStore = new Map();
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP to user's email (after verifying email + password)
 * POST /api/otp/send
 */
router.post("/send", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    // Step 1: Authenticate user with Supabase
    const { createClient } = require("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYWV0eGt4d2VnaHVveHlodm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTM1MzMsImV4cCI6MjA4NjkyOTUzM30.LqjfwdltknPXai8oEBALGpl7nLIxDp4YB9yO3G7O37E";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify email and password with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (authError || !authData.user) {
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
      return res.status(403).json({ 
        success: false, 
        message: "Email not confirmed. Please contact admin for account verification." 
      });
    }

    // Step 2: Check if user profile exists and is active
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, status, portal_access, type, group_id, role, requires_password_reset")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ 
        success: false, 
        message: "User profile not found" 
      });
    }

    // Check if user requires password reset (exclude admin role)
    if (profile.requires_password_reset === true && profile.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "PASSWORD_RESET_REQUIRED",
        requiresPasswordReset: true
      });
    }

    // Check if user is active
    if (profile.status !== "active") {
      return res.status(403).json({ 
        success: false, 
        message: "Account is not active. Please contact support." 
      });
    }

    // Check if user belongs to a group and validate group status
    if (profile.group_id) {
      const { data: groupProfile, error: groupError } = await supabaseAdmin
        .from("profiles")
        .select("id, status, type")
        .eq("id", profile.group_id)
        .single();

      if (groupError || !groupProfile) {
        return res.status(403).json({ 
          success: false, 
          message: "Your group account no longer exists. Please contact support." 
        });
      }

      if (groupProfile.status !== "active") {
        return res.status(403).json({ 
          success: false, 
          message: "Your group account is not active. Please contact your group administrator." 
        });
      }

      if (groupProfile.type !== "group") {
        return res.status(403).json({ 
          success: false, 
          message: "Invalid group configuration. Please contact support." 
        });
      }
    }

    // Check portal access for non-admin users
    if (profile.type !== "admin" && !profile.portal_access) {
      return res.status(403).json({ 
        success: false, 
        message: "Portal access is disabled for your account." 
      });
    }

    // Step 3: Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY;

    // Store OTP with metadata (including password for later authentication)
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt,
      attempts: 0,
      userId: profile.id,
      password: password, // Store password temporarily for Supabase auth after OTP verification
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

    console.log(`OTP sent to ${email} after password verification: ${otp} (expires in 10 minutes)`);

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
      return res.status(400).json({ 
        success: false, 
        message: "OTP not found or expired. Please request a new OTP." 
      });
    }

    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(emailKey);
      return res.status(400).json({ 
        success: false, 
        message: "OTP has expired. Please request a new OTP." 
      });
    }

    // Check max attempts
    if (storedData.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(emailKey);
      return res.status(429).json({ 
        success: false, 
        message: "Maximum verification attempts exceeded. Please request a new OTP." 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp.trim()) {
      storedData.attempts += 1;
      otpStore.set(emailKey, storedData);
      
      const remainingAttempts = MAX_ATTEMPTS - storedData.attempts;
      return res.status(400).json({ 
        success: false, 
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.` 
      });
    }

    // OTP verified successfully - Now authenticate with Supabase to create session
    const { createClient } = require("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate with Supabase using stored password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: storedData.password,
    });

    if (authError || !authData.session) {
      console.error("Supabase auth error after OTP verification:", authError);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to create session. Please try logging in again." 
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

    // Update last login
    await supabaseAdmin
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", profile.id);

    // Clear OTP from store
    otpStore.delete(emailKey);

    console.log(`OTP verified successfully for ${email}, Supabase session created`);

    return res.json({
      success: true,
      message: "Login successful",
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in,
      },
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        displayName: profile.display_name,
        type: profile.type,
        role: profile.role,
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

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    // Clear existing OTP
    otpStore.delete(email.toLowerCase());

    // Re-verify credentials and send new OTP
    // Reuse the send endpoint logic
    const { createClient } = require("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmhmZ2ZoaWRoenN3cWtocHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODEzMDIsImV4cCI6MjA4NTM1NzMwMn0.cZs_jInY7UYWMay0VKGJVwpu9J8ApW_pCCY7yZF2utQ";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, status, portal_access, type")
      .eq("id", authData.user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: "User profile not found" 
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY;

    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt,
      attempts: 0,
      userId: profile.id,
      password: password, // Store password for later authentication
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

    console.log(`OTP resent to ${email}: ${otp}`);

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
      console.log(`Cleaned up expired OTP for ${email}`);
    }
  }
}, 5 * 60 * 1000);

module.exports = router;
