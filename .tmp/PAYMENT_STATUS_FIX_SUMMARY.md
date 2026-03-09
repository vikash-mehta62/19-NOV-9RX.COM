# Payment Status Fix Summary

## Problem
Payment status was not updating correctly after order modifications and payment adjustments. The issues were:

1. When order increased from $100 (paid) → $150, status became `partial_paid` ✓
2. When order decreased back to $100, status should return to `paid` but didn't ✗
3. When "Charge Saved Card" was used, status should become `paid` but didn't ✗
4. When "Send Payment Link" was used, status should stay `partial_paid` but wasn't calculated ✗
5. When "Use Credit Line" was used, status should become `paid` but didn't ✗

## Solution

### 1. Created Payment Status Calculator Utility
**File:** `src/utils/paymentStatusCalculator.ts`

This utility provides centralized logic for calculating payment status:

- `recalculateOrderPaymentStatus()` - Calculates status based on total, paid, and credit memo amounts
- `calculatePaymentStatusAfterAdjustment()` - Calculates status after specific adjustment actions
- `calculateBalanceDue()` - Calculates remaining balance
- `needsPaymentAdjustment()` - Determines if adjustment modal is needed

**Logic:**
- Total ≤ 0 → `paid`
- Paid + Credit ≥ Total → `paid`
- Paid + Credit > 0 but < Total → `partial_paid`
- No payment → `unpaid`

### 2. Updated Payment Adjustment Modal
**File:** `src/components/orders/PaymentAdjustmentModal.tsx`

Added payment status updates for each adjustment action:

#### None - Save Order Only
```typescript
const newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount, // what was already paid
  creditMemoBalance,
  'none'
);

await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

#### Charge Saved Card
```typescript
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount,
  creditMemoBalance,
  'collect_payment'
);

await supabase
  .from('orders')
  .update({ 
    payment_status: newPaymentStatus,
    paid_amount: originalAmount + absoluteDifference 
  })
  .eq('id', orderId);
```

#### Send Payment Link
```typescript
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount, // no new payment yet
  creditMemoBalance,
  'send_payment_link'
);

await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

#### Use Credit Line
```typescript
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount,
  creditMemoBalance,
  'use_credit'
);

await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

#### Issue Credit Memo
```typescript
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount,
  creditMemoBalance + absoluteDifference, // increased credit
  'issue_credit_memo'
);

await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

#### Process Refund
```typescript
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount - absoluteDifference, // reduced paid amount
  creditMemoBalance,
  'process_refund'
);

await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

## Expected Behavior After Fix

### Scenario 1: Order Increase
- Order: $100 (paid) → $150
- Action: None → Status: `partial_paid` (paid $100, owes $50)
- Action: Charge Card → Status: `paid` (paid $150)
- Action: Send Link → Status: `partial_paid` (paid $100, link sent for $50)
- Action: Use Credit → Status: `paid` (paid via credit line)

### Scenario 2: Order Decrease Back
- Order: $150 (partial_paid, paid $100) → $100
- Action: None → Status: `paid` (paid $100, total $100)
- Action: Issue Credit → Status: `paid` (paid $100, total $100, credit $50)
- Action: Refund → Status: `paid` (paid $50, total $100, refunded $50)

### Scenario 3: Unpaid Order
- Order: $100 (unpaid) → $150
- No adjustment modal shown (nothing paid yet)

## Files Modified
1. ✅ `src/utils/paymentStatusCalculator.ts` - Created
2. ⚠️ `src/components/orders/PaymentAdjustmentModal.tsx` - Needs manual update

## Manual Steps Required

Due to template literal escaping issues in the replacement tool, you need to manually add the payment status updates to `PaymentAdjustmentModal.tsx`:

1. Import the calculator at the top (already done)
2. Add `let newPaymentStatus: string;` declaration (already done)
3. Add payment status updates after each action's toast/result (see `.tmp/handleSubmit_fixed.tsx` for complete code)

The complete fixed `handleSubmit` function is available in `.tmp/handleSubmit_fixed.tsx` for reference.

## Testing Checklist

- [ ] Order $100 paid → increase to $150 → "None" → Status: partial_paid
- [ ] Order $100 paid → increase to $150 → "Charge Card" → Status: paid
- [ ] Order $100 paid → increase to $150 → "Send Link" → Status: partial_paid
- [ ] Order $100 paid → increase to $150 → "Use Credit" → Status: paid
- [ ] Order $150 partial ($100 paid) → decrease to $100 → "None" → Status: paid
- [ ] Order $150 partial ($100 paid) → decrease to $100 → "Issue Credit" → Status: paid
- [ ] Order $150 partial ($100 paid) → decrease to $100 → "Refund" → Status: paid
