const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const mailSender = require("../utils/mailSender");
const launchPasswordResetTemplate = require("../templates/launchPasswordResetTemplate");
const { requireAdmin, requireAuth } = require("../middleware/auth");

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Health check endpoint
 * GET /api/launch/health
 */
router.get("/health", (req, res) => {
  return res.json({
    success: true,
    message: "Launch password reset API is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      sendEmails: "POST /api/launch/send-reset-emails",
      markCompleted: "POST /api/launch/mark-completed",
      getStats: "GET /api/launch/reset-stats"
    }
  });
});

/**
 * Send password reset + T&C acceptance emails to all users
 * POST /api/launch/send-reset-emails
 */
router.post("/send-reset-emails", requireAdmin, async (req, res) => {
  try {
    const { testMode = false, testEmail = null, selectedUserIds = null, sendToAll = false } = req.body;

    // Verify admin access
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "superadmin"].includes(profile.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get users based on mode
    let query = supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name");

    if (testMode && testEmail) {
      // Test mode: single email
      query = query.eq("email", testEmail);
    } else if (selectedUserIds && selectedUserIds.length > 0) {
      // Selected users mode
      query = query.in("id", selectedUserIds);
    } else if (!sendToAll) {
      // Safety check: if not test mode, not selected users, and not explicitly sendToAll
      return res.status(400).json({ error: "Invalid send mode" });
    }
    // If sendToAll is true, query remains unfiltered (all users)

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    if (!users || users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    const results = {
      total: users.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Process users in batches to avoid overwhelming the email service
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (user) => {
        try {
          // Generate password reset token with redirect to launch password reset page
          const redirectUrl = `${process.env.FRONTEND_URL || 'https://9rx.vercel.app'}/launch-password-reset?launch=true`;
          
          const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: user.email,
            options: {
              redirectTo: redirectUrl,
            }
          });

          if (resetError) {
            console.error(`Error generating reset link for ${user.email}:`, resetError);
            results.failed++;
            results.errors.push({ email: user.email, error: "Failed to generate reset link" });
            return;
          }

          console.log(`✅ Generated recovery link for ${user.email}`);
          console.log(`   Redirect URL: ${redirectUrl}`);

          // Use the actual Supabase recovery link which creates a proper session
          // This link will automatically authenticate the user and redirect to our page
          const resetLink = resetData.properties.action_link;
          const termsLink = `${process.env.FRONTEND_URL || 'https://9rx.vercel.app'}/terms-and-conditions`;

          // Send email
          const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Valued Customer';
          const emailContent = launchPasswordResetTemplate(userName, user.email, resetLink, termsLink);
          
          await mailSender(
            user.email,
            "🚀 Action Required: New Website Launch - Reset Password & Accept Terms",
            emailContent
          );

          // Track in database
          await supabaseAdmin.from("launch_password_resets").insert({
            profile_id: user.id,
            email: user.email,
            reset_token: resetData.properties.hashed_token,
            email_sent_at: new Date().toISOString(),
          });

          // Mark user as requiring password reset
          await supabaseAdmin
            .from("profiles")
            .update({ password_reset_required: true })
            .eq("id", user.id);

          results.sent++;
          console.log(`✓ Email sent to ${user.email}`);
        } catch (error) {
          console.error(`Error processing ${user.email}:`, error);
          results.failed++;
          results.errors.push({ email: user.email, error: "Failed to process user launch email" });
        }
      }));

      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return res.json({
      success: true,
      message: `Email campaign completed`,
      results,
      testMode,
      selectedMode: selectedUserIds && selectedUserIds.length > 0,
      sendToAll
    });
  } catch (error) {
    console.error("Send reset emails error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * Get launch password reset statistics
 * GET /api/launch/reset-stats
 */
router.get("/reset-stats", requireAdmin, async (req, res) => {
  try {
    // Verify admin access
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get statistics
    const { data: resets, error: resetsError } = await supabaseAdmin
      .from("launch_password_resets")
      .select("*");

    if (resetsError) {
      return res.status(500).json({ error: "Failed to fetch statistics" });
    }

    const stats = {
      total_emails_sent: resets.length,
      completed: resets.filter(r => r.completed).length,
      pending: resets.filter(r => !r.completed).length,
      password_reset: resets.filter(r => r.password_reset_at).length,
      terms_accepted: resets.filter(r => r.terms_accepted_at).length,
      both_completed: resets.filter(r => r.password_reset_at && r.terms_accepted_at).length,
    };

    return res.json({
      success: true,
      stats,
      resets: resets.map(r => ({
        email: r.email,
        email_sent_at: r.email_sent_at,
        password_reset_at: r.password_reset_at,
        terms_accepted_at: r.terms_accepted_at,
        completed: r.completed,
      }))
    });
  } catch (error) {
    console.error("Get reset stats error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * Mark user as completed (password reset + terms accepted)
 * POST /api/launch/mark-completed
 * Requires authenticated recovery/user session.
 */
router.post("/mark-completed", requireAuth, async (req, res) => {
  try {
    const { email, action } = req.body; // action: 'password_reset' or 'terms_accepted' or 'both'

    console.log("=== Mark Completed Request ===");
    console.log("Email:", email);
    console.log("Action:", action);

    if (!email || !action) {
      console.error("❌ Missing required fields:", { email, action });
      return res.status(400).json({ error: "Missing required fields: email and action" });
    }

    if (!['password_reset', 'terms_accepted', 'both'].includes(action)) {
      console.error("❌ Invalid action:", action);
      return res.status(400).json({ error: "Invalid action. Must be 'password_reset', 'terms_accepted', or 'both'" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const requesterEmail = req.auth?.user?.email?.toLowerCase().trim();
    const requesterRole = req.auth?.profile?.role;
    const isPrivileged = requesterRole === "admin" || requesterRole === "superadmin";

    if (!isPrivileged && requesterEmail !== normalizedEmail) {
      return res.status(403).json({ error: "Forbidden: cannot update another user" });
    }

    // Get user profile by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile not found for email:", normalizedEmail);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Profile found:", profile.id);

    // Check if record exists in launch_password_resets (handle duplicates)
    const { data: existingResets, error: checkError } = await supabaseAdmin
      .from("launch_password_resets")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });

    if (checkError) {
      console.error("❌ Error checking for existing record:", checkError);
      return res.status(500).json({ error: "Failed to check existing record" });
    }

    console.log("📋 Existing records found:", existingResets?.length || 0);

    // If duplicates exist, delete old ones and keep the most recent
    if (existingResets && existingResets.length > 1) {
      console.log("⚠️ Found duplicate records, cleaning up...");
      const idsToDelete = existingResets.slice(1).map(r => r.id);
      
      const { error: deleteError } = await supabaseAdmin
        .from("launch_password_resets")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("❌ Error deleting duplicates:", deleteError);
      } else {
        console.log("✅ Deleted", idsToDelete.length, "duplicate records");
      }
    }

    const existingReset = existingResets && existingResets.length > 0 ? existingResets[0] : null;

    // If no record exists, create one
    if (!existingReset) {
      console.log("💡 Creating new record for user");
      const { error: insertError } = await supabaseAdmin
        .from("launch_password_resets")
        .insert({
          profile_id: profile.id,
          email: profile.email,
          email_sent_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("❌ Error creating record:", insertError);
        return res.status(500).json({ error: "Failed to create tracking record" });
      }
      console.log("✅ New record created");
    }

    // Prepare update data based on action
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (action === 'password_reset' || action === 'both') {
      updateData.password_reset_at = new Date().toISOString();
    }

    if (action === 'terms_accepted' || action === 'both') {
      updateData.terms_accepted_at = new Date().toISOString();
    }

    // If both actions are being marked, set completed to true
    if (action === 'both') {
      updateData.completed = true;
    }

    console.log("📝 Update data:", updateData);

    // Update the record
    const { data: reset, error: updateError } = await supabaseAdmin
      .from("launch_password_resets")
      .update(updateData)
      .eq("profile_id", profile.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return res.status(500).json({ error: "Failed to update status" });
    }

    console.log("✅ Record updated successfully");
    console.log("📊 Updated record:", {
      email: reset.email,
      password_reset_at: reset.password_reset_at,
      terms_accepted_at: reset.terms_accepted_at,
      completed: reset.completed
    });

    // Check if both completed (when not already marked as completed)
    if (reset.password_reset_at && reset.terms_accepted_at && !reset.completed) {
      console.log("🎉 Both actions completed! Marking as completed...");
      
      const { error: completedError } = await supabaseAdmin
        .from("launch_password_resets")
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq("profile_id", profile.id);

      if (completedError) {
        console.error("❌ Error marking as completed:", completedError);
      } else {
        console.log("✅ Marked as completed");
        reset.completed = true; // Update local object
      }
    }

    // Update profile table
    const profileUpdateData = {};
    
    if (reset.terms_accepted_at) {
      // Create terms_and_conditions JSONB object
      profileUpdateData.terms_and_conditions = {
        accepted: true,
        acceptedAt: reset.terms_accepted_at,
        version: "1.0",
        method: "launch_password_reset"
      };
    }
    
    if (reset.password_reset_at) {
      profileUpdateData.last_password_reset_at = reset.password_reset_at;
    }
    
    if (reset.completed) {
      profileUpdateData.password_reset_required = false;
    }

    if (Object.keys(profileUpdateData).length > 0) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdateData)
        .eq("id", profile.id);

      if (profileUpdateError) {
        console.error("❌ Error updating profile:", profileUpdateError);
      } else {
        console.log("✅ Profile updated:", profileUpdateData);
      }
    }

    console.log("=== Mark Completed Success ===");
    return res.json({
      success: true,
      message: "Status updated successfully",
      reset: {
        email: reset.email,
        password_reset_at: reset.password_reset_at,
        terms_accepted_at: reset.terms_accepted_at,
        completed: reset.completed
      }
    });
  } catch (error) {
    console.error("❌ Mark completed error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
