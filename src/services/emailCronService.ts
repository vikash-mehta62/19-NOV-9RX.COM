// Email Cron Service - Background job processor for email queue and automations
// This should be called periodically (e.g., every minute) via a cron job or edge function

import { processEmailQueue, retryFailedEmails, getQueueStats } from "./emailQueueService";
import { processScheduledAutomations } from "./emailAutomationEngine";
import { evaluateABTest } from "./emailCampaignService";
import { supabase } from "@/integrations/supabase/client";

interface CronJobResult {
  job: string;
  success: boolean;
  details: any;
  duration: number;
}

// Process all email-related cron jobs
export async function runEmailCronJobs(): Promise<CronJobResult[]> {
  const results: CronJobResult[] = [];

  // 1. Process email queue
  const queueStart = Date.now();
  try {
    const queueResult = await processEmailQueue(50);
    results.push({
      job: "processEmailQueue",
      success: true,
      details: queueResult,
      duration: Date.now() - queueStart,
    });
  } catch (error: any) {
    results.push({
      job: "processEmailQueue",
      success: false,
      details: { error: error.message },
      duration: Date.now() - queueStart,
    });
  }

  // 2. Retry failed emails
  const retryStart = Date.now();
  try {
    const retried = await retryFailedEmails();
    results.push({
      job: "retryFailedEmails",
      success: true,
      details: { retried },
      duration: Date.now() - retryStart,
    });
  } catch (error: any) {
    results.push({
      job: "retryFailedEmails",
      success: false,
      details: { error: error.message },
      duration: Date.now() - retryStart,
    });
  }

  // 3. Process scheduled automations
  const automationStart = Date.now();
  try {
    const automationResult = await processScheduledAutomations();
    results.push({
      job: "processScheduledAutomations",
      success: true,
      details: automationResult,
      duration: Date.now() - automationStart,
    });
  } catch (error: any) {
    results.push({
      job: "processScheduledAutomations",
      success: false,
      details: { error: error.message },
      duration: Date.now() - automationStart,
    });
  }

  // 4. Check and evaluate A/B tests
  const abTestStart = Date.now();
  try {
    const abTestResult = await checkABTests();
    results.push({
      job: "checkABTests",
      success: true,
      details: abTestResult,
      duration: Date.now() - abTestStart,
    });
  } catch (error: any) {
    results.push({
      job: "checkABTests",
      success: false,
      details: { error: error.message },
      duration: Date.now() - abTestStart,
    });
  }

  // 5. Clean up old data
  const cleanupStart = Date.now();
  try {
    const cleanupResult = await cleanupOldData();
    results.push({
      job: "cleanupOldData",
      success: true,
      details: cleanupResult,
      duration: Date.now() - cleanupStart,
    });
  } catch (error: any) {
    results.push({
      job: "cleanupOldData",
      success: false,
      details: { error: error.message },
      duration: Date.now() - cleanupStart,
    });
  }

  return results;
}

// Check and evaluate A/B tests that are ready
async function checkABTests(): Promise<{ evaluated: number }> {
  let evaluated = 0;

  // Get running A/B tests that have passed their test duration
  const { data: tests } = await supabase
    .from("email_ab_tests")
    .select("*")
    .eq("status", "running");

  if (!tests) return { evaluated: 0 };

  for (const test of tests) {
    const startedAt = new Date(test.started_at);
    const testEndTime = new Date(startedAt.getTime() + test.test_duration_hours * 60 * 60 * 1000);

    if (new Date() >= testEndTime) {
      await evaluateABTest(test.id);
      evaluated++;
    }
  }

  return { evaluated };
}

// Clean up old data to prevent database bloat
async function cleanupOldData(): Promise<{
  queueCleaned: number;
  eventsCleaned: number;
  webhooksCleaned: number;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Clean old sent/failed queue items (30 days)
  const { data: queueData } = await supabase
    .from("email_queue")
    .delete()
    .in("status", ["sent", "failed", "cancelled"])
    .lt("created_at", thirtyDaysAgo)
    .select("id");

  // Clean old tracking events (90 days)
  const { data: eventsData } = await supabase
    .from("email_tracking_events")
    .delete()
    .lt("occurred_at", ninetyDaysAgo)
    .select("id");

  // Clean processed webhook events (30 days)
  const { data: webhooksData } = await supabase
    .from("email_webhook_events")
    .delete()
    .eq("processed", true)
    .lt("received_at", thirtyDaysAgo)
    .select("id");

  return {
    queueCleaned: queueData?.length || 0,
    eventsCleaned: eventsData?.length || 0,
    webhooksCleaned: webhooksData?.length || 0,
  };
}

// Check for inactive users and trigger automation
export async function checkInactiveUsers(): Promise<{ triggered: number }> {
  let triggered = 0;

  // Get inactive user automations
  const { data: automations } = await supabase
    .from("email_automations")
    .select("*")
    .eq("trigger_type", "inactive_user")
    .eq("is_active", true);

  if (!automations || automations.length === 0) return { triggered: 0 };

  for (const automation of automations) {
    const inactiveDays = automation.trigger_conditions?.inactive_days || 30;
    const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

    // Get inactive users
    const { data: inactiveUsers } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, last_sign_in_at")
      .lt("last_sign_in_at", cutoffDate.toISOString())
      .limit(100);

    if (!inactiveUsers) continue;

    for (const user of inactiveUsers) {
      // Check if already sent to this user recently
      const { data: recentExec } = await supabase
        .from("automation_executions")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("executed_at", new Date(Date.now() - automation.cooldown_days * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentExec && recentExec.length > 0) continue;

      // Import and trigger automation
      const { triggerAutomation } = await import("./emailAutomationEngine");
      await triggerAutomation("inactive_user", {
        userId: user.id,
        email: user.email,
        userName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Customer",
        triggerType: "inactive_user",
        triggerData: {
          last_active: user.last_sign_in_at,
          inactive_days: inactiveDays,
        },
      });

      triggered++;
    }
  }

  return { triggered };
}

// Check for abandoned carts and trigger automation
export async function checkAbandonedCarts(): Promise<{ triggered: number }> {
  let triggered = 0;

  // Get abandoned cart automations
  const { data: automations } = await supabase
    .from("email_automations")
    .select("*")
    .eq("trigger_type", "abandoned_cart")
    .eq("is_active", true);

  if (!automations || automations.length === 0) return { triggered: 0 };

  for (const automation of automations) {
    const delayHours = automation.trigger_conditions?.delay_hours || 24;
    const minCartValue = automation.trigger_conditions?.min_cart_value || 0;
    const cutoffTime = new Date(Date.now() - delayHours * 60 * 60 * 1000);

    // Get abandoned carts (you'll need to adjust this based on your cart table structure)
    const { data: abandonedCarts } = await supabase
      .from("carts")
      .select(`
        id,
        user_id,
        total,
        items,
        updated_at,
        profiles (id, email, first_name, last_name)
      `)
      .eq("status", "active")
      .gte("total", minCartValue)
      .lt("updated_at", cutoffTime.toISOString())
      .limit(100);

    if (!abandonedCarts) continue;

    for (const cart of abandonedCarts) {
      const profile = cart.profiles as any;
      if (!profile?.email) continue;

      // Check if already sent for this cart
      const { data: recentExec } = await supabase
        .from("automation_executions")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("user_id", cart.user_id)
        .eq("status", "completed")
        .gte("executed_at", new Date(Date.now() - automation.cooldown_days * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentExec && recentExec.length > 0) continue;

      // Trigger automation
      const { triggerAutomation } = await import("./emailAutomationEngine");
      await triggerAutomation("abandoned_cart", {
        userId: cart.user_id,
        email: profile.email,
        userName: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Customer",
        triggerType: "abandoned_cart",
        triggerData: {
          cart_id: cart.id,
          cart_total: cart.total,
          cart_items: cart.items,
          cart_url: `${window.location.origin}/pharmacy/order/create`,
        },
      });

      triggered++;
    }
  }

  return { triggered };
}

// Get email system health status
export async function getEmailSystemHealth(): Promise<{
  queueStats: any;
  automationsActive: number;
  campaignsRunning: number;
  recentErrors: number;
  status: "healthy" | "degraded" | "critical";
}> {
  const queueStats = await getQueueStats();

  const { count: automationsActive } = await supabase
    .from("email_automations")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: campaignsRunning } = await supabase
    .from("email_campaigns")
    .select("*", { count: "exact", head: true })
    .eq("status", "sending");

  // Count recent errors (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentErrors } = await supabase
    .from("email_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("updated_at", oneHourAgo);

  // Determine health status
  let status: "healthy" | "degraded" | "critical" = "healthy";
  if ((recentErrors || 0) > 50 || queueStats.failed > 100) {
    status = "critical";
  } else if ((recentErrors || 0) > 10 || queueStats.failed > 20) {
    status = "degraded";
  }

  return {
    queueStats,
    automationsActive: automationsActive || 0,
    campaignsRunning: campaignsRunning || 0,
    recentErrors: recentErrors || 0,
    status,
  };
}
