/**
 * Payment calculation utilities for orders
 * Handles paid amounts, balance due, and payment status
 */

import { supabase } from "@/integrations/supabase/client";

export interface PaymentSummary {
  paidAmount: number;
  balanceDue: number;
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
  isPending: boolean;
}

/**
 * Calculate payment summary for an order
 * @param orderId - Order ID
 * @param totalAmount - Total order amount
 * @param paymentStatus - Current payment status from order
 * @returns Payment summary with paid amount and balance due
 */
export async function calculatePaymentSummary(
  orderId: string,
  totalAmount: number,
  paymentStatus: string
): Promise<PaymentSummary> {
  try {
    // Fetch all payment transactions for this order
    const { data: transactions, error } = await supabase
      .from("payment_transactions")
      .select("amount, status, transaction_type")
      .eq("order_id", orderId);

    if (error) {
      console.error("Error fetching payment transactions:", error);
      // Fallback to payment status
      return getPaymentSummaryFromStatus(totalAmount, paymentStatus);
    }

    // Calculate total paid amount from successful transactions
    const paidAmount = transactions
      ?.filter(tx => ['approved', 'completed', 'success'].includes(tx.status?.toLowerCase()))
      .reduce((sum, tx) => {
        if (tx.transaction_type?.toLowerCase() === 'refund') {
          return sum - Number(tx.amount);
        }
        return sum + Number(tx.amount);
      }, 0) || 0;

    // If no transactions found but order is marked as paid, assume full amount is paid
    // This handles legacy orders without transaction records
    const finalPaidAmount = paidAmount === 0 && paymentStatus === 'paid' 
      ? totalAmount 
      : paidAmount;

    // Calculate balance due with proper rounding to avoid floating point issues
    const rawBalanceDue = totalAmount - finalPaidAmount;
    const balanceDue = Math.abs(rawBalanceDue) < 0.01 ? 0 : Math.max(0, rawBalanceDue);
    
    const isFullyPaid = balanceDue === 0 && finalPaidAmount > 0;
    const isPartiallyPaid = finalPaidAmount > 0 && balanceDue > 0;
    const isPending = finalPaidAmount === 0;

    return {
      paidAmount: finalPaidAmount,
      balanceDue,
      isFullyPaid,
      isPartiallyPaid,
      isPending,
    };
  } catch (error) {
    console.error("Error calculating payment summary:", error);
    return getPaymentSummaryFromStatus(totalAmount, paymentStatus);
  }
}

/**
 * Fallback payment summary based on payment status only
 */
function getPaymentSummaryFromStatus(totalAmount: number, paymentStatus: string): PaymentSummary {
  const isFullyPaid = paymentStatus === 'paid';
  const paidAmount = isFullyPaid ? totalAmount : 0;
  const balanceDue = isFullyPaid ? 0 : totalAmount;

  return {
    paidAmount,
    balanceDue,
    isFullyPaid,
    isPartiallyPaid: false,
    isPending: !isFullyPaid,
  };
}

/**
 * Create a payment transaction record for legacy paid orders
 * This ensures proper tracking when orders are modified
 */
export async function ensurePaymentTransactionExists(
  orderId: string,
  profileId: string,
  amount: number,
  paymentStatus: string
): Promise<boolean> {
  try {
    // Check if transaction already exists
    const { count } = await supabase
      .from("payment_transactions")
      .select("*", { count: 'exact', head: true })
      .eq("order_id", orderId);

    // If no transactions exist but order is paid, create a legacy record
    if (count === 0 && paymentStatus === 'paid' && amount > 0) {
      // Get invoice ID if exists
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      const { error } = await supabase
        .from("payment_transactions")
        .insert({
          order_id: orderId,
          profile_id: profileId,
          invoice_id: invoiceData?.id,
          amount: amount,
          status: 'completed',
          transaction_type: 'payment',
          payment_method_type: 'legacy_record',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error creating legacy payment transaction:", error);
        return false;
      }

      console.log(`Created legacy payment transaction for order ${orderId}`);
      return true;
    }

    return true;
  } catch (error) {
    console.error("Error ensuring payment transaction exists:", error);
    return false;
  }
}

/**
 * Format payment status for display
 */
export function getPaymentStatusDisplay(summary: PaymentSummary): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (summary.isFullyPaid) {
    return {
      label: "Paid",
      color: "text-green-700",
      bgColor: "bg-green-100",
    };
  }
  
  if (summary.isPartiallyPaid) {
    return {
      label: "Partial",
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
    };
  }
  
  return {
    label: "Unpaid",
    color: "text-red-700",
    bgColor: "bg-red-100",
  };
}