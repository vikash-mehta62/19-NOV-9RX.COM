// Email Webhook Handlers - Process events from email providers (Resend, SendGrid, SES)
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Process Resend webhook
exports.resendWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    // Log the webhook event
    await supabase.from("email_webhook_events").insert({
      provider: "resend",
      event_type: event.type,
      payload: event,
      email: event.data?.email || event.data?.to?.[0],
      message_id: event.data?.email_id,
    });

    // Process based on event type
    switch (event.type) {
      case "email.sent":
        await handleEmailSent(event.data);
        break;
      case "email.delivered":
        await handleEmailDelivered(event.data);
        break;
      case "email.opened":
        await handleEmailOpened(event.data);
        break;
      case "email.clicked":
        await handleEmailClicked(event.data);
        break;
      case "email.bounced":
        await handleEmailBounced(event.data);
        break;
      case "email.complained":
        await handleEmailComplained(event.data);
        break;
    }

    // Mark as processed
    await supabase
      .from("email_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("message_id", event.data?.email_id)
      .eq("provider", "resend");

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Resend webhook error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Process SendGrid webhook
exports.sendgridWebhook = async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      // Log the webhook event
      await supabase.from("email_webhook_events").insert({
        provider: "sendgrid",
        event_type: event.event,
        payload: event,
        email: event.email,
        message_id: event.sg_message_id,
      });

      // Process based on event type
      switch (event.event) {
        case "delivered":
          await handleEmailDelivered({ email: event.email, email_id: event.sg_message_id });
          break;
        case "open":
          await handleEmailOpened({ email: event.email, email_id: event.sg_message_id });
          break;
        case "click":
          await handleEmailClicked({ 
            email: event.email, 
            email_id: event.sg_message_id,
            url: event.url 
          });
          break;
        case "bounce":
          await handleEmailBounced({ 
            email: event.email, 
            email_id: event.sg_message_id,
            bounce_type: event.type === "blocked" ? "soft" : "hard"
          });
          break;
        case "spamreport":
          await handleEmailComplained({ email: event.email, email_id: event.sg_message_id });
          break;
        case "unsubscribe":
          await handleUnsubscribe(event.email);
          break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("SendGrid webhook error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Process AWS SES webhook (via SNS)
exports.sesWebhook = async (req, res) => {
  try {
    let message = req.body;

    // Handle SNS subscription confirmation
    if (message.Type === "SubscriptionConfirmation") {
      // Auto-confirm subscription (in production, verify the TopicArn)
      const https = require("https");
      https.get(message.SubscribeURL);
      return res.status(200).json({ confirmed: true });
    }

    // Parse SNS notification
    if (message.Type === "Notification") {
      message = JSON.parse(message.Message);
    }

    const eventType = message.eventType || message.notificationType;
    const mail = message.mail || {};

    // Log the webhook event
    await supabase.from("email_webhook_events").insert({
      provider: "ses",
      event_type: eventType,
      payload: message,
      email: mail.destination?.[0],
      message_id: mail.messageId,
    });

    // Process based on event type
    switch (eventType) {
      case "Delivery":
        await handleEmailDelivered({ 
          email: mail.destination?.[0], 
          email_id: mail.messageId 
        });
        break;
      case "Open":
        await handleEmailOpened({ 
          email: mail.destination?.[0], 
          email_id: mail.messageId 
        });
        break;
      case "Click":
        await handleEmailClicked({ 
          email: mail.destination?.[0], 
          email_id: mail.messageId,
          url: message.click?.link
        });
        break;
      case "Bounce":
        const bounceType = message.bounce?.bounceType === "Permanent" ? "hard" : "soft";
        for (const recipient of message.bounce?.bouncedRecipients || []) {
          await handleEmailBounced({ 
            email: recipient.emailAddress, 
            email_id: mail.messageId,
            bounce_type: bounceType
          });
        }
        break;
      case "Complaint":
        for (const recipient of message.complaint?.complainedRecipients || []) {
          await handleEmailComplained({ 
            email: recipient.emailAddress, 
            email_id: mail.messageId 
          });
        }
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("SES webhook error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Handler functions
async function handleEmailSent(data) {
  // Update email log status
  await supabase
    .from("email_logs")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("provider_message_id", data.email_id);
}

async function handleEmailDelivered(data) {
  // Update email log
  await supabase
    .from("email_logs")
    .update({ status: "delivered" })
    .eq("provider_message_id", data.email_id);

  // Record tracking event
  const { data: log } = await supabase
    .from("email_logs")
    .select("tracking_id")
    .eq("provider_message_id", data.email_id)
    .single();

  if (log?.tracking_id) {
    await supabase.from("email_tracking_events").insert({
      tracking_id: log.tracking_id,
      event_type: "delivered",
    });
  }
}

async function handleEmailOpened(data) {
  const { data: log } = await supabase
    .from("email_logs")
    .select("tracking_id, campaign_id")
    .eq("provider_message_id", data.email_id)
    .single();

  if (log?.tracking_id) {
    // Check if already recorded (avoid duplicate opens)
    const { data: existing } = await supabase
      .from("email_tracking_events")
      .select("id")
      .eq("tracking_id", log.tracking_id)
      .eq("event_type", "opened")
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("email_tracking_events").insert({
        tracking_id: log.tracking_id,
        event_type: "opened",
      });

      // Update campaign stats
      if (log.campaign_id) {
        await incrementCampaignStat(log.campaign_id, "open_count");
      }
    }
  }
}

async function handleEmailClicked(data) {
  const { data: log } = await supabase
    .from("email_logs")
    .select("tracking_id, campaign_id")
    .eq("provider_message_id", data.email_id)
    .single();

  if (log?.tracking_id) {
    await supabase.from("email_tracking_events").insert({
      tracking_id: log.tracking_id,
      event_type: "clicked",
      link_url: data.url,
    });

    // Update campaign stats
    if (log.campaign_id) {
      await incrementCampaignStat(log.campaign_id, "click_count");
    }
  }
}

async function handleEmailBounced(data) {
  const email = data.email;
  const bounceType = data.bounce_type || "hard";

  // Update subscriber
  const { data: subscriber } = await supabase
    .from("email_subscribers")
    .select("id, bounce_count")
    .eq("email", email.toLowerCase())
    .single();

  if (subscriber) {
    const newBounceCount = (subscriber.bounce_count || 0) + 1;
    const shouldSuppress = bounceType === "hard" || newBounceCount >= 3;

    await supabase
      .from("email_subscribers")
      .update({
        status: shouldSuppress ? "bounced" : "active",
        bounce_count: newBounceCount,
        last_bounce_at: new Date().toISOString(),
      })
      .eq("id", subscriber.id);

    if (shouldSuppress) {
      await supabase.from("email_suppression_list").upsert({
        email: email.toLowerCase(),
        reason: "bounce",
        notes: `${bounceType} bounce, count: ${newBounceCount}`,
      });
    }
  }

  // Update campaign stats
  const { data: log } = await supabase
    .from("email_logs")
    .select("campaign_id, tracking_id")
    .eq("provider_message_id", data.email_id)
    .single();

  if (log?.campaign_id) {
    await incrementCampaignStat(log.campaign_id, "bounce_count");
  }

  if (log?.tracking_id) {
    await supabase.from("email_tracking_events").insert({
      tracking_id: log.tracking_id,
      event_type: "bounced",
    });
  }
}

async function handleEmailComplained(data) {
  const email = data.email;

  // Update subscriber status
  await supabase
    .from("email_subscribers")
    .update({
      status: "complained",
      complaint_at: new Date().toISOString(),
    })
    .eq("email", email.toLowerCase());

  // Add to suppression list
  await supabase.from("email_suppression_list").upsert({
    email: email.toLowerCase(),
    reason: "complaint",
    notes: "Spam complaint received",
  });

  // Record tracking event
  const { data: log } = await supabase
    .from("email_logs")
    .select("tracking_id")
    .eq("provider_message_id", data.email_id)
    .single();

  if (log?.tracking_id) {
    await supabase.from("email_tracking_events").insert({
      tracking_id: log.tracking_id,
      event_type: "complained",
    });
  }
}

async function handleUnsubscribe(email) {
  await supabase
    .from("email_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", email.toLowerCase());

  await supabase.from("email_suppression_list").upsert({
    email: email.toLowerCase(),
    reason: "unsubscribe",
  });
}

async function incrementCampaignStat(campaignId, column) {
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select(column)
    .eq("id", campaignId)
    .single();

  if (campaign) {
    await supabase
      .from("email_campaigns")
      .update({ [column]: (campaign[column] || 0) + 1 })
      .eq("id", campaignId);
  }
}

module.exports = {
  resendWebhook: exports.resendWebhook,
  sendgridWebhook: exports.sendgridWebhook,
  sesWebhook: exports.sesWebhook,
};
