/**
 * Email Cron Service - Server-side background job processor
 * Handles: Queue processing, Automations, Abandoned carts, Inactive users, Cleanup
 * 
 * Tables used:
 * - email_queue (pending emails)
 * - email_automations (automation rules)
 * - automation_executions (execution tracking)
 * - email_templates (email content)
 * - email_logs (sent email history)
 * - email_campaigns (campaign stats)
 * - carts (abandoned cart detection)
 * - profiles (user data)
 */

const { createClient } = require("@supabase/supabase-js");
const mailSender = require("../utils/mailSender");
const { inventoryStockAlertTemplate } = require("../templates/inventoryStockAlert");
const crypto = require("crypto");
require("dotenv").config();

// Initialize Supabase client with SERVICE_ROLE_KEY for server-side operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for background jobs

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials for Email Cron");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Queue processing
  queueBatchSize: 50,
  queueInterval: 30 * 1000, // 30 seconds
  
  // Abandoned cart
  abandonedCartInterval: 5 * 60 * 1000, // 5 minutes
  
  // Inactive users
  inactiveUserInterval: 60 * 60 * 1000, // 1 hour
  
  // Scheduled automations
  automationInterval: 60 * 1000, // 1 minute
  
  // Cleanup
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  cleanupQueueDays: 30,
  cleanupEventsDays: 90,
  
  // Retry
  retryInterval: 5 * 60 * 1000, // 5 minutes

  // Inventory stock alerts
  inventoryAlertBatchSize: 50,
  inventoryAlertInterval: 60 * 1000, // 1 minute
  inventoryAlertCooldownMinutes: parseInt(process.env.INVENTORY_ALERT_COOLDOWN_MINUTES || "30", 10),
  
  // Duplicate prevention
  duplicateCheckHours: 24, // Don't send same email type to same user within 24 hours
};

const canProcessEmailQueue = () =>
  process.env.NODE_ENV === "production" || process.env.EMAIL_QUEUE_ENABLED === "true";

// ============================================
// HELPER FUNCTIONS
// ============================================

const replaceTemplateVariables = (htmlContent, variables) => {
  if (!htmlContent) return "";
  // Matches: {{key}}, {{ key }}, &#123;&#123;key&#125;&#125;
  const variableRegex = /(?:\{\{|&#123;&#123;|&#x7B;&#x7B;)\s*([a-zA-Z0-9_]+)\s*(?:\}\}|&#125;&#125;|&#x7D;&#x7D;)/gi;
  return htmlContent.replace(variableRegex, (match, key) => {
    const lookupKey = key.toLowerCase();
    if (variables[key] !== undefined && variables[key] !== null) return String(variables[key]);
    if (variables[lookupKey] !== undefined && variables[lookupKey] !== null) return String(variables[lookupKey]);
    return "";
  });
};

const log = (emoji, message, data = null) => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`${emoji} [${timestamp}] ${message}`, JSON.stringify(data));
  } else {
    console.log(`${emoji} [${timestamp}] ${message}`);
  }
};

const parseEmailList = (value) => String(value || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

async function getInventoryAlertRecipients() {
  // Only send to admin email of this Inventory stock updates.
  return parseEmailList(process.env.ADMIN_EMAIL).slice(0, 1);
}

function getInventoryAlertSubject(events) {
  const counts = (events || []).reduce((acc, event) => {
    acc[event.status] = (acc[event.status] || 0) + 1;
    return acc;
  }, {});

  const total = events?.length || 0;
  if (counts.out_of_stock) {
    return `9RX Inventory Alert: ${counts.out_of_stock} out of stock, ${total} total affected`;
  }
  if (counts.critical) {
    return `9RX Inventory Alert: ${counts.critical} critical, ${total} total affected`;
  }
  return `9RX Inventory Alert: ${total} product${total === 1 ? "" : "s"} very low`;
}

async function isInventoryAlertInCooldown() {
  const cooldownMinutes = Number.isFinite(CONFIG.inventoryAlertCooldownMinutes)
    ? CONFIG.inventoryAlertCooldownMinutes
    : 30;

  if (cooldownMinutes <= 0) {
    return false;
  }

  const cutoffTime = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("email_queue")
    .select("id, status, created_at, sent_at")
    .eq("email_type", "inventory_alert")
    .in("status", ["pending", "processing", "sent"])
    .gte("created_at", cutoffTime)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    log("⚠️", `Inventory alert cooldown check failed: ${error.message}`);
    return true;
  }

  return Array.isArray(data) && data.length > 0;
}

function classifyInventoryStock(stockValue) {
  const stock = Number(stockValue || 0);

  if (stock <= 0) {
    return { status: "out_of_stock", threshold: 0 };
  }

  if (stock < 20) {
    return { status: "very_low", threshold: 20 };
  }

  if (stock <= 50) {
    return { status: "critical", threshold: 50 };
  }

  return null;
}

const inventoryStatusRank = {
  out_of_stock: 3,
  very_low: 2,
  critical: 1,
};

function buildInventorySizeLabel(size) {
  const unitToggle = size.products?.unitToggle === true;
  const parts = [
    size.size_name,
    size.size_value,
    unitToggle ? size.size_unit : "",
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.join(" ") || "Default";
}

function mapProductSizeToInventoryItem(size) {
  const alert = classifyInventoryStock(size.stock);
  if (!alert) return null;

  return {
    product_id: size.product_id,
    product_size_id: size.id,
    product_name: size.products?.name || "Unknown product",
    size_label: buildInventorySizeLabel(size),
    size_name: size.size_name || "",
    size_value: size.size_value || "",
    size_unit: size.size_unit || "",
    unitToggle: size.products?.unitToggle === true,
    sku: size.sku || size.products?.sku || "N/A",
    previous_stock: null,
    current_stock: Number(size.stock || 0),
    threshold: alert.threshold,
    status: alert.status,
    source: "product_size_stock_snapshot",
  };
}

async function fetchCurrentAffectedInventoryItems() {
  const { data, error } = await supabase
    .from("product_sizes")
    .select(`
      id,
      product_id,
      size_name,
      size_value,
      size_unit,
      sku,
      stock,
      is_active,
      products!inner (
        id,
        name,
        sku,
        unitToggle,
        is_active
      )
    `)
    .lte("stock", 50)
    .order("stock", { ascending: true })
    .limit(500);

  if (error) throw error;

  return (data || [])
    .filter((size) => size.is_active !== false && size.products?.is_active !== false)
    .map(mapProductSizeToInventoryItem)
    .filter(Boolean);
}

async function getInventoryAlertStateMap(productSizeIds) {
  const ids = [...new Set((productSizeIds || []).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("inventory_alert_state")
    .select("*")
    .in("product_size_id", ids);

  if (error) throw error;

  return new Map((data || []).map((row) => [row.product_size_id, row]));
}

function shouldNotifyInventoryItem(item, state) {
  if (!state) return true;
  if (state.resolved_at) return true;
  if (state.last_status !== item.status) return true;

  const previousRank = inventoryStatusRank[state.last_status] || 0;
  const currentRank = inventoryStatusRank[item.status] || 0;
  return currentRank > previousRank;
}

function sortInventoryItemsBySeverity(items) {
  return [...items].sort((a, b) => {
    const rankDiff = (inventoryStatusRank[b.status] || 0) - (inventoryStatusRank[a.status] || 0);
    if (rankDiff !== 0) return rankDiff;
    return Number(a.current_stock || 0) - Number(b.current_stock || 0);
  });
}

async function upsertInventoryAlertState(items, queueId, eventIdByProductSizeId = new Map()) {
  if (!items.length) return;

  const now = new Date().toISOString();
  const rows = items.map((item) => ({
    product_size_id: item.product_size_id,
    product_id: item.product_id,
    last_status: item.status,
    last_stock: item.current_stock,
    last_email_queue_id: queueId,
    last_event_id: eventIdByProductSizeId.get(item.product_size_id) || null,
    last_notified_at: now,
    resolved_at: null,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("inventory_alert_state")
    .upsert(rows, { onConflict: "product_size_id" });

  if (error) throw error;
}

async function syncCampaignDeliveryStatus(campaignId) {
  if (!campaignId) return;

  const { data: queueRows, error } = await supabase
    .from("email_queue")
    .select("status")
    .eq("campaign_id", campaignId);

  if (error) return;

  const counts = (queueRows || []).reduce((acc, row) => {
    const key = row.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sentCount = counts.sent || 0;
  const pendingCount = (counts.pending || 0) + (counts.processing || 0);
  const failedCount = counts.failed || 0;

  let status = "sending";
  if (pendingCount === 0) {
    status = sentCount > 0 ? "sent" : failedCount > 0 ? "failed" : "draft";
  }

  await supabase
    .from("email_campaigns")
    .update({
      sent_count: sentCount,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", campaignId);
}

async function syncAutomationExecutionStatus(queueId, status, providerMessageId = null) {
  if (!queueId || !["completed", "failed", "processing"].includes(status)) return;

  const update = {
    status,
    email_queue_id: queueId,
  };

  if (status === "completed") {
    update.executed_at = new Date().toISOString();
    if (providerMessageId) {
      update.provider_message_id = providerMessageId;
    }
  }

  if (status === "failed") {
    update.executed_at = null;
  }

  await supabase
    .from("automation_executions")
    .update(update)
    .eq("email_queue_id", queueId)
    .in("status", ["pending", "processing"]);
}

/**
 * Format cart items HTML - Handle both simple items and items with sizes
 * @param {Array} cartItems - Array of cart items
 * @returns {Object} - { html, total, itemCount }
 */
const formatCartItemsForEmail = (cartItems) => {
  let cartItemsHtml = '';
  let calculatedTotal = 0;
  let totalItemCount = 0;
  
  if (!cartItems || !Array.isArray(cartItems)) {
    return { html: '', total: 0, itemCount: 0 };
  }
  
  cartItems.forEach((item) => {
    if (item.sizes && Array.isArray(item.sizes)) {
      // Item has sizes (like the cart structure we saw)
      item.sizes.forEach(size => {
        const sizeTotal = (size.quantity || 0) * (size.price || 0);
        calculatedTotal += sizeTotal;
        totalItemCount++;
        cartItemsHtml += `
          <div style="border-bottom:1px solid #eee; padding:10px 0;">
            <strong>${item.name || item.product_name || "Product"} - ${size.size_value || ''} ${item.unitToggle ? (size.size_unit || '') : ''}</strong>
            <div style="color:#666; font-size:14px;">Qty: ${size.quantity} Ã— $${(size.price || 0).toFixed(2)} = $${sizeTotal.toFixed(2)}</div>
          </div>
        `;
      });
    } else {
      // Simple item structure
      const itemTotal = (item.quantity || 0) * (item.price || 0);
      calculatedTotal += itemTotal;
      totalItemCount++;
      cartItemsHtml += `
        <div style="border-bottom:1px solid #eee; padding:10px 0;">
          <strong>${item.name || item.product_name || "Product"}</strong>
          <div style="color:#666; font-size:14px;">Qty: ${item.quantity} Ã— $${(item.price || 0).toFixed(2)} = $${itemTotal.toFixed(2)}</div>
        </div>
      `;
    }
  });
  
  return { html: cartItemsHtml, total: calculatedTotal, itemCount: totalItemCount };
};

// ============================================
// DUPLICATE EMAIL PREVENTION
// ============================================
/**
 * Check if a similar email was already sent/queued recently
 * @param {string} email - Recipient email
 * @param {string} automationId - Automation ID
 * @param {string} triggerType - Type of email (abandoned_cart, inactive_user, etc.)
 * @param {string} userId - User ID (optional)
 * @returns {Promise<boolean>} - true if duplicate exists, false if safe to send
 */
async function isDuplicateEmail(email, automationId, triggerType, userId = null) {
  try {
    const cutoffTime = new Date(Date.now() - CONFIG.duplicateCheckHours * 60 * 60 * 1000).toISOString();
    
    // LAYER 1: Check email_queue for pending/processing/sent emails with SAME automation
    let queueQuery = supabase
      .from("email_queue")
      .select("id, status, created_at")
      .eq("to_email", email)
      .in("status", ["pending", "processing", "sent"]);
    
    // If automation_id provided, check for same automation
    if (automationId) {
      queueQuery = queueQuery.eq("automation_id", automationId);
    }
    
    const { data: queuedEmails, error: queueError } = await queueQuery.limit(1);

    if (queueError) {
      log("⚠️", `Duplicate check queue error: ${queueError.message}`);
      return true; // Block if check fails (safer)
    }

    if (queuedEmails && queuedEmails.length > 0) {
      log("🚫", `DUPLICATE BLOCKED: ${email} already in queue (status: ${queuedEmails[0].status}, automation: ${automationId})`);
      return true;
    }

    // LAYER 2: Check email_logs for recently sent emails with same automation
    let logsQuery = supabase
      .from("email_logs")
      .select("id, sent_at")
      .eq("email_address", email)
      .eq("status", "sent")
      .gte("sent_at", cutoffTime);
    
    if (automationId) {
      logsQuery = logsQuery.eq("automation_id", automationId);
    }
    
    const { data: sentEmails, error: logError } = await logsQuery.limit(1);

    if (logError) {
      log("⚠️", `Duplicate check logs error: ${logError.message}`);
      return true; // Block if check fails
    }

    if (sentEmails && sentEmails.length > 0) {
      log("🚫", `DUPLICATE BLOCKED: ${email} already sent in last 24h (automation: ${automationId})`);
      return true;
    }

    // LAYER 3: Check automation_executions for this user + automation
    if (userId && automationId) {
      const { data: executions, error: execError } = await supabase
        .from("automation_executions")
        .select("id, executed_at")
        .eq("automation_id", automationId)
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("executed_at", cutoffTime)
        .limit(1);

      if (!execError && executions && executions.length > 0) {
        log("🚫", `DUPLICATE BLOCKED: Execution already exists for user ${userId} (automation: ${automationId})`);
        return true;
      }
    }

    return false; // No duplicate found, safe to send
  } catch (error) {
    log("❌", `Duplicate check error: ${error.message}`);
    return true; // Block if check fails (safer for production)
  }
}

// ============================================
// 1. PROCESS EMAIL QUEUE
// ============================================
async function processEmailQueue() {
  const results = { processed: 0, sent: 0, failed: 0 };

  if (!canProcessEmailQueue()) {
    log("⏸️", `Email queue processing skipped in NODE_ENV=${process.env.NODE_ENV || "undefined"}`);
    return { ...results, skipped: true };
  }

  try {
    const now = new Date().toISOString();

    // Get pending emails that are due to send
    const { data: pendingEmails, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(CONFIG.queueBatchSize);

    if (error) throw error;
    if (!pendingEmails || pendingEmails.length === 0) return results;

    log("📧", `Processing ${pendingEmails.length} queued emails...`);

    for (const queuedEmail of pendingEmails) {
      results.processed++;
      const recipientEmail = queuedEmail.to_email || queuedEmail.email;

      // Mark as processing (simple update)
      const { error: updateError } = await supabase
        .from("email_queue")
        .update({ status: "processing", last_attempt_at: new Date().toISOString() })
        .eq("id", queuedEmail.id)
        .eq("status", "pending");

      if (updateError) {
        log("❌", `Update error for ${recipientEmail}: ${updateError.message}`);
        continue;
      }

      // Verify status changed
      const { data: verifyStatus } = await supabase
        .from("email_queue")
        .select("status")
        .eq("id", queuedEmail.id)
        .single();

      if (!verifyStatus || verifyStatus.status !== "processing") {
        log("⏭️", `Skipping ${recipientEmail} - already picked by another process`);
        continue;
      }

      if (queuedEmail.automation_id) {
        await syncAutomationExecutionStatus(queuedEmail.id, "processing");
      }

      try {
        // Prepare variables for substitution
        const metadata = queuedEmail.metadata || {};
        
        // Base variables from metadata
        const variables = {
          ...metadata,
          email: recipientEmail,
          user_name: metadata.first_name
            ? `${metadata.first_name} ${metadata.last_name || ""}`.trim()
            : metadata.user_name || "Valued Customer",
          userName: metadata.first_name
            ? `${metadata.first_name} ${metadata.last_name || ""}`.trim()
            : metadata.user_name || "Valued Customer",
          name: metadata.first_name || metadata.user_name || "Valued Customer",
          first_name: metadata.first_name || "",
          last_name: metadata.last_name || "",
          unsubscribe_url: `${process.env.APP_URL || "https://9rx.com"}/api/email/unsubscribe?t=${metadata.tracking_id || ""}&e=${encodeURIComponent(recipientEmail || "")}`,
          company_name: "9RX",
          current_year: new Date().getFullYear().toString(),
          shop_url: "https://9rx.com/pharmacy/products",
          
          // Order-related variables (from metadata or empty)
          order_number: metadata.order_number || "",
          order_total: metadata.order_total || "",
          order_items: metadata.order_items || "",
          order_url: metadata.order_url || "https://9rx.com/pharmacy/orders",
          subtotal: metadata.subtotal || "",
          shipping: metadata.shipping || "",
          tracking_number: metadata.tracking_number || "",
          tracking_url: metadata.tracking_url || "",
          
          // Cart-related variables
          cart_items: metadata.cart_items || "",
          cart_total: metadata.cart_total || "",
          cart_url: metadata.cart_url || "https://9rx.com/pharmacy/order/create",
          item_count: metadata.item_count || "0",
          
          // Promo-related variables
          promo_title: metadata.promo_title || "",
          promo_code: metadata.promo_code || "",
          promo_description: metadata.promo_description || "",
          discount_text: metadata.discount_text || "",
          featured_products: metadata.featured_products || "",
          expiry_date: metadata.expiry_date || "",
          
          // Restock variables
          restock_items: metadata.restock_items || "",
          reorder_url: metadata.reorder_url || "https://9rx.com/pharmacy/products",
        };

        const htmlContent = replaceTemplateVariables(queuedEmail.html_content, variables);
        const subject = replaceTemplateVariables(queuedEmail.subject, variables);
        const sendResult = await mailSender(recipientEmail, subject, htmlContent);

        if (sendResult.success) {
          // CRITICAL: Update queue status to sent - MUST succeed
          const { error: updateError } = await supabase
            .from("email_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: sendResult.messageId,
              attempts: (queuedEmail.attempts || 0) + 1,
            })
            .eq("id", queuedEmail.id);

          if (updateError) {
            log("❌", `CRITICAL: Failed to mark email as sent for ${recipientEmail}: ${updateError.message}`);
            // Even if update fails, email was sent - log it anyway
          } else {
            log("✅", `Email sent & marked: ${recipientEmail}`);
          }

          // Log the email (this creates the record that prevents duplicates)
          const { error: logError } = await supabase.from("email_logs").insert({
            user_id: metadata.user_id || null,
            email_address: recipientEmail,
            subject: subject,
            email_type: queuedEmail.campaign_id ? "campaign" : queuedEmail.automation_id ? "automation" : "transactional",
            status: "sent",
            campaign_id: queuedEmail.campaign_id || null,
            automation_id: queuedEmail.automation_id || null,
            template_id: queuedEmail.template_id || null,
            provider_message_id: sendResult.messageId,
            tracking_id: metadata.tracking_id || null,
            sent_at: new Date().toISOString(),
          });

          if (logError) {
            log("⚠️", `Failed to log email for ${recipientEmail}: ${logError.message}`);
          }

          // Update campaign sent count
          if (queuedEmail.campaign_id) {
            await syncCampaignDeliveryStatus(queuedEmail.campaign_id);
          }

          // Update automation sent count
          if (queuedEmail.automation_id) {
            await syncAutomationExecutionStatus(queuedEmail.id, "completed", sendResult.messageId);

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
        const newAttempts = (queuedEmail.attempts || 0) + 1;
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
        log("❌", `Failed to send to ${recipientEmail}: ${sendError.message}`);

        if (queuedEmail.campaign_id) {
          await syncCampaignDeliveryStatus(queuedEmail.campaign_id);
        }

        if (queuedEmail.automation_id && !shouldRetry) {
          await syncAutomationExecutionStatus(queuedEmail.id, "failed");
        }
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (results.sent > 0 || results.failed > 0) {
      log("✅", `Queue processed: ${results.sent} sent, ${results.failed} failed`);
    }
  } catch (error) {
    log("❌", "Queue processing error:", error.message);
  }

  return results;
}

// ============================================
// 2. RETRY FAILED EMAILS
// ============================================
async function retryFailedEmails() {
  try {
    const { data, error } = await supabase
      .from("email_queue")
      .update({ status: "pending" })
      .eq("status", "failed")
      .lt("attempts", 3)
      .lte("next_retry_at", new Date().toISOString())
      .select("id");

    if (error) throw error;
    if (data && data.length > 0) {
      log("🔄", `Retrying ${data.length} failed emails`);
    }
    return data?.length || 0;
  } catch (error) {
    log("❌", "Retry failed emails error:", error.message);
    return 0;
  }
}

// ============================================
// 2B. PROCESS INVENTORY STOCK ALERT EVENTS
// ============================================
async function processInventoryStockAlerts() {
  const results = { processed: 0, queued: 0, failed: 0, recipients: 0, skippedCooldown: false, mode: "group" };
  let lockedEventIds = [];
  let lockedEventsForRetry = [];

  try {
    await syncQueuedInventoryAlertEvents();

    const { data: pendingEvents, error } = await supabase
      .from("inventory_alert_events")
      .select("*")
      .eq("status_state", "pending")
      .lte("created_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(CONFIG.inventoryAlertBatchSize);

    if (error) throw error;
    const currentItems = await fetchCurrentAffectedInventoryItems();
    if ((!pendingEvents || pendingEvents.length === 0) && currentItems.length === 0) return results;

    const stateMap = await getInventoryAlertStateMap(currentItems.map((item) => item.product_size_id));
    const currentItemByProductSizeId = new Map(currentItems.map((item) => [item.product_size_id, item]));
    const pendingEventByProductSizeId = new Map(
      (pendingEvents || [])
        .filter((event) => event.product_size_id)
        .map((event) => [event.product_size_id, event])
    );

    const staleEventIds = (pendingEvents || [])
      .filter((event) => {
        const currentItem = currentItemByProductSizeId.get(event.product_size_id);
        if (!currentItem) return true;
        return !shouldNotifyInventoryItem(currentItem, stateMap.get(event.product_size_id));
      })
      .map((event) => event.id);

    if (staleEventIds.length > 0) {
      await supabase
        .from("inventory_alert_events")
        .update({
          status_state: "cancelled",
          processed_at: new Date().toISOString(),
          error_message: "Inventory alert already covered or stock recovered",
          updated_at: new Date().toISOString(),
        })
        .in("id", staleEventIds)
        .eq("status_state", "pending");
    }

    const unnotifiedItems = sortInventoryItemsBySeverity(
      currentItems.filter((item) => shouldNotifyInventoryItem(item, stateMap.get(item.product_size_id)))
    );

    if (unnotifiedItems.length === 0) return results;

    const cooldownActive = await isInventoryAlertInCooldown();
    let itemsToQueue = unnotifiedItems.slice(0, CONFIG.inventoryAlertBatchSize);

    if (cooldownActive) {
      results.mode = "single";
      results.skippedCooldown = true;

      const pendingProductSizeIds = new Set((pendingEvents || []).map((event) => event.product_size_id).filter(Boolean));
      const focusedItem = unnotifiedItems.find((item) => pendingProductSizeIds.has(item.product_size_id));

      if (!focusedItem) {
        log("⏳", `Inventory stock alert cooldown active; no new product-size alert is ready`);
        return results;
      }

      itemsToQueue = [focusedItem];
      log("⏳", `Inventory stock alert cooldown active; queueing one focused product alert`);
    }

    const eventIds = itemsToQueue
      .map((item) => pendingEventByProductSizeId.get(item.product_size_id)?.id)
      .filter(Boolean);

    let lockedEvents = [];
    if (eventIds.length > 0) {
      const { data, error: lockError } = await supabase
        .from("inventory_alert_events")
        .update({
          status_state: "processing",
          last_attempt_at: new Date().toISOString(),
        })
        .in("id", eventIds)
        .eq("status_state", "pending")
        .select("*");

      if (lockError) throw lockError;
      lockedEvents = data || [];
    }

    lockedEventIds = lockedEvents.map((event) => event.id);
    lockedEventsForRetry = lockedEvents;
    results.processed = itemsToQueue.length;

    const recipients = await getInventoryAlertRecipients();
    results.recipients = recipients.length;

    if (recipients.length === 0) {
      for (const event of lockedEvents) {
        const attempts = (event.attempts || 0) + 1;
        await supabase
          .from("inventory_alert_events")
          .update({
            status_state: attempts < (event.max_attempts || 3) ? "failed" : "cancelled",
            attempts,
            next_retry_at: attempts < (event.max_attempts || 3)
              ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString()
              : null,
            error_message: "No inventory alert recipients configured",
            updated_at: new Date().toISOString(),
          })
          .eq("id", event.id);
      }

      results.failed = lockedEvents.length;
      log("⚠️", "Inventory stock alert skipped: no recipients configured");
      return results;
    }

    const htmlContent = inventoryStockAlertTemplate({
      items: itemsToQueue,
      generatedAt: new Date(),
    });
    const subject = getInventoryAlertSubject(itemsToQueue);
    const trackingId = crypto.randomUUID();
    const metadata = {
      tracking_id: trackingId,
      inventory_alert_event_ids: lockedEvents.map((event) => event.id),
      inventory_alert_mode: cooldownActive ? "single" : "group",
      product_size_ids: itemsToQueue.map((item) => item.product_size_id),
      alert_count: itemsToQueue.length,
      alert_statuses: itemsToQueue.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}),
    };

    const queueRows = recipients.map((email) => ({
      to_email: email,
      to_name: "9RX Inventory Team",
      subject,
      html_content: htmlContent,
      text_content: `9RX inventory alert: ${itemsToQueue.length} product(s) need attention.`,
      email_type: "inventory_alert",
      priority: 20,
      scheduled_at: new Date().toISOString(),
      status: "pending",
      attempts: 0,
      max_attempts: 3,
      metadata,
    }));

    const { data: queuedEmails, error: queueError } = await supabase
      .from("email_queue")
      .insert(queueRows)
      .select("id");

    if (queueError) throw queueError;

    const firstQueueId = queuedEmails?.[0]?.id || null;
    const eventIdByProductSizeId = new Map(lockedEvents.map((event) => [event.product_size_id, event.id]));

    await upsertInventoryAlertState(itemsToQueue, firstQueueId, eventIdByProductSizeId);

    if (lockedEvents.length > 0) {
      await supabase
        .from("inventory_alert_events")
        .update({
          status_state: "queued",
          email_queue_id: firstQueueId,
          processed_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .in("id", lockedEvents.map((event) => event.id));
    }

    results.queued = itemsToQueue.length;
    log("📦", `Inventory stock alert ${results.mode} email queued for ${recipients.length} recipient(s): ${itemsToQueue.length} product(s)`);
  } catch (error) {
    results.failed = results.processed || 0;
    log("❌", "Inventory stock alert processing error:", error.message);

    if (lockedEventIds.length > 0) {
      try {
        for (const event of lockedEventsForRetry) {
          const attempts = (event.attempts || 0) + 1;
          await supabase
            .from("inventory_alert_events")
            .update({
              status_state: attempts < (event.max_attempts || 3) ? "failed" : "cancelled",
              attempts,
              next_retry_at: attempts < (event.max_attempts || 3)
                ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString()
                : null,
              error_message: error.message,
              updated_at: new Date().toISOString(),
            })
            .eq("id", event.id)
            .eq("status_state", "processing");
        }
      } catch (updateError) {
        log("❌", "Failed to mark inventory alerts as failed:", updateError.message);
      }
    }
  }

  return results;
}

async function syncQueuedInventoryAlertEvents() {
  try {
    const { data: queuedEvents, error } = await supabase
      .from("inventory_alert_events")
      .select("id, email_queue_id, attempts, max_attempts")
      .eq("status_state", "queued")
      .not("email_queue_id", "is", null)
      .limit(100);

    if (error) throw error;
    if (!queuedEvents || queuedEvents.length === 0) return { sent: 0, failed: 0 };

    const queueIds = [...new Set(queuedEvents.map((event) => event.email_queue_id).filter(Boolean))];
    const { data: queueRows, error: queueError } = await supabase
      .from("email_queue")
      .select("id, status, error_message")
      .in("id", queueIds);

    if (queueError) throw queueError;

    const queueStatusById = new Map((queueRows || []).map((row) => [row.id, row]));
    const sentIds = [];
    const failedEvents = [];

    for (const event of queuedEvents) {
      const queueRow = queueStatusById.get(event.email_queue_id);
      if (!queueRow) continue;

      if (queueRow.status === "sent") {
        sentIds.push(event.id);
      } else if (queueRow.status === "failed" || queueRow.status === "cancelled") {
        failedEvents.push({
          id: event.id,
          attempts: event.attempts,
          max_attempts: event.max_attempts,
          error: queueRow.error_message || `Email queue ${queueRow.status}`,
        });
      }
    }

    if (sentIds.length > 0) {
      await supabase
        .from("inventory_alert_events")
        .update({
          status_state: "sent",
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", sentIds);
    }

    for (const event of failedEvents) {
      const attempts = (event.attempts || 0) + 1;
      const maxAttempts = event.max_attempts || 3;
      await supabase
        .from("inventory_alert_events")
        .update({
          status_state: attempts < maxAttempts ? "failed" : "cancelled",
          attempts,
          next_retry_at: attempts < maxAttempts
            ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString()
            : null,
          error_message: event.error,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    }

    if (failedEvents.length > 0) {
      const failedQueueIds = [...new Set(
        failedEvents
          .map((event) => queuedEvents.find((queuedEvent) => queuedEvent.id === event.id)?.email_queue_id)
          .filter(Boolean)
      )];

      if (failedQueueIds.length > 0) {
        await supabase
          .from("inventory_alert_state")
          .update({
            last_email_queue_id: null,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in("last_email_queue_id", failedQueueIds);
      }
    }

    return { sent: sentIds.length, failed: failedEvents.length };
  } catch (error) {
    log("❌", "Inventory alert status sync error:", error.message);
    return { sent: 0, failed: 0 };
  }
}

async function retryFailedInventoryStockAlerts() {
  try {
    const { data, error } = await supabase
      .from("inventory_alert_events")
      .update({ status_state: "pending" })
      .eq("status_state", "failed")
      .lt("attempts", 3)
      .lte("next_retry_at", new Date().toISOString())
      .select("id");

    if (error) throw error;
    if (data && data.length > 0) {
      log("🔄", `Retrying ${data.length} inventory stock alert event(s)`);
    }
    return data?.length || 0;
  } catch (error) {
    log("❌", "Retry inventory stock alerts error:", error.message);
    return 0;
  }
}

// ============================================
// 3. CHECK ABANDONED CARTS
// ============================================
async function checkAbandonedCarts() {
  let triggered = 0;

  try {
    // Get active abandoned cart automations
    const { data: automations, error: autoError } = await supabase
      .from("email_automations")
      .select("*")
      .eq("trigger_type", "abandoned_cart")
      .eq("is_active", true);

    if (autoError) throw autoError;
    if (!automations || automations.length === 0) {
      return { triggered: 0 };
    }

    for (const automation of automations) {
      const delayHours = automation.trigger_conditions?.delay_hours || 1;
      const minCartValue = automation.trigger_conditions?.min_cart_value || 0;
      const cutoffTime = new Date(Date.now() - delayHours * 60 * 60 * 1000).toISOString();

      // Find abandoned carts
      const { data: carts, error: cartError } = await supabase
        .from("carts")
        .select(`
          id, user_id, total, items, updated_at,
          profiles!inner (id, email, first_name, last_name)
        `)
        .eq("status", "active")
        .lt("updated_at", cutoffTime)
        .is("abandoned_email_sent_at", null)
        .gte("total", minCartValue);

      if (cartError || !carts || carts.length === 0) continue;

      log("🛒", `Found ${carts.length} abandoned carts for automation: ${automation.name}`);

      for (const cart of carts) {
        const profile = cart.profiles;
        if (!profile?.email) continue;

        // CHECK FOR DUPLICATE EMAIL - Prevent sending same email again
        const isDuplicate = await isDuplicateEmail(profile.email, automation.id, "abandoned_cart", cart.user_id);
        if (isDuplicate) {
          log("⏭️", `Skipping ${profile.email} - duplicate email prevention`);
          // Mark cart as processed to avoid checking again
          await supabase
            .from("carts")
            .update({ abandoned_email_sent_at: new Date().toISOString() })
            .eq("id", cart.id);
          continue;
        }

        // Check cooldown - has this user received this automation recently?
        const cooldownDate = new Date(Date.now() - automation.cooldown_days * 24 * 60 * 60 * 1000);
        const { data: recentExec } = await supabase
          .from("automation_executions")
          .select("id")
          .eq("automation_id", automation.id)
          .eq("user_id", cart.user_id)
          .eq("status", "completed")
          .gte("executed_at", cooldownDate.toISOString())
          .limit(1);

        if (recentExec && recentExec.length > 0) {
          log("⏭️", `Skipping ${profile.email} - within cooldown period`);
          continue;
        }

        // Check send limit per user
        const { count: totalSent } = await supabase
          .from("automation_executions")
          .select("*", { count: "exact", head: true })
          .eq("automation_id", automation.id)
          .eq("user_id", cart.user_id)
          .eq("status", "completed");

        if ((totalSent || 0) >= automation.send_limit_per_user) {
          log("⏭️", `Skipping ${profile.email} - send limit reached`);
          continue;
        }

        // Get template
        if (!automation.template_id) {
          log("⚠️", `Automation ${automation.name} has no template`);
          continue;
        }

        const { data: template, error: templateError } = await supabase
          .from("email_templates")
          .select("*")
          .eq("id", automation.template_id)
          .eq("is_active", true)
          .single();

        if (templateError || !template) {
          log("⚠️", `Template not found for automation ${automation.name}`);
          continue;
        }

        // Format cart items HTML using helper function
        const cartFormatted = formatCartItemsForEmail(cart.items);
        
        // Debug logging
        log("🔍", `Cart formatting debug for cart ${cart.id}:`, {
          itemsCount: cart.items?.length || 0,
          formattedItemCount: cartFormatted.itemCount,
          formattedTotal: cartFormatted.total,
          cartTotal: cart.total,
          hasHtml: cartFormatted.html.length > 0
        });

        const userName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Customer";
        const trackingId = crypto.randomUUID();

        const variables = {
          user_name: userName,
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email,
          item_count: cartFormatted.itemCount.toString(),
          cart_items: cartFormatted.html,
          cart_total: cartFormatted.total > 0 ? cartFormatted.total.toFixed(2) : (cart.total || 0).toFixed(2),
          cart_url: "https://9rx.com/pharmacy/order/create",
          unsubscribe_url: `${process.env.APP_URL || "https://9rx.com"}/api/email/unsubscribe?t=${trackingId}&e=${encodeURIComponent(profile.email)}`,
          company_name: "9RX",
          current_year: new Date().getFullYear().toString(),
        };
        
        // Debug: Log variables being used
        log("📝", `Template variables for ${profile.email}:`, {
          item_count: variables.item_count,
          cart_total: variables.cart_total,
          has_cart_items: variables.cart_items.length > 0
        });

        const subject = replaceTemplateVariables(template.subject, variables);
        const htmlContent = replaceTemplateVariables(template.html_content, variables);

        // CHECK: Is this email already in queue (pending/sent)?
        const { data: existingEmail } = await supabase
          .from("email_queue")
          .select("id, status")
          .eq("to_email", profile.email)
          .eq("automation_id", automation.id)
          .in("status", ["pending", "processing", "sent"])
          .limit(1);

        if (existingEmail && existingEmail.length > 0) {
          log("🚫", `Email already in queue for ${profile.email} (status: ${existingEmail[0].status}) - SKIPPING`);
          // Mark cart anyway so we don't check again
          await supabase
            .from("carts")
            .update({ abandoned_email_sent_at: new Date().toISOString() })
            .eq("id", cart.id);
          continue;
        }

        // Queue email
        const { data: queueData, error: queueError } = await supabase.from("email_queue").insert({
          to_email: profile.email,
          to_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
          subject,
          html_content: htmlContent,
          text_content: template.text_content || null,
          automation_id: automation.id,
          template_id: automation.template_id,
          status: "pending",
          priority: 5,
          scheduled_at: new Date().toISOString(),
          metadata: {
            user_id: cart.user_id,
            tracking_id: trackingId,
            first_name: profile.first_name,
            last_name: profile.last_name,
            cart_id: cart.id,
            trigger_type: "abandoned_cart",
            // Add cart data for reference
            cart_items: cartFormatted.html,
            cart_total: cartFormatted.total > 0 ? cartFormatted.total.toFixed(2) : (cart.total || 0).toFixed(2),
            item_count: cartFormatted.itemCount.toString(),
          },
        })
        .select("id")
        .single();

        if (queueError) {
          log("❌", `Failed to queue email for ${profile.email}: ${queueError.message}`);
          continue;
        }

        // Record execution
        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          user_id: cart.user_id,
          status: "pending",
          email_queue_id: queueData?.id || null,
          trigger_data: { 
            cart_id: cart.id, 
            cart_total: cartFormatted.total > 0 ? cartFormatted.total : cart.total,
            item_count: cartFormatted.itemCount,
          },
        });

        // Mark cart as email sent
        await supabase
          .from("carts")
          .update({ abandoned_email_sent_at: new Date().toISOString() })
          .eq("id", cart.id);

        // Also mark user profile - prevents duplicate emails to same user
        await supabase
          .from("profiles")
          .update({ last_abandoned_cart_email_at: new Date().toISOString() })
          .eq("id", cart.user_id);

        triggered++;
        log("📧", `Abandoned cart email queued for ${profile.email} (Cart: $${cart.total}) - MARKED`);
      }
    }

    if (triggered > 0) {
      log("✅", `Abandoned cart check complete: ${triggered} emails queued`);
    }
  } catch (error) {
    log("❌", "Abandoned cart check error:", error.message);
  }

  return { triggered };
}

// ============================================
// 4. CHECK INACTIVE USERS
// ============================================
async function checkInactiveUsers() {
  let triggered = 0;

  try {
    // Get active inactive user automations
    const { data: automations, error: autoError } = await supabase
      .from("email_automations")
      .select("*")
      .eq("trigger_type", "inactive_user")
      .eq("is_active", true);

    if (autoError) throw autoError;
    if (!automations || automations.length === 0) {
      return { triggered: 0 };
    }

    for (const automation of automations) {
      const inactiveDays = automation.trigger_conditions?.inactive_days || 30;
      const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

      // Find inactive users
      const { data: inactiveUsers, error: userError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, last_sign_in_at")
        .lt("last_sign_in_at", cutoffDate.toISOString())
        .not("email", "is", null)
        .limit(100);

      if (userError || !inactiveUsers || inactiveUsers.length === 0) continue;

      for (const user of inactiveUsers) {
        if (!user.email) continue;

        // CHECK FOR DUPLICATE EMAIL - Prevent sending same email again
        const isDuplicate = await isDuplicateEmail(user.email, automation.id, "inactive_user", user.id);
        if (isDuplicate) {
          log("⏭️", `Skipping inactive user ${user.email} - duplicate email prevention`);
          continue;
        }

        // Check cooldown
        const cooldownDate = new Date(Date.now() - automation.cooldown_days * 24 * 60 * 60 * 1000);
        const { data: recentExec } = await supabase
          .from("automation_executions")
          .select("id")
          .eq("automation_id", automation.id)
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("executed_at", cooldownDate.toISOString())
          .limit(1);

        if (recentExec && recentExec.length > 0) continue;

        // Check send limit
        const { count: totalSent } = await supabase
          .from("automation_executions")
          .select("*", { count: "exact", head: true })
          .eq("automation_id", automation.id)
          .eq("user_id", user.id)
          .eq("status", "completed");

        if ((totalSent || 0) >= automation.send_limit_per_user) continue;

        // Get template
        if (!automation.template_id) continue;
        
        const { data: template } = await supabase
          .from("email_templates")
          .select("*")
          .eq("id", automation.template_id)
          .eq("is_active", true)
          .single();

        if (!template) continue;

        const userName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Customer";
        const trackingId = crypto.randomUUID();

        const variables = {
          user_name: userName,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          email: user.email,
          unsubscribe_url: `${process.env.APP_URL || "https://9rx.com"}/api/email/unsubscribe?t=${trackingId}&e=${encodeURIComponent(user.email)}`,
          company_name: "9RX",
          current_year: new Date().getFullYear().toString(),
        };

        const subject = replaceTemplateVariables(template.subject, variables);
        const htmlContent = replaceTemplateVariables(template.html_content, variables);

        // CHECK: Is this email already in queue (pending/sent)?
        const { data: existingEmail } = await supabase
          .from("email_queue")
          .select("id, status")
          .eq("to_email", user.email)
          .eq("automation_id", automation.id)
          .in("status", ["pending", "processing", "sent"])
          .limit(1);

        if (existingEmail && existingEmail.length > 0) {
          log("🚫", `Email already in queue for ${user.email} (status: ${existingEmail[0].status}) - SKIPPING`);
          continue;
        }

        // Queue email
        const { data: queueData, error: queueError } = await supabase.from("email_queue").insert({
          to_email: user.email,
          to_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          subject,
          html_content: htmlContent,
          text_content: template.text_content || null,
          automation_id: automation.id,
          template_id: automation.template_id,
          status: "pending",
          priority: 3,
          scheduled_at: new Date().toISOString(),
          metadata: {
            user_id: user.id,
            tracking_id: trackingId,
            first_name: user.first_name,
            last_name: user.last_name,
            trigger_type: "inactive_user",
          },
        })
        .select("id")
        .single();

        if (queueError) {
          log("❌", `Failed to queue inactive user email for ${user.email}: ${queueError.message}`);
          continue;
        }

        // Record execution
        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          user_id: user.id,
          status: "pending",
          email_queue_id: queueData?.id || null,
          trigger_data: { inactive_days: inactiveDays },
        });

        // Mark user profile - prevents duplicate "We miss you" emails
        await supabase
          .from("profiles")
          .update({ last_inactive_user_email_at: new Date().toISOString() })
          .eq("id", user.id);

        triggered++;
        log("📧", `Inactive user email queued for ${user.email} - MARKED`);
      }
    }

    if (triggered > 0) {
      log("😴", `Inactive user emails queued: ${triggered}`);
    }
  } catch (error) {
    log("❌", "Inactive user check error:", error.message);
  }

  return { triggered };
}

// ============================================
// 5. PROCESS SCHEDULED AUTOMATIONS
// ============================================
async function processScheduledAutomations() {
  let processed = 0;

  try {
    // Get pending executions
    const { data: pendingExecutions, error } = await supabase
      .from("automation_executions")
      .select(`*, email_automations (*)`)
      .eq("status", "pending")
      .limit(100);

    if (error || !pendingExecutions || pendingExecutions.length === 0) {
      return { processed: 0 };
    }

    for (const execution of pendingExecutions) {
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

      // Get template
      if (!automation.template_id) {
        await supabase
          .from("automation_executions")
          .update({ status: "skipped", skip_reason: "No template" })
          .eq("id", execution.id);
        continue;
      }

      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", automation.template_id)
        .eq("is_active", true)
        .single();

      if (!template) {
        await supabase
          .from("automation_executions")
          .update({ status: "skipped", skip_reason: "Template not found" })
          .eq("id", execution.id);
        continue;
      }

      const triggerData = execution.trigger_data || {};
      const trackingId = crypto.randomUUID();

      const variables = {
        user_name: triggerData.userName || triggerData.user_name || "Customer",
        first_name: triggerData.first_name || "",
        last_name: triggerData.last_name || "",
        email: triggerData.email,
        ...triggerData,
        unsubscribe_url: `${process.env.APP_URL || "https://9rx.com"}/api/email/unsubscribe?t=${trackingId}&e=${encodeURIComponent(triggerData.email || "")}`,
        company_name: "9RX",
        current_year: new Date().getFullYear().toString(),
      };

      const subject = replaceTemplateVariables(template.subject, variables);
      const htmlContent = replaceTemplateVariables(template.html_content, variables);

      // Queue email
      const { data: queueData, error: queueError } = await supabase
        .from("email_queue")
        .insert({
          to_email: triggerData.email,
          to_name: triggerData.userName || triggerData.user_name || triggerData.first_name || triggerData.email,
          subject,
          html_content: htmlContent,
          text_content: template.text_content || null,
          automation_id: automation.id,
          template_id: automation.template_id,
          status: "pending",
          scheduled_at: new Date().toISOString(),
          metadata: {
            user_id: execution.user_id,
            tracking_id: trackingId,
            ...triggerData,
          },
        })
        .select("id")
        .single();

      // Update execution
      await supabase
        .from("automation_executions")
        .update({ 
          status: "pending",
          email_queue_id: queueData?.id || null,
        })
        .eq("id", execution.id);

      processed++;
    }

    if (processed > 0) {
      log("⚡", `Scheduled automations processed: ${processed}`);
    }
  } catch (error) {
    log("❌", "Scheduled automation error:", error.message);
  }

  return { processed };
}

// ============================================
// 6. CLEANUP OLD DATA
// ============================================
async function cleanupOldData() {
  try {
    const queueCutoff = new Date(Date.now() - CONFIG.cleanupQueueDays * 24 * 60 * 60 * 1000).toISOString();
    const eventsCutoff = new Date(Date.now() - CONFIG.cleanupEventsDays * 24 * 60 * 60 * 1000).toISOString();

    // Clean old sent/failed queue items
    const { data: queueData } = await supabase
      .from("email_queue")
      .delete()
      .in("status", ["sent", "failed", "cancelled"])
      .lt("created_at", queueCutoff)
      .select("id");

    // Clean old tracking events
    const { data: eventsData } = await supabase
      .from("email_tracking_events")
      .delete()
      .lt("occurred_at", eventsCutoff)
      .select("id");

    // Clean processed webhooks
    const { data: webhooksData } = await supabase
      .from("email_webhook_events")
      .delete()
      .eq("processed", true)
      .lt("received_at", queueCutoff)
      .select("id");

    const queueCleaned = queueData?.length || 0;
    const eventsCleaned = eventsData?.length || 0;
    const webhooksCleaned = webhooksData?.length || 0;

    if (queueCleaned > 0 || eventsCleaned > 0 || webhooksCleaned > 0) {
      log("🧹", `Cleanup: ${queueCleaned} queue, ${eventsCleaned} events, ${webhooksCleaned} webhooks`);
    }

    return { queueCleaned, eventsCleaned, webhooksCleaned };
  } catch (error) {
    log("❌", "Cleanup error:", error.message);
    return { queueCleaned: 0, eventsCleaned: 0, webhooksCleaned: 0 };
  }
}

// ============================================
// 7. TRIGGER EVENT-BASED AUTOMATIONS
// ============================================
/**
 * Trigger automation for a specific event
 * @param {string} triggerType - Type of trigger (welcome, order_placed, order_shipped, etc.)
 * @param {object} eventData - Data about the event
 * @returns {Promise<{triggered: number, errors: string[]}>}
 */
async function triggerAutomation(triggerType, eventData) {
  const results = { triggered: 0, errors: [] };

  try {
    // Get active automations for this trigger type
    const { data: automations, error: autoError } = await supabase
      .from("email_automations")
      .select("*")
      .eq("trigger_type", triggerType)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (autoError) throw autoError;
    if (!automations || automations.length === 0) {
      log("ℹ️", `No active automations for trigger: ${triggerType}`);
      return results;
    }

    const { email, userId, firstName, lastName, ...extraData } = eventData;

    if (!email) {
      results.errors.push("Email is required");
      return results;
    }

    for (const automation of automations) {
      try {
        // Check for duplicate
        const isDuplicate = await isDuplicateEmail(email, automation.id, triggerType, userId);
        if (isDuplicate) {
          log("⏭️", `Skipping ${email} - duplicate for ${triggerType}`);
          continue;
        }

        // Check cooldown
        if (userId && automation.cooldown_days > 0) {
          const cooldownDate = new Date(Date.now() - automation.cooldown_days * 24 * 60 * 60 * 1000);
          const { data: recentExec } = await supabase
            .from("automation_executions")
            .select("id")
            .eq("automation_id", automation.id)
            .eq("user_id", userId)
            .eq("status", "completed")
            .gte("executed_at", cooldownDate.toISOString())
            .limit(1);

          if (recentExec && recentExec.length > 0) {
            log("⏭️", `Skipping ${email} - within cooldown for ${automation.name}`);
            continue;
          }
        }

        // Check send limit
        if (userId) {
          const { count: totalSent } = await supabase
            .from("automation_executions")
            .select("*", { count: "exact", head: true })
            .eq("automation_id", automation.id)
            .eq("user_id", userId)
            .eq("status", "completed");

          if ((totalSent || 0) >= automation.send_limit_per_user) {
            log("⏭️", `Skipping ${email} - send limit reached for ${automation.name}`);
            continue;
          }
        }

        // Get template
        if (!automation.template_id) {
          log("⚠️", `Automation ${automation.name} has no template`);
          continue;
        }

        const { data: template } = await supabase
          .from("email_templates")
          .select("*")
          .eq("id", automation.template_id)
          .eq("is_active", true)
          .single();

        if (!template) {
          log("⚠️", `Template not found for automation ${automation.name}`);
          continue;
        }

        const userName = `${firstName || ""} ${lastName || ""}`.trim() || "Customer";
        const trackingId = crypto.randomUUID();
        const delayHours = automation.trigger_conditions?.delay_hours || 0;
        const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

        const variables = {
          user_name: userName,
          first_name: firstName || "",
          last_name: lastName || "",
          email: email,
          ...extraData,
          unsubscribe_url: `${process.env.APP_URL || "https://9rx.com"}/api/email/unsubscribe?t=${trackingId}&e=${encodeURIComponent(email)}`,
          company_name: "9RX",
          current_year: new Date().getFullYear().toString(),
        };

        const subject = replaceTemplateVariables(template.subject, variables);
        const htmlContent = replaceTemplateVariables(template.html_content, variables);

        // Queue email (with delay if configured)
        const { data: queueData, error: queueError } = await supabase.from("email_queue").insert({
          to_email: email,
          to_name: `${firstName || ''} ${lastName || ''}`.trim() || email,
          subject,
          html_content: htmlContent,
          text_content: template.text_content || null,
          automation_id: automation.id,
          template_id: automation.template_id,
          status: "pending",
          priority: automation.priority || 5,
          scheduled_at: scheduledAt.toISOString(),
          metadata: {
            user_id: userId,
            tracking_id: trackingId,
            first_name: firstName,
            last_name: lastName,
            trigger_type: triggerType,
            ...extraData,
          },
        })
        .select("id")
        .single();

        if (queueError) {
          results.errors.push(`Failed to queue for ${automation.name}: ${queueError.message}`);
          continue;
        }

        // Record execution
        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          user_id: userId || null,
          status: "pending",
          email_queue_id: queueData?.id || null,
          trigger_data: { email, trigger_type: triggerType, ...extraData },
        });

        results.triggered++;
        log("📧", `${triggerType} email queued for ${email} (Automation: ${automation.name})`);
      } catch (err) {
        results.errors.push(`Error in ${automation.name}: ${err.message}`);
      }
    }
  } catch (error) {
    log("❌", `Trigger automation error (${triggerType}):`, error.message);
    results.errors.push(error.message);
  }

  return results;
}

// ============================================
// 8. CHECK BIRTHDAY EMAILS
// ============================================
async function checkBirthdayEmails() {
  let triggered = 0;

  try {
    const { data: automations, error: autoError } = await supabase
      .from("email_automations")
      .select("*")
      .eq("trigger_type", "birthday")
      .eq("is_active", true);

    if (autoError) throw autoError;
    if (!automations || automations.length === 0) return { triggered: 0 };

    // Get today's date (month and day)
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    for (const automation of automations) {
      // Find users with birthday today
      const { data: users, error: userError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, date_of_birth")
        .not("email", "is", null)
        .not("date_of_birth", "is", null);

      if (userError || !users) continue;

      // Filter users whose birthday is today
      const birthdayUsers = users.filter(user => {
        if (!user.date_of_birth) return false;
        const dob = new Date(user.date_of_birth);
        return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
      });

      for (const user of birthdayUsers) {
        const result = await triggerAutomation("birthday", {
          email: user.email,
          userId: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
        });
        triggered += result.triggered;
      }
    }

    if (triggered > 0) {
      log("🎂", `Birthday emails queued: ${triggered}`);
    }
  } catch (error) {
    log("❌", "Birthday check error:", error.message);
  }

  return { triggered };
}

// ============================================
// 9. CHECK SIGNUP ANNIVERSARY EMAILS
// ============================================
async function checkSignupAnniversary() {
  let triggered = 0;

  try {
    const { data: automations, error: autoError } = await supabase
      .from("email_automations")
      .select("*")
      .eq("trigger_type", "signup_anniversary")
      .eq("is_active", true);

    if (autoError) throw autoError;
    if (!automations || automations.length === 0) return { triggered: 0 };

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    for (const automation of automations) {
      const { data: users, error: userError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, created_at")
        .not("email", "is", null);

      if (userError || !users) continue;

      // Filter users whose signup anniversary is today (at least 1 year ago)
      const anniversaryUsers = users.filter(user => {
        if (!user.created_at) return false;
        const signupDate = new Date(user.created_at);
        const yearsSinceSignup = today.getFullYear() - signupDate.getFullYear();
        return yearsSinceSignup >= 1 && 
               signupDate.getMonth() + 1 === todayMonth && 
               signupDate.getDate() === todayDay;
      });

      for (const user of anniversaryUsers) {
        const signupDate = new Date(user.created_at);
        const years = today.getFullYear() - signupDate.getFullYear();
        
        const result = await triggerAutomation("signup_anniversary", {
          email: user.email,
          userId: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          years_as_customer: years.toString(),
        });
        triggered += result.triggered;
      }
    }

    if (triggered > 0) {
      log("🎉", `Anniversary emails queued: ${triggered}`);
    }
  } catch (error) {
    log("❌", "Anniversary check error:", error.message);
  }

  return { triggered };
}

// ============================================
// 10. CHECK RESTOCK REMINDERS
// ============================================
/**
 * Check for users who might need to restock based on their purchase history
 * Analyzes order frequency and sends reminders when it's time to reorder
 */
async function checkRestockReminders() {
  let triggered = 0;

  try {
    const { data: automations, error: autoError } = await supabase
      .from("email_automations")
      .select("*")
      .eq("trigger_type", "restock_reminder")
      .eq("is_active", true);

    if (autoError) throw autoError;
    if (!automations || automations.length === 0) return { triggered: 0 };

    for (const automation of automations) {
      // Default restock interval is 30 days if not specified
      const restockDays = automation.trigger_conditions?.restock_days || 30;
      const minOrders = automation.trigger_conditions?.min_orders || 2; // Need at least 2 orders to calculate frequency

      // Find users with multiple orders to analyze purchase patterns
      const { data: orderStats, error: statsError } = await supabase
        .from("orders")
        .select(`
          profile_id,
          created_at,
          total,
          profiles!inner (id, email, first_name, last_name)
        `)
        .eq("status", "delivered")
        .order("created_at", { ascending: false });

      if (statsError || !orderStats) continue;

      // Group orders by user
      const userOrders = {};
      for (const order of orderStats) {
        const userId = order.profile_id;
        if (!userId) continue;
        
        if (!userOrders[userId]) {
          userOrders[userId] = {
            profile: order.profiles,
            orders: [],
          };
        }
        userOrders[userId].orders.push({
          date: new Date(order.created_at),
          total: order.total,
        });
      }

      // Analyze each user's purchase pattern
      for (const [userId, userData] of Object.entries(userOrders)) {
        const { profile, orders } = userData;
        
        // Need minimum orders to calculate frequency
        if (orders.length < minOrders) continue;
        if (!profile?.email) continue;

        // Calculate average days between orders
        let totalDaysBetween = 0;
        for (let i = 0; i < orders.length - 1; i++) {
          const daysBetween = (orders[i].date - orders[i + 1].date) / (1000 * 60 * 60 * 24);
          totalDaysBetween += daysBetween;
        }
        const avgDaysBetween = totalDaysBetween / (orders.length - 1);

        // Check if it's time to remind (last order was around their average purchase interval ago)
        const lastOrderDate = orders[0].date;
        const daysSinceLastOrder = (new Date() - lastOrderDate) / (1000 * 60 * 60 * 24);

        // Send reminder if days since last order is within 10% of their average interval
        // or if it exceeds the configured restock_days
        const shouldRemind = daysSinceLastOrder >= Math.min(avgDaysBetween * 0.9, restockDays);

        if (!shouldRemind) continue;

        // Check for duplicate
        const isDuplicate = await isDuplicateEmail(profile.email, automation.id, "restock_reminder", userId);
        if (isDuplicate) continue;

        // Get last ordered products for personalization
        const { data: lastOrderItems } = await supabase
          .from("order_items")
          .select(`
            quantity,
            product_name,
            products (name, image_url)
          `)
          .eq("order_id", orders[0].id)
          .limit(5);

        const productList = (lastOrderItems || [])
          .map(item => item.product_name || item.products?.name || "Product")
          .join(", ");

        const result = await triggerAutomation("restock_reminder", {
          email: profile.email,
          userId: userId,
          firstName: profile.first_name,
          lastName: profile.last_name,
          days_since_order: Math.round(daysSinceLastOrder).toString(),
          avg_order_frequency: Math.round(avgDaysBetween).toString(),
          last_products: productList,
          total_orders: orders.length.toString(),
        });

        triggered += result.triggered;
      }
    }

    if (triggered > 0) {
      log("📦", `Restock reminder emails queued: ${triggered}`);
    }
  } catch (error) {
    log("❌", "Restock reminder check error:", error.message);
  }

  return { triggered };
}

// ============================================
// 11. TRACK CONVERSION
// ============================================
/**
 * Track a conversion from an email (e.g., user made a purchase after receiving email)
 * @param {string} userId - User ID who converted
 * @param {string} orderId - Order ID (optional)
 * @param {number} orderTotal - Order total (optional)
 */
async function trackConversion(userId, orderId = null, orderTotal = null) {
  try {
    // Find recent automation executions for this user (within last 7 days)
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: executions, error } = await supabase
      .from("automation_executions")
      .select("automation_id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("executed_at", cutoffDate);

    if (error || !executions || executions.length === 0) return;

    // Get unique automation IDs
    const automationIds = [...new Set(executions.map(e => e.automation_id))];

    // Increment conversion count for each automation
    for (const automationId of automationIds) {
      const { data: automation } = await supabase
        .from("email_automations")
        .select("total_conversions")
        .eq("id", automationId)
        .single();

      if (automation) {
        await supabase
          .from("email_automations")
          .update({ total_conversions: (automation.total_conversions || 0) + 1 })
          .eq("id", automationId);
      }
    }

    log("💰", `Conversion tracked for user ${userId} - ${automationIds.length} automations credited`);
  } catch (error) {
    log("❌", "Conversion tracking error:", error.message);
  }
}

// ============================================
// 12. CUSTOMER DOCUMENT REMINDERS
// ============================================
/**
 * Check customer documents for expiry and send reminders
 * - 30 days before expiry (first reminder)
 * - 7 days before expiry (second reminder)
 * - After expired (final reminder)
 * 
 * Prevents duplicate reminders for same stage
 */
async function checkCustomerDocumentReminders() {
  try {
    log("📄", "Checking customer document reminders...");

    let emailsSent = 0;
    let notificationsCreated = 0;
    let skipped = 0;
    let checked = 0;

    // Fetch all customer documents with profile info
    const { data: documents, error: fetchError } = await supabase
      .from("customer_documents")
      .select(`
        id,
        customer_id,
        name,
        document_category,
        document_number,
        expires_at,
        reminder_days_before,
        profiles:customer_id (
          id,
          email,
          first_name,
          last_name,
          display_name
        )
      `);

    if (fetchError) {
      log("❌", "Error fetching documents:", fetchError.message);
      return { checked: 0, emailsSent: 0, notificationsCreated: 0, skipped: 0 };
    }

    if (!documents || documents.length === 0) {
      log("📄", "No documents found to check");
      return { checked: 0, emailsSent: 0, notificationsCreated: 0, skipped: 0 };
    }

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const doc of documents) {
      checked++;

      // Skip if no profile or email
      if (!doc.profiles || !doc.profiles.email) {
        skipped++;
        continue;
      }

      const profile = doc.profiles;
      let reminderType = null;
      let subject = "";
      let message = "";
      let daysLeft = null;

      // Get document category label
      const categoryLabels = {
        license: "License",
        insurance: "Insurance",
        tax_form: "Tax Form",
        id_proof: "ID Proof",
        address_proof: "Address Proof",
        other: "Document"
      };
      const categoryLabel = categoryLabels[doc.document_category] || "Document";
      const displayName = doc.name || categoryLabel;

      // Skip if no expiry date
      if (!doc.expires_at) {
        skipped++;
        continue;
      }

      // Calculate days left
      const expiryDate = new Date(doc.expires_at);
      expiryDate.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / ONE_DAY_MS);

      // Determine reminder type based on days left
      // 1. 30 days before expiry (first reminder)
      if (daysLeft === 30) {
        reminderType = "30_days_before";
        subject = `Reminder: ${displayName} expires in 30 days`;
        message = `Your ${categoryLabel} "${displayName}" will expire on ${expiryDate.toLocaleDateString()}. Please renew it within the next 30 days.`;
      }
      // 2. 7 days before expiry (second reminder)
      else if (daysLeft === 7) {
        reminderType = "7_days_before";
        subject = `Urgent: ${displayName} expires in 7 days`;
        message = `Your ${categoryLabel} "${displayName}" will expire on ${expiryDate.toLocaleDateString()}. Please renew it within the next 7 days.`;
      }
      // 3. Already expired (final reminder)
      else if (daysLeft < 0) {
        // Only send expired reminder once (check if already sent)
        const { data: expiredReminder } = await supabase
          .from("customer_document_reminder_logs")
          .select("id")
          .eq("customer_document_id", doc.id)
          .eq("reminder_type", "expired")
          .limit(1);

        if (expiredReminder && expiredReminder.length > 0) {
          skipped++;
          continue; // Already sent expired reminder
        }

        reminderType = "expired";
        subject = `Action Required: ${displayName} has expired`;
        message = `Your ${categoryLabel} "${displayName}" expired on ${expiryDate.toLocaleDateString()}. Please upload a renewed copy immediately.`;
      }

      // Skip if no reminder needed
      if (!reminderType) {
        skipped++;
        continue;
      }

      // Check for duplicate reminder (same type already sent)
      const { data: recentReminders, error: reminderCheckError } = await supabase
        .from("customer_document_reminder_logs")
        .select("id")
        .eq("customer_document_id", doc.id)
        .eq("reminder_type", reminderType)
        .limit(1);

      if (reminderCheckError) {
        log("❌", "Error checking recent reminders:", reminderCheckError.message);
        skipped++;
        continue;
      }

      // Skip if already sent this reminder type
      if (recentReminders && recentReminders.length > 0) {
        skipped++;
        continue;
      }

      // Prepare customer name
      const customerName = profile.display_name ||
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
        "Customer";

      let emailSent = false;
      let notificationSent = false;

      // Send email directly using mailSender
      try {
        const urgencyColor = reminderType === "expired" ? "#dc2626" : 
                            reminderType === "7_days_before" ? "#f59e0b" : "#3b82f6";
        
        const urgencyIcon = reminderType === "expired" ? "🚨" : 
                           reminderType === "7_days_before" ? "⚠️" : "📄";

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyColor}dd 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">${urgencyIcon} Document Reminder</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello ${customerName},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
                <p style="margin: 5px 0;"><strong>Document:</strong> ${displayName}</p>
                <p style="margin: 5px 0;"><strong>Category:</strong> ${categoryLabel}</p>
                ${doc.document_number ? `<p style="margin: 5px 0;"><strong>Number:</strong> ${doc.document_number}</p>` : ""}
                <p style="margin: 5px 0;"><strong>Expires:</strong> ${expiryDate.toLocaleDateString()}</p>
                ${daysLeft >= 0 ? `<p style="margin: 5px 0; color: ${urgencyColor}; font-weight: bold;"><strong>Days Left:</strong> ${daysLeft} days</p>` : `<p style="margin: 5px 0; color: ${urgencyColor}; font-weight: bold;"><strong>Status:</strong> EXPIRED</p>`}
              </div>
              <p style="font-size: 16px; margin-bottom: 20px;">Please sign in to your 9RX account and update the document details or upload a replacement.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://9rx.com/pharmacy/settings" style="background: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Update Document Now</a>
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you have any questions, please contact our support team.</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>© ${new Date().getFullYear()} 9RX. All rights reserved.</p>
            </div>
          </div>
        `;

        const emailResult = await mailSender(
          profile.email,
          subject,
          htmlContent
        );

        if (emailResult.success) {
          emailSent = true;
          emailsSent++;
          log("✅", `Email sent to ${profile.email} for ${displayName} (${reminderType})`);
        } else {
          log("❌", `Failed to send email to ${profile.email}:`, emailResult.error);
        }
      } catch (emailError) {
        log("❌", "Error sending email:", emailError.message);
      }

      // Create in-app notification
      try {
        const notifType = reminderType === "expired" ? "error" : "warning";
        const notifTitle = reminderType === "expired" ? "Document Expired" :
                          reminderType === "7_days_before" ? "Urgent: Document Expiring Soon" :
                          "Document Reminder";

        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: doc.customer_id,
            title: notifTitle,
            message: message,
            type: notifType,
            link: "/pharmacy/settings",
            metadata: {
              document_id: doc.id,
              reminder_type: reminderType,
              expires_at: doc.expires_at,
              days_left: daysLeft,
            },
          });

        if (!notifError) {
          notificationSent = true;
          notificationsCreated++;
        } else {
          log("❌", "Error creating notification:", notifError.message);
        }
      } catch (notifError) {
        log("❌", "Error creating notification:", notifError.message);
      }

      // Log the reminder
      try {
        const { error: logError } = await supabase
          .from("customer_document_reminder_logs")
          .insert({
            customer_document_id: doc.id,
            customer_id: doc.customer_id,
            reminder_type: reminderType,
            reminder_window_days: daysLeft !== null ? Math.abs(daysLeft) : null,
            sent_via_email: emailSent,
            sent_via_notification: notificationSent,
            metadata: {
              document_name: doc.name,
              document_category: doc.document_category || "other",
              expires_at: doc.expires_at,
              customer_email: profile.email,
              days_left: daysLeft,
            },
          });

        if (logError) {
          log("❌", "Error logging reminder:", logError.message);
        }
      } catch (logError) {
        log("❌", "Error logging reminder:", logError.message);
      }
    }

    const result = { checked, emailsSent, notificationsCreated, skipped };
    log("✅", "Document reminders processed:", result);
    return result;

  } catch (error) {
    log("❌", "Document reminder check error:", error.message);
    return { checked: 0, emailsSent: 0, notificationsCreated: 0, skipped: 0 };
  }
}

// ============================================
// MAIN CRON STARTER (UPDATED)
// ============================================
function startEmailCron() {
  if (!canProcessEmailQueue()) {
    log("⏸️", `Email Cron Service disabled in NODE_ENV=${process.env.NODE_ENV || "undefined"}. Set EMAIL_QUEUE_ENABLED=true to enable locally.`);
    return;
  }

  log("🚀", "========================================");
  log("🚀", "Email Cron Service Starting...");
  log("📋", "Configuration:", {
    queueInterval: `${CONFIG.queueInterval / 1000}s`,
    abandonedCartInterval: `${CONFIG.abandonedCartInterval / 60000}m`,
    inactiveUserInterval: `${CONFIG.inactiveUserInterval / 60000}m`,
    automationInterval: `${CONFIG.automationInterval / 1000}s`,
    retryInterval: `${CONFIG.retryInterval / 60000}m`,
    inventoryAlertInterval: `${CONFIG.inventoryAlertInterval / 1000}s`,
    inventoryAlertCooldown: `${CONFIG.inventoryAlertCooldownMinutes}m`,
  });
  log("🚀", "========================================");

  // 1. Process email queue (every 30 seconds)
  setInterval(processEmailQueue, CONFIG.queueInterval);

  // 2. Retry failed emails (every 5 minutes)
  setInterval(retryFailedEmails, CONFIG.retryInterval);

  // 2b. Convert inventory alert events into queued emails (every minute)
  setInterval(processInventoryStockAlerts, CONFIG.inventoryAlertInterval);
  setInterval(retryFailedInventoryStockAlerts, CONFIG.retryInterval);

  // 3. Check abandoned carts (every 5 minutes)
  setInterval(checkAbandonedCarts, CONFIG.abandonedCartInterval);

  // 4. Check inactive users (every hour)
  setInterval(checkInactiveUsers, CONFIG.inactiveUserInterval);

  // 5. Process scheduled automations (every minute)
  setInterval(processScheduledAutomations, CONFIG.automationInterval);

  // 6. Cleanup old data (every 24 hours)
  setInterval(cleanupOldData, CONFIG.cleanupInterval);

  // 7. Check birthdays (every hour - will only send once per day due to duplicate check)
  setInterval(checkBirthdayEmails, CONFIG.inactiveUserInterval);

  // 8. Check signup anniversaries (every hour)
  setInterval(checkSignupAnniversary, CONFIG.inactiveUserInterval);

  // 9. Check restock reminders (every 6 hours)
  setInterval(checkRestockReminders, 6 * 60 * 60 * 1000);

  // 10. Check customer document reminders (every 6 hours)
  setInterval(checkCustomerDocumentReminders, 6 * 60 * 60 * 1000);

  // Run initial checks after 5 seconds
  setTimeout(async () => {
    log("🔄", "Running initial checks...");
    await processEmailQueue();
    await processInventoryStockAlerts();
    await checkAbandonedCarts();
    await processScheduledAutomations();
    log("✅", "Initial checks complete");
  }, 5000);

  log("✅", "Email Cron Service Started Successfully");
}

module.exports = {
  startEmailCron,
  processEmailQueue,
  retryFailedEmails,
  processInventoryStockAlerts,
  retryFailedInventoryStockAlerts,
  checkAbandonedCarts,
  checkInactiveUsers,
  processScheduledAutomations,
  cleanupOldData,
  triggerAutomation,
  checkBirthdayEmails,
  checkSignupAnniversary,
  checkRestockReminders,
  trackConversion,
  checkCustomerDocumentReminders,
};
