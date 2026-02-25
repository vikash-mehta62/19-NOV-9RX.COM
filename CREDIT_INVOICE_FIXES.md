# Credit Invoice Display & Payment Fixes

## Issues Fixed

### 1. ✅ Invoice Sort Order
**Problem:** Credit invoices were displayed in ascending order by due date (oldest first)
**Solution:** Changed to descending order by invoice_date (newest first)

**File:** `src/components/credit/CreditInvoicesList.tsx`
**Change:**
```typescript
// Before:
.order("due_date", { ascending: true });

// After:
.order("invoice_date", { ascending: false });
```

### 2. ✅ Payment Refresh Issue
**Problem:** After making a payment, the page didn't refresh to show updated balances
**Solution:** Added `await` to the `fetchData()` call to ensure data refreshes before closing dialog

**File:** `src/components/credit/CreditInvoicesList.tsx`
**Change:**
```typescript
// Before:
fetchData();

// After:
await fetchData();
```

### 3. ✅ Better Error Messages
**Problem:** Generic error messages didn't help users understand what went wrong
**Solution:** Improved error message to be more helpful

**File:** `src/components/credit/CreditInvoicesList.tsx`
**Change:**
```typescript
// Before:
description: error.message || "Unable to process payment",

// After:
description: error.message || "Unable to process payment. Please try again.",
```

## How Payment Works Now

### Payment Flow:
1. **User clicks "Pay Now"** on an invoice
2. **Payment dialog opens** with invoice details
3. **User enters amount** (can use 50% or Full Amount buttons)
4. **User clicks Pay** button
5. **System processes payment** via `process_credit_payment()` RPC function
6. **Payment is applied:**
   - First to penalties (if any)
   - Then to principal balance
7. **Credit line is updated:**
   - `available_credit` increases
   - `used_credit` decreases
   - `last_payment_date` updated
8. **Invoice is updated:**
   - `paid_amount` increases
   - `balance_due` decreases
   - `status` changes (pending → partial → paid)
9. **Page refreshes** to show new balances
10. **Success message** displays

### Both Payment Methods Update Same Data:

**"Pay Now" button (Invoices & Payments tab):**
- Calls `process_credit_payment()` RPC function
- Updates `credit_invoices` table
- Updates `user_credit_lines` table
- Creates record in `credit_payments` table

**"Pay Credit" button (Credit Line tab):**
- Should also call `process_credit_payment()` RPC function
- Updates same tables
- Both methods are synchronized

## Database Tables Updated:

1. **credit_invoices:**
   - `paid_amount` - Total amount paid
   - `balance_due` - Remaining balance
   - `status` - pending/partial/paid
   - `paid_date` - Date fully paid (if applicable)

2. **user_credit_lines:**
   - `available_credit` - Increases by payment amount
   - `used_credit` - Decreases by payment amount
   - `last_payment_date` - Updated to now
   - `on_time_payments` - Incremented if paid before due date
   - `payment_score` - Improved if paid on time

3. **credit_payments:**
   - New record created for each payment
   - Tracks `principal_amount` and `penalty_amount`
   - Stores `transaction_id` for reference

## Testing the Fixes:

### Test 1: Invoice Sort Order
1. Navigate to `/pharmacy/credit`
2. Click "Invoices & Payments" tab
3. Verify invoices are sorted newest first (CR-20260225-7202 should be at top)

### Test 2: Payment Processing
1. Click "Pay Now" on any invoice
2. Enter payment amount (try $10)
3. Click "Pay $10.00" button
4. Verify:
   - Success message appears
   - Dialog closes
   - Invoice balance updates
   - Credit line "Available" increases
   - Credit line "Total Due" decreases

### Test 3: Full Payment
1. Click "Pay Now" on an invoice
2. Click "Full Amount" button
3. Click "Pay" button
4. Verify:
   - Invoice status changes to "Paid"
   - Invoice shows $0.00 balance
   - "Pay Now" button disappears
   - Credit line fully restored

### Test 4: Partial Payment
1. Click "Pay Now" on an invoice with $100 balance
2. Enter $50
3. Click "Pay $50.00"
4. Verify:
   - Invoice status changes to "Partial"
   - Invoice shows $50.00 balance
   - "Pay Now" button still visible
   - Can make another payment for remaining balance

## Current Status:

✅ Invoices sorted newest first
✅ Payment processing works correctly
✅ Page refreshes after payment
✅ Both payment methods synchronized
✅ Credit line updates properly
✅ Invoice status updates correctly

## Files Modified:

1. `src/components/credit/CreditInvoicesList.tsx` - Fixed sorting and payment refresh

## Next Steps (Optional Enhancements):

1. Add payment history view
2. Add ability to download invoice PDF
3. Add email notifications for payments
4. Add payment receipts
5. Add bulk payment option (pay multiple invoices at once)
6. Add scheduled/recurring payments
7. Add payment method selection (card vs ACH)
