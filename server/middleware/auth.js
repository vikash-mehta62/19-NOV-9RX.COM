const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase admin credentials are not configured");
    }
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

function extractBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice(7).trim();
}

async function resolveAuthContext(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, type, status, email, group_id")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ success: false, message: "Failed to load profile" });
    }

    req.auth = {
      token,
      user: authData.user,
      profile: profile || null,
    };

    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Authentication failed" });
  }
}

function requireAuth(req, res, next) {
  return resolveAuthContext(req, res, next);
}

function requireRoles(allowedRoles = []) {
  return async (req, res, next) => {
    await resolveAuthContext(req, res, (err) => {
      if (err) {
        return next(err);
      }

      const role = req.auth?.profile?.role;
      if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      return next();
    });
  };
}

const requireAdmin = requireRoles(["admin", "superadmin"]);

module.exports = {
  getSupabaseAdmin,
  extractBearerToken,
  requireAuth,
  requireRoles,
  requireAdmin,
};
