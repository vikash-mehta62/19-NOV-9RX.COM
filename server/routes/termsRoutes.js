const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

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
 * Generate terms acceptance token using Supabase's recovery system (same as password reset)
 * POST /api/terms/generate-token
 */
router.post("/generate-token", async (req, res) => {
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
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-terms`
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

    const acceptanceTimestamp = acceptedAt || new Date().toISOString();
    const userIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Prepare terms acceptance data
    const termsData = {
      accepted: true,
      acceptedAt: acceptanceTimestamp,
      version: "1.0",
      ipAddress: userIP,
      userAgent: userAgent,
      method: "email_link"
    };

    // Prepare update data
    const updateData = {
      terms_and_conditions: termsData,
      terms_signature: termsSignature,
      privacy_policy_accepted: true,
      privacy_policy_accepted_at: acceptanceTimestamp,
      privacy_policy_signature: privacySignature,
      updated_at: new Date().toISOString()
    };

    // Add ACH authorization data if accepted
    if (achAccepted) {
      updateData.ach_authorization_accepted = true;
      updateData.ach_authorization_accepted_at = acceptanceTimestamp;
      updateData.ach_authorization_signature = achSignature;
      updateData.ach_authorization_version = "1.0";
      updateData.ach_authorization_ip_address = userIP;
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