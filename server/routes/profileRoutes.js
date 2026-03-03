const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { requireRoles } = require("../middleware/auth");

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Generate secure profile completion link using Supabase magic link
 * POST /api/profile/generate-completion-link
 */
router.post("/generate-completion-link", requireRoles(["admin", "superadmin", "group"]), async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    console.log("🔗 Generating profile completion link for:", email);

    if (userId) {
      const { data: targetProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, group_id")
        .eq("id", userId)
        .maybeSingle();

      if (profileError || !targetProfile) {
        return res.status(404).json({
          success: false,
          message: "Target user profile not found"
        });
      }

      if (targetProfile.email?.toLowerCase().trim() !== email.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          message: "Email does not match user profile"
        });
      }

      const callerRole = req.auth?.profile?.role;
      const callerId = req.auth?.user?.id;
      if (callerRole === "group" && targetProfile.group_id !== callerId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden - group scope mismatch"
        });
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/update-profile`;

    // Generate magic link using Supabase
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase().trim(),
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (error) {
      console.error("❌ Error generating magic link:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to generate profile completion link"
      });
    }

    console.log("✅ Magic link generated successfully");
    console.log("   Redirect URL:", redirectUrl);

    // Return the action link (this is the magic link with token)
    return res.json({
      success: true,
      completionLink: data.properties.action_link,
      redirectUrl: redirectUrl
    });
  } catch (error) {
    console.error("❌ Generate completion link error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * Verify session and get user profile info
 * GET /api/profile/verify-completion-session
 */
router.get("/verify-completion-session", async (req, res) => {
  try {
    // Verify admin access
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized - No token provided" 
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Session verification failed:", authError);
      return res.status(401).json({ 
        success: false,
        error: "Invalid or expired session" 
      });
    }

    console.log("✅ Session verified for user:", user.email);

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Error fetching profile:", profileError);
      return res.status(404).json({
        success: false,
        error: "User profile not found"
      });
    }

    console.log("✅ Profile data retrieved for:", profile.email);

    // Return user info
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.display_name || 'User',
        ...profile
      }
    });
  } catch (error) {
    console.error("❌ Verify session error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Health check endpoint
 * GET /api/profile/health
 */
router.get("/health", (req, res) => {
  return res.json({
    success: true,
    message: "Profile completion API is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      generateLink: "POST /api/profile/generate-completion-link",
      verifySession: "GET /api/profile/verify-completion-session"
    }
  });
});

module.exports = router;
