# 🎯 iPOS Pays Payment Gateway - Complete Hindi Guide

## 📋 Kya Kya Implemented Hai?

### ✅ **Working Features:**

1. **Edge Function** (`supabase/functions/ipospay-payment/index.ts`)
   - Hardcoded credentials (TPN: 133526975132)
   - Sandbox mode enabled
   - JWT verification disabled (`verify_jwt = false`)
   - Payment URL generation working
   - Payment status query working

2. **Payment Service** (`src/services/paymentService.ts`)
   - `processPaymentIPOSPay()` - Payment URL generate karta hai
   - `queryIPOSPayStatus()` - Payment status check karta hai
   - `isIPOSPayEnabled()` - Check karta hai iPOS Pays enabled hai ya nahi

3. **Helper Functions** (`src/services/iPosPayService.ts`)
   - `parseCallbackResponse()` - Callback data parse karta hai
   - `isPaymentSuccessful()` - Check karta hai payment successful hai
   - Amount conversion functions
   - Card type formatting

4. **Payment Modal** (`src/components/PaymentModal.tsx`)
   - iPOS Pays check karta hai
   - Agar enabled hai to redirect karta hai
   - Pending payment info localStorage mein save karta hai

5. **Payment Callback Page** (`src/pages/PaymentCallback.tsx`) ✨ **NEW!**
   - Payment verification
   - Order status update
   - Partial payment handling
   - Inventory deduction
   - Invoice creation
   - Email confirmation

6. **Payment Cancelled Page** (`src/pages/PaymentCancelled.tsx`) ✨ **NEW!**
   - User cancelled payment handling

7. **Routes** (`src/App.tsx`) ✨ **NEW!**
   - `/payment/callback` - Payment success/failure page
   - `/payment/cancel` - Payment cancelled page

---

## 🔄 Complete Payment Flow (Step by Step)

### **Scenario 1: New Order + Immediate Payment**

```
1. User order create karta hai
   ↓
2. Order status: "unpaid"
   ↓
3. User "Pay Now" button click karta hai
   ↓
4. System check karta hai: iPOS Pays enabled hai?
   ↓
5. Edge function call hota hai → Payment URL generate hota hai
   ↓
6. Pending payment info localStorage mein save hota hai:
   {
     transactionReferenceId: "ABC123",
     orderId: "order-123",
     amount: 100.00,
     baseAmount: 97.00,
     processingFee: 3.00
   }
   ↓
7. User iPOS Pays page pe redirect hota hai
   ↓
8. User card details enter karta hai
   ↓
9. Payment success hota hai
   ↓
10. User wapas aapki site pe aata hai: /payment/callback?responseCode=200&...
   ↓
11. Callback page localStorage se pending payment info uthata hai
   ↓
12. Payment data parse hota hai
   ↓
13. Order update hota hai:
    - payment_status: "paid"
    - paid_amount: 100.00
    - processing_fee_amount: 3.00
   ↓
14. Payment transaction log hota hai (payment_transactions table)
   ↓
15. Inventory deduct hoti hai (RPC function call)
   ↓
16. Invoice create hota hai
   ↓
17. Email bhejta hai (optional)
   ↓
18. Success page dikhta hai
```

---

### **Scenario 2: Existing Order + Later Payment**

```
1. Order pehle se hai (status: "unpaid")
   ↓
2. User "Pay Now" button click karta hai
   ↓
3. Same flow as Scenario 1
   ↓
4. Order update hota hai
   ↓
5. Inventory deduct hoti hai
   ↓
6. Invoice create hota hai
```

---

### **Scenario 3: Partial Payment**

```
Example: Order total = $100

FIRST PAYMENT ($50):
1. User $50 pay karta hai
   ↓
2. Payment successful
   ↓
3. Order update:
   - payment_status: "partial_paid"
   - paid_amount: 50.00
   - total_amount: 100.00
   ↓
4. Inventory NAHI deduct hoti (kyunki abhi pura payment nahi hua)
   ↓
5. Invoice NAHI create hota
   ↓
6. Transaction log hota hai

SECOND PAYMENT ($50):
1. User remaining $50 pay karta hai
   ↓
2. Payment successful
   ↓
3. Order update:
   - payment_status: "paid"
   - paid_amount: 100.00
   - total_amount: 100.00
   ↓
4. Inventory AB deduct hoti hai (kyunki ab pura payment ho gaya)
   ↓
5. Invoice AB create hota hai
   ↓
6. Email bhejta hai
```

---

### **Scenario 4: Failed Payment**

```
1. User payment karta hai
   ↓
2. Payment fail hota hai (card declined, insufficient funds, etc.)
   ↓
3. User wapas aata hai: /payment/callback?responseCode=400&...
   ↓
4. Callback page error detect karta hai
   ↓
5. Failed transaction log hota hai:
   - status: "declined"
   - error_message: "Card declined"
   ↓
6. Order status NAHI change hota (still "unpaid")
   ↓
7. Error page dikhta hai
   ↓
8. User "Try Again" button se wapas try kar sakta hai
```

---

## 💾 Database Changes

### **Orders Table:**
```sql
-- Payment ke baad ye fields update hote hain:
payment_status: "unpaid" → "partial_paid" → "paid"
paid_amount: 0 → 50 → 100
processing_fee_amount: 0 → 3 → 3
payment_method: "card"
updated_at: current timestamp
```

### **Payment Transactions Table:**
```sql
-- Har payment ke liye ek entry create hoti hai:
INSERT INTO payment_transactions (
  profile_id,
  order_id,
  transaction_id,        -- iPOS Pays transaction ID
  auth_code,             -- Approval code
  transaction_type,      -- "auth_capture"
  amount,                -- Payment amount
  payment_method_type,   -- "card"
  card_last_four,        -- "1234"
  card_type,             -- "visa"
  status,                -- "approved" or "declined"
  processor,             -- "ipospay"
  response_code,         -- "200" or "400"
  response_message,      -- "Payment successful"
  raw_response           -- Full iPOS Pays response
)
```

### **Invoices Table:**
```sql
-- Jab fully paid hota hai tab invoice create hota hai:
INSERT INTO invoices (
  invoice_number,        -- Auto-generated
  order_id,
  profile_id,
  status,                -- "pending"
  amount,                -- Subtotal
  tax_amount,            -- Tax
  total_amount,          -- Total
  payment_status,        -- "paid"
  payment_method,        -- "card"
  items,                 -- Order items
  customer_info,         -- Customer details
  shipping_info          -- Shipping address
)
```

---

## 🔍 Verification Kaise Karein?

### **1. Payment URL Generation Test:**
```javascript
// Browser console mein run karein:
const result = await processPaymentIPOSPay(
  100.00,                    // amount
  "test-order-123",          // orderId
  "John Doe",                // customerName
  "john@example.com",        // customerEmail
  "1234567890",              // customerMobile
  "Test Order",              // description
  "9RX Pharmacy"             // merchantName
);

console.log(result);
// Expected: { success: true, paymentUrl: "https://...", transactionReferenceId: "..." }
```

### **2. Database Verification:**
```sql
-- Order status check karein:
SELECT 
  id,
  order_number,
  payment_status,
  total_amount,
  paid_amount,
  processing_fee_amount
FROM orders 
WHERE id = 'YOUR_ORDER_ID';

-- Payment transactions check karein:
SELECT 
  transaction_id,
  amount,
  status,
  processor,
  card_last_four,
  created_at
FROM payment_transactions 
WHERE order_id = 'YOUR_ORDER_ID'
ORDER BY created_at DESC;

-- Invoice check karein:
SELECT 
  invoice_number,
  total_amount,
  payment_status
FROM invoices 
WHERE order_id = 'YOUR_ORDER_ID';

-- Inventory check karein:
SELECT 
  product_id,
  size_id,
  stock
FROM product_sizes 
WHERE id IN (
  SELECT size_id 
  FROM order_items 
  WHERE order_id = 'YOUR_ORDER_ID'
);
```

---

## 🧪 Testing Guide

### **Test Cards (Sandbox Mode):**

| Card Number | Expiry | CVV | Result |
|------------|--------|-----|--------|
| 4111111111111111 | 12/25 | 123 | Success |
| 4000000000000002 | 12/25 | 123 | Declined |
| 5555555555554444 | 12/25 | 123 | Success |
| 378282246310005 | 12/25 | 1234 | Success (Amex) |

### **Test Scenarios:**

#### **Test 1: Full Payment**
```
1. Create order: $100
2. Pay full amount: $100
3. Verify:
   ✅ Order status = "paid"
   ✅ paid_amount = 100
   ✅ Inventory deducted
   ✅ Invoice created
   ✅ Transaction logged
```

#### **Test 2: Partial Payment**
```
1. Create order: $100
2. Pay partial: $50
3. Verify:
   ✅ Order status = "partial_paid"
   ✅ paid_amount = 50
   ❌ Inventory NOT deducted
   ❌ Invoice NOT created
4. Pay remaining: $50
5. Verify:
   ✅ Order status = "paid"
   ✅ paid_amount = 100
   ✅ Inventory deducted NOW
   ✅ Invoice created NOW
```

#### **Test 3: Failed Payment**
```
1. Create order: $100
2. Use decline card: 4000000000000002
3. Verify:
   ✅ Order status = still "unpaid"
   ✅ paid_amount = 0
   ✅ Transaction logged as "declined"
   ✅ Error message shown
```

#### **Test 4: Cancelled Payment**
```
1. Create order: $100
2. Click "Pay Now"
3. On iPOS Pays page, click "Cancel"
4. Verify:
   ✅ Redirected to /payment/cancel
   ✅ Order status = still "unpaid"
   ✅ Can try again
```

---

## 🚨 Common Issues & Solutions

### **Issue 1: Payment URL Not Generating**
```
Error: "GATEWAY_DISABLED" or "MISSING_CREDENTIALS"

Solution:
1. Check edge function credentials:
   - TPN: 133526975132
   - Auth Token: Valid token from dashboard
2. Check edge function deployed:
   - Go to Supabase Dashboard → Edge Functions
   - Verify "ipospay-payment" is deployed
3. Check config.toml:
   - verify_jwt = false for ipospay-payment
```

### **Issue 2: Callback Page Not Working**
```
Error: "No pending payment found"

Solution:
1. Check localStorage:
   - Open browser console
   - Run: localStorage.getItem('pending_payment')
   - Should show payment info
2. Check if redirect happened too fast:
   - Add delay before redirect
3. Check callback URL:
   - Should be: /payment/callback
   - Not: /payment-callback or /callback
```

### **Issue 3: Order Not Updating**
```
Error: "Failed to update order"

Solution:
1. Check Supabase permissions:
   - orders table should allow UPDATE
2. Check order exists:
   - SELECT * FROM orders WHERE id = 'order-id'
3. Check RLS policies:
   - Disable RLS temporarily for testing
4. Check console logs:
   - Look for error messages
```

### **Issue 4: Inventory Not Deducting**
```
Error: "Inventory deduction failed"

Solution:
1. Check RPC function exists:
   - SELECT * FROM pg_proc WHERE proname = 'deduct_order_stock_after_payment_atomic'
2. Check function permissions:
   - GRANT EXECUTE ON FUNCTION deduct_order_stock_after_payment_atomic TO authenticated
3. Check order items:
   - Verify order has items with valid size_ids
4. Check stock availability:
   - SELECT stock FROM product_sizes WHERE id = 'size-id'
```

### **Issue 5: Invoice Not Creating**
```
Error: "Invoice creation failed"

Solution:
1. Check invoice already exists:
   - SELECT * FROM invoices WHERE order_id = 'order-id'
2. Check invoice number generation:
   - SELECT generate_invoice_number()
3. Check required fields:
   - profile_id, order_id, total_amount must be present
```

---

## 🔐 Security Considerations

### **1. Credentials:**
- ✅ Hardcoded in edge function (not in frontend)
- ✅ Edge function deployed on Supabase (secure)
- ⚠️ For production: Use environment variables

### **2. Payment Verification:**
- ✅ Callback verifies payment status
- ✅ Transaction logged in database
- ✅ Order updated atomically

### **3. Inventory:**
- ✅ Deducted only after full payment
- ✅ Uses RPC function (atomic operation)
- ✅ Prevents double deduction

---

## 📝 Next Steps

### **For Testing:**
1. ✅ Create test order
2. ✅ Click "Pay Now"
3. ✅ Complete payment on iPOS Pays
4. ✅ Verify callback works
5. ✅ Check order updated
6. ✅ Check inventory deducted
7. ✅ Check invoice created

### **For Production:**
1. ❌ Get production credentials from iPOS Pays
2. ❌ Update edge function:
   ```typescript
   production: {
     tpn: "YOUR_PRODUCTION_TPN",
     authToken: "YOUR_PRODUCTION_TOKEN",
   }
   ```
3. ❌ Change testMode to false:
   ```typescript
   testMode: false
   ```
4. ❌ Deploy edge function
5. ❌ Test with real card (small amount)
6. ❌ Monitor first few transactions
7. ❌ Enable for all users

---

## 📞 Support

### **iPOS Pays Support:**
- Email: devsupport@dejavoo.io
- Docs: https://docs.ipospays.com
- Dashboard: https://payment.ipospays.tech (sandbox)

### **Current Credentials:**
- TPN: 133526975132
- Environment: Sandbox
- Auth Token: Valid (expires periodically)

---

## 🎉 Summary

**Kya Kya Ho Gaya:**
1. ✅ Edge function with hardcoded credentials
2. ✅ Payment URL generation
3. ✅ Redirect to iPOS Pays
4. ✅ Payment callback page
5. ✅ Payment verification
6. ✅ Order status update
7. ✅ Partial payment handling
8. ✅ Inventory deduction
9. ✅ Invoice creation
10. ✅ Transaction logging

**Kya Karna Hai:**
1. Test karein different scenarios
2. Verify database changes
3. Check inventory deduction
4. Test partial payments
5. Test failed payments
6. Production credentials lein
7. Production mode enable karein

**Kaise Test Karein:**
1. Order create karein
2. "Pay Now" click karein
3. Test card use karein: 4111111111111111
4. Payment complete karein
5. Callback page check karein
6. Database verify karein
7. Inventory check karein

Bas! Ab aapka payment system ready hai! 🚀
