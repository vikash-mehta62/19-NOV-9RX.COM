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
  
  // Duplicate prevention
  duplicateCheckHours: 24, // Don't send same email type to same user within 24 hours
};

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
            <strong>${item.name || item.product_name || "Product"} - ${size.size_value || ''}</strong>
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
      .eq("email", email)
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

  try {
    // Get pending emails that are due to send
    const { data: pendingEmails, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(CONFIG.queueBatchSize);

    if (error) throw error;
    if (!pendingEmails || pendingEmails.length === 0) return results;

    log("📧", `Processing ${pendingEmails.length} queued emails...`);

    for (const queuedEmail of pendingEmails) {
      results.processed++;

      // Mark as processing (simple update)
      const { error: updateError } = await supabase
        .from("email_queue")
        .update({ status: "processing", last_attempt_at: new Date().toISOString() })
        .eq("id", queuedEmail.id)
        .eq("status", "pending");

      if (updateError) {
        log("❌", `Update error for ${queuedEmail.to_email}: ${updateError.message}`);
        continue;
      }

      // Verify status changed
      const { data: verifyStatus } = await supabase
        .from("email_queue")
        .select("status")
        .eq("id", queuedEmail.id)
        .single();

      if (!verifyStatus || verifyStatus.status !== "processing") {
        log("⏭️", `Skipping ${queuedEmail.to_email} - already picked by another process`);
        continue;
      }

      try {
        // Prepare variables for substitution
        const metadata = queuedEmail.metadata || {};
        
        // Base variables from metadata
        const variables = {
          ...metadata,
          email: queuedEmail.to_email,
          user_name: metadata.first_name
            ? `${metadata.first_name} ${metadata.last_name || ""}`.trim()
            : metadata.user_name || "Valued Customer",
          userName: metadata.first_name
            ? `${metadata.first_name} ${metadata.last_name || ""}`.trim()
            : metadata.user_name || "Valued Customer",
          name: metadata.first_name || metadata.user_name || "Valued Customer",
          first_name: metadata.first_name || "",
          last_name: metadata.last_name || "",
          unsubscribe_url: `${process.env.APP_URL || "https://9rx.com"}/api/email/unsubscribe?t=${metadata.tracking_id || ""}&e=${encodeURIComponent(queuedEmail.to_email)}`,
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
        const sendResult = await mailSender(queuedEmail.to_email, subject, htmlContent);

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
            log("❌", `CRITICAL: Failed to mark email as sent for ${queuedEmail.to_email}: ${updateError.message}`);
            // Even if update fails, email was sent - log it anyway
          } else {
            log("✅", `Email sent & marked: ${queuedEmail.to_email}`);
          }

          // Log the email (this creates the record that prevents duplicates)
          const { error: logError } = await supabase.from("email_logs").insert({
            user_id: metadata.user_id || null,
            email_address: queuedEmail.to_email,
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
            log("⚠️", `Failed to log email for ${queuedEmail.to_email}: ${logError.message}`);
          }

          // Update campaign sent count
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

          // Update automation sent count
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
        log("❌", `Failed to send to ${queuedEmail.to_email}: ${sendError.message}`);
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
          .eq("email", profile.email)
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
        const { error: queueError } = await supabase.from("email_queue").insert({
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
        });

        if (queueError) {
          log("❌", `Failed to queue email for ${profile.email}: ${queueError.message}`);
          continue;
        }

        // Record execution
        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          user_id: cart.user_id,
          status: "completed",
          executed_at: new Date().toISOString(),
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
          .eq("email", user.email)
          .eq("automation_id", automation.id)
          .in("status", ["pending", "processing", "sent"])
          .limit(1);

        if (existingEmail && existingEmail.length > 0) {
          log("🚫", `Email already in queue for ${user.email} (status: ${existingEmail[0].status}) - SKIPPING`);
          continue;
        }

        // Queue email
        await supabase.from("email_queue").insert({
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
        });

        // Record execution
        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          user_id: user.id,
          status: "completed",
          executed_at: new Date().toISOString(),
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
          email: triggerData.email,
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
          status: "completed", 
          executed_at: new Date().toISOString(),
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
// MAIN CRON STARTER
// ============================================
function startEmailCron() {
  log("🚀", "========================================");
  log("🚀", "Email Cron Service Starting...");
  log("📋", "Configuration:", {
    queueInterval: `${CONFIG.queueInterval / 1000}s`,
    abandonedCartInterval: `${CONFIG.abandonedCartInterval / 60000}m`,
    inactiveUserInterval: `${CONFIG.inactiveUserInterval / 60000}m`,
    automationInterval: `${CONFIG.automationInterval / 1000}s`,
    retryInterval: `${CONFIG.retryInterval / 60000}m`,
  });
  log("🚀", "========================================");

  // 1. Process email queue (every 30 seconds)
  setInterval(processEmailQueue, CONFIG.queueInterval);

  // 2. Retry failed emails (every 5 minutes)
  setInterval(retryFailedEmails, CONFIG.retryInterval);

  // 3. Check abandoned carts (every 5 minutes)
  setInterval(checkAbandonedCarts, CONFIG.abandonedCartInterval);

  // 4. Check inactive users (every hour)
  setInterval(checkInactiveUsers, CONFIG.inactiveUserInterval);

  // 5. Process scheduled automations (every minute)
  setInterval(processScheduledAutomations, CONFIG.automationInterval);

  // 6. Cleanup old data (every 24 hours)
  setInterval(cleanupOldData, CONFIG.cleanupInterval);

  // Run initial checks after 5 seconds
  setTimeout(async () => {
    log("🔄", "Running initial checks...");
    await processEmailQueue();
    await checkAbandonedCarts();
    await processScheduledAutomations();
    log("✅", "Initial checks complete");
  }, 5000);

  log("✅", "Email Cron Service Started Successfully");
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
        const { error: queueError } = await supabase.from("email_queue").insert({
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
        });

        if (queueError) {
          results.errors.push(`Failed to queue for ${automation.name}: ${queueError.message}`);
          continue;
        }

        // Record execution
        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          user_id: userId || null,
          status: "completed",
          executed_at: new Date().toISOString(),
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
// MAIN CRON STARTER (UPDATED)
// ============================================
function startEmailCron() {
  log("🚀", "========================================");
  log("🚀", "Email Cron Service Starting...");
  log("📋", "Configuration:", {
    queueInterval: `${CONFIG.queueInterval / 1000}s`,
    abandonedCartInterval: `${CONFIG.abandonedCartInterval / 60000}m`,
    inactiveUserInterval: `${CONFIG.inactiveUserInterval / 60000}m`,
    automationInterval: `${CONFIG.automationInterval / 1000}s`,
    retryInterval: `${CONFIG.retryInterval / 60000}m`,
  });
  log("🚀", "========================================");

  // 1. Process email queue (every 30 seconds)
  setInterval(processEmailQueue, CONFIG.queueInterval);

  // 2. Retry failed emails (every 5 minutes)
  setInterval(retryFailedEmails, CONFIG.retryInterval);

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

  // Run initial checks after 5 seconds
  setTimeout(async () => {
    log("🔄", "Running initial checks...");
    await processEmailQueue();
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
  checkAbandonedCarts,
  checkInactiveUsers,
  processScheduledAutomations,
  cleanupOldData,
  triggerAutomation,
  checkBirthdayEmails,
  checkSignupAnniversary,
  checkRestockReminders,
  trackConversion,
};
