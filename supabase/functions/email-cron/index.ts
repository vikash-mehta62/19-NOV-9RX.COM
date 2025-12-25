// Email Cron Job - DISABLED
// All email processing is now handled by Node.js backend server
// See: server/cron/emailCron.js
//
// REASON: Having multiple processors (Edge Function + Node.js) caused duplicate emails
// The Node.js backend server handles all email queue processing now

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Return disabled message - all processing moved to backend
  return new Response(
    JSON.stringify({
      success: false,
      message: "Email cron is disabled. Processing handled by Node.js backend server.",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
