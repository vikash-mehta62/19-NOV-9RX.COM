const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { buildTermsObject, buildPrivacyObject, buildAchObject } = require("../utils/termsHelper");
const { requireAdmin } = require("../middleware/auth");

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseAdmin = () => {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Resend terms acceptance email to user (Admin only)
 * POST /api/terms/resend-acceptance-email
 */
router.post("/resend-acceptance-email", requireAdmin, async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, terms_and_conditions, privacy_policy, ach_authorization")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check which terms are not accepted
    const termsAccepted = profile.terms_and_conditions?.accepted || false;
    const privacyAccepted = profile.privacy_policy?.accepted || false;
    const achAccepted = profile.ach_authorization?.accepted || false;

    // Generate recovery link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'https://9rx.vercel.app'}/accept-terms`
      }
    });

    if (error) {
      console.error("Error generating terms recovery link:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate terms acceptance link"
      });
    }

    // Send email with the link
    const mailSender = require("../utils/mailSender");
    const adminCreateAccountTemplate = require("../templates/adminCreateAccount");

    const emailHtml = adminCreateAccountTemplate(
      profile.first_name,
      profile.last_name,
      profile.email,
      null, // No password for resend
      data.properties.action_link,
      {
        termsAccepted,
        privacyAccepted,
        achAccepted
      }
    );

    await mailSender(
      profile.email,
      `Action Required: Accept Terms & Conditions - 9RX`,
      emailHtml
    );

    console.log(`✅ Terms acceptance email resent to: ${profile.email}`);

    return res.json({
      success: true,
      message: "Terms acceptance email sent successfully",
      pendingAcceptances: {
        terms: !termsAccepted,
        privacy: !privacyAccepted,
        ach: !achAccepted
      }
    });

  } catch (error) {
    console.error("Resend terms email error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * Generate terms acceptance token using Supabase's recovery system (same as password reset)
 * POST /api/terms/generate-token
 */
router.post("/generate-token", requireAdmin, async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: "userId and email are required"
      });
    }

    // Generate recovery link that redirects to terms acceptance page
    // This works exactly like password reset - Supabase creates a session when user clicks
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'https://9rx.vercel.app'}/accept-terms`
      }
    });

    if (error) {
      console.error("Error generating terms recovery link:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate terms acceptance link"
      });
    }

    console.log(`✅ Generated recovery link for terms acceptance: ${email}`);

    return res.json({
      success: true,
      actionLink: data.properties.action_link,
      hashedToken: data.properties.hashed_token
    });

  } catch (error) {
    console.error("Generate terms token error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * Verify terms acceptance session (user should have valid recovery session)
 * GET /api/terms/verify-session
 */
router.get("/verify-session", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization header provided"
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the session token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session"
      });
    }

    // Get user profile information
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found"
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email
      }
    });

  } catch (error) {
    console.error("Verify terms session error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * Accept terms and privacy policy (requires valid session from recovery link)
 * POST /api/terms/accept
 */
router.post("/accept", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { 
      termsAccepted, 
      privacyAccepted, 
      achAccepted, 
      termsSignature, 
      privacySignature, 
      achSignature, 
      acceptedAt 
    } = req.body;

    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({
        success: false,
        message: "Both terms and privacy policy acceptance are required"
      });
    }

    if (termsAccepted && !termsSignature) {
      return res.status(400).json({
        success: false,
        message: "Digital signature is required for Terms of Service"
      });
    }

    if (privacyAccepted && !privacySignature) {
      return res.status(400).json({
        success: false,
        message: "Digital signature is required for Privacy Policy"
      });
    }

    if (achAccepted && !achSignature) {
      return res.status(400).json({
        success: false,
        message: "Digital signature is required for ACH authorization"
      });
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization header provided"
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the session token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session"
      });
    }

    const userIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Prepare update data using JSONB helper functions (SINGLE SOURCE OF TRUTH)
    const updateData = {
      terms_and_conditions: buildTermsObject(true, termsSignature, userIP, userAgent, 'email_link'),
      privacy_policy: buildPrivacyObject(true, privacySignature, userIP, userAgent, 'email_link'),
      ach_authorization: achAccepted 
        ? buildAchObject(true, achSignature, userIP, userAgent, 'email_link')
        : null,
      
      // DUAL-WRITE: Keep old columns during transition period for backward compatibility
      terms_signature: termsSignature,
      privacy_policy_accepted: true,
      privacy_policy_accepted_at: new Date().toISOString(),
      privacy_policy_signature: privacySignature,
      ach_authorization_accepted: achAccepted || false,
      ach_authorization_accepted_at: achAccepted ? new Date().toISOString() : null,
      ach_authorization_signature: achSignature || null,
      
      updated_at: new Date().toISOString()
    }

    // Update user profile with terms acceptance
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile with terms acceptance:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to save terms acceptance"
      });
    }

    // Record acceptance in audit trail using the database function
    try {
      // Record terms of service acceptance with signature
      await supabaseAdmin.rpc('record_terms_acceptance', {
        p_profile_id: user.id,
        p_terms_type: 'terms_of_service',
        p_terms_version: '1.0',
        p_ip_address: userIP,
        p_user_agent: userAgent,
        p_acceptance_method: 'email_link',
        p_digital_signature: termsSignature,
        p_signature_method: 'typed_name'
      });

      // Record privacy policy acceptance with signature
      await supabaseAdmin.rpc('record_terms_acceptance', {
        p_profile_id: user.id,
        p_terms_type: 'privacy_policy',
        p_terms_version: '1.0',
        p_ip_address: userIP,
        p_user_agent: userAgent,
        p_acceptance_method: 'email_link',
        p_digital_signature: privacySignature,
        p_signature_method: 'typed_name'
      });

      // Record ACH authorization if accepted
      if (achAccepted) {
        await supabaseAdmin.rpc('record_terms_acceptance', {
          p_profile_id: user.id,
          p_terms_type: 'ach_authorization',
          p_terms_version: '1.0',
          p_ip_address: userIP,
          p_user_agent: userAgent,
          p_acceptance_method: 'email_link',
          p_digital_signature: achSignature,
          p_signature_method: 'typed_name'
        });
      }
    } catch (auditError) {
      console.error("Error recording audit trail:", auditError);
      // Don't fail the request if audit fails, but log it
    }

    console.log(`✅ Terms accepted for user: ${user.email}${achAccepted ? ' (including ACH authorization with signature)' : ''}`);

    return res.json({
      success: true,
      message: achAccepted 
        ? "Terms, Privacy Policy, and ACH Authorization accepted successfully"
        : "Terms and Privacy Policy accepted successfully"
    });

  } catch (error) {
    console.error("Accept terms error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

module.exports = router;
