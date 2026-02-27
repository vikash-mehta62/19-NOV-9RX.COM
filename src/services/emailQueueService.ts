// Email Queue Service - Handles email queuing with retry logic
import { supabase } from "@/integrations/supabase/client";
import { sendEmail, logEmail } from "./emailService";

interface QueuedEmail {
  id: string;
  email: string;
  subject: string;
  html_content: string;
  text_content?: string;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  campaign_id?: string;
  automation_id?: string;
  template_id?: string;
  subscriber_id?: string;
  priority?: number;
  scheduled_at?: string;
  metadata?: Record<string, any>;
}

// Add email to queue
export async function queueEmail(email: QueuedEmail): Promise<{ success: boolean; queueId?: string; error?: string }> {
  try {
    // Check if email is suppressed
    const { data: suppressed } = await supabase
      .rpc('is_email_suppressed', { check_email: email.email });
    
    if (suppressed) {
      return { success: false, error: "Email is suppressed" };
    }

    const { data, error } = await supabase
      .from("email_queue")
      .insert({
        to_email: email.email.toLowerCase(),
        to_name: email.metadata?.user_name || email.metadata?.first_name || "",
        subject: email.subject,
        html_content: email.html_content,
        text_content: email.text_content,
        from_email: email.from_email,
        from_name: email.from_name,
        reply_to: email.reply_to,
        campaign_id: email.campaign_id,
        automation_id: email.automation_id,
        template_id: email.template_id,
        subscriber_id: email.subscriber_id,
        priority: email.priority || 0,
        scheduled_at: email.scheduled_at || new Date().toISOString(),
        metadata: email.metadata || {},
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;
    return { success: true, queueId: data.id };
  } catch (error: any) {
    console.error("Error queuing email:", error);
    return { success: false, error: error.message };
  }
}

// Queue multiple emails (for campaigns)
export async function queueBulkEmails(
  emails: QueuedEmail[],
  batchSize: number = 100
): Promise<{ queued: number; failed: number; errors: string[] }> {
  const results = { queued: 0, failed: 0, errors: [] as string[] };

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const records = batch.map(email => ({
      to_email: email.email.toLowerCase(),
      to_name: email.metadata?.user_name || email.metadata?.first_name || "",
      subject: email.subject,
      html_content: email.html_content,
      text_content: email.text_content,
      from_email: email.from_email,
      from_name: email.from_name,
      reply_to: email.reply_to,
      campaign_id: email.campaign_id,
      automation_id: email.automation_id,
      template_id: email.template_id,
      subscriber_id: email.subscriber_id,
      priority: email.priority || 0,
      scheduled_at: email.scheduled_at || new Date().toISOString(),
      metadata: email.metadata || {},
      status: "pending",
    }));

    const { data, error } = await supabase
      .from("email_queue")
      .insert(records)
      .select("id");

    if (error) {
      results.failed += batch.length;
      results.errors.push(error.message);
    } else {
      results.queued += data?.length || 0;
    }
  }

  return results;
}

// Process pending emails from queue
export async function processEmailQueue(limit: number = 50): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const results = { processed: 0, sent: 0, failed: 0 };

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
    if (!pendingEmails || pendingEmails.length === 0) return results;

    for (const queuedEmail of pendingEmails) {
      results.processed++;

      // Mark as processing
      await supabase
        .from("email_queue")
        .update({ status: "processing", last_attempt_at: new Date().toISOString() })
        .eq("id", queuedEmail.id);

      try {
        // Send the email
        const sendResult = await sendEmail({
          to: queuedEmail.to_email,
          subject: queuedEmail.subject,
          html: queuedEmail.html_content,
          text: queuedEmail.text_content,
          from: queuedEmail.from_email ? `${queuedEmail.from_name} <${queuedEmail.from_email}>` : undefined,
          replyTo: queuedEmail.reply_to,
        });

        if (sendResult.success) {
          // Update queue status
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
          await logEmail(
            queuedEmail.metadata?.user_id || null,
            queuedEmail.to_email,
            queuedEmail.subject,
            queuedEmail.campaign_id ? "campaign" : queuedEmail.automation_id ? "automation" : "transactional",
            "sent",
            queuedEmail.campaign_id,
            queuedEmail.automation_id,
            queuedEmail.template_id,
            sendResult.messageId
          );

          results.sent++;
        } else {
          throw new Error(sendResult.error);
        }
      } catch (sendError: any) {
        const newAttempts = queuedEmail.attempts + 1;
        const shouldRetry = newAttempts < queuedEmail.max_attempts;

        await supabase
          .from("email_queue")
          .update({
            status: shouldRetry ? "pending" : "failed",
            attempts: newAttempts,
            error_message: sendError.message,
            next_retry_at: shouldRetry 
              ? new Date(Date.now() + Math.pow(2, newAttempts) * 60000).toISOString() // Exponential backoff
              : null,
          })
          .eq("id", queuedEmail.id);

        results.failed++;
      }
    }
  } catch (error) {
    console.error("Error processing email queue:", error);
  }

  return results;
}

// Retry failed emails
export async function retryFailedEmails(): Promise<number> {
  const { data, error } = await supabase
    .from("email_queue")
    .update({ status: "pending" })
    .eq("status", "failed")
    .lt("attempts", 3)
    .lte("next_retry_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("Error retrying failed emails:", error);
    return 0;
  }

  return data?.length || 0;
}

// Cancel queued emails for a campaign
export async function cancelCampaignEmails(campaignId: string): Promise<number> {
  const { data, error } = await supabase
    .from("email_queue")
    .update({ status: "cancelled" })
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("Error cancelling campaign emails:", error);
    return 0;
  }

  return data?.length || 0;
}

// Get queue statistics
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}> {
  const { data, error } = await supabase
    .from("email_queue")
    .select("status")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error("Error getting queue stats:", error);
    return { pending: 0, processing: 0, sent: 0, failed: 0 };
  }

  return {
    pending: data.filter(e => e.status === "pending").length,
    processing: data.filter(e => e.status === "processing").length,
    sent: data.filter(e => e.status === "sent").length,
    failed: data.filter(e => e.status === "failed").length,
  };
}
