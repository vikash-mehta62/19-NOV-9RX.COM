// Email Tracking Service - Open/Click tracking with pixel and link wrapping
import { supabase } from "@/integrations/supabase/client";

const TRACKING_DOMAIN = import.meta.env.VITE_TRACKING_DOMAIN || window.location.origin;

// Generate tracking pixel HTML
export function generateTrackingPixel(trackingId: string): string {
  const pixelUrl = `${TRACKING_DOMAIN}/api/track/open/${trackingId}`;
  return `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
}

// Wrap links for click tracking
export function wrapLinksForTracking(
  html: string,
  trackingId: string,
  campaignId?: string
): string {
  // Regex to find all href links
  const linkRegex = /href=["']([^"']+)["']/gi;
  let linkIndex = 0;

  return html.replace(linkRegex, (match, url) => {
    // Skip mailto, tel, and anchor links
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return match;
    }

    // Skip unsubscribe links (they have their own tracking)
    if (url.includes('unsubscribe')) {
      return match;
    }

    linkIndex++;
    const trackingUrl = `${TRACKING_DOMAIN}/api/track/click/${trackingId}?url=${encodeURIComponent(url)}&lid=${linkIndex}`;
    return `href="${trackingUrl}"`;
  });
}

// Add unsubscribe link to email
export function addUnsubscribeLink(html: string, trackingId: string, email: string): string {
  const unsubscribeUrl = `${TRACKING_DOMAIN}/unsubscribe?t=${trackingId}&e=${encodeURIComponent(email)}`;
  
  const unsubscribeHtml = `
    <div style="text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; margin-top: 30px;">
      <p>You're receiving this email because you subscribed to updates from 9RX.</p>
      <p><a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> | <a href="${TRACKING_DOMAIN}/email-preferences?t=${trackingId}" style="color: #666;">Manage Preferences</a></p>
    </div>
  `;

  // Insert before closing body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${unsubscribeHtml}</body>`);
  }
  
  return html + unsubscribeHtml;
}

// Prepare email for tracking
export function prepareEmailForTracking(
  html: string,
  trackingId: string,
  email: string,
  options: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    addUnsubscribe?: boolean;
    campaignId?: string;
  } = {}
): string {
  let processedHtml = html;

  // Add click tracking
  if (options.trackClicks !== false) {
    processedHtml = wrapLinksForTracking(processedHtml, trackingId, options.campaignId);
  }

  // Add unsubscribe link
  if (options.addUnsubscribe !== false) {
    processedHtml = addUnsubscribeLink(processedHtml, trackingId, email);
  }

  // Add open tracking pixel (at the end of body)
  if (options.trackOpens !== false) {
    const pixel = generateTrackingPixel(trackingId);
    if (processedHtml.includes('</body>')) {
      processedHtml = processedHtml.replace('</body>', `${pixel}</body>`);
    } else {
      processedHtml += pixel;
    }
  }

  return processedHtml;
}

// Record tracking event
export async function recordTrackingEvent(
  trackingId: string,
  eventType: 'opened' | 'clicked' | 'unsubscribed',
  details: {
    linkUrl?: string;
    linkId?: string;
    userAgent?: string;
    ipAddress?: string;
  } = {}
): Promise<boolean> {
  try {
    // Get email log by tracking ID
    const { data: emailLog } = await supabase
      .from("email_logs")
      .select("id, email_address, campaign_id, automation_id")
      .eq("tracking_id", trackingId)
      .single();

    if (!emailLog) {
      console.error("Email log not found for tracking ID:", trackingId);
      return false;
    }

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(details.userAgent || '');

    // Insert tracking event
    await supabase.from("email_tracking_events").insert({
      email_log_id: emailLog.id,
      tracking_id: trackingId,
      event_type: eventType,
      link_url: details.linkUrl,
      link_id: details.linkId,
      user_agent: details.userAgent,
      ip_address: details.ipAddress,
      device_type: deviceInfo.deviceType,
      email_client: deviceInfo.emailClient,
    });

    // Update campaign/automation stats
    if (emailLog.campaign_id) {
      await updateCampaignStats(emailLog.campaign_id, eventType);
    }

    return true;
  } catch (error) {
    console.error("Error recording tracking event:", error);
    return false;
  }
}

// Update campaign statistics
async function updateCampaignStats(campaignId: string, eventType: string): Promise<void> {
  const columnMap: Record<string, string> = {
    opened: 'open_count',
    clicked: 'click_count',
    unsubscribed: 'unsubscribe_count',
  };

  const column = columnMap[eventType];
  if (!column) return;

  // Increment the counter
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select(column)
    .eq("id", campaignId)
    .single();

  if (campaign) {
    await supabase
      .from("email_campaigns")
      .update({ [column]: (campaign[column] || 0) + 1 })
      .eq("id", campaignId);
  }
}

// Parse user agent to extract device and email client info
function parseUserAgent(userAgent: string): { deviceType: string; emailClient: string } {
  const ua = userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile';
  }

  let emailClient = 'unknown';
  if (ua.includes('gmail')) emailClient = 'gmail';
  else if (ua.includes('outlook') || ua.includes('microsoft')) emailClient = 'outlook';
  else if (ua.includes('apple') || ua.includes('webkit')) emailClient = 'apple_mail';
  else if (ua.includes('yahoo')) emailClient = 'yahoo';
  else if (ua.includes('thunderbird')) emailClient = 'thunderbird';

  return { deviceType, emailClient };
}

// Get tracking analytics for a campaign
export async function getCampaignAnalytics(campaignId: string): Promise<{
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  topLinks: { url: string; clicks: number }[];
  deviceBreakdown: { device: string; count: number }[];
  hourlyOpens: { hour: number; count: number }[];
}> {
  // Get campaign data
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Get tracking events
  const { data: events } = await supabase
    .from("email_tracking_events")
    .select("*")
    .eq("email_log_id", campaignId);

  const trackingEvents = events || [];

  // Calculate metrics
  const totalSent = campaign.sent_count || 0;
  const opened = campaign.open_count || 0;
  const clicked = campaign.click_count || 0;
  const bounced = campaign.bounce_count || 0;
  const unsubscribed = campaign.unsubscribe_count || 0;

  // Top clicked links
  const linkClicks: Record<string, number> = {};
  trackingEvents
    .filter(e => e.event_type === 'clicked' && e.link_url)
    .forEach(e => {
      linkClicks[e.link_url!] = (linkClicks[e.link_url!] || 0) + 1;
    });

  const topLinks = Object.entries(linkClicks)
    .map(([url, clicks]) => ({ url, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // Device breakdown
  const deviceCounts: Record<string, number> = {};
  trackingEvents
    .filter(e => e.device_type)
    .forEach(e => {
      deviceCounts[e.device_type!] = (deviceCounts[e.device_type!] || 0) + 1;
    });

  const deviceBreakdown = Object.entries(deviceCounts)
    .map(([device, count]) => ({ device, count }));

  // Hourly opens
  const hourlyCounts: Record<number, number> = {};
  trackingEvents
    .filter(e => e.event_type === 'opened')
    .forEach(e => {
      const hour = new Date(e.occurred_at).getHours();
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });

  const hourlyOpens = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourlyCounts[hour] || 0,
  }));

  return {
    totalSent,
    delivered: totalSent - bounced,
    opened,
    clicked,
    bounced,
    unsubscribed,
    openRate: totalSent > 0 ? (opened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (clicked / totalSent) * 100 : 0,
    clickToOpenRate: opened > 0 ? (clicked / opened) * 100 : 0,
    topLinks,
    deviceBreakdown,
    hourlyOpens,
  };
}
