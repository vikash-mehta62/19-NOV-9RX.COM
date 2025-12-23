// Subscriber Management Service - Handles subscriptions, preferences, and suppression
import { supabase } from "@/integrations/supabase/client";

interface SubscriberData {
  email: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

// Add new subscriber
export async function addSubscriber(data: SubscriberData): Promise<{
  success: boolean;
  subscriberId?: string;
  error?: string;
}> {
  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from("email_subscribers")
      .select("id, status")
      .eq("email", data.email.toLowerCase())
      .single();

    if (existing) {
      // Reactivate if unsubscribed
      if (existing.status === "unsubscribed") {
        await supabase
          .from("email_subscribers")
          .update({
            status: "active",
            first_name: data.firstName,
            last_name: data.lastName,
            tags: data.tags || [],
            custom_fields: data.customFields || {},
          })
          .eq("id", existing.id);
        return { success: true, subscriberId: existing.id };
      }
      return { success: true, subscriberId: existing.id };
    }

    // Check suppression list
    const { data: suppressed } = await supabase
      .from("email_suppression_list")
      .select("id")
      .eq("email", data.email.toLowerCase())
      .single();

    if (suppressed) {
      return { success: false, error: "Email is on suppression list" };
    }

    // Create new subscriber
    const { data: subscriber, error } = await supabase
      .from("email_subscribers")
      .insert({
        email: data.email.toLowerCase(),
        first_name: data.firstName,
        last_name: data.lastName,
        user_id: data.userId,
        source: data.source || "signup",
        tags: data.tags || [],
        custom_fields: data.customFields || {},
        status: "active",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Set default preferences
    await setDefaultPreferences(subscriber.id);

    return { success: true, subscriberId: subscriber.id };
  } catch (error: any) {
    console.error("Error adding subscriber:", error);
    return { success: false, error: error.message };
  }
}

// Set default email preferences
async function setDefaultPreferences(subscriberId: string): Promise<void> {
  const defaultPreferences = [
    { preference_type: "marketing", is_enabled: true },
    { preference_type: "transactional", is_enabled: true },
    { preference_type: "newsletter", is_enabled: true },
    { preference_type: "promotional", is_enabled: true },
  ];

  await supabase.from("email_preferences").insert(
    defaultPreferences.map(pref => ({
      subscriber_id: subscriberId,
      ...pref,
    }))
  );
}

// Unsubscribe
export async function unsubscribe(
  email: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update subscriber status
    const { error: updateError } = await supabase
      .from("email_subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email", email.toLowerCase());

    if (updateError) throw updateError;

    // Add to suppression list
    await supabase.from("email_suppression_list").upsert({
      email: email.toLowerCase(),
      reason: "unsubscribe",
      notes: reason,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error unsubscribing:", error);
    return { success: false, error: error.message };
  }
}

// Update preferences
export async function updatePreferences(
  email: string,
  preferences: Record<string, boolean>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get subscriber
    const { data: subscriber } = await supabase
      .from("email_subscribers")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (!subscriber) {
      return { success: false, error: "Subscriber not found" };
    }

    // Update each preference
    for (const [type, enabled] of Object.entries(preferences)) {
      await supabase
        .from("email_preferences")
        .upsert({
          subscriber_id: subscriber.id,
          preference_type: type,
          is_enabled: enabled,
        });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating preferences:", error);
    return { success: false, error: error.message };
  }
}

// Get subscriber preferences
export async function getPreferences(email: string): Promise<Record<string, boolean> | null> {
  try {
    const { data: subscriber } = await supabase
      .from("email_subscribers")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (!subscriber) return null;

    const { data: preferences } = await supabase
      .from("email_preferences")
      .select("preference_type, is_enabled")
      .eq("subscriber_id", subscriber.id);

    if (!preferences) return null;

    return preferences.reduce((acc, pref) => {
      acc[pref.preference_type] = pref.is_enabled;
      return acc;
    }, {} as Record<string, boolean>);
  } catch (error) {
    console.error("Error getting preferences:", error);
    return null;
  }
}

// Handle bounce
export async function handleBounce(
  email: string,
  bounceType: "hard" | "soft"
): Promise<void> {
  try {
    const { data: subscriber } = await supabase
      .from("email_subscribers")
      .select("id, bounce_count")
      .eq("email", email.toLowerCase())
      .single();

    if (!subscriber) return;

    const newBounceCount = (subscriber.bounce_count || 0) + 1;

    // Hard bounce or 3+ soft bounces = suppress
    if (bounceType === "hard" || newBounceCount >= 3) {
      await supabase
        .from("email_subscribers")
        .update({
          status: "bounced",
          bounce_count: newBounceCount,
          last_bounce_at: new Date().toISOString(),
        })
        .eq("id", subscriber.id);

      await supabase.from("email_suppression_list").upsert({
        email: email.toLowerCase(),
        reason: "bounce",
        notes: `${bounceType} bounce, count: ${newBounceCount}`,
      });
    } else {
      await supabase
        .from("email_subscribers")
        .update({
          bounce_count: newBounceCount,
          last_bounce_at: new Date().toISOString(),
        })
        .eq("id", subscriber.id);
    }
  } catch (error) {
    console.error("Error handling bounce:", error);
  }
}

// Handle complaint (spam report)
export async function handleComplaint(email: string): Promise<void> {
  try {
    await supabase
      .from("email_subscribers")
      .update({
        status: "complained",
        complaint_at: new Date().toISOString(),
      })
      .eq("email", email.toLowerCase());

    await supabase.from("email_suppression_list").upsert({
      email: email.toLowerCase(),
      reason: "complaint",
      notes: "Spam complaint received",
    });
  } catch (error) {
    console.error("Error handling complaint:", error);
  }
}

// Add to suppression list manually
export async function suppressEmail(
  email: string,
  reason: "manual" | "invalid",
  notes?: string
): Promise<boolean> {
  try {
    await supabase.from("email_suppression_list").upsert({
      email: email.toLowerCase(),
      reason,
      notes,
    });

    await supabase
      .from("email_subscribers")
      .update({ status: "suppressed" })
      .eq("email", email.toLowerCase());

    return true;
  } catch (error) {
    console.error("Error suppressing email:", error);
    return false;
  }
}

// Remove from suppression list
export async function unsuppressEmail(email: string): Promise<boolean> {
  try {
    await supabase
      .from("email_suppression_list")
      .delete()
      .eq("email", email.toLowerCase());

    await supabase
      .from("email_subscribers")
      .update({ status: "active" })
      .eq("email", email.toLowerCase());

    return true;
  } catch (error) {
    console.error("Error unsuppressing email:", error);
    return false;
  }
}

// Import subscribers from CSV data
export async function importSubscribers(
  subscribers: SubscriberData[],
  tags?: string[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (const sub of subscribers) {
    const result = await addSubscriber({
      ...sub,
      tags: [...(sub.tags || []), ...(tags || [])],
      source: "import",
    });

    if (result.success) {
      results.imported++;
    } else {
      results.skipped++;
      if (result.error) {
        results.errors.push(`${sub.email}: ${result.error}`);
      }
    }
  }

  return results;
}

// Get subscriber stats
export async function getSubscriberStats(): Promise<{
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  complained: number;
  suppressed: number;
}> {
  const { data } = await supabase
    .from("email_subscribers")
    .select("status");

  if (!data) {
    return { total: 0, active: 0, unsubscribed: 0, bounced: 0, complained: 0, suppressed: 0 };
  }

  return {
    total: data.length,
    active: data.filter(s => s.status === "active").length,
    unsubscribed: data.filter(s => s.status === "unsubscribed").length,
    bounced: data.filter(s => s.status === "bounced").length,
    complained: data.filter(s => s.status === "complained").length,
    suppressed: data.filter(s => s.status === "suppressed").length,
  };
}

// Search subscribers
export async function searchSubscribers(
  query: string,
  filters?: {
    status?: string;
    tags?: string[];
    source?: string;
  },
  limit: number = 50
): Promise<any[]> {
  let dbQuery = supabase
    .from("email_subscribers")
    .select("*")
    .limit(limit);

  if (query) {
    dbQuery = dbQuery.or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
  }

  if (filters?.status) {
    dbQuery = dbQuery.eq("status", filters.status);
  }

  if (filters?.tags && filters.tags.length > 0) {
    dbQuery = dbQuery.contains("tags", filters.tags);
  }

  if (filters?.source) {
    dbQuery = dbQuery.eq("source", filters.source);
  }

  const { data } = await dbQuery.order("created_at", { ascending: false });
  return data || [];
}
