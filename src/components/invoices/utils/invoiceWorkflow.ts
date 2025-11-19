
import { Invoice, InvoiceItem, InvoiceStatus, CustomerInfo } from "../types/invoice.types";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type InvoiceAction = 
  | "send"
  | "mark_paid"
  | "mark_overdue"
  | "cancel"
  | "remind";

export const getNextStatus = (currentStatus: InvoiceStatus, action: InvoiceAction): InvoiceStatus => {
  const statusTransitions = {
    draft: { send: "needs_payment_link" },
    needs_payment_link: { send: "payment_link_sent" },
    payment_link_sent: { mark_paid: "paid", mark_overdue: "overdue" },
    pending: { mark_paid: "paid", mark_overdue: "overdue" },
    overdue: { mark_paid: "paid" },
    paid: {},
    cancelled: {}
  } as const;

  return (statusTransitions[currentStatus]?.[action] as InvoiceStatus) || currentStatus;
};

export const handleInvoiceAction = async (
  invoice: Invoice,
  action: InvoiceAction
): Promise<void> => {
  try {
    const nextStatus = getNextStatus(invoice.status, action);
    
    if (nextStatus !== invoice.status) {
      const { error } = await supabase
        .from('invoices')
        .update({ status: nextStatus })
        .eq('id', invoice.id);

      if (error) throw error;
    }

    let customerInfo: CustomerInfo;
    if (typeof invoice.customer_info === 'string') {
      customerInfo = JSON.parse(invoice.customer_info);
    } else {
      customerInfo = invoice.customer_info as CustomerInfo;
    }

    const actionMessages = {
      send: `Invoice ${invoice.invoice_number} has been sent to ${customerInfo.email}`,
      mark_paid: `Invoice ${invoice.invoice_number} has been marked as paid`,
      mark_overdue: `Invoice ${invoice.invoice_number} has been marked as overdue`,
      cancel: `Invoice ${invoice.invoice_number} has been cancelled`,
      remind: `Payment reminder sent to ${customerInfo.email}`,
    };

    toast({
      title: "Success",
      description: actionMessages[action],
    });

  } catch (error) {
    console.error("Error in handleInvoiceAction:", error);
    toast({
      title: "Error",
      description: "Failed to process invoice action",
      variant: "destructive",
    });
  }
};

export const shouldShowReminder = (invoice: Invoice): boolean => {
  if (!["pending", "payment_link_sent", "overdue"].includes(invoice.status)) return false;
  
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysDiff >= 7;
};
