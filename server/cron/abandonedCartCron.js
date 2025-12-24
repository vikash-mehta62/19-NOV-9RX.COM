const { createClient } = require("@supabase/supabase-js");
const mailSender = require("../utils/mailSender");
require("dotenv").config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials for Cron Job");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Automation configuration
const AUTOMATION_CONFIG = {
  checkInterval: 60 * 1000, // Check every 1 minute
  abandonedTimeout: 1 * 60 * 1000, // 1 minutes for testing (usually 1-2 hours)
};

async function checkAbandonedCarts() {
  console.log("🔥 [CRON] Starting Abandoned Cart Check...");

  try {
    // 1. Calculate cutoff time
    const now = Date.now();
    const cutoffTime = new Date(now - AUTOMATION_CONFIG.abandonedTimeout).toISOString();

    // 2. Fetch potential abandoned carts
    // Criteria: status='active', updated_at < cutoff, abandoned_email_sent_at is null
    const { data: carts, error: cartError } = await supabase
      .from("carts")
      .select(`
        id,
        user_id,
        total,
        items,
        updated_at,
        status,
        profiles (
          email,
          first_name,
          last_name
        )
      `)
      .eq("status", "active")
      .lt("updated_at", cutoffTime)
      .is("abandoned_email_sent_at", null);

    if (cartError) {
      console.error("❌ [CRON] Error fetching carts:", cartError.message);
      return;
    }

    if (!carts || carts.length === 0) {
      console.log("✅ [CRON] No abandoned carts found.");
      return;
    }

    console.log(`🛒 [CRON] Found ${carts.length} potential abandoned carts.`);

    // 3. Process each cart
    for (const cart of carts) {
      const userEmail = cart.profiles?.email;
      
      if (!userEmail) {
        console.warn(`⚠️ [CRON] Cart ${cart.id} has no associated user email. Skipping.`);
        continue;
      }

      console.log(`Processing cart ${cart.id} for ${userEmail}...`);

      // 4. Send Email
      const userName = cart.profiles.first_name || "Customer";
      const cartTotal = cart.total || 0;
      
      const emailSubject = "You left something behind! 🛒";
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${userName},</h2>
          <p>We noticed you left some items in your cart at 9RX. They're waiting for you!</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Cart Total:</strong> $${cartTotal.toFixed(2)}</p>
            <p><a href="https://9rx.com/pharmacy/order/create" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Return to Checkout</a></p>
          </div>
          
          <p>Don't miss out on your health essentials.</p>
          <p>Best regards,<br>The 9RX Team</p>
        </div>
      `;

      const emailResult = await mailSender(userEmail, emailSubject, emailBody);

      if (emailResult.success) {
        // 5. Update cart status
        const { error: updateError } = await supabase
          .from("carts")
          .update({ abandoned_email_sent_at: new Date().toISOString() })
          .eq("id", cart.id);

        if (updateError) {
          console.error(`❌ [CRON] Failed to update cart ${cart.id}:`, updateError.message);
        } else {
          console.log(`✅ [CRON] Processed cart ${cart.id} successfully.`);
        }
      } else {
        console.error(`❌ [CRON] Failed to send email for cart ${cart.id}:`, emailResult.error);
      }
    }

  } catch (error) {
    console.error("❌ [CRON] Unexpected error in abandoned cart check:", error);
  }
}

// Start the cron job
const startAbandonedCartCron = () => {
  console.log("🚀 Abandoned Cart Cron Job Initialized");
  console.log(`   Interval: ${AUTOMATION_CONFIG.checkInterval / 1000}s`);
  console.log(`   Timeout: ${AUTOMATION_CONFIG.abandonedTimeout / 1000}s`);
  
  // Run immediately on startup
  checkAbandonedCarts();

  // Schedule periodic run
  setInterval(checkAbandonedCarts, AUTOMATION_CONFIG.checkInterval);
};

module.exports = startAbandonedCartCron;
