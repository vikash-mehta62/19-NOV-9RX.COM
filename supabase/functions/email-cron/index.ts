// Email Cron Job - Supabase Edge Function
// Schedule this to run every minute using pg_cron or external scheduler

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CronResult {
  job: string;
  success: boolean;
  details: any;
  duration: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const results: CronResult[] = [];
  const startTime = Date.now();

  try {
    // 1. Process Email Queue
    const queueResult = await processEmailQueue(supabase);
    results.push({
      job: "processEmailQueue",
      success: true,
      details: queueResult,
      duration: Date.now() - startTime,
    });

    // 2. Retry Failed Emails
    const retryResult = await retryFailedEmails(supabase);
    results.push({
      job: "retryFailedEmails",
      success: true,
      details: retryResult,
      duration: Date.now() - startTime,
    });

    // 3. Process Scheduled Automations
    const automationResult = await processScheduledAutomations(supabase);
    results.push({
      job: "processScheduledAutomations",
      success: true,
      details: automationResult,
      duration: Date.now() - startTime,
    });

    // 4. Check A/B Tests
    const abTestResult = await checkABTests(supabase);
    results.push({
      job: "checkABTests",
      success: true,
      details: abTestResult,
      duration: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalDuration: Date.now() - startTime,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Process pending emails from queue
async function processEmailQueue(supabase: any) {
  const processed = { sent: 0, failed: 0 };

  // Get pending emails
  const { data: pendingEmails } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .limit(50);

  if (!pendingEmails || pendingEmails.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  for (const email of pendingEmails) {
    // Mark as processing
    await supabase
      .from("email_queue")
      .update({ status: "processing", last_attempt_at: new Date().toISOString() })
      .eq("id", email.id);

    try {
      // Get email settings
      const { data: settings } = await supabase
        .from("email_settings")
        .select("setting_key, setting_value");

      const emailSettings = (settings || []).reduce((acc: any, s: any) => {
        acc[s.setting_key] = s.setting_value;
        return acc;
      }, {});

      // Determine provider and send
      const provider = emailSettings.provider || "nodejs";
      let result: any;
      let response: Response;

      if (provider === "nodejs" || provider === "smtp") {
        // Call Node.js backend API
        const apiUrl = Deno.env.get("NODE_API_URL") || "http://localhost:4000";
        response = await fetch(`${apiUrl}/api/email/send-test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.email,
            subject: email.subject,
            content: email.html_content,
          }),
        });
        result = await response.json();
      } else {
        // Send via Resend
        response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${emailSettings.api_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${emailSettings.from_name || "9RX"} <${emailSettings.from_email || "noreply@9rx.com"}>`,
            to: [email.email],
            subject: email.subject,
            html: email.html_content,
            text: email.text_content,
          }),
        });
        result = await response.json();
      }

      if (response.ok && (result.success !== false)) {
        await supabase
          .from("email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: result.id,
            attempts: email.attempts + 1,
          })
          .eq("id", email.id);

        // Log the email
        await supabase.from("email_logs").insert({
          email_address: email.email,
          subject: email.subject,
          email_type: email.campaign_id ? "campaign" : email.automation_id ? "automation" : "transactional",
          status: "sent",
          campaign_id: email.campaign_id,
          automation_id: email.automation_id,
          template_id: email.template_id,
          provider_message_id: result.id,
          tracking_id: email.metadata?.tracking_id,
          sent_at: new Date().toISOString(),
        });

        processed.sent++;
      } else {
        throw new Error(result.message || "Failed to send");
      }
    } catch (error: any) {
      const newAttempts = email.attempts + 1;
      const shouldRetry = newAttempts < email.max_attempts;

      await supabase
        .from("email_queue")
        .update({
          status: shouldRetry ? "pending" : "failed",
          attempts: newAttempts,
          error_message: error.message,
          next_retry_at: shouldRetry
            ? new Date(Date.now() + Math.pow(2, newAttempts) * 60000).toISOString()
            : null,
        })
        .eq("id", email.id);

      processed.failed++;
    }
  }

  return { processed: pendingEmails.length, ...processed };
}

// Retry failed emails
async function retryFailedEmails(supabase: any) {
  const { data } = await supabase
    .from("email_queue")
    .update({ status: "pending" })
    .eq("status", "failed")
    .lt("attempts", 3)
    .lte("next_retry_at", new Date().toISOString())
    .select("id");

  return { retried: data?.length || 0 };
}

// Process scheduled automations
async function processScheduledAutomations(supabase: any) {
  const processed = { executed: 0, skipped: 0 };

  const { data: pendingExecutions } = await supabase
    .from("automation_executions")
    .select(`*, email_automations (*)`)
    .eq("status", "pending")
    .limit(100);

  if (!pendingExecutions) return processed;

  for (const execution of pendingExecutions) {
    const automation = execution.email_automations;
    if (!automation || !automation.is_active) {
      await supabase
        .from("automation_executions")
        .update({ status: "skipped", skip_reason: "Automation inactive" })
        .eq("id", execution.id);
      processed.skipped++;
      continue;
    }

    // Check delay
    const delayHours = automation.trigger_conditions?.delay_hours || 0;
    const createdAt = new Date(execution.created_at);
    const executeAt = new Date(createdAt.getTime() + delayHours * 60 * 60 * 1000);

    if (new Date() < executeAt) continue;

    // Get template
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", automation.template_id)
      .single();

    if (!template) {
      await supabase
        .from("automation_executions")
        .update({ status: "failed", skip_reason: "Template not found" })
        .eq("id", execution.id);
      continue;
    }

    // Queue the email
    const trackingId = crypto.randomUUID();
    const { data: queueEntry } = await supabase
      .from("email_queue")
      .insert({
        email: execution.trigger_data?.email,
        subject: template.subject,
        html_content: template.html_content,
        automation_id: automation.id,
        template_id: template.id,
        metadata: { tracking_id: trackingId, user_id: execution.user_id },
        status: "pending",
      })
      .select("id")
      .single();

    await supabase
      .from("automation_executions")
      .update({
        status: "completed",
        email_queue_id: queueEntry?.id,
        executed_at: new Date().toISOString(),
      })
      .eq("id", execution.id);

    processed.executed++;
  }

  return processed;
}

// Check and evaluate A/B tests
async function checkABTests(supabase: any) {
  let evaluated = 0;

  const { data: tests } = await supabase
    .from("email_ab_tests")
    .select("*")
    .eq("status", "running");

  if (!tests) return { evaluated: 0 };

  for (const test of tests) {
    const startedAt = new Date(test.started_at);
    const testEndTime = new Date(startedAt.getTime() + test.test_duration_hours * 60 * 60 * 1000);

    if (new Date() >= testEndTime) {
      // Evaluate winner
      let variantARate = 0;
      let variantBRate = 0;

      if (test.winner_criteria === "open_rate") {
        variantARate = test.variant_a_sent > 0 ? test.variant_a_opens / test.variant_a_sent : 0;
        variantBRate = test.variant_b_sent > 0 ? test.variant_b_opens / test.variant_b_sent : 0;
      } else {
        variantARate = test.variant_a_opens > 0 ? test.variant_a_clicks / test.variant_a_opens : 0;
        variantBRate = test.variant_b_opens > 0 ? test.variant_b_clicks / test.variant_b_opens : 0;
      }

      const winner = variantARate >= variantBRate ? "A" : "B";

      await supabase
        .from("email_ab_tests")
        .update({ winner, status: "completed", completed_at: new Date().toISOString() })
        .eq("id", test.id);

      evaluated++;
    }
  }

  return { evaluated };
}
