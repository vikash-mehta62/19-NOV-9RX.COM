// Email Queue Processor - Uses existing nodemailer setup to send queued emails
const { createClient } = require("@supabase/supabase-js");
const mailSender = require("../utils/mailSender");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Process pending emails from queue
exports.processQueue = async (req, res) => {
  const results = { processed: 0, sent: 0, failed: 0, errors: [] };
  const limit = parseInt(req.query.limit) || 50;

  try {
    // Get pending emails that are due
    const { data: pendingEmails, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    if (!pendingEmails || pendingEmails.length === 0) {
      return res.json({ message: "No pending emails", ...results });
    }

    for (const queuedEmail of pendingEmails) {
      results.processed++;

      // Mark as processing
      await supabase
        .from("email_queue")
        .update({ status: "processing", last_attempt_at: new Date().toISOString() })
        .eq("id", queuedEmail.id);

      try {
        // Send using existing mailSender
        const sendResult = await mailSender(
          queuedEmail.email,
          queuedEmail.subject,
          queuedEmail.html_content
        );

        if (sendResult.success) {
          // Update queue status to sent
          await supabase
            .from("email_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: sendResult.messageId,
              attempts: queuedEmail.attempts + 1,
            })
            .eq("id", queuedEmail.id);


          // Log the email
          await supabase.from("email_logs").insert({
            user_id: queuedEmail.metadata?.user_id || null,
            email_address: queuedEmail.email,
            subject: queuedEmail.subject,
            email_type: queuedEmail.campaign_id ? "campaign" : queuedEmail.automation_id ? "automation" : "transactional",
            status: "sent",
            campaign_id: queuedEmail.campaign_id,
            automation_id: queuedEmail.automation_id,
            template_id: queuedEmail.template_id,
            provider_message_id: sendResult.messageId,
            tracking_id: queuedEmail.metadata?.tracking_id,
            sent_at: new Date().toISOString(),
          });

          // Update campaign sent count if applicable
          if (queuedEmail.campaign_id) {
            const { data: campaign } = await supabase
              .from("email_campaigns")
              .select("sent_count")
              .eq("id", queuedEmail.campaign_id)
              .single();

            if (campaign) {
              await supabase
                .from("email_campaigns")
                .update({ sent_count: (campaign.sent_count || 0) + 1 })
                .eq("id", queuedEmail.campaign_id);
            }
          }

          // Update automation sent count if applicable
          if (queuedEmail.automation_id) {
            const { data: automation } = await supabase
              .from("email_automations")
              .select("total_sent")
              .eq("id", queuedEmail.automation_id)
              .single();

            if (automation) {
              await supabase
                .from("email_automations")
                .update({ total_sent: (automation.total_sent || 0) + 1 })
                .eq("id", queuedEmail.automation_id);
            }
          }

          results.sent++;
        } else {
          throw new Error(sendResult.error || "Failed to send email");
        }
      } catch (sendError) {
        const newAttempts = queuedEmail.attempts + 1;
        const maxAttempts = queuedEmail.max_attempts || 3;
        const shouldRetry = newAttempts < maxAttempts;

        await supabase
          .from("email_queue")
          .update({
            status: shouldRetry ? "pending" : "failed",
            attempts: newAttempts,
            error_message: sendError.message,
            next_retry_at: shouldRetry
              ? new Date(Date.now() + Math.pow(2, newAttempts) * 60000).toISOString()
              : null,
          })
          .eq("id", queuedEmail.id);

        results.failed++;
        results.errors.push(`${queuedEmail.email}: ${sendError.message}`);
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      message: `Processed ${results.processed} emails`,
      ...results,
    });
  } catch (error) {
    console.error("Queue processing error:", error);
    res.status(500).json({ success: false, error: error.message, ...results });
  }
};

// Retry failed emails
exports.retryFailed = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("email_queue")
      .update({ status: "pending" })
      .eq("status", "failed")
      .lt("attempts", 3)
      .lte("next_retry_at", new Date().toISOString())
      .select("id");

    if (error) throw error;

    res.json({
      success: true,
      message: `${data?.length || 0} emails queued for retry`,
      retried: data?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get queue statistics
exports.getStats = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("email_queue")
      .select("status")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const stats = {
      pending: data.filter(e => e.status === "pending").length,
      processing: data.filter(e => e.status === "processing").length,
      sent: data.filter(e => e.status === "sent").length,
      failed: data.filter(e => e.status === "failed").length,
      cancelled: data.filter(e => e.status === "cancelled").length,
    };

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Send a single test email
exports.sendTest = async (req, res) => {
  const { email, subject, content } = req.body;

  if (!email || !subject) {
    return res.status(400).json({ success: false, error: "Email and subject are required" });
  }

  try {
    const htmlContent = content || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✅ Test Email Successful!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
          <p>This is a test email from your 9RX email system.</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">If you received this email, your email configuration is working correctly!</p>
        </div>
      </div>
    `;

    const result = await mailSender(email, subject, htmlContent);

    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent to ${email}`,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
