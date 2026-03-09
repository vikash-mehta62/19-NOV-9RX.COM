# Final Payment Status Fix - Exact Instructions

## ✅ Already Done
1. ✅ Created simplified `src/utils/paymentStatusCalculator.ts`
2. ✅ Added `currentPaidAmount` state variable
3. ✅ Added `loadOrderData()` function to fetch actual paid_amount
4. ✅ Fixed "None" action to use `currentPaidAmount`
5. ✅ Fixed "Charge Saved Card" action to use `currentPaidAmount`

## ⚠️ Remaining Fixes Needed

### Fix 1: Send Payment Link (Line ~306)
**Location:** After `reason: reason || ...` line, BEFORE the toast

**Add this code:**
```typescript
// Calculate new payment status - payment link sent, should be partial_paid
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  newAmount,
  currentPaidAmount // no new payment yet
);

// Update order payment status
await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

### Fix 2: Use Credit Line (Line ~346)
**Location:** After the toast with "Credit Applied", BEFORE `} else {`

**Add this code:**
```typescript
// Calculate new payment status - credit line used, should be paid
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  newAmount,
  currentPaidAmount + absoluteDifference // credit line counts as payment
);

// Update order payment status
await supabase
  .from('orders')
  .update({ 
    payment_status: newPaymentStatus,
    paid_amount: currentPaidAmount + absoluteDifference
  })
  .eq('id', orderId);
```

### Fix 3: Issue Credit Memo (Line ~370)
**Location:** After the `createAdjustment` call inside `if (result.success)` block

**Add this code:**
```typescript
// Calculate new payment status - credit memo issued
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  newAmount,
  currentPaidAmount // paid amount unchanged
);

// Update order payment status
await supabase
  .from('orders')
  .update({ payment_status: newPaymentStatus })
  .eq('id', orderId);
```

### Fix 4: Process Refund (Line ~410)
**Location:** After the last `createAdjustment` call inside `if (result.success)` block

**Add this code:**
```typescript
// Calculate new payment status - refund processed
newPaymentStatus = calculatePaymentStatusAfterAdjustment(
  newAmount,
  currentPaidAmount - absoluteDifference // reduced paid amount
);

// Update order payment status
await supabase
  .from('orders')
  .update({ 
    payment_status: newPaymentStatus,
    paid_amount: currentPaidAmount - absoluteDifference
  })
  .eq('id', orderId);
```

### Fix 5: Display Paid Amount (Line ~450)
**Location:** In the "Paid Amount" display section

**Change from:**
```typescript
<span className="font-medium text-green-600">${originalAmount.toFixed(2)}</span>
```

**Change to:**
```typescript
<span className="font-medium text-green-600">${currentPaidAmount.toFixed(2)}</span>
```

## Testing Scenarios

### Test 1: Order Increase with "None"
- Initial: total=$100, paid=$100, status=paid
- Add items: total=$150
- Select "None - Save Order Only"
- Expected: total=$150, paid=$100, status=partial_paid ✅

### Test 2: Order Increase with "Charge Card"
- Initial: total=$100, paid=$100, status=paid
- Add items: total=$150
- Select "Charge Saved Card"
- Expected: total=$150, paid=$150, status=paid ✅

### Test 3: Order Decrease Back
- Initial: total=$150, paid=$100, status=partial_paid
- Remove items: total=$100
- Select "None - Save Order Only"
- Expected: total=$100, paid=$100, status=paid ✅

### Test 4: Send Payment Link
- Initial: total=$100, paid=$100, status=paid
- Add items: total=$150
- Select "Send Payment Link"
- Expected: total=$150, paid=$100, status=partial_paid ✅

### Test 5: Use Credit Line
- Initial: total=$100, paid=$100, status=paid
- Add items: total=$150
- Select "Use Credit Line"
- Expected: total=$150, paid=$150, status=paid ✅

## Key Points
1. **ALWAYS use `currentPaidAmount`** - this is the actual paid_amount from database
2. **NEVER use `originalAmount`** - this is the order total, not payment
3. **Simple formula**: `calculatePaymentStatusAfterAdjustment(newTotal, newPaidAmount)`
4. **Update both** `payment_status` AND `paid_amount` when payment changes

## Why This Works
- Single source of truth: `calculatePaymentStatus()` function
- No credit memo confusion: credit memo is NOT payment
- Correct paid_amount tracking: fetched from database
- Simple logic: paid < total = partial_paid, paid >= total = paid
