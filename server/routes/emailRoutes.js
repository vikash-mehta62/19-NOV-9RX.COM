// Email Routes - Webhooks, Tracking, and Queue Processing endpoints
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { resendWebhook, sendgridWebhook, sesWebhook } = require("../controllers/emailWebhooks");
const { processQueue, retryFailed, getStats, sendTest } = require("../controllers/emailQueueProcessor");
const { 
  processEmailQueue, 
  checkAbandonedCarts, 
  checkInactiveUsers, 
  processScheduledAutomations,
  cleanupOldData 
} = require("../cron/emailCron");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================
// QUEUE PROCESSING ENDPOINTS (Uses Node.js mailSender)
// ============================================

// Process pending emails from queue - call this via cron job
router.get("/queue/process", processQueue);
router.post("/queue/process", processQueue);

// Retry failed emails
router.post("/queue/retry", retryFailed);

// Get queue statistics
router.get("/queue/stats", getStats);

// Send a test email directly
router.post("/send-test", sendTest);

// ============================================
// CRON TRIGGER ENDPOINTS (Manual triggers)
// ============================================

// Trigger all cron jobs manually
router.post("/cron/run-all", async (req, res) => {
  try {
    const results = {
      queue: await processEmailQueue(),
      abandonedCarts: await checkAbandonedCarts(),
      inactiveUsers: await checkInactiveUsers(),
      scheduledAutomations: await processScheduledAutomations(),
    };
    res.json({ success: true, message: "All cron jobs executed", results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger specific cron jobs
router.post("/cron/queue", async (req, res) => {
  try {
    const result = await processEmailQueue();
    res.json({ success: true, message: "Queue processed", result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/cron/abandoned-carts", async (req, res) => {
  try {
    const result = await checkAbandonedCarts();
    res.json({ success: true, message: "Abandoned carts checked", result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/cron/inactive-users", async (req, res) => {
  try {
    const result = await checkInactiveUsers();
    res.json({ success: true, message: "Inactive users checked", result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/cron/automations", async (req, res) => {
  try {
    const result = await processScheduledAutomations();
    res.json({ success: true, message: "Scheduled automations processed", result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/cron/cleanup", async (req, res) => {
  try {
    const result = await cleanupOldData();
    res.json({ success: true, message: "Cleanup completed", result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

// Resend webhooks
router.post("/webhooks/resend", resendWebhook);

// SendGrid webhooks
router.post("/webhooks/sendgrid", sendgridWebhook);

// AWS SES webhooks (via SNS)
router.post("/webhooks/ses", sesWebhook);

// ============================================
// TRACKING ENDPOINTS
// ============================================

// Open tracking pixel
router.get("/track/open/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

    // Get email log
    const { data: log } = await supabase
      .from("email_logs")
      .select("id, campaign_id, automation_id")
      .eq("tracking_id", trackingId)
      .single();

    if (log) {
      // Check if already opened (avoid duplicates)
      const { data: existing } = await supabase
        .from("email_tracking_events")
        .select("id")
        .eq("tracking_id", trackingId)
        .eq("event_type", "opened")
        .limit(1);

      if (!existing || existing.length === 0) {
        // Parse user agent
        const deviceInfo = parseUserAgent(userAgent);

        // Record open event
        await supabase.from("email_tracking_events").insert({
          email_log_id: log.id,
          tracking_id: trackingId,
          event_type: "opened",
          user_agent: userAgent,
          ip_address: ipAddress,
          device_type: deviceInfo.deviceType,
          email_client: deviceInfo.emailClient,
        });

        // Update campaign stats
        if (log.campaign_id) {
          await incrementStat("email_campaigns", log.campaign_id, "open_count");
        }

        // Update automation stats
        if (log.automation_id) {
          await incrementStat("email_automations", log.automation_id, "total_sent");
        }
      }
    }
  } catch (error) {
    console.error("Open tracking error:", error);
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.send(pixel);
});

// Click tracking redirect
router.get("/track/click/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { url, lid } = req.query;
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

    if (!url) {
      return res.status(400).send("Missing URL");
    }

    // Get email log
    const { data: log } = await supabase
      .from("email_logs")
      .select("id, campaign_id")
      .eq("tracking_id", trackingId)
      .single();

    if (log) {
      const deviceInfo = parseUserAgent(userAgent);

      // Record click event
      await supabase.from("email_tracking_events").insert({
        email_log_id: log.id,
        tracking_id: trackingId,
        event_type: "clicked",
        link_url: url,
        link_id: lid,
        user_agent: userAgent,
        ip_address: ipAddress,
        device_type: deviceInfo.deviceType,
        email_client: deviceInfo.emailClient,
      });

      // Update campaign stats
      if (log.campaign_id) {
        await incrementStat("email_campaigns", log.campaign_id, "click_count");
      }
    }

    // Redirect to actual URL
    res.redirect(302, decodeURIComponent(url));
  } catch (error) {
    console.error("Click tracking error:", error);
    // Still redirect even on error
    if (req.query.url) {
      res.redirect(302, decodeURIComponent(req.query.url));
    } else {
      res.status(500).send("Error");
    }
  }
});

// ============================================
// UNSUBSCRIBE ENDPOINTS
// ============================================

// Unsubscribe page (GET - show form)
router.get("/unsubscribe", async (req, res) => {
  const { t: trackingId, e: email } = req.query;

  // Return simple HTML form
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Unsubscribe - 9RX</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .btn { background: #dc3545; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        .btn:hover { background: #c82333; }
        .success { color: #28a745; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 5px; }
        textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>Unsubscribe from 9RX Emails</h1>
      <p>We're sorry to see you go. Click the button below to unsubscribe from our mailing list.</p>
      <form method="POST" action="/api/email/unsubscribe">
        <input type="hidden" name="trackingId" value="${trackingId || ''}" />
        <input type="hidden" name="email" value="${email || ''}" />
        <div class="form-group">
          <label>Reason (optional):</label>
          <textarea name="reason" rows="3" placeholder="Tell us why you're unsubscribing..."></textarea>
        </div>
        <button type="submit" class="btn">Unsubscribe</button>
      </form>
    </body>
    </html>
  `);
});

// Process unsubscribe (POST)
router.post("/unsubscribe", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { trackingId, email, reason } = req.body;

    if (!email) {
      return res.status(400).send("Email is required");
    }

    // Update subscriber status
    await supabase
      .from("email_subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email", email.toLowerCase());

    // Add to suppression list
    await supabase.from("email_suppression_list").upsert({
      email: email.toLowerCase(),
      reason: "unsubscribe",
      notes: reason || null,
    });

    // Record tracking event if we have tracking ID
    if (trackingId) {
      const { data: log } = await supabase
        .from("email_logs")
        .select("id, campaign_id")
        .eq("tracking_id", trackingId)
        .single();

      if (log) {
        await supabase.from("email_tracking_events").insert({
          email_log_id: log.id,
          tracking_id: trackingId,
          event_type: "unsubscribed",
        });

        if (log.campaign_id) {
          await incrementStat("email_campaigns", log.campaign_id, "unsubscribe_count");
        }
      }
    }

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed - 9RX</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
          h1 { color: #28a745; }
          .btn { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 5px; text-decoration: none; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>✓ Successfully Unsubscribed</h1>
        <p>You have been removed from our mailing list. You will no longer receive marketing emails from 9RX.</p>
        <p>Note: You may still receive transactional emails related to your orders.</p>
        <a href="https://9rx.com" class="btn">Return to 9RX</a>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).send("An error occurred. Please try again.");
  }
});

// Email preferences page
router.get("/email-preferences", async (req, res) => {
  const { t: trackingId } = req.query;

  // Get subscriber from tracking ID
  let email = "";
  let preferences = {};

  if (trackingId) {
    const { data: log } = await supabase
      .from("email_logs")
      .select("email_address")
      .eq("tracking_id", trackingId)
      .single();

    if (log) {
      email = log.email_address;

      const { data: subscriber } = await supabase
        .from("email_subscribers")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (subscriber) {
        const { data: prefs } = await supabase
          .from("email_preferences")
          .select("preference_type, is_enabled")
          .eq("subscriber_id", subscriber.id);

        preferences = (prefs || []).reduce((acc, p) => {
          acc[p.preference_type] = p.is_enabled;
          return acc;
        }, {});
      }
    }
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email Preferences - 9RX</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .pref-item { display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee; }
        .pref-item label { flex: 1; }
        .btn { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Email Preferences</h1>
      <p>Manage what types of emails you receive from 9RX.</p>
      <form method="POST" action="/api/email/preferences">
        <input type="hidden" name="trackingId" value="${trackingId || ''}" />
        <input type="hidden" name="email" value="${email}" />
        
        <div class="pref-item">
          <label>Marketing & Promotions</label>
          <input type="checkbox" name="marketing" ${preferences.marketing !== false ? 'checked' : ''} />
        </div>
        <div class="pref-item">
          <label>Newsletter</label>
          <input type="checkbox" name="newsletter" ${preferences.newsletter !== false ? 'checked' : ''} />
        </div>
        <div class="pref-item">
          <label>Product Updates</label>
          <input type="checkbox" name="promotional" ${preferences.promotional !== false ? 'checked' : ''} />
        </div>
        <div class="pref-item">
          <label>Order Updates (Required)</label>
          <input type="checkbox" name="transactional" checked disabled />
        </div>
        
        <button type="submit" class="btn">Save Preferences</button>
      </form>
    </body>
    </html>
  `);
});

// Save preferences
router.post("/preferences", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { email, marketing, newsletter, promotional } = req.body;

    if (!email) {
      return res.status(400).send("Email is required");
    }

    const { data: subscriber } = await supabase
      .from("email_subscribers")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (!subscriber) {
      return res.status(404).send("Subscriber not found");
    }

    // Update preferences
    const prefs = [
      { preference_type: "marketing", is_enabled: marketing === "on" },
      { preference_type: "newsletter", is_enabled: newsletter === "on" },
      { preference_type: "promotional", is_enabled: promotional === "on" },
    ];

    for (const pref of prefs) {
      await supabase.from("email_preferences").upsert({
        subscriber_id: subscriber.id,
        ...pref,
      });
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Preferences Saved - 9RX</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
          h1 { color: #28a745; }
        </style>
      </head>
      <body>
        <h1>✓ Preferences Saved</h1>
        <p>Your email preferences have been updated.</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Save preferences error:", error);
    res.status(500).send("An error occurred");
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();
  
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? "tablet" : "mobile";
  }

  let emailClient = "unknown";
  if (ua.includes("gmail")) emailClient = "gmail";
  else if (ua.includes("outlook") || ua.includes("microsoft")) emailClient = "outlook";
  else if (ua.includes("apple") || ua.includes("webkit")) emailClient = "apple_mail";
  else if (ua.includes("yahoo")) emailClient = "yahoo";

  return { deviceType, emailClient };
}

async function incrementStat(table, id, column) {
  const { data } = await supabase
    .from(table)
    .select(column)
    .eq("id", id)
    .single();

  if (data) {
    await supabase
      .from(table)
      .update({ [column]: (data[column] || 0) + 1 })
      .eq("id", id);
  }
}

module.exports = router;
