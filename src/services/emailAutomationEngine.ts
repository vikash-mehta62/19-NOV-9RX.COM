// Email Automation Engine - Executes automation triggers
import { supabase } from "@/integrations/supabase/client";
import { queueEmail } from "./emailQueueService";
import { replaceTemplateVariables } from "./emailService";
import { prepareEmailForTracking } from "./emailTrackingService";

interface AutomationTriggerData {
  userId?: string;
  email: string;
  userName?: string;
  triggerType: string;
  triggerData?: Record<string, any>;
}

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_conditions: any;
  template_id: string;
  is_active: boolean;
  priority: number;
  send_limit_per_user: number;
  cooldown_days: number;
}

// Check if automation should be executed for this user
async function shouldExecuteAutomation(
  automation: Automation,
  userId: string | undefined,
  email: string
): Promise<{ execute: boolean; reason?: string }> {
  // Check if email is suppressed
  const { data: suppressed } = await supabase
    .rpc('is_email_suppressed', { check_email: email });
  
  if (suppressed) {
    return { execute: false, reason: "Email is suppressed" };
  }

  // Check subscriber status
  const { data: subscriber } = await supabase
    .from("email_subscribers")
    .select("status")
    .eq("email", email.toLowerCase())
    .single();

  if (subscriber && subscriber.status !== 'active') {
    return { execute: false, reason: `Subscriber status: ${subscriber.status}` };
  }

  if (!userId) {
    return { execute: true };
  }

  // Check send limit per user
  const { count: totalSent } = await supabase
    .from("automation_executions")
    .select("*", { count: "exact", head: true })
    .eq("automation_id", automation.id)
    .eq("user_id", userId)
    .eq("status", "completed");

  if ((totalSent || 0) >= automation.send_limit_per_user) {
    return { execute: false, reason: "Send limit reached for user" };
  }

  // Check cooldown period
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - automation.cooldown_days);

  const { data: recentExecution } = await supabase
    .from("automation_executions")
    .select("id")
    .eq("automation_id", automation.id)
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("executed_at", cooldownDate.toISOString())
    .limit(1);

  if (recentExecution && recentExecution.length > 0) {
    return { execute: false, reason: "Within cooldown period" };
  }

  return { execute: true };
}

// Execute a single automation
export async function executeAutomation(
  automation: Automation,
  triggerData: AutomationTriggerData
): Promise<{ success: boolean; executionId?: string; error?: string }> {
  try {
    // Check if should execute
    const check = await shouldExecuteAutomation(
      automation,
      triggerData.userId,
      triggerData.email
    );

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from("automation_executions")
      .insert({
        automation_id: automation.id,
        user_id: triggerData.userId,
        trigger_data: triggerData.triggerData,
        status: check.execute ? "processing" : "skipped",
        skip_reason: check.reason,
      })
      .select("id")
      .single();

    if (execError) throw execError;

    if (!check.execute) {
      return { success: false, executionId: execution.id, error: check.reason };
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", automation.template_id)
      .single();

    if (templateError || !template) {
      await supabase
        .from("automation_executions")
        .update({ status: "failed", skip_reason: "Template not found" })
        .eq("id", execution.id);
      return { success: false, executionId: execution.id, error: "Template not found" };
    }

    // Prepare email content
    const variables: Record<string, string> = {
      user_name: triggerData.userName || "Customer",
      email: triggerData.email,
      ...Object.entries(triggerData.triggerData || {}).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>),
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let htmlContent = replaceTemplateVariables(template.html_content, variables);

    // Add tracking
    const trackingId = crypto.randomUUID();
    htmlContent = prepareEmailForTracking(htmlContent, trackingId, triggerData.email, {
      trackOpens: true,
      trackClicks: true,
      addUnsubscribe: true,
    });

    // Queue the email
    const queueResult = await queueEmail({
      email: triggerData.email,
      subject,
      html_content: htmlContent,
      text_content: template.text_content,
      automation_id: automation.id,
      template_id: automation.template_id,
      metadata: {
        user_id: triggerData.userId,
        tracking_id: trackingId,
        trigger_type: triggerData.triggerType,
      },
    });

    if (!queueResult.success) {
      await supabase
        .from("automation_executions")
        .update({ status: "failed", skip_reason: queueResult.error })
        .eq("id", execution.id);
      return { success: false, executionId: execution.id, error: queueResult.error };
    }

    // Update execution record
    await supabase
      .from("automation_executions")
      .update({
        status: "completed",
        email_queue_id: queueResult.queueId,
        executed_at: new Date().toISOString(),
      })
      .eq("id", execution.id);

    // Update automation stats
    await supabase
      .from("email_automations")
      .update({ total_sent: automation.total_sent + 1 })
      .eq("id", automation.id);

    return { success: true, executionId: execution.id };
  } catch (error: any) {
    console.error("Error executing automation:", error);
    return { success: false, error: error.message };
  }
}

// Trigger automation by type
export async function triggerAutomation(
  triggerType: string,
  data: AutomationTriggerData
): Promise<{ triggered: number; errors: string[] }> {
  const results = { triggered: 0, errors: [] as string[] };

  try {
    // Get active automations for this trigger type
    const { data: automations, error } = await supabase
      .from("email_automations")
      .select("*")
      .eq("trigger_type", triggerType)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (error) throw error;
    if (!automations || automations.length === 0) return results;

    for (const automation of automations) {
      // Check trigger conditions
      if (!checkTriggerConditions(automation, data)) {
        continue;
      }

      // Calculate delay
      const delayHours = automation.trigger_conditions?.delay_hours || 0;
      
      if (delayHours > 0) {
        // Schedule for later
        await scheduleAutomation(automation, data, delayHours);
        results.triggered++;
      } else {
        // Execute immediately
        const result = await executeAutomation(automation, data);
        if (result.success) {
          results.triggered++;
        } else if (result.error) {
          results.errors.push(`${automation.name}: ${result.error}`);
        }
      }
    }
  } catch (error: any) {
    results.errors.push(error.message);
  }

  return results;
}

// Check if trigger conditions are met
function checkTriggerConditions(
  automation: Automation,
  data: AutomationTriggerData
): boolean {
  const conditions = automation.trigger_conditions || {};

  // Check minimum cart value for abandoned cart
  if (automation.trigger_type === "abandoned_cart") {
    const minValue = conditions.min_cart_value || 0;
    const cartValue = data.triggerData?.cart_total || 0;
    if (cartValue < minValue) return false;
  }

  // Check inactive days
  if (automation.trigger_type === "inactive_user") {
    const requiredDays = conditions.inactive_days || 30;
    const lastActive = data.triggerData?.last_active;
    if (lastActive) {
      const daysSinceActive = Math.floor(
        (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActive < requiredDays) return false;
    }
  }

  return true;
}

// Schedule automation for later execution
async function scheduleAutomation(
  automation: Automation,
  data: AutomationTriggerData,
  delayHours: number
): Promise<void> {
  const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

  await supabase.from("automation_executions").insert({
    automation_id: automation.id,
    user_id: data.userId,
    trigger_data: {
      ...data.triggerData,
      email: data.email,
      userName: data.userName,
      triggerType: data.triggerType,
    },
    status: "pending",
  });
}

// Process scheduled automations (call this from a cron job)
export async function processScheduledAutomations(): Promise<{
  processed: number;
  executed: number;
  errors: string[];
}> {
  const results = { processed: 0, executed: 0, errors: [] as string[] };

  try {
    // Get pending executions that are due
    const { data: pendingExecutions, error } = await supabase
      .from("automation_executions")
      .select(`
        *,
        email_automations (*)
      `)
      .eq("status", "pending")
      .lte("created_at", new Date(Date.now() - 60000).toISOString()) // At least 1 minute old
      .limit(100);

    if (error) throw error;
    if (!pendingExecutions) return results;

    for (const execution of pendingExecutions) {
      results.processed++;

      const automation = execution.email_automations;
      if (!automation || !automation.is_active) {
        await supabase
          .from("automation_executions")
          .update({ status: "skipped", skip_reason: "Automation inactive" })
          .eq("id", execution.id);
        continue;
      }

      // Check delay
      const delayHours = automation.trigger_conditions?.delay_hours || 0;
      const createdAt = new Date(execution.created_at);
      const executeAt = new Date(createdAt.getTime() + delayHours * 60 * 60 * 1000);

      if (new Date() < executeAt) {
        continue; // Not yet time to execute
      }

      const triggerData: AutomationTriggerData = {
        userId: execution.user_id,
        email: execution.trigger_data?.email,
        userName: execution.trigger_data?.userName,
        triggerType: execution.trigger_data?.triggerType,
        triggerData: execution.trigger_data,
      };

      // Delete the pending execution (we'll create a new one in executeAutomation)
      await supabase
        .from("automation_executions")
        .delete()
        .eq("id", execution.id);

      const result = await executeAutomation(automation, triggerData);
      if (result.success) {
        results.executed++;
      } else if (result.error) {
        results.errors.push(result.error);
      }
    }
  } catch (error: any) {
    results.errors.push(error.message);
  }

  return results;
}

// Convenience functions for common triggers
export const automationTriggers = {
  async onUserSignup(userId: string, email: string, userName: string) {
    return triggerAutomation("welcome", {
      userId,
      email,
      userName,
      triggerType: "welcome",
    });
  },

  async onCartAbandoned(userId: string, email: string, userName: string, cartData: any) {
    return triggerAutomation("abandoned_cart", {
      userId,
      email,
      userName,
      triggerType: "abandoned_cart",
      triggerData: {
        cart_total: cartData.total,
        cart_items: cartData.items,
        cart_url: cartData.url,
      },
    });
  },

  async onOrderPlaced(userId: string, email: string, userName: string, orderData: any) {
    return triggerAutomation("order_placed", {
      userId,
      email,
      userName,
      triggerType: "order_placed",
      triggerData: {
        order_number: orderData.order_number,
        order_total: orderData.total,
        items: orderData.items,
      },
    });
  },

  async onOrderShipped(userId: string, email: string, userName: string, orderData: any) {
    return triggerAutomation("order_shipped", {
      userId,
      email,
      userName,
      triggerType: "order_shipped",
      triggerData: {
        order_number: orderData.order_number,
        tracking_number: orderData.tracking_number,
        carrier: orderData.carrier,
      },
    });
  },

  async onOrderDelivered(userId: string, email: string, userName: string, orderData: any) {
    return triggerAutomation("order_delivered", {
      userId,
      email,
      userName,
      triggerType: "order_delivered",
      triggerData: {
        order_number: orderData.order_number,
      },
    });
  },
};
