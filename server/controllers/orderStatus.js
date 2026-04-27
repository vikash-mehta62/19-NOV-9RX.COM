
const accountActiveTemplate = require("../templates/accountActiveTemplate");
const adminAccountActiveTemplate = require("../templates/adminCreateAccount");
const adminOrderNotificationTemplate = require("../templates/adminOrderPlaced");
const { contactUsEmail } = require("../templates/contactFormRes");
const { customizationQueryEmail } = require("../templates/customizationQuaery");
const orderConfirmationTemplate = require("../templates/orderCreate");
const orderStatusTemplate = require("../templates/orderTemlate");
const purchaseOrderTemplate = require("../templates/purchaseOrderTemplate");
const paymentLink = require("../templates/paymentLink");
const { passwordResetTemplate, profileUpdateTemplate, paymentSuccessTemplate } = require("../templates/profiles");
const userVerificationTemplate = require("../templates/userVerificationTemplate");
const signupSuccessTemplate = require("../templates/signupSuccessTemplate");
const mailSender = require("../utils/mailSender");
const { buildPayNowUrl, generateOrderDocumentPdf } = require("../utils/orderPdfGenerator");
const { generateFrontendStylePdf } = require("../utils/frontendStylePdfGenerator");
const { triggerAutomation, trackConversion } = require("../cron/emailCron");
const { createClient } = require("@supabase/supabase-js");

// Admin email from environment variable with fallback
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sppatel@9rx.com";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
const getSupabaseAdmin = () => {
  if (supabaseAdmin) return supabaseAdmin;
  if (!supabaseUrl || !supabaseServiceKey) return null;

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdmin;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateItemsSubtotal = (items = []) => {
  if (!Array.isArray(items)) return 0;

  return items.reduce((total, item) => {
    if (Array.isArray(item?.sizes) && item.sizes.length > 0) {
      return (
        total +
        item.sizes.reduce(
          (sizeSum, size) => sizeSum + toNumber(size?.price) * toNumber(size?.quantity),
          0,
        )
      );
    }

    return total + toNumber(item?.price ?? item?.unit_price) * toNumber(item?.quantity);
  }, 0);
};

const normalizeOrderTotals = (order = {}) => {
  const subtotal = calculateItemsSubtotal(order.items || []);
  const shippingCost = toNumber(order.shipping_cost);
  const taxAmount = toNumber(order.tax_amount);
  const explicitProcessingFeeAmount = toNumber(order.processing_fee_amount);
  const handlingCharges = toNumber(order.po_handling_charges);
  const freightCharges = toNumber(order.po_fred_charges);
  const discountAmount = toNumber(order.discount_amount);
  const storedTotalAmount = toNumber(order.total_amount ?? order.total);
  const baseWithoutProcessingFee =
    subtotal +
    shippingCost +
    taxAmount +
    handlingCharges +
    freightCharges -
    discountAmount;
  const inferredProcessingFeeAmount =
    explicitProcessingFeeAmount > 0
      ? explicitProcessingFeeAmount
      : Math.max(0, Number((storedTotalAmount - baseWithoutProcessingFee).toFixed(2)));
  const processingFeeAmount = inferredProcessingFeeAmount;

  const calculatedTotal =
    baseWithoutProcessingFee + processingFeeAmount;

  return {
    subtotal,
    shipping_cost: shippingCost,
    tax_amount: taxAmount,
    processing_fee_amount: processingFeeAmount,
    po_handling_charges: handlingCharges,
    po_fred_charges: freightCharges,
    discount_amount: discountAmount,
    total_amount: Math.max(0, Number(calculatedTotal.toFixed(2))),
  };
};

const getBalanceDue = (order = {}) => {
  const total = toNumber(order.total_amount ?? order.total ?? 0);
  const paid = toNumber(order.paid_amount ?? 0);
  const adjustment = toNumber(order.adjustment_amount ?? 0);
  return adjustment > 0 ? adjustment : Math.max(0, total - paid);
};

const mergeOrderData = (incoming = {}, dbOrder = {}) => {
  const merged = {
    ...dbOrder,
    ...incoming,
  };

  merged.customerInfo = incoming.customerInfo || dbOrder.customerInfo || {};
  merged.shippingAddress = incoming.shippingAddress || dbOrder.shippingAddress || {};
  merged.items =
    Array.isArray(incoming.items) && incoming.items.length > 0
      ? incoming.items
      : (dbOrder.items || []);

  if (merged.total_amount == null) {
    merged.total_amount = incoming.total ?? dbOrder.total_amount ?? dbOrder.total ?? 0;
  }
  if (merged.total == null) {
    merged.total = merged.total_amount;
  }

  // Ensure tax_amount and shipping_cost are properly merged
  if (merged.tax_amount == null) {
    merged.tax_amount = incoming.tax_amount ?? dbOrder.tax_amount ?? 0;
  }
  if (merged.shipping_cost == null) {
    merged.shipping_cost = incoming.shipping_cost ?? dbOrder.shipping_cost ?? 0;
  }
  
  // Ensure paid_amount is properly merged
  if (merged.paid_amount == null) {
    merged.paid_amount = incoming.paid_amount ?? dbOrder.paid_amount ?? 0;
  }

  merged.order_number = incoming.order_number || dbOrder.order_number || incoming.orderNumber || dbOrder.orderNumber;
  return merged;
};

const resolveOrderFromDb = async (incomingOrder = {}) => {
  console.log("📥 Incoming order data:", {
    has_id: !!incomingOrder?.id,
    has_order_number: !!incomingOrder?.order_number,
    has_items: !!incomingOrder?.items,
    has_customerInfo: !!incomingOrder?.customerInfo,
    has_shippingAddress: !!incomingOrder?.shippingAddress,
    has_subtotal: !!incomingOrder?.subtotal,
    has_tax: !!incomingOrder?.tax_amount,
    has_shipping: !!incomingOrder?.shipping_cost,
    has_total: !!incomingOrder?.total_amount,
    has_discount_amount: !!incomingOrder?.discount_amount,
    has_discount_details: !!incomingOrder?.discount_details,
    has_paid_amount: !!incomingOrder?.paid_amount,
    has_payment_status: !!incomingOrder?.payment_status,
    has_invoice_number: !!incomingOrder?.invoice_number,
    discount_amount_value: incomingOrder?.discount_amount,
    discount_details_value: incomingOrder?.discount_details,
    keys: Object.keys(incomingOrder || {})
  });

  const adminClient = getSupabaseAdmin();
  
  // If incoming order has all necessary data, use it directly
  const hasCompleteData = incomingOrder?.items && 
                          incomingOrder?.customerInfo?.email && 
                          incomingOrder?.total_amount;
  
  if (hasCompleteData && !adminClient) {
    console.log("✅ Using incoming order data directly (no admin client)");
    return incomingOrder;
  }

  let dbOrder = null;
  let needsDbFetch = false;

  // Only fetch from DB if we're missing critical data
  if (!hasCompleteData && adminClient) {
    needsDbFetch = true;
    
    if (incomingOrder?.id) {
      const { data } = await adminClient
        .from("orders")
        .select("*")
        .eq("id", incomingOrder.id)
        .maybeSingle();
      dbOrder = data || null;
      console.log("🔍 Fetched order from DB by ID:", !!dbOrder);
    }

    if (!dbOrder && incomingOrder?.order_number) {
      const { data } = await adminClient
        .from("orders")
        .select("*")
        .eq("order_number", incomingOrder.order_number)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      dbOrder = data || null;
      console.log("🔍 Fetched order from DB by order_number:", !!dbOrder);
    }
  }

  const merged = mergeOrderData(incomingOrder, dbOrder || {});
  const normalizedTotals = normalizeOrderTotals(merged);
  merged.subtotal = normalizedTotals.subtotal;
  merged.shipping_cost = normalizedTotals.shipping_cost;
  merged.tax_amount = normalizedTotals.tax_amount;
  merged.processing_fee_amount = normalizedTotals.processing_fee_amount;
  merged.po_handling_charges = normalizedTotals.po_handling_charges;
  merged.po_fred_charges = normalizedTotals.po_fred_charges;
  merged.discount_amount = normalizedTotals.discount_amount;
  merged.total_amount = normalizedTotals.total_amount;
  merged.total = normalizedTotals.total_amount;

  // Only fetch invoice number if not already present
  if (!merged.invoice_number && merged.id && adminClient) {
    const { data: invoiceData } = await adminClient
      .from("invoices")
      .select("invoice_number")
      .eq("order_id", merged.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invoiceData?.invoice_number) {
      merged.invoice_number = invoiceData.invoice_number;
      console.log("📄 Fetched invoice number:", merged.invoice_number);
    }
  }

  // Only fetch customer info if email is missing
  if (!merged?.customerInfo?.email && merged?.profile_id && adminClient) {
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("email, first_name, last_name, mobile_phone")
      .eq("id", merged.profile_id)
      .maybeSingle();

    if (profileData) {
      merged.customerInfo = {
        ...(merged.customerInfo || {}),
        email: profileData.email || merged.customerInfo?.email || "",
        name:
          merged.customerInfo?.name ||
          `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() ||
          "Customer",
        phone: merged.customerInfo?.phone || profileData.mobile_phone || "",
      };
      console.log("👤 Fetched customer info from profiles");
    }
  }

  console.log("📦 Final resolved order data:", {
    order_number: merged.order_number,
    invoice_number: merged.invoice_number,
    subtotal: merged.subtotal,
    tax_amount: merged.tax_amount,
    shipping_cost: merged.shipping_cost,
    discount_amount: merged.discount_amount,
    discount_details: merged.discount_details,
    total_amount: merged.total_amount,
    total: merged.total,
    paid_amount: merged.paid_amount,
    payment_status: merged.payment_status,
    items_count: merged.items?.length,
    has_customer_email: !!merged.customerInfo?.email,
    db_fetch_needed: needsDbFetch
  });

  return merged;
};

const appendPaymentBlock = (html, paymentUrl, balanceDue) => {
  if (!paymentUrl || balanceDue <= 0) return html;

  const block = `
    <div style="margin: 20px 0; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #065f46; font-weight: 600;">Payment Link</p>
      <p style="margin: 0; font-size: 13px; color: #065f46;">
        Balance Due: $${toNumber(balanceDue).toFixed(2)}<br/>
        <a href="${paymentUrl}" style="color: #047857; font-weight: 600;">Pay Online Securely</a>
      </p>
    </div>
  `;

  return html.includes("</body>") ? html.replace("</body>", `${block}</body>`) : `${html}${block}`;
};

const buildOrderDocument = async (order, options = {}) => {
  try {
    const paymentUrl = options.paymentUrl || buildPayNowUrl(order?.id);
    
    console.log("🎨 Using frontend-style PDF generator:", {
      documentType: options.documentType,
      payment_status: order.payment_status,
      order_number: order.order_number
    });
 
    // Use the new frontend-style PDF generator
    const pdf = await generateFrontendStylePdf(order, {
      documentType: options.documentType,
      paymentUrl,
      includePricingInPdf: options.includePricingInPdf,
    });

    return {
      paymentUrl: pdf.paymentUrl || paymentUrl,
      balanceDue: toNumber(pdf.balanceDue),
      attachments: [
        {
          filename: pdf.filename,
          content: pdf.buffer,
          contentType: "application/pdf",
        },
      ],
    };
  } catch (error) {
    console.error("Failed to generate order PDF attachment:", error.message);
    return null;
  }
};

const buildPurchaseOrderEmailPayload = async (incomingOrder = {}, options = {}) => {
  const order = await resolveOrderFromDb(incomingOrder);

  if (!order || order.poAccept !== false) {
    throw new Error("This endpoint only supports purchase orders.");
  }

  if (!order?.customerInfo?.email) {
    throw new Error("Vendor email is missing on this purchase order.");
  }

  const includePricingInPdf =
    typeof options.includePricingInPdf === "boolean"
      ? options.includePricingInPdf
      : order?.payment?.includePricingInPdf !== false;

  const pdfMeta = await buildOrderDocument(order, {
    documentType: "PURCHASE ORDER",
    includePricingInPdf,
  });
  const eventType = options.eventType === "updated" ? "updated" : "created";
  const subjectPrefix = eventType === "updated" ? "Updated Purchase Order" : "New Purchase Order";

  return {
    order,
    pdfMeta,
    eventType,
    includePricingInPdf,
    subject: `${subjectPrefix} #${order.order_number || order.id} - 9RX`,
    emailContent: purchaseOrderTemplate(order, { eventType, includePricingInPdf }),
  };
};


exports.orderSatusCtrl = async (req, res) => {
  try {
    const incomingOrder = req.body || {};
    const order = await resolveOrderFromDb(incomingOrder);

    console.log("📧 Order status update email data:", {
      order_number: order.order_number,
      total_amount: order.total_amount,
      paid_amount: order.paid_amount,
      payment_status: order.payment_status,
      tax_amount: order.tax_amount,
      shipping_cost: order.shipping_cost,
      status: order.status,
      customer_email: order.customerInfo?.email
    });

    if (!order || !order.customerInfo || !order.customerInfo.email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Determine document type based on payment status
    // If paid → INVOICE, otherwise → SALES ORDER
    const isPaid = order.payment_status?.toLowerCase() === 'paid';
    const documentType = isPaid ? 'INVOICE' : 'SALES ORDER';
    
    console.log("📄 Document type for status update email:", {
      payment_status: order.payment_status,
      documentType: documentType
    });

    // Generate email content using the template
    const pdfMeta = await buildOrderDocument(order, { documentType });
    const emailContent = appendPaymentBlock(
      orderStatusTemplate(order),
      pdfMeta?.paymentUrl,
      pdfMeta?.balanceDue ?? getBalanceDue(order)
    );

    // Send email
    await mailSender(
      order.customerInfo.email,
      "Order Status Update",
      emailContent,
      pdfMeta ? { attachments: pdfMeta.attachments } : undefined
    );

    // Trigger automation based on order status
    const status = order.status?.toLowerCase();
    if (status === 'shipped') {
      await triggerAutomation('order_shipped', {
        email: order.customerInfo.email,
        userId: order.userId || order.profile_id,
        firstName: order.customerInfo.firstName || order.customerInfo.name?.split(' ')[0],
        lastName: order.customerInfo.lastName || order.customerInfo.name?.split(' ').slice(1).join(' '),
        order_number: order.order_number || order.orderNumber || order.id,
        tracking_number: order.tracking_number || order.trackingNumber || '',
        shipping_method: order.shipping_method || order.shippingMethod || '',
      }); 
    } else if (status === 'delivered') {
      await triggerAutomation('order_delivered', {
        email: order.customerInfo.email,
        userId: order.userId || order.profile_id,
        firstName: order.customerInfo.firstName || order.customerInfo.name?.split(' ')[0],
        lastName: order.customerInfo.lastName || order.customerInfo.name?.split(' ').slice(1).join(' '),
        order_number: order.order_number || order.orderNumber || order.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status email sent successfully!",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: "Internal server error",
    });
  }
};


exports.orderPlacedCtrl = async (req, res) => {
  try {
    const incomingOrder = req.body || {};
    const order = await resolveOrderFromDb(incomingOrder);

    console.log("📧 Order data for email:", {
      order_number: order.order_number,
      total_amount: order.total_amount,
      tax_amount: order.tax_amount,
      shipping_cost: order.shipping_cost,
      items_count: order.items?.length,
      customer_email: order.customerInfo?.email,
      processing_fee_amount: order?.processing_fee_amount,
      discount_amount: order?.discount_amount,
      discount_details: order?.discount_details,
    });

    // Ensure required fields are present
    if (!order || !order.customerInfo || !order.customerInfo.email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Determine document type based on payment status
    // If paid → INVOICE, otherwise → SALES ORDER
    const isPaid = order.payment_status?.toLowerCase() === 'paid';
    const documentType = isPaid ? 'INVOICE' : 'SALES ORDER';
    
    console.log("📄 Document type for email:", {
      payment_status: order.payment_status,
      invoice_number: order.invoice_number,
      documentType: documentType
    });

    console.log("All Data:", order);

    // Generate email content using the template
    const pdfMeta = await buildOrderDocument(order, { documentType });
    const emailContent = appendPaymentBlock(
      orderConfirmationTemplate(order),
      pdfMeta?.paymentUrl,
      pdfMeta?.balanceDue ?? getBalanceDue(order)
    );
    const emailContentAdmin = adminOrderNotificationTemplate(order);

    // Send email to customer
    await mailSender(
      order.customerInfo.email,
      "Order Placed Successfully - 9RX",
      emailContent,
      pdfMeta ? { attachments: pdfMeta.attachments } : undefined
    );
    // Send notification to admin
    await mailSender(
      ADMIN_EMAIL,
      "New Order Placed",
      emailContentAdmin
    );

    // Trigger order_placed automation
    await triggerAutomation('order_placed', {
      email: order.customerInfo.email,
      userId: order.userId || order.profile_id,
      firstName: order.customerInfo.firstName || order.customerInfo.name?.split(' ')[0],
      lastName: order.customerInfo.lastName || order.customerInfo.name?.split(' ').slice(1).join(' '),
      order_number: order.order_number || order.orderNumber || order.id,
      order_total: order.total_amount || order.totalAmount || order.total,
      item_count: order.items?.length || 0,
    });

    // Track conversion (user made a purchase)
    if (order.userId || order.profile_id) {
      await trackConversion(
        order.userId || order.profile_id,
        order.orderNumber || order.id,
        order.totalAmount || order.total
      );
    }

    // Check if this is user's first purchase
    // Note: This would need to be checked against order history
    // For now, we'll trigger first_purchase automation and let the automation's
    // send_limit_per_user handle preventing duplicates
    await triggerAutomation('first_purchase', {
      email: order.customerInfo.email,
      userId: order.userId || order.profile_id,
      firstName: order.customerInfo.firstName || order.customerInfo.name?.split(' ')[0],
      lastName: order.customerInfo.lastName || order.customerInfo.name?.split(' ').slice(1).join(' '),
      order_number: order.order_number || order.orderNumber || order.id,
      order_total: order.total_amount || order.totalAmount || order.total,
    });

    return res.status(200).json({
      success: true,
      message: "Order status email sent successfully!",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: "Internal server error",
    });
  }
};

exports.purchaseOrderEmailCtrl = async (req, res) => {
  try {
    const { order, pdfMeta, subject, emailContent } = await buildPurchaseOrderEmailPayload(req.body || {}, {
      eventType: req.body?.eventType,
      includePricingInPdf: req.body?.includePricingInPdf,
    });

    await mailSender(
      order.customerInfo.email,
      subject,
      emailContent,
      pdfMeta ? { attachments: pdfMeta.attachments } : undefined
    );

    return res.status(200).json({
      success: true,
      message: "Purchase order email sent successfully.",
    });
  } catch (error) {
    console.error("Error sending purchase order email:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to send purchase order email.",
      error: "Internal server error",
    });
  }
};


exports.userNotificationCtrl = async (req, res) => {
  try {
    const { groupname, name, email, userId } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate profile completion link
    let profileCompletionLink = null;
    if (userId && email) {
      try {
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error("Supabase admin credentials not configured");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUserError || !authUser?.user) {
          throw new Error("Invalid userId for profile completion link");
        }

        const authEmail = (authUser.user.email || "").toLowerCase().trim();
        const requestEmail = email.toLowerCase().trim();
        if (!authEmail || authEmail !== requestEmail) {
          throw new Error("Email and userId mismatch for profile completion link");
        }

        const frontendUrl = process.env.FRONTEND_URL || "https://9rx.com";
        const redirectUrl = `${frontendUrl}/update-profile`;
        
        console.log("🔗 Generating magic link with redirect:", redirectUrl);
        
        // Generate magic link using admin API
        const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email.toLowerCase().trim(),
          options: { 
            redirectTo: redirectUrl,
          },
        });

        if (magicLinkError) {
          console.error("❌ Magic link generation error:", magicLinkError);
          throw magicLinkError;
        }

        // Get the action_link which contains the verification URL
        let actionLink = magicLinkData?.properties?.action_link || null;
        
        if (actionLink) {
          // Parse and modify the URL to ensure proper redirect
          try {
            const url = new URL(actionLink);
            
            // Force the redirect_to parameter to update-profile
            url.searchParams.set('redirect_to', redirectUrl);
            
            profileCompletionLink = url.toString();
            console.log("✅ Profile completion link generated with redirect_to:", redirectUrl);
            console.log("📧 Full magic link:", profileCompletionLink);
          } catch (urlError) {
            console.error("❌ Error parsing magic link URL:", urlError);
            profileCompletionLink = actionLink;
          }
        } else {
          console.warn("⚠️ No action_link in magic link response");
        }
      } catch (linkError) {
        console.error("Failed to generate profile completion link:", linkError.message);
        // Continue without link - user can still complete profile later
      }
    }

    const emailContent = userVerificationTemplate(groupname, name, email);
    const userEmailContent = signupSuccessTemplate(name, email, profileCompletionLink);

    // Notify Admin
    await mailSender(
      ADMIN_EMAIL,
      "New User Registration - Verification Required",
      emailContent
    );

    // Notify User
    await mailSender(
      email,
      "Welcome to 9RX",
      userEmailContent
    );

    // Trigger welcome automation
    const nameParts = name.split(' ');
    await triggerAutomation('welcome', {
      email: email,
      userId: userId,
      firstName: nameParts[0] || name,
      lastName: nameParts.slice(1).join(' ') || '',
      group_name: groupname || '',
    });

    return res.status(200).json({
      success: true,
      message: "Order status email sent successfully!",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: "Internal server error",
    });
  }
};


exports.accountActivation = async (req, res) => {
  try {
    const { name, email, admin = false } = req.body;


    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate email content using the template
    const emailContent = accountActiveTemplate(name, email, admin);

    // Send email
    await mailSender(
      email,
      "Your Account Active Successfully! ",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Account Active",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: "Internal server error",
    });
  }
};

exports.adminAccountActivation = async (req, res) => {
  try {
    console.log("📧 Admin account activation email request received:", {
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    const { name, email, admin = false, password, termsAcceptanceLink } = req.body;

    // Ensure required fields are present
    if (!name || !email) {
      console.log("❌ Missing required fields:", { name: !!name, email: !!email });
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    console.log("📝 Generating email content for:", email);
    // Generate email content using the template
    const emailContent = adminAccountActiveTemplate(name, email, admin, password, termsAcceptanceLink);

    console.log("📤 Attempting to send email to:", email);
    // Send email
    const emailResult = await mailSender(
      email,
      "Your Account has been created Successfully! ",
      emailContent
    );

    console.log("📧 Email send result:", emailResult);

    if (emailResult.success) {
      console.log("✅ Email sent successfully to:", email);
      return res.status(200).json({
        success: true,
        message: "Account Active",
        emailSent: true,
        messageId: emailResult.messageId
      });
    } else {
      console.log("❌ Email failed to send:", emailResult.error);
      return res.status(500).json({
        success: false,
        message: "Failed to send email",
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error("💥 Error in adminAccountActivation:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: "Internal server error",
    });
  }
};


exports.contactCtrl = async (req, res) => {
  const { name, email, contact, company, subject, message } = req.body;
  try {

    if (!name || !contact) {
      return res.status(500).send({
        message: "Plase provide all fields",
        success: false
      })
    }

    const emailRes = await mailSender(
      ADMIN_EMAIL,
      "New Contact Form Submission",
      contactUsEmail(name, email, contact, company, subject, message)
    )
    res.status(200).send({
      message: "Email send successfully.Our team will contact you soon!",
      emailRes,
      success: true
    })
  } catch (error) {
    console.log(error)
    res.status(500).send({
      message: "Error in sending email",
    })
  }
}


exports.customization = async (req, res) => {
  const { name, email, phone, selectedProducts } = req.body;
  try {

    if (!name || !phone) {
      return res.status(500).send({
        message: "Plase provide all fields",
        success: false
      })
    }

    const emailRes = await mailSender(
      ADMIN_EMAIL,
      "New Customization Request",
      customizationQueryEmail(name, email, phone, selectedProducts)
    )
    res.status(200).send({
      message: "Email send successfully.Our team will contact you soon!",
      emailRes,
      success: true
    })
  } catch (error) {
    console.log(error)
    res.status(500).send({
      message: "Error in sending email",
    })
  }
}


exports.paymentLinkCtrl = async (req, res) => {
  try {
    const incomingOrder = req.body || {};
    const order = await resolveOrderFromDb(incomingOrder);
    console.log(order)
    if (!order || !order.customerInfo || !order.customerInfo.email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    const paymentEmailOrder = {
      ...order,
      total: order.total ?? order.total_amount ?? 0,
      pay_now_url: buildPayNowUrl(order?.id),
    };
    const pdfMeta = await buildOrderDocument(paymentEmailOrder, {
      documentType: paymentEmailOrder?.invoice_number ? "INVOICE" : "SALES ORDER",
    });
    const emailContent = paymentLink({
      ...paymentEmailOrder,
      pay_now_url: pdfMeta?.paymentUrl || paymentEmailOrder.pay_now_url,
    });

    await mailSender(
      order.customerInfo.email,
      `Complete Your Payment - Order #${order.order_number || order.orderNumber || 'N/A'} | 9RX`,
      emailContent,
      pdfMeta ? { attachments: pdfMeta.attachments } : undefined
    );

    return res.status(200).json({
      success: true,
      message: "Payment Link Send Successfully",
    });
  } catch (error) {
    console.error("Error in payment link:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in payment link",
      error: "Internal server error",
    });
  }
}


exports.passwordConfirmationNotification = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required details: name and email are required.",
      });
    }

    // Generate email content using the template
    const emailContent = passwordResetTemplate(name);

    // Send email
    await mailSender(
      email,
      "Password Reset Confirmation - 9RX",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Password reset confirmation email sent",
    });
  } catch (error) {
    console.error("Error in Password Confirmation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send password confirmation email",
      error: "Internal server error",
    });
  }
};

exports.updateProfileNotification = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required details: name and email are required.",
      });
    }

    // Generate email content using the template
    const emailContent = profileUpdateTemplate(name, email);

    // Send email
    await mailSender(
      email,
      "Profile Updated Successfully - 9RX",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Profile update notification sent",
    });
  } catch (error) {
    console.error("Error in Profile Update Notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send profile update notification",
      error: "Internal server error",
    });
  }
};

exports.paymentSuccessFull = async (req, res) => {
  try {
    const { name, email, orderNumber, transactionId } = req.body;

    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required details: name and email are required.",
      });
    }

    // Generate email content using the template
    const emailContent = paymentSuccessTemplate(name, orderNumber, transactionId);

    // Send email
    await mailSender(
      email,
      `Payment Successful - Order #${orderNumber || 'N/A'} - 9RX`,
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Payment confirmation email sent",
    });
  } catch (error) {
    console.error("Error in Payment Success Notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send payment confirmation email",
      error: "Internal server error",
    });
  }
};




// Group Invitation Email
const groupInvitationTemplate = require("../templates/groupInvitationTemplate");

exports.groupInvitationCtrl = async (req, res) => {
  try {
    const {
      email,
      pharmacyName,
      contactPerson,
      groupName,
      inviterName,
      inviteLink,
      expiresAt,
      personalMessage,
    } = req.body;

    // Validate required fields
    if (!email || !pharmacyName || !groupName || !inviteLink) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, pharmacyName, groupName, inviteLink",
      });
    }

    // Generate email content
    const emailContent = groupInvitationTemplate({
      pharmacyName,
      contactPerson,
      groupName,
      inviterName: inviterName || groupName,
      inviteLink,
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      personalMessage,
    });

    // Send email
    await mailSender(
      email,
      `You're Invited to Join ${groupName} on 9RX`,
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Invitation email sent successfully",
    });
  } catch (error) {
    console.error("Error sending group invitation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send invitation email",
      error: "Internal server error",
    });
  }
};
