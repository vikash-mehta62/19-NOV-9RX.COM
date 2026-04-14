# iPOS Pays Complete Payment Flow

## How It Works

### 1. User Clicks "Pay Now" Button
When a user clicks the "Pay Now" button on an order:

```typescript
// OrdersList.tsx
onClick={() => {
  setSelectCustomerInfo(order);
  setModalIsOpen(true);  // Opens PaymentModal
}}
```

### 2. PaymentModal Automatically Redirects to iPOS
The PaymentModal component automatically checks if iPOS is enabled and redirects:

```typescript
// PaymentModal.tsx (line ~750)
const iPosResult = await processPaymentIPOSPay(
  processorChargeAmount,  // Amount to charge (may include processing fee)
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  description,
  merchantName,
  logoUrl
);

if (iPosResult.success && iPosResult.paymentUrl) {
  // Save payment info for callback
  localStorage.setItem('pending_payment', JSON.stringify({
    transactionReferenceId: iPosResult.transactionReferenceId,
    orderId,
    amount: processorChargeAmount,
    baseAmount: basePaymentAmount,  // Original amount without fees
    processingFee: cardProcessingFeeAmount,  // Expected processing fee
    // ... other data
  }));
  
  // Redirect to iPOS payment page
  window.location.href = iPosResult.paymentUrl;
}
```

### 3. Customer Pays on iPOS Page
Customer is redirected to iPOS secure payment page where they can:
- Pay with Credit Card (Visa, Mastercard, Amex, Discover)
- Pay with ACH/Bank Account (if enabled by ISO)

iPOS handles:
- Card validation
- CVV verification
- Processing fee calculation (if enabled)
- Payment processing
- Fraud detection

### 4. iPOS Redirects Back to Your Site
After payment (success or failure), iPOS redirects to:
```
https://your-site.com/payment/callback?responseCode=200&transactionId=xxx&amount=xxx&...
```

### 5. PaymentCallback Automatically Processes Everything
The `PaymentCallback.tsx` component automatically:

#### ✅ Detects Payment Method
```typescript
// Detects if ACH or Card payment
const isACHPayment = paymentMethod === "ACH" || !!achAccountLast4;
```

#### ✅ Auto-Detects Processing Fees
```typescript
// If charged amount > base amount, it's a credit card with processing fee
let processingFee = pendingPayment.processingFee || 0;
if (paymentAmount > baseAmount && processingFee === 0) {
  processingFee = paymentAmount - baseAmount;
  console.log("💳 Auto-detected credit card processing fee:", processingFee);
}
```

#### ✅ Updates Order
```typescript
await supabase.from("orders").update({
  payment_status: newPaymentStatus,  // "paid" or "partial_paid"
  paid_amount: newPaidAmount,
  total_amount: newTotalAmount,  // Includes processing fee
  processing_fee_amount: totalProcessingFee,
  payment_method: isACHPayment ? "ach" : "card",
  updated_at: new Date().toISOString(),
});
```

#### ✅ Logs Transaction
```typescript
await supabase.from("payment_transactions").insert({
  profile_id: order.profile_id,
  order_id: orderId,
  transaction_id: paymentData.transactionId,
  amount: paymentAmount,
  payment_method_type: isACHPayment ? "ach" : "card",
  card_last_four: isACHPayment ? accountLast4 : cardLast4,
  card_type: isACHPayment ? accountType : cardType,
  status: "approved",
  processor: "ipospay",
  // ... other fields
});
```

#### ✅ Deducts Inventory (if fully paid)
```typescript
if (newPaymentStatus === "paid" && order.payment_status !== "paid") {
  await deductInventory(orderId, order.items);
}
```

#### ✅ Creates Invoice (if fully paid)
```typescript
if (newPaymentStatus === "paid") {
  await createInvoiceForOrder(orderId, order, newTotalAmount);
}
```

#### ✅ Sends Confirmation Email
```typescript
await sendPaymentConfirmationEmail(order, paymentData);
```

### 6. User Sees Success/Failure Page
The callback page displays:
- ✅ Payment successful with transaction details
- ❌ Payment failed with error message
- Transaction ID, amount, payment method
- Button to view orders or try again

## Processing Fee Handling

### Scenario 1: ACH Payment (No Fee)
```
Base Amount: $100.00
iPOS Charges: $100.00
Processing Fee: $0.00
Order Total: $100.00
```

### Scenario 2: Credit Card Payment (With Fee)
```
Base Amount: $100.00
iPOS Charges: $103.00 (3% processing fee)
Processing Fee: $3.00 (auto-detected)
Order Total: $103.00
```

The system automatically detects the processing fee by comparing:
- `paymentAmount` (what iPOS charged)
- `baseAmount` (what was expected)
- If `paymentAmount > baseAmount`, the difference is the processing fee

## ACH Payment Detection

The callback automatically detects ACH payments from URL parameters:

```typescript
// ACH-specific URL params from iPOS
const paymentMethod = searchParams.get("paymentMethod"); // "ACH"
const accountType = searchParams.get("accountType"); // "checking" or "savings"
const accountLast4 = searchParams.get("accountLast4"); // "6789"
const routingNumber = searchParams.get("routingNumber"); // "021000021"

// Auto-detect ACH
const isACHPayment = paymentMethod === "ACH" || !!accountLast4;
```

## Error Handling

### Payment Failed
```typescript
if (!success) {
  // Log failed transaction
  await logFailedPayment(pendingPayment, paymentData);
  
  // Show error message with details
  toast.error("Payment failed: " + paymentData.responseMessage);
}
```

### CVV Mismatch Example
```
URL: /payment/callback?responseCode=400&errResponseCode=N7&errResponseMessage=CVV2%20MISMATCH

Display:
❌ Payment Failed
Error Details: CVV2 MISMATCH
Error Code: N7
```

## Complete Flow Diagram

```
User Clicks "Pay Now"
        ↓
PaymentModal Opens
        ↓
Check if iPOS Enabled
        ↓
Generate Payment URL (Edge Function)
        ↓
Save pending_payment to localStorage
        ↓
Redirect to iPOS Payment Page
        ↓
Customer Enters Payment Details
        ↓
iPOS Processes Payment
        ↓
iPOS Redirects to /payment/callback
        ↓
PaymentCallback Reads URL Params
        ↓
Detect Payment Method (ACH/Card)
        ↓
Auto-Detect Processing Fee
        ↓
Update Order Status
        ↓
Log Transaction
        ↓
Deduct Inventory (if paid)
        ↓
Create Invoice (if paid)
        ↓
Send Email
        ↓
Show Success/Failure Page
        ↓
User Clicks "View Orders"
        ↓
Done! ✅
```

## Key Features

✅ **Automatic Redirect**: No manual intervention needed  
✅ **Processing Fee Detection**: Automatically detects credit card fees  
✅ **ACH Support**: Handles both card and ACH payments  
✅ **Partial Payments**: Supports multiple payments on same order  
✅ **Inventory Management**: Auto-deducts stock when fully paid  
✅ **Invoice Generation**: Creates invoice when order is paid  
✅ **Error Handling**: Shows detailed error messages  
✅ **Transaction Logging**: Logs all payment attempts  

## Testing

### Test Card (Sandbox)
```
Card: 4111 1111 1111 1111
CVV: 999
Expiry: 12/25
```

### Test ACH (Sandbox)
```
Routing: 021000021
Account: 123456789
Type: Checking
```

## Deployment

1. Deploy edge function:
   ```bash
   supabase functions deploy ipospay-payment
   ```

2. Test payment flow:
   - Click "Pay Now" on an order
   - Verify redirect to iPOS
   - Complete payment
   - Verify callback updates order
   - Check transaction log

3. Enable ACH (if needed):
   - Contact iPOS support: devsupport@dejavoo.io
   - Request ACH enablement for TPN 133526975132

## Summary

The entire payment flow is **fully automated**:
1. User clicks "Pay Now" → Automatic redirect to iPOS
2. Customer pays on iPOS → Automatic callback to your site
3. Callback processes everything → Order updated, inventory deducted, invoice created
4. User sees result → Success or failure with details

**No manual intervention needed at any step!** 🎉
