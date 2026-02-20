const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase Admin Client with service role key
const supabaseUrl = process.env.SUPABASE_URL || "https://qiaetxkxweghuoxyhvml.supabase.co";
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
    const { email, password, firstName, lastName, userMetadata, profileData } = req.body;

    if (!email || !firstName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, firstName",
      });
    }

    // Validate or generate secure password
    let userPassword = password;
    if (!userPassword) {
      // Generate a secure random password if not provided
      const crypto = require('crypto');
      userPassword = crypto.randomBytes(16).toString('base64').slice(0, 16);
      console.log(`Generated secure password for ${email}: ${userPassword}`);
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
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

    // If profileData is provided, create/upsert the profile using admin client (bypasses RLS)
    let profileResult = null;
    if (profileData && typeof profileData === 'object') {
      const fullProfileData = {
        ...profileData,
        id: authData.user.id,
        email: email.toLowerCase().trim(),
      };

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(fullProfileData, { onConflict: "id" })
        .select()
        .single();

      if (profileError) {
        console.error("Profile creation error (admin create-user):", profileError);
        // Don't fail the whole request - auth user was created successfully
        profileResult = { success: false, error: profileError.message };
      } else {
        profileResult = { success: true, data: profile };
      }
    }

    return res.json({
      success: true,
      message: "User created successfully",
      userId: authData.user.id,
      user: authData.user,
      profile: profileResult,
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

    // First check if user exists in auth
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError && getUserError.status !== 404) {
      console.error("Error checking user existence:", getUserError);
      return res.status(400).json({
        success: false,
        message: "Failed to verify user status",
        error: {
          code: getUserError.code,
          status: getUserError.status
        }
      });
    }

    // If user doesn't exist in auth, consider it already deleted (success)
    if (!existingUser || getUserError?.status === 404) {
      console.log("User already deleted from auth:", userId);
      return res.json({
        success: true,
        message: "User already deleted from authentication system",
        alreadyDeleted: true
      });
    }

    // User exists, proceed with deletion
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Delete User Error:", error);
      
      // If error is "user not found" or "unexpected_failure" with null user, treat as success
      if (error.code === 'unexpected_failure' || error.status === 404) {
        console.log("User deletion resulted in expected error (likely already deleted):", error.code);
        return res.json({
          success: true,
          message: "User deleted successfully",
          note: "User was already removed from authentication system"
        });
      }
      
      // Return detailed error information for other errors
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to delete user",
        error: {
          code: error.code,
          details: error.details,
          hint: error.hint,
          status: error.status
        }
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
      details: error.toString()
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

    // Validate or generate secure password
    let userPassword = password;
    if (!userPassword) {
      // Generate a secure random password if not provided
      const crypto = require('crypto');
      userPassword = crypto.randomBytes(16).toString('base64').slice(0, 16);
      console.log(`Generated secure password for ${email}: ${userPassword}`);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
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

// Update pharmacy profile after signup (for group invitation flow)
router.put("/update-pharmacy-profile/:userId", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId } = req.params;
    const {
      firstName,
      lastName,
      companyName,
      phone,
      groupId,
    } = req.body;

    // Validate required fields
    if (!userId || !groupId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, groupId",
      });
    }

    // Wait for trigger to complete (with retries)
    let profileExists = false;
    let retries = 5;
    
    while (!profileExists && retries > 0) {
      const { data: checkProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      if (checkProfile) {
        profileExists = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
    }

    if (!profileExists) {
      // Profile doesn't exist - create it via upsert
      const profileData = {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        company_name: companyName || "",
        mobile_phone: phone || "",
        group_id: groupId,
        type: "pharmacy",
        status: "pending",
        account_status: "pending",
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError, data: upsertData } = await supabaseAdmin
        .from("profiles")
        .upsert([profileData])
        .select()
        .single();

      if (upsertError) {
        console.error("Profile Upsert Error:", upsertError);
        return res.status(400).json({
          success: false,
          message: upsertError.message || "Failed to create user profile",
        });
      }

      return res.json({
        success: true,
        message: "Profile created successfully",
        profile: upsertData,
      });
    }

    // Profile exists - update it
    const { error: profileError, data: profileData } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        company_name: companyName || "",
        mobile_phone: phone || "",
        group_id: groupId,
        type: "pharmacy",
        status: "pending",
        account_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select();

    if (profileError) {
      console.error("Profile Update Error:", profileError);
      return res.status(400).json({
        success: false,
        message: profileError.message || "Failed to update user profile",
      });
    }

    // Return first result (should only be one)
    return res.json({
      success: true,
      message: "Profile updated successfully",
      profile: profileData && profileData.length > 0 ? profileData[0] : null,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      details: error.message,
    });
  }
});

module.exports = router;

// Approve user access request
router.post("/approve-access/:userId", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Get user details first
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name, last_name, company_name, email_notifaction, group_id")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return res.status(400).json({
        success: false,
        message: userError.message || "Failed to fetch user details",
      });
    }

    // IMPORTANT: Update auth.users to confirm email
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (authUpdateError) {
      console.error("Error confirming email in auth.users:", authUpdateError);
      // Don't fail the request, just log the error
    }

    // Update profile status
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        status: "active", 
        account_status: "approved" 
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return res.status(400).json({
        success: false,
        message: updateError.message || "Failed to approve user",
      });
    }

    // If user was created via group invitation, update pharmacy_invitations table
    if (userData.group_id) {
      console.log("Updating invitation status for user:", userId, "group:", userData.group_id);
      
      // Try by accepted_by first
      const { error: invitationError } = await supabaseAdmin
        .from("pharmacy_invitations")
        .update({ status: "accepted" })
        .eq("accepted_by", userId)
        .in("status", ["pending", "accepted"]);

      if (invitationError) {
        console.error("Error updating invitation (by accepted_by):", invitationError);
        
        // Fallback: try by email
        const { error: altError } = await supabaseAdmin
          .from("pharmacy_invitations")
          .update({ 
            status: "accepted",
            accepted_by: userId 
          })
          .eq("group_id", userData.group_id)
          .eq("email", userData.email)
          .in("status", ["pending", "accepted"]);
        
        if (altError) {
          console.error("Error updating invitation (by email):", altError);
        }
      }
    }

    return res.json({
      success: true,
      message: "User access approved successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Approve Access Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// Reject user access request
router.post("/reject-access/:userId", async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Get user details first
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("group_id, email")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return res.status(400).json({
        success: false,
        message: userError.message || "Failed to fetch user details",
      });
    }

    // Update profile status
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        status: "rejected", 
        account_status: "rejected",
        rejection_reason: reason || null
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return res.status(400).json({
        success: false,
        message: updateError.message || "Failed to reject user",
      });
    }

    // If user was created via group invitation, update pharmacy_invitations table
    if (userData.group_id) {
      const { error: invitationError } = await supabaseAdmin
        .from("pharmacy_invitations")
        .update({ status: "cancelled" })
        .eq("accepted_by", userId)
        .eq("status", "pending");

      if (invitationError) {
        console.error("Error updating invitation status:", invitationError);
      }
    }

    return res.json({
      success: true,
      message: "User access rejected successfully",
    });
  } catch (error) {
    console.error("Reject Access Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});
