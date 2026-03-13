const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { requireAdmin, requireRoles, extractBearerToken } = require("../middleware/auth");

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

const requireAdminOrGroup = requireRoles(["admin", "superadmin", "group"]);

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const hasValidPhoneDigits = (value) => {
  if (value == null || value === "") return true;
  return String(value).replace(/\D/g, "").length === 10;
};
const hasValidEmail = (value) => {
  if (value == null || value === "") return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
};
const hasValidUrl = (value) => {
  if (value == null || value === "") return true;
  try {
    const normalizedValue = /^https?:\/\//i.test(String(value).trim())
      ? String(value).trim()
      : `https://${String(value).trim()}`;
    new URL(normalizedValue);
    return true;
  } catch {
    return false;
  }
};

const validateVendorProfileData = (profileData = {}) => {
  const missingFields = [];
  const billingAddress = profileData.billing_address || {};
  const shippingAddress = profileData.shipping_address || {};
  const sameAsShipping = Boolean(profileData.same_as_shipping);

  if (!isNonEmptyString(profileData.first_name)) missingFields.push("first_name");
  if (!isNonEmptyString(profileData.last_name)) missingFields.push("last_name");
  if (!isNonEmptyString(profileData.company_name)) missingFields.push("company_name");
  if (!isNonEmptyString(profileData.payment_terms)) missingFields.push("payment_terms");
  if (!isNonEmptyString(billingAddress.countryRegion || billingAddress.country)) missingFields.push("billing_address.countryRegion");
  if (!isNonEmptyString(billingAddress.street1)) missingFields.push("billing_address.street1");
  if (!isNonEmptyString(billingAddress.city)) missingFields.push("billing_address.city");
  if (!isNonEmptyString(billingAddress.state)) missingFields.push("billing_address.state");
  if (!isNonEmptyString(billingAddress.zip_code)) missingFields.push("billing_address.zip_code");

  if (!sameAsShipping) {
    if (!isNonEmptyString(shippingAddress.countryRegion || shippingAddress.country)) missingFields.push("shipping_address.countryRegion");
    if (!isNonEmptyString(shippingAddress.street1)) missingFields.push("shipping_address.street1");
    if (!isNonEmptyString(shippingAddress.city)) missingFields.push("shipping_address.city");
    if (!isNonEmptyString(shippingAddress.state)) missingFields.push("shipping_address.state");
    if (!isNonEmptyString(shippingAddress.zip_code)) missingFields.push("shipping_address.zip_code");
  }

  if (missingFields.length > 0) {
    return `Missing required vendor fields: ${missingFields.join(", ")}`;
  }

  if (!hasValidEmail(profileData.email) || !hasValidEmail(profileData.alternative_email)) {
    return "Vendor email fields must contain valid email addresses";
  }

  const phoneValues = [
    profileData.work_phone,
    profileData.mobile_phone,
    billingAddress.phone,
    billingAddress.faxNumber,
    shippingAddress.phone,
    shippingAddress.faxNumber,
  ];

  if (phoneValues.some((value) => !hasValidPhoneDigits(value))) {
    return "Phone and fax fields must contain exactly 10 digits when provided";
  }

  if (!hasValidUrl(profileData.website)) {
    return "Website must be a valid URL";
  }

  return null;
};

const isDuplicateEmailError = (error) => {
  const details = [
    error?.message,
    error?.msg,
    error?.error_description,
    error?.details,
    error?.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    details.includes("already registered") ||
    details.includes("already exists") ||
    details.includes("user already registered") ||
    details.includes("duplicate") ||
    details.includes("email exists")
  );
};

const findExistingUserByEmail = async (supabaseAdmin, email) => {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  if (!normalizedEmail) return null;

  const { data: profileMatch, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profileMatch) {
    return { source: "profiles", user: profileMatch };
  }

  const perPage = 200;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const authMatch = users.find(
      (user) => String(user.email || "").toLowerCase().trim() === normalizedEmail
    );

    if (authMatch) {
      return { source: "auth", user: authMatch };
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
};

// Create user endpoint (generic - for customers, groups, vendors)
router.post("/create-user", requireAdmin, async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { email, password, firstName, lastName, userMetadata, profileData } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();

    if (!email || !firstName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, firstName",
      });
    }

    if (profileData?.type === "vendor") {
      const vendorValidationError = validateVendorProfileData({
        ...profileData,
        email,
      });

      if (vendorValidationError) {
        return res.status(400).json({
          success: false,
          message: vendorValidationError,
        });
      }
    }

    const existingUser = await findExistingUserByEmail(supabaseAdmin, normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Validate or generate secure password
    let userPassword = password;
    if (!userPassword) {
      // Generate a secure random password if not provided
      const crypto = require('crypto');
      userPassword = crypto.randomBytes(16).toString('base64').slice(0, 16);
      console.log(`Generated secure password for ${email}`);
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
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
      if (isDuplicateEmailError(authError)) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Failed to create user account",
      });
    }

    // If profileData is provided, create/upsert the profile using admin client (bypasses RLS)
    let profileResult = null;
    if (profileData && typeof profileData === 'object') {
      const { parent_group, ...sanitizedProfileData } = profileData;
      const fullProfileData = {
        ...sanitizedProfileData,
        active_notification: typeof sanitizedProfileData.active_notification === "boolean"
          ? sanitizedProfileData.active_notification
          : true,
        id: authData.user.id,
        email: normalizedEmail,
      };

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(fullProfileData, { onConflict: "id" })
        .select()
        .single();

      if (profileError) {
        console.error("Profile creation error (admin create-user):", profileError);
        // Don't fail the whole request - auth user was created successfully
        profileResult = { success: false, error: "Profile creation failed" };
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
      message: "Internal server error",
    });
  }
});

// Delete user endpoint
router.delete("/delete-user/:userId", requireAdmin, async (req, res) => {
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
        message: "Failed to delete user",
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
      message: "Internal server error",
    });
  }
});

// Create pharmacy user endpoint
router.post("/create-pharmacy-user", requireAdminOrGroup, async (req, res) => {
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
      console.log(`Generated secure password for ${email}`);
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
        message: "Failed to create user account",
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
      active_notification: true,
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
          message: "Failed to create user profile",
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
      invitationToken,
    } = req.body;

    // Validate required fields
    if (!userId || !groupId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, groupId",
      });
    }

    // Allow privileged callers (admin/group) OR enforce invitation-token validation.
    let isPrivilegedCaller = false;
    const bearerToken = extractBearerToken(req);
    if (bearerToken) {
      const { data: authData } = await supabaseAdmin.auth.getUser(bearerToken);
      if (authData?.user?.id) {
        const { data: callerProfile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();
        if (["admin", "superadmin", "group"].includes(callerProfile?.role)) {
          isPrivilegedCaller = true;
        }
      }
    }

    if (!isPrivilegedCaller) {
      if (!invitationToken) {
        return res.status(401).json({
          success: false,
          message: "Invitation token is required",
        });
      }

      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from("pharmacy_invitations")
        .select("id, email, status, expires_at, group_id")
        .eq("token", invitationToken)
        .maybeSingle();

      if (invitationError || !invitation) {
        return res.status(401).json({
          success: false,
          message: "Invalid invitation token",
        });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Invitation is no longer valid",
        });
      }

      if (invitation.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          message: "Invitation group mismatch",
        });
      }

      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Invitation has expired",
        });
      }

      const { data: targetUser, error: userLookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userLookupError || !targetUser?.user?.email) {
        return res.status(400).json({
          success: false,
          message: "Invalid user",
        });
      }

      if (targetUser.user.email.toLowerCase().trim() !== invitation.email.toLowerCase().trim()) {
        return res.status(403).json({
          success: false,
          message: "User does not match invitation",
        });
      }
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
        active_notification: true,
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
          message: "Failed to create user profile",
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
        message: "Failed to update user profile",
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
    });
  }
});

// Approve user access request
router.post("/approve-access/:userId", requireAdmin, async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId } = req.params;

    console.log("🔵 Approve access request received for userId:", userId);

    if (!userId) {
      console.log("❌ No userId provided");
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Get user details first
    console.log("📋 Fetching user details...");
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name, last_name, company_name, email_notifaction, group_id")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("❌ Error fetching user:", userError);
      return res.status(400).json({
        success: false,
        message: "Failed to fetch user details",
        error: userError.message,
      });
    }

    console.log("✅ User details fetched:", {
      email: userData.email,
      name: `${userData.first_name} ${userData.last_name}`,
      group_id: userData.group_id
    });

    // IMPORTANT: Update auth.users to confirm email
    console.log("🔐 Confirming email in auth.users...");
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (authUpdateError) {
      console.error("⚠️ Error confirming email in auth.users:", authUpdateError);
      // Don't fail the request, just log the error
    } else {
      console.log("✅ Email confirmed in auth.users");
    }

    // Update profile status
    console.log("📝 Updating profile status to active...");
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        status: "active", 
        account_status: "approved",
        portal_access: true,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("❌ Error updating profile:", updateError);
      return res.status(400).json({
        success: false,
        message: "Failed to approve user",
        error: updateError.message,
      });
    }

    console.log("✅ Profile status updated to active");

    // If user was created via group invitation, update pharmacy_invitations table
    if (userData.group_id) {
      console.log("👥 Updating invitation status for user:", userId, "group:", userData.group_id);
      
      // Try by accepted_by first
      const { error: invitationError } = await supabaseAdmin
        .from("pharmacy_invitations")
        .update({ status: "accepted" })
        .eq("accepted_by", userId)
        .in("status", ["pending", "accepted"]);

      if (invitationError) {
        console.error("⚠️ Error updating invitation (by accepted_by):", invitationError);
        
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
          console.error("⚠️ Error updating invitation (by email):", altError);
        } else {
          console.log("✅ Invitation updated via email fallback");
        }
      } else {
        console.log("✅ Invitation updated successfully");
      }
    }

    console.log("🎉 User approval completed successfully");

    return res.json({
      success: true,
      message: "User access approved successfully",
      user: userData,
    });
  } catch (error) {
    console.error("💥 Approve Access Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Reject user access request
router.post("/reject-access/:userId", requireAdmin, async (req, res) => {
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
        message: "Failed to fetch user details",
      });
    }

    // Update profile status
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        status: "rejected", 
        account_status: "rejected",
        rejection_reason: reason || null,
        portal_access: false,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return res.status(400).json({
        success: false,
        message: "Failed to reject user",
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
      message: "Internal server error",
    });
  }
});

module.exports = router;
