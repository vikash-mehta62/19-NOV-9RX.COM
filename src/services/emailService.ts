// Email Service - Handles email sending via Resend/SendGrid/AWS SES
// Configure your preferred provider in email_settings table

import { supabase } from "@/integrations/supabase/client";

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface EmailSettings {
  provider: string;
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to: string;
}

// Get email settings from database
export async function getEmailSettings(): Promise<EmailSettings | null> {
  try {
    const { data, error } = await supabase
      .from("email_settings")
      .select("setting_key, setting_value");

    if (error) throw error;

    const settings: any = {};
    data?.forEach((row) => {
      settings[row.setting_key] = row.setting_value;
    });

    return {
      provider: settings.provider || "resend",
      api_key: settings.api_key || "",
      from_email: settings.from_email || "noreply@9rx.com",
      from_name: settings.from_name || "9RX Pharmacy Supplies",
      reply_to: settings.reply_to || "support@9rx.com",
    };
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return null;
  }
}

// Replace template variables with actual values
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value);
  });
  return result;
}

// Send email via Resend
async function sendViaResend(
  apiKey: string,
  payload: EmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || "Failed to send email" };
    }

    return { success: true, messageId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Send via Node.js backend (uses your existing nodemailer setup)
async function sendViaNodeAPI(
  payload: EmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || "http://localhost:4000";
    const response = await fetch(`${baseUrl}/api/email/send-test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: Array.isArray(payload.to) ? payload.to[0] : payload.to,
        subject: payload.subject,
        content: payload.html,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || "Failed to send email" };
    }

    return { success: true, messageId: data.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Main send email function
export async function sendEmail(
  payload: EmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const settings = await getEmailSettings();

  const emailPayload: EmailPayload = {
    ...payload,
    from: payload.from || `${settings?.from_name || "9RX"} <${settings?.from_email || "noreply@9rx.com"}>`,
    replyTo: payload.replyTo || settings?.reply_to,
  };

  // Check provider setting
  const provider = settings?.provider || "nodejs";

  switch (provider) {
    case "nodejs":
    case "smtp":
      // Use Node.js backend with nodemailer
      return sendViaNodeAPI(emailPayload);
    case "resend":
      if (!settings?.api_key) {
        return { success: false, error: "Resend API key not configured" };
      }
      return sendViaResend(settings.api_key, emailPayload);
    // Add more providers here
    // case "sendgrid":
    //   return sendViaSendGrid(settings.api_key, emailPayload);
    // case "ses":
    //   return sendViaSES(settings.api_key, emailPayload);
    default:
      return { success: false, error: `Unknown provider: ${settings.provider}` };
  }
}

// Log email to database
export async function logEmail(
  userId: string | null,
  email: string,
  subject: string,
  emailType: string,
  status: string,
  campaignId?: string,
  automationId?: string,
  templateId?: string,
  messageId?: string,
  errorMessage?: string
) {
  try {
    await supabase.from("email_logs").insert({
      user_id: userId,
      email_address: email,
      subject,
      email_type: emailType,
      status,
      campaign_id: campaignId || null,
      automation_id: automationId || null,
      template_id: templateId || null,
      provider_message_id: messageId || null,
      error_message: errorMessage || null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error("Error logging email:", error);
  }
}

// Send welcome email
export async function sendWelcomeEmail(
  userId: string,
  email: string,
  userName: string
) {
  try {
    // Get welcome template
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_type", "welcome")
      .eq("is_active", true)
      .single();

    if (!template) {
      console.error("Welcome template not found");
      return;
    }

    const html = replaceTemplateVariables(template.html_content, {
      user_name: userName,
      shop_url: `${window.location.origin}/pharmacy/products`,
    });

    const result = await sendEmail({
      to: email,
      subject: replaceTemplateVariables(template.subject, { user_name: userName }),
      html,
    });

    await logEmail(
      userId,
      email,
      template.subject,
      "welcome",
      result.success ? "sent" : "failed",
      undefined,
      undefined,
      template.id,
      result.messageId,
      result.error
    );
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
}

// Send abandoned cart email
export async function sendAbandonedCartEmail(
  userId: string,
  email: string,
  userName: string,
  cartItems: any[],
  cartTotal: number
) {
  try {
    // Get abandoned cart template
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_type", "abandoned_cart")
      .eq("is_active", true)
      .single();

    if (!template) {
      console.error("Abandoned cart template not found");
      return;
    }

    // Format cart items HTML
    const cartItemsHtml = cartItems
      .map(
        (item) => `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
          <div>
            <p style="margin: 0; font-weight: 500;">${item.name || item.product_name}</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Qty: ${item.quantity}</p>
          </div>
          <p style="margin: 0; font-weight: 500;">$${(item.price * item.quantity).toFixed(2)}</p>
        </div>
      `
      )
      .join("");

    const html = replaceTemplateVariables(template.html_content, {
      user_name: userName,
      item_count: cartItems.length.toString(),
      cart_items: cartItemsHtml,
      cart_total: cartTotal.toFixed(2),
      cart_url: `${window.location.origin}/pharmacy/order/create`,
    });

    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html,
    });

    await logEmail(
      userId,
      email,
      template.subject,
      "abandoned_cart",
      result.success ? "sent" : "failed",
      undefined,
      undefined,
      template.id,
      result.messageId,
      result.error
    );

    return result;
  } catch (error) {
    console.error("Error sending abandoned cart email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// Send promotional email to multiple recipients
export async function sendBulkPromotionalEmail(
  campaignId: string,
  recipients: { userId: string; email: string; userName: string }[],
  subject: string,
  htmlContent: string,
  promoCode?: string,
  expiryDate?: string
) {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const recipient of recipients) {
    try {
      const html = replaceTemplateVariables(htmlContent, {
        user_name: recipient.userName,
        promo_code: promoCode || "",
        expiry_date: expiryDate || "",
        shop_url: `${window.location.origin}/pharmacy/products`,
      });

      const result = await sendEmail({
        to: recipient.email,
        subject,
        html,
      });

      await logEmail(
        recipient.userId,
        recipient.email,
        subject,
        "promotional",
        result.success ? "sent" : "failed",
        campaignId,
        undefined,
        undefined,
        result.messageId,
        result.error
      );

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${recipient.email}: ${result.error}`);
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error: any) {
      results.failed++;
      results.errors.push(`${recipient.email}: ${error.message}`);
    }
  }

  // Update campaign stats
  await supabase
    .from("email_campaigns")
    .update({
      sent_count: results.sent,
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return results;
}
