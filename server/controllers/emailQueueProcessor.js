// Email Queue Processor - Uses existing nodemailer setup to send queued emails
const { createClient } = require("@supabase/supabase-js");
const mailSender = require("../utils/mailSender");

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper for variable replacement
const replaceTemplateVariables = (htmlContent, variables) => {
  if (!htmlContent) return "";
  
  // Universal replacement for variables including HTML entities
  // Matches: {{key}}, {{ key }}, &#123;&#123;key&#125;&#125;
  const variableRegex = /(?:\{\{|&#123;&#123;|&#x7B;&#x7B;)\s*([a-zA-Z0-9_]+)\s*(?:\}\}|&#125;&#125;|&#x7D;&#x7D;)/gi;

  return htmlContent.replace(variableRegex, (match, key) => {
      // Normalize key to lowercase for lookup
      const lookupKey = key.toLowerCase();
      
      // Check variables (try exact then lowercase)
      if (variables[key] !== undefined && variables[key] !== null) {
          return variables[key];
      }
      if (variables[lookupKey] !== undefined && variables[lookupKey] !== null) {
          return variables[lookupKey];
      }

      // Return empty string if variable not found
      return ""; 
  });
};

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
        // Prepare variables for substitution
        const metadata = queuedEmail.metadata || {};
        const variables = {
          ...metadata,
          email: queuedEmail.email,
          user_name: metadata.first_name 
            ? `${metadata.first_name} ${metadata.last_name || ''}`.trim() 
            : (metadata.user_name || "Valued Customer"),
          userName: metadata.first_name 
            ? `${metadata.first_name} ${metadata.last_name || ''}`.trim() 
            : (metadata.user_name || "Valued Customer"),
          unsubscribe_url: `${process.env.APP_URL || 'https://9rx.com'}/unsubscribe?t=${metadata.tracking_id || ''}&e=${encodeURIComponent(queuedEmail.email)}`,
          // Add aliases for convenience
          name: metadata.first_name || "Valued Customer",
          first_name: metadata.first_name || "",
          last_name: metadata.last_name || "",
          company_name: "9RX",
          current_year: new Date().getFullYear().toString(),
          shop_url: "https://9rx.com/pharmacy/products",
          
          // Order-related variables
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

        // Perform variable substitution
        let htmlContent = replaceTemplateVariables(queuedEmail.html_content, variables);
        let subject = replaceTemplateVariables(queuedEmail.subject, variables);

        // Send using existing mailSender
        const sendResult = await mailSender(
          queuedEmail.email,
          subject,
          htmlContent
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
            subject: subject,
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
    let htmlContent = content || `
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

    // Fetch user profile
    let userProfile = null;
    let userId = null;
    
    console.log(`[DEBUG] Starting test email for: ${email}`);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();
      
      if (error) console.error("[DEBUG] Profile fetch error:", error);
      
      userProfile = data;
      userId = data?.id;
      console.log(`[DEBUG] Found User Profile:`, userId ? `ID: ${userId}` : "No ID found");
    } catch (err) {
      console.log("[DEBUG] No profile found for test email", err);
    }

    // Initialize variables with defaults
    let cartItemsHtml = "";
    let itemCount = "0";
    let cartTotal = "0.00";
    let orderItemsHtml = "";
    let orderNumber = "";
    let subtotal = "0.00";
    let shipping = "0.00";
    let orderTotal = "0.00";
    let orderUrl = "https://9rx.com/orders";
    
    // Fetch ACTUAL data if user exists
    if (userId) {
        console.log(`[DEBUG] Attempting to fetch data for User ID: ${userId}`);

        // 1. Fetch Cart Data (from carts table directly)
        try {
            console.log("[DEBUG] Fetching carts...");
            const { data: carts, error: cartError } = await supabase
                .from("carts")
                .select("*")
                .eq("user_id", userId)
                .eq("status", "active")
                .order("updated_at", { ascending: false })
                .limit(1);

            if (cartError) console.error("[DEBUG] Cart fetch error:", cartError);
            console.log(`[DEBUG] Carts found: ${carts?.length || 0}`);

            if (carts && carts.length > 0) {
                const cart = carts[0];
                console.log("[DEBUG] Processing cart:", cart.id);
                // Map fields from carts table structure
                itemCount = (cart.items?.length || 0).toString();
                cartTotal = (cart.total || 0).toFixed(2);
                
                // Format Cart Items HTML from items column
                const items = cart.items || [];
                console.log(`[DEBUG] Cart items count: ${items.length}`);
                
                if (items.length > 0) {
                    cartItemsHtml = items.map(item => `
                        <div style="border-bottom:1px solid #eee; padding:8px 0;">
                            <div style="font-weight:bold;">${item.name || item.product_name || 'Product'}</div>
                            <div style="color:#666; font-size:14px;">Qty: ${item.quantity} x $${(item.price || 0).toFixed(2)}</div>
                        </div>
                    `).join('');
                }
            }
        } catch (err) { console.error("[DEBUG] Error fetching cart:", err); }

        // 2. Fetch Latest Order Data
        try {
            console.log("[DEBUG] Fetching orders...");
            const { data: orders, error: orderError } = await supabase
                .from("orders")
                .select("*")
                .eq("profile_id", userId) // Changed from customer_id to profile_id
                .order("created_at", { ascending: false })
                .limit(1);

            if (orderError) console.error("[DEBUG] Order fetch error:", orderError);
            console.log(`[DEBUG] Orders found: ${orders?.length || 0}`);

            if (orders && orders.length > 0) {
                const order = orders[0];
                console.log("[DEBUG] Processing order:", order.id, "Order Number:", order.order_number);
                
                orderNumber = order.order_number || order.id.substring(0,8);
                subtotal = (order.subtotal || 0).toFixed(2);
                shipping = (order.shipping_cost || 0).toFixed(2);
                orderTotal = (order.total_amount || 0).toFixed(2);
                orderUrl = `https://9rx.com/orders/${orderNumber}`;

                // Format Order Items HTML
                const items = order.items || order.products || [];
                console.log(`[DEBUG] Order items count: ${items.length}`);

                if (items.length > 0) {
                    orderItemsHtml = `
                    <table width="100%" cellpadding="5" cellspacing="0" style="border-collapse:collapse;">
                        ${items.map(item => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px 0;">
                                <strong>${item.name || item.product_name || 'Product'}</strong>
                                ${item.size ? `<br><span style="color:#666;font-size:12px;">Size: ${item.size}</span>` : ''}
                            </td>
                            <td align="center">x${item.quantity}</td>
                            <td align="right">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                        </tr>
                        `).join('')}
                    </table>`;
                }
            } else {
                console.log("[DEBUG] No orders found for this user.");
            }
        } catch (err) { console.error("[DEBUG] Error fetching order:", err); }
    } else {
        console.log("[DEBUG] Skipping data fetch - User ID is null");
    }

    // Fallback to mock data ONLY if actual data is missing/empty

    // Fallback to mock data ONLY if actual data is missing/empty
    if (!cartItemsHtml) {
        cartItemsHtml = `
        <div style="border-bottom:1px solid #eee; padding:8px 0;">
            <div style="font-weight:bold;">Premium Bandages (Mock Data)</div>
            <div style="color:#666; font-size:14px;">Qty: 2 x $15.00</div>
        </div>`;
        itemCount = "1";
        cartTotal = "30.00";
    }

    if (!orderItemsHtml) {
         orderItemsHtml = `
           <table width="100%" cellpadding="5" cellspacing="0" style="border-collapse:collapse;">
             <tr style="border-bottom:1px solid #eee;">
               <td style="padding:10px 0;"><strong>Medical Gloves (Mock Data)</strong></td>
               <td align="center">x10</td>
               <td align="right">$120.00</td>
             </tr>
           </table>`;
         orderNumber = "MOCK-1234";
         orderTotal = "120.00";
    }
    
    // For restock, we'll keep mock data for now as it requires complex logic
    const restockItemsHtml = `
      <div style="background:#f9f9f9; padding:10px; border-radius:4px; margin-bottom:5px;">
        <strong>Syringes 10ml</strong> - <a href="#" style="color:#2563eb;">Buy Again</a>
      </div>`;

    // Prepare variables using actual profile data or fallback to mock data
    const variables = {
      email,
      user_name: userProfile?.first_name 
        ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() 
        : (userProfile?.display_name || "Test User"),
      name: userProfile?.first_name || "Test User",
      first_name: userProfile?.first_name || "Test",
      last_name: userProfile?.last_name || "User",
      company_name: userProfile?.company_name || "9RX",
      current_year: new Date().getFullYear().toString(),
      unsubscribe_url: "#",
      
      // Abandoned Cart Variables
      item_count: itemCount,
      cart_items: cartItemsHtml,
      cart_total: cartTotal,
      cart_url: "https://9rx.com/cart",

      // Order Confirmation Variables
      order_number: orderNumber,
      order_items: orderItemsHtml,
      subtotal: subtotal,
      shipping: shipping,
      order_total: orderTotal,
      order_url: `https://9rx.com/orders/${orderNumber}`,

      // Restock Reminder Variables
      restock_items: restockItemsHtml,
      reorder_url: "https://9rx.com/reorder/quick-list"
    };

    // Perform variable substitution
    htmlContent = replaceTemplateVariables(htmlContent, variables);
    const processedSubject = replaceTemplateVariables(subject, variables);

    const result = await mailSender(email, processedSubject, htmlContent);

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
