import { supabase } from "@/integrations/supabase/client";
import { queueEmail } from "./emailQueueService";
import { createNotification } from "./notificationService";
import { getDocumentCategoryLabel } from "@/lib/customerDocumentStatus";

type ReminderType = "missing_expiry" | "expiring_soon" | "expired";

interface DueDocumentRow {
  id: string;
  customer_id: string;
  name: string;
  document_category?: string | null;
  document_number?: string | null;
  expires_at?: string | null;
  reminder_days_before?: number | null;
  profiles?: {
    id: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
  } | null;
}

interface ReminderResult {
  checked: number;
  emailQueued: number;
  notificationsCreated: number;
  skipped: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getReminderType(doc: DueDocumentRow): { type: ReminderType; subject: string; message: string } | null {
  const category = getDocumentCategoryLabel(doc.document_category);
  const displayName = doc.name || category;

  if (!doc.expires_at) {
    return {
      type: "missing_expiry",
      subject: `Action required: add expiry date for ${displayName}`,
      message: `Your ${category} document "${displayName}" is missing an expiry date. Please update it so renewals can be tracked.`,
    };
  }

  const expiry = new Date(doc.expires_at);
  expiry.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / ONE_DAY_MS);

  if (daysLeft < 0) {
    return {
      type: "expired",
      subject: `Expired document: ${displayName}`,
      message: `Your ${category} document "${displayName}" expired on ${expiry.toLocaleDateString()}. Please upload a renewed copy.`,
    };
  }

  const reminderWindow = Number(doc.reminder_days_before || 30);
  if (daysLeft <= reminderWindow) {
    return {
      type: "expiring_soon",
      subject: `Document expiring in ${daysLeft} day${daysLeft === 1 ? "" : "s"}: ${displayName}`,
      message: `Your ${category} document "${displayName}" expires on ${expiry.toLocaleDateString()}. Please renew it before it expires.`,
    };
  }

  return null;
}

async function hasRecentReminder(doc: DueDocumentRow, type: ReminderType) {
  const sevenDaysAgo = new Date(Date.now() - 7 * ONE_DAY_MS).toISOString();

  const { data, error } = await supabase
    .from("customer_document_reminder_logs")
    .select("id")
    .eq("customer_document_id", doc.id)
    .eq("reminder_type", type)
    .gte("sent_at", sevenDaysAgo)
    .limit(1);

  if (error) throw error;
  return Boolean(data && data.length > 0);
}

async function logReminder(
  doc: DueDocumentRow,
  type: ReminderType,
  sentViaEmail: boolean,
  sentViaNotification: boolean
) {
  const { error } = await supabase.from("customer_document_reminder_logs").insert({
    customer_document_id: doc.id,
    customer_id: doc.customer_id,
    reminder_type: type,
    reminder_window_days: Number(doc.reminder_days_before || 30),
    sent_via_email: sentViaEmail,
    sent_via_notification: sentViaNotification,
    metadata: {
      document_name: doc.name,
      document_category: doc.document_category || "other",
      expires_at: doc.expires_at,
    },
  });

  if (error) throw error;
}

export async function processCustomerDocumentReminders(): Promise<ReminderResult> {
  const result: ReminderResult = {
    checked: 0,
    emailQueued: 0,
    notificationsCreated: 0,
    skipped: 0,
  };

  const { data, error } = await supabase
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

  if (error) throw error;

  const docs = (data || []) as DueDocumentRow[];

  for (const doc of docs) {
    result.checked++;

    const reminder = getReminderType(doc);
    if (!reminder || !doc.profiles?.id) {
      result.skipped++;
      continue;
    }

    const alreadySent = await hasRecentReminder(doc, reminder.type);
    if (alreadySent) {
      result.skipped++;
      continue;
    }

    let emailQueued = false;
    let notificationCreated = false;
    const customerName =
      doc.profiles.display_name ||
      `${doc.profiles.first_name || ""} ${doc.profiles.last_name || ""}`.trim() ||
      "Customer";

    if (doc.profiles.email) {
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 12px;">Document reminder</h2>
          <p>Hello ${customerName},</p>
          <p>${reminder.message}</p>
          <p>Please sign in to your 9RX account and update the document details or upload a replacement.</p>
        </div>
      `;

      const queueResult = await queueEmail({
        email: doc.profiles.email,
        subject: reminder.subject,
        html_content: html,
        metadata: {
          user_id: doc.customer_id,
          user_name: customerName,
          reminder_type: reminder.type,
          document_id: doc.id,
        },
      });

      emailQueued = queueResult.success;
      if (queueResult.success) {
        result.emailQueued++;
      }
    }

    try {
      await createNotification({
        user_id: doc.customer_id,
        title: "Document reminder",
        message: reminder.message,
        type: reminder.type === "expired" ? "error" : "warning",
        link: "/pharmacy/settings",
        metadata: {
          document_id: doc.id,
          reminder_type: reminder.type,
          expires_at: doc.expires_at,
        },
      });
      notificationCreated = true;
      result.notificationsCreated++;
    } catch (notificationError) {
      console.error("Failed to create document notification:", notificationError);
    }

    await logReminder(doc, reminder.type, emailQueued, notificationCreated);
  }

  return result;
}
