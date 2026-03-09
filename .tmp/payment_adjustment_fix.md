# Payment Adjustment Status Fix

## Summary
The payment status is not updating correctly after payment adjustments. Need to add payment status calculation and updates for:

1. **Send Payment Link** - After line 295 (after toast), add:
```typescript
// Calculate new payment status - payment link sent, should be partial_paid
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount,
  creditMemoBalance,
  'send_payment_link'
);

// Update order payment status
await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

2. **Use Credit Line** - After line 335 (after toast), add:
```typescript
// Calculate new payment status - credit line used, should be paid
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount,
  creditMemoBalance,
  'use_credit'
);

// Update order payment status
await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

3. **Issue Credit Memo** - After line 355 (after createAdjustment), add:
```typescript
// Calculate new payment status - credit memo issued
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount,
  creditMemoBalance + absoluteDifference,
  'issue_credit_memo'
);

// Update order payment status
await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

4. **Process Refund** - After line 395 (after createAdjustment), add:
```typescript
// Calculate new payment status - refund processed
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  originalAmount,
  newAmount,
  originalAmount - absoluteDifference,
  creditMemoBalance,
  'process_refund'
);

// Update order payment status
await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

## Files Modified
- src/components/orders/PaymentAdjustmentModal.tsx
- src/utils/paymentStatusCalculator.ts (created)
