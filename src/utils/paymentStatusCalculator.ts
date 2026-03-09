/**
 * Payment Status Calculator Utility
 * 
 * SINGLE SOURCE OF TRUTH for payment status calculation
 * Industry standard logic - simple and reliable
 */

export interface OrderPaymentData {
  total_amount: number;
  paid_amount: number;
}

export type PaymentStatus = 'unpaid' | 'partial_paid' | 'paid' | 'refunded' | 'cancelled';

/**
 * Calculate payment status - SINGLE FUNCTION FOR ALL CASES
 * 
 * Logic (Industry Standard):
 * - total <= 0 → paid (free order)
 * - paid = 0 → unpaid
 * - paid < total → partial_paid
 * - paid >= total → paid (includes overpaid)
 */
export function calculatePaymentStatus({
  total,
  paid,
}: {
  total: number;
  paid: number;
}): PaymentStatus {
  const totalAmount = Number(total || 0);
  const paidAmount = Number(paid || 0);

  // Free order or negative total
  if (totalAmount <= 0.01) {
    return 'paid';
  }

  // Nothing paid
  if (paidAmount <= 0.01) {
    return 'unpaid';
  }

  // Partial payment
  if (paidAmount < totalAmount - 0.01) {
    return 'partial_paid';
  }

  // Fully paid or overpaid
  return 'paid';
}

/**
 * Recalculate order payment status - wrapper for consistency
 */
export function recalculateOrderPaymentStatus(orderData: OrderPaymentData): PaymentStatus {
  return calculatePaymentStatus({
    total: orderData.total_amount,
    paid: orderData.paid_amount,
  });
}

/**
 * Calculate new payment status after adjustment - SIMPLIFIED
 * Just pass new total and new paid amount
 */
export function calculatePaymentStatusAfterAdjustment(
  newTotal: number,
  newPaidAmount: number
): PaymentStatus {
  return calculatePaymentStatus({
    total: newTotal,
    paid: newPaidAmount,
  });
}

/**
 * Calculate the balance due for an order
 */
export function calculateBalanceDue(
  totalAmount: number,
  paidAmount: number
): number {
  return Math.max(0, totalAmount - paidAmount);
}

/**
 * Determine if an order needs payment adjustment modal
 */
export function needsPaymentAdjustment(
  originalAmount: number,
  newAmount: number,
  currentPaymentStatus: string
): boolean {
  const difference = Math.abs(newAmount - originalAmount);
  
  // No adjustment needed if amounts are the same (within tolerance)
  if (difference < 0.01) {
    return false;
  }

  // If order is unpaid, no adjustment needed (nothing paid yet)
  if (currentPaymentStatus === 'unpaid') {
    return false;
  }

  // If order is paid or partial_paid, adjustment is needed
  return true;
}
