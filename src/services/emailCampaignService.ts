// Email Campaign Service - Handles campaign sending with A/B testing
import { supabase } from "@/integrations/supabase/client";
import { queueBulkEmails } from "./emailQueueService";
import { replaceTemplateVariables } from "./emailService";
import { prepareEmailForTracking } from "./emailTrackingService";

interface CampaignRecipient {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_id?: string;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  campaign_type: string;
  target_audience: any;
  track_opens: boolean;
  track_clicks: boolean;
  ab_test_id?: string;
}

// Get recipients based on target audience
export async function getCampaignRecipients(
  targetAudience: any
): Promise<CampaignRecipient[]> {
  let query = supabase
    .from("email_subscribers")
    .select("id, email, first_name, last_name, user_id")
    .eq("status", "active");

  const audienceType = typeof targetAudience === 'string' ? targetAudience : (targetAudience?.type || "all");

  switch (audienceType) {
    case "specific":
      if (targetAudience?.emails && Array.isArray(targetAudience.emails)) {
        // Fetch actual user data for each email
        const specificRecipients: CampaignRecipient[] = [];
        
        for (const email of targetAudience.emails) {
          // Look up user in profiles table
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name")
            .eq("email", email)
            .single();
          
          if (profile) {
            specificRecipients.push({
              id: crypto.randomUUID(),
              email: profile.email,
              first_name: profile.first_name || "",
              last_name: profile.last_name || "",
              user_id: profile.id
            });
          } else {
            // If user not found in profiles, still add with email only
            specificRecipients.push({
              id: crypto.randomUUID(),
              email: email,
              first_name: "",
              last_name: "",
              user_id: undefined
            });
          }
        }
        
        return specificRecipients;
      }
      return [];
    case "pharmacy":
      query = query.contains("tags", ["pharmacy"]);
      break;
    case "group":
      query = query.contains("tags", ["group"]);
      break;
    case "hospital":
      query = query.contains("tags", ["hospital"]);
      break;
    case "active":
      // Users active in last 30 days - would need to join with profiles
      break;
    case "inactive":
      // Users inactive for 30+ days
      break;
    case "high_value":
      query = query.contains("tags", ["high_value"]);
      break;
    // "all" - no additional filters
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching recipients:", error);
    return [];
  }

  return data || [];
}

// Helper: Format cart items for email HTML (mirrors server-side formatCartItemsForEmail)
function formatCartItemsForEmail(cartItems: any[]): { html: string; total: number; itemCount: number } {
  let cartItemsHtml = '';
  let calculatedTotal = 0;
  let totalItemCount = 0;

  if (!cartItems || !Array.isArray(cartItems)) {
    return { html: '', total: 0, itemCount: 0 };
  }

  cartItems.forEach((item: any) => {
    if (item.sizes && Array.isArray(item.sizes)) {
      item.sizes.forEach((size: any) => {
        const sizeTotal = (size.quantity || 0) * (size.price || 0);
        calculatedTotal += sizeTotal;
        totalItemCount++;
        cartItemsHtml += `
          <div style="border-bottom:1px solid #eee; padding:10px 0;">
            <strong>${item.name || item.product_name || "Product"} - ${size.size_value || ''}</strong>
            <div style="color:#666; font-size:14px;">Qty: ${size.quantity} × $${(size.price || 0).toFixed(2)} = $${sizeTotal.toFixed(2)}</div>
          </div>
        `;
      });
    } else {
      const itemTotal = (item.quantity || 0) * (item.price || 0);
      calculatedTotal += itemTotal;
      totalItemCount++;
      cartItemsHtml += `
        <div style="border-bottom:1px solid #eee; padding:10px 0;">
          <strong>${item.name || item.product_name || "Product"}</strong>
          <div style="color:#666; font-size:14px;">Qty: ${item.quantity} × $${(item.price || 0).toFixed(2)} = $${itemTotal.toFixed(2)}</div>
        </div>
      `;
    }
  });

  return { html: cartItemsHtml, total: calculatedTotal, itemCount: totalItemCount };
}

// Send campaign to all recipients
export async function sendCampaign(campaignId: string): Promise<{
  success: boolean;
  queued: number;
  failed: number;
  errors: string[];
}> {
  const results = { success: false, queued: 0, failed: 0, errors: [] as string[] };

  try {
    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      results.errors.push("Campaign not found");
      return results;
    }

    if (campaign.status === "sent" || campaign.status === "sending") {
      results.errors.push("Campaign already sent or sending");
      return results;
    }

    // Check if the campaign's template is abandoned_cart type
    let isAbandonedCartTemplate = false;
    if (campaign.template_id) {
      const { data: templateInfo } = await supabase
        .from("email_templates")
        .select("template_type")
        .eq("id", campaign.template_id)
        .single();
      if (templateInfo?.template_type === "abandoned_cart") {
        isAbandonedCartTemplate = true;
      }
    }

    // Update status to sending
    await supabase
      .from("email_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Get recipients
    const recipients = await getCampaignRecipients(campaign.target_audience);

    if (recipients.length === 0) {
      results.errors.push("No recipients found");
      await supabase
        .from("email_campaigns")
        .update({ status: "draft" })
        .eq("id", campaignId);
      return results;
    }

    // Check for A/B test
    let abTest = null;
    if (campaign.ab_test_id) {
      const { data } = await supabase
        .from("email_ab_tests")
        .select("*")
        .eq("id", campaign.ab_test_id)
        .single();
      abTest = data;
    }

    // Prepare emails
    const emailsToQueue = [];
    
    for (let index = 0; index < recipients.length; index++) {
      const recipient = recipients[index];
      const userName = [recipient.first_name, recipient.last_name]
        .filter(Boolean)
        .join(" ") || "Customer";

      // Fetch additional user data if user_id is available
      let orderData: any = null;
      let profileData: any = null;
      let cartData: { html: string; total: number; itemCount: number } = { html: '', total: 0, itemCount: 0 };
      
      if (recipient.user_id) {
        // Fetch most recent order for this user (including items)
        const { data: orders } = await supabase
          .from("orders")
          .select("order_number, total_amount, created_at, status, items, shipping_cost, tax_amount, tracking_number, shipping_method")
          .eq("profile_id", recipient.user_id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        orderData = orders && orders.length > 0 ? orders[0] : null;
        
        // Fetch additional profile data
        const { data: profiles } = await supabase
          .from("profiles")
          .select("company_name, work_phone, mobile_phone")
          .eq("id", recipient.user_id)
          .limit(1);
        
        profileData = profiles && profiles.length > 0 ? profiles[0] : null;

        // If this is an abandoned cart template, fetch the user's active cart
        if (isAbandonedCartTemplate) {
          const { data: userCart } = await supabase
            .from("carts")
            .select("id, items, total, updated_at")
            .eq("user_id", recipient.user_id)
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(1);

          if (userCart && userCart.length > 0 && userCart[0].items && Array.isArray(userCart[0].items) && userCart[0].items.length > 0) {
            cartData = formatCartItemsForEmail(userCart[0].items);
            // Fallback to DB total if calculated total is 0
            if (cartData.total === 0 && userCart[0].total > 0) {
              cartData.total = userCart[0].total;
            }
          }
        }
      }

      // Determine variant for A/B test
      let subject = campaign.subject;
      let htmlContent = campaign.html_content;
      let abVariant: string | undefined;

      if (abTest && abTest.status === "running") {
        const useVariantA = index % 100 < abTest.split_percentage;
        abVariant = useVariantA ? "A" : "B";
        
        if (abTest.test_type === "subject") {
          subject = useVariantA ? abTest.variant_a.subject : abTest.variant_b.subject;
        } else if (abTest.test_type === "content") {
          htmlContent = useVariantA ? abTest.variant_a.content : abTest.variant_b.content;
        }
      }

      // Replace variables with comprehensive data
      const variables: Record<string, string> = {
        user_name: userName,
        userName: userName, // Alias for compatibility
        first_name: recipient.first_name || "",
        last_name: recipient.last_name || "",
        email: recipient.email,
        name: recipient.first_name || "Customer",
        // Order-related variables
        order_number: orderData?.order_number || "",
        order_total: orderData?.total_amount ? `${parseFloat(orderData.total_amount).toFixed(2)}` : "",
        order_status: orderData?.status || "",
        order_date: orderData?.created_at ? new Date(orderData.created_at).toLocaleDateString() : "",
        order_url: orderData?.order_number ? `https://9rx.com/pharmacy/orders/${orderData.order_number}` : "https://9rx.com/pharmacy/orders",
        order_items: orderData?.items && Array.isArray(orderData.items) && orderData.items.length > 0
          ? orderData.items.map((item: any) => `
            <div style="border-bottom:1px solid #eee;padding:10px 0;">
              <strong>${item.name || item.product_name || "Product"}</strong>
              <div style="color:#666;font-size:14px;">
                Qty: ${item.quantity || 1} × $${(item.price || 0).toFixed(2)} = $${((item.quantity || 1) * (item.price || 0)).toFixed(2)}
              </div>
            </div>
          `).join("")
          : "",
        subtotal: orderData?.total_amount && orderData?.shipping_cost 
          ? `${(parseFloat(orderData.total_amount) - parseFloat(orderData.shipping_cost || 0)).toFixed(2)}` 
          : orderData?.total_amount ? `${parseFloat(orderData.total_amount).toFixed(2)}` : "",
        shipping: orderData?.shipping_cost ? `${parseFloat(orderData.shipping_cost).toFixed(2)}` : "0.00",
        // Tracking variables (for shipping notification templates)
        tracking_number: orderData?.tracking_number || "",
        tracking_url: "",
        shipping_method: orderData?.shipping_method || "",
        // Profile-related variables
        company_name: profileData?.company_name || "",
        phone: profileData?.work_phone || profileData?.mobile_phone || "",
        // Cart variables (populated for abandoned_cart templates)
        cart_items: cartData.html,
        cart_total: cartData.total > 0 ? cartData.total.toFixed(2) : "",
        item_count: cartData.itemCount > 0 ? cartData.itemCount.toString() : "",
        // System variables
        current_year: new Date().getFullYear().toString(),
        company: "9RX",
        shop_url: "https://9rx.com/pharmacy/products",
        cart_url: "https://9rx.com/pharmacy/order/create",
        reorder_url: "https://9rx.com/pharmacy/products",
      };

      const processedSubject = replaceTemplateVariables(subject, variables);
      let processedHtml = replaceTemplateVariables(htmlContent, variables);

      // Add tracking
      const trackingId = crypto.randomUUID();
      processedHtml = prepareEmailForTracking(processedHtml, trackingId, recipient.email, {
        trackOpens: campaign.track_opens,
        trackClicks: campaign.track_clicks,
        addUnsubscribe: true,
        campaignId: campaign.id,
      });

      emailsToQueue.push({
        email: recipient.email,
        subject: processedSubject,
        html_content: processedHtml,
        text_content: campaign.text_content,
        campaign_id: campaign.id,
        subscriber_id: undefined, // Don't use profile ID as subscriber_id (foreign key constraint)
        metadata: {
          user_id: recipient.user_id,
          tracking_id: trackingId,
          ab_variant: abVariant,
          first_name: recipient.first_name,
          last_name: recipient.last_name,
          user_name: userName,
          order_number: orderData?.order_number,
          order_total: orderData?.total_amount ? `$${parseFloat(orderData.total_amount).toFixed(2)}` : "",
          company_name: profileData?.company_name || "",
          phone: profileData?.work_phone || profileData?.mobile_phone || "",
          // Tracking data in metadata (for shipping notification emails)
          tracking_number: orderData?.tracking_number || "",
          shipping_method: orderData?.shipping_method || "",
          // Cart data in metadata (for abandoned cart emails)
          cart_items: cartData.html || "",
          cart_total: cartData.total > 0 ? cartData.total.toFixed(2) : "",
          item_count: cartData.itemCount > 0 ? cartData.itemCount.toString() : "",
        },
      });
    }

    // Queue emails in batches
    const queueResult = await queueBulkEmails(emailsToQueue);
    results.queued = queueResult.queued;
    results.failed = queueResult.failed;
    results.errors = queueResult.errors;

    // Update campaign stats
    await supabase
      .from("email_campaigns")
      .update({
        status: queueResult.failed === emailsToQueue.length ? "failed" : "sent",
        total_recipients: recipients.length,
        sent_count: queueResult.queued,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    results.success = queueResult.queued > 0;
  } catch (error: any) {
    results.errors.push(error.message);
    
    // Reset campaign status on error
    await supabase
      .from("email_campaigns")
      .update({ status: "draft" })
      .eq("id", campaignId);
  }

  return results;
}

// Create A/B test for campaign
export async function createABTest(
  campaignId: string,
  testConfig: {
    name: string;
    testType: "subject" | "content" | "from_name" | "send_time";
    variantA: any;
    variantB: any;
    splitPercentage?: number;
    testSampleSize?: number;
    winnerCriteria?: "open_rate" | "click_rate" | "conversion";
    autoSendWinner?: boolean;
    testDurationHours?: number;
  }
): Promise<{ success: boolean; testId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("email_ab_tests")
      .insert({
        campaign_id: campaignId,
        name: testConfig.name,
        test_type: testConfig.testType,
        variant_a: testConfig.variantA,
        variant_b: testConfig.variantB,
        split_percentage: testConfig.splitPercentage || 50,
        test_sample_size: testConfig.testSampleSize || 1000,
        winner_criteria: testConfig.winnerCriteria || "open_rate",
        auto_send_winner: testConfig.autoSendWinner ?? true,
        test_duration_hours: testConfig.testDurationHours || 4,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Link test to campaign
    await supabase
      .from("email_campaigns")
      .update({ ab_test_id: data.id })
      .eq("id", campaignId);

    return { success: true, testId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Start A/B test
export async function startABTest(testId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase
      .from("email_ab_tests")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", testId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Evaluate A/B test results and pick winner
export async function evaluateABTest(testId: string): Promise<{
  winner: "A" | "B" | null;
  variantARate: number;
  variantBRate: number;
}> {
  const { data: test } = await supabase
    .from("email_ab_tests")
    .select("*")
    .eq("id", testId)
    .single();

  if (!test) {
    return { winner: null, variantARate: 0, variantBRate: 0 };
  }

  let variantARate = 0;
  let variantBRate = 0;

  switch (test.winner_criteria) {
    case "open_rate":
      variantARate = test.variant_a_sent > 0 
        ? (test.variant_a_opens / test.variant_a_sent) * 100 
        : 0;
      variantBRate = test.variant_b_sent > 0 
        ? (test.variant_b_opens / test.variant_b_sent) * 100 
        : 0;
      break;
    case "click_rate":
      variantARate = test.variant_a_opens > 0 
        ? (test.variant_a_clicks / test.variant_a_opens) * 100 
        : 0;
      variantBRate = test.variant_b_opens > 0 
        ? (test.variant_b_clicks / test.variant_b_opens) * 100 
        : 0;
      break;
  }

  const winner = variantARate >= variantBRate ? "A" : "B";

  // Update test with winner
  await supabase
    .from("email_ab_tests")
    .update({
      winner,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", testId);

  return { winner, variantARate, variantBRate };
}

// Pause campaign
export async function pauseCampaign(campaignId: string): Promise<boolean> {
  const { error } = await supabase
    .from("email_campaigns")
    .update({ status: "paused" })
    .eq("id", campaignId);

  if (!error) {
    // Cancel pending emails in queue
    await supabase
      .from("email_queue")
      .update({ status: "cancelled" })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");
  }

  return !error;
}

// Resume campaign
export async function resumeCampaign(campaignId: string): Promise<boolean> {
  const { error } = await supabase
    .from("email_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId);

  if (!error) {
    // Reactivate cancelled emails
    await supabase
      .from("email_queue")
      .update({ status: "pending" })
      .eq("campaign_id", campaignId)
      .eq("status", "cancelled");
  }

  return !error;
}

// Get campaign performance summary
export async function getCampaignPerformance(campaignId: string): Promise<{
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
  openRate: string;
  clickRate: string;
  bounceRate: string;
}> {
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return {
      sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0,
      openRate: "0%", clickRate: "0%", bounceRate: "0%",
    };
  }

  const sent = campaign.sent_count || 0;
  const bounces = campaign.bounce_count || 0;
  const delivered = sent - bounces;
  const opens = campaign.open_count || 0;
  const clicks = campaign.click_count || 0;
  const unsubscribes = campaign.unsubscribe_count || 0;

  return {
    sent,
    delivered,
    opens,
    clicks,
    bounces,
    unsubscribes,
    openRate: sent > 0 ? `${((opens / sent) * 100).toFixed(1)}%` : "0%",
    clickRate: opens > 0 ? `${((clicks / opens) * 100).toFixed(1)}%` : "0%",
    bounceRate: sent > 0 ? `${((bounces / sent) * 100).toFixed(1)}%` : "0%",
  };
}
