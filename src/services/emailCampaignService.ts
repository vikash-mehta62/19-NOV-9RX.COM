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
        return targetAudience.emails.map((email: string) => ({
          id: crypto.randomUUID(),
          email: email,
          first_name: "",
          last_name: "",
          user_id: undefined
        }));
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
    const emailsToQueue = recipients.map((recipient, index) => {
      const userName = [recipient.first_name, recipient.last_name]
        .filter(Boolean)
        .join(" ") || "Customer";

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

      // Replace variables
      const variables: Record<string, string> = {
        user_name: userName,
        first_name: recipient.first_name || "",
        last_name: recipient.last_name || "",
        email: recipient.email,
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

      return {
        email: recipient.email,
        subject: processedSubject,
        html_content: processedHtml,
        text_content: campaign.text_content,
        campaign_id: campaign.id,
        subscriber_id: recipient.id,
        metadata: {
          user_id: recipient.user_id,
          tracking_id: trackingId,
          ab_variant: abVariant,
        },
      };
    });

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
