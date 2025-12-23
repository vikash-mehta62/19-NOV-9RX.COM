const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase Admin Client with service role key
const supabaseUrl = process.env.SUPABASE_URL || "https://wrvmbgmmuoivsfancgft.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper to get Supabase admin client
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

// Create user endpoint (generic - for customers, groups, vendors)
router.post("/create-user", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { email, password, firstName, lastName, userMetadata } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, firstName",
      });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || "12345678",
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName || "",
        ...userMetadata,
      },
    });

    if (authError) {
      console.error("Auth Error:", authError);
      return res.status(400).json({
        success: false,
        message: authError.message || "Failed to create user account",
      });
    }

    return res.json({
      success: true,
      message: "User created successfully",
      userId: authData.user.id,
      user: authData.user,
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// Delete user endpoint
router.delete("/delete-user/:userId", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Delete User Error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to delete user",
      });
    }

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// Create pharmacy user endpoint
router.post("/create-pharmacy-user", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      phone,
      groupId,
      billingAddress,
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !groupId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, firstName, lastName, groupId",
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || "12345678",
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authError) {
      console.error("Auth Error:", authError);
      return res.status(400).json({
        success: false,
        message: authError.message || "Failed to create user account",
      });
    }

    // Create profile in profiles table
    const profileData = {
      id: authData.user.id,
      display_name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      group_type: "branch",
      billing_address: billingAddress || {},
      email: email,
      mobile_phone: phone || "",
      company_name: companyName || "",
      group_id: groupId,
      status: "pending",
      type: "pharmacy",
      role: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert([profileData]);

    if (profileError) {
      console.error("Profile Error:", profileError);
      // Try to clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(400).json({
        success: false,
        message: profileError.message || "Failed to create user profile",
      });
    }

    return res.json({
      success: true,
      message: "Pharmacy user created successfully",
      userId: authData.user.id,
    });
  } catch (error) {
    console.error("Create Pharmacy User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: error.message,
    });
  }
});

module.exports = router;
