# 🧪 Test iPOS Pays Integration in Payment Modal

## ✅ What's Updated

Payment Modal (`src/components/PaymentModal.tsx`) ab automatically check karega:
1. User credit card select karta hai
2. "Pay" button click karta hai
3. System check karta hai iPOS Pays enabled hai ya nahi
4. Agar enabled hai → Redirect to iPOS Pays
5. Agar disabled hai → Use Authorize.Net (existing flow)

## 🔧 Setup Steps

### Step 1: Update Edge Function Credentials

**File:** `supabase/functions/ipospay-payment/index.ts`

**Lines 10-25:**
```typescript
const IPOSPAY_CONFIG = {
  enabled: true,  // ← Make sure this is true
  testMode: true, // ← true for sandbox
  
  sandbox: {
    tpn: "YOUR_SANDBOX_TPN",           // ← Your actual TPN
    authToken: "YOUR_SANDBOX_TOKEN",   // ← Your actual token
  },
  
  production: {
    tpn: "YOUR_PRODUCTION_TPN",
    authToken: "YOUR_PRODUCTION_TOKEN",
  },
};
```

### Step 2: Deploy Edge Function

```bash
supabase functions deploy ipospay-payment
```

### Step 3: Test Payment Flow

1. Go to your order page: `http://localhost:3000/admin/orders`
2. Click on an order
3. Click "Pay Now" or payment button
4. Payment modal opens
5. Select "Credit Card"
6. Fill in billing details (any dummy data)
7. Click "Pay $102.88"

**Expected Behavior:**

#### If iPOS Pays is Enabled:
```
1. Loading spinner shows
2. Toast message: "Redirecting to Payment Page"
3. Browser redirects to iPOS Pays
4. You see iPOS Pays payment form
5. Enter test card: 4111111111111111
6. Complete payment
7. Redirects back to your site
```

#### If iPOS Pays is Disabled/Not Configured:
```
1. Console shows: "ℹ️ iPOS Pays not configured - using Authorize.Net"
2. Payment processes with Authorize.Net (existing flow)
3. No redirect happens
```

## 🔍 Debugging

### Check Browser Console

**Open Console (F12) and look for:**

```javascript
// When payment starts
🔍 Checking if iPOS Pays is enabled...

// If iPOS Pays is enabled
✅ iPOS Pays enabled - redirecting to payment page

// If iPOS Pays is disabled
ℹ️ iPOS Pays not configured - using Authorize.Net

// If there's an error
❌ iPOS Pays error: [error message]
ℹ️ Falling back to Authorize.Net
```

### Check Edge Function Logs

```bash
supabase functions logs ipospay-payment --follow
```

**Look for:**
```
iPOS Pay request: { action: 'generatePaymentUrl' }
Using iPOS Pays environment: SANDBOX
TPN: 1234567890
Generating payment URL: { ... }
iPOS Pays response: { message: 'Url generated Successful', ... }
```

### Check localStorage

**In browser console:**
```javascript
// Check pending payment data
JSON.parse(localStorage.getItem('pending_payment'))

// Should show:
{
  transactionReferenceId: "ABC123XYZ",
  orderId: "...",
  orderNumber: "ORD-12345",
  amount: 102.88,
  baseAmount: 99.98,
  processingFee: 2.90,
  customerName: "EMail Test",
  customerEmail: "test@example.com",
  timestamp: "2024-..."
}
```

## 🎯 Test Scenarios

### Scenario 1: iPOS Pays Enabled (Success)

**Setup:**
- Edge function has valid credentials
- `enabled: true` in config

**Steps:**
1. Open payment modal
2. Select Credit Card
3. Fill billing info
4. Click Pay

**Expected:**
- ✅ Redirects to iPOS Pays
- ✅ Can complete payment
- ✅ Redirects back

### Scenario 2: iPOS Pays Disabled (Fallback)

**Setup:**
- Edge function has `enabled: false`
- OR no credentials

**Steps:**
1. Open payment modal
2. Select Credit Card
3. Fill card details
4. Click Pay

**Expected:**
- ✅ Uses Authorize.Net
- ✅ Payment processes normally
- ✅ No redirect

### Scenario 3: iPOS Pays Error (Fallback)

**Setup:**
- Edge function has invalid credentials

**Steps:**
1. Open payment modal
2. Select Credit Card
3. Click Pay

**Expected:**
- ⚠️ Shows error toast
- ✅ Falls back to Authorize.Net
- ✅ Can still complete payment

## 🃏 Test Cards

### iPOS Pays (Sandbox):
```
Success:
  Number: 4111111111111111
  Expiry: 12/25
  CVV: 123
  Name: Test User

Decline:
  Number: 4000000000000002
  Expiry: 12/25
  CVV: 123
  Name: Test User
```

### Authorize.Net (Sandbox):
```
Success:
  Number: 4111111111111111
  Expiry: 12/25
  CVV: 123
  Name: Test User
```

## 📊 Flow Diagram

```
User clicks "Pay" button
         ↓
Check if Credit Card selected?
         ↓ Yes
Try iPOS Pays
         ↓
Is iPOS Pays enabled?
    ↙         ↘
  Yes          No
   ↓            ↓
Redirect    Use Authorize.Net
to iPOS     (existing flow)
Pays
   ↓
Complete
payment
   ↓
Redirect
back
```

## 🐛 Common Issues

### "Redirecting to Payment Page" but nothing happens
**Solution:**
- Check edge function logs
- Verify credentials are correct
- Check browser console for errors

### Stuck on loading
**Solution:**
- Check if edge function is deployed
- Verify Supabase project URL is correct
- Check network tab for failed requests

### "Payment Error" toast
**Solution:**
- Check edge function logs for error details
- Verify TPN and Auth Token are correct
- Make sure `testMode` matches your credentials

### Payment processes with Authorize.Net instead
**Solution:**
- Check `enabled: true` in edge function
- Verify credentials are set
- Check edge function logs

## ✅ Success Checklist

- [ ] Edge function deployed
- [ ] Credentials updated in edge function
- [ ] `enabled: true` in config
- [ ] Payment modal opens
- [ ] Can select Credit Card
- [ ] Click Pay shows "Redirecting" toast
- [ ] Redirects to iPOS Pays
- [ ] iPOS Pays page loads
- [ ] Can enter test card
- [ ] Payment completes
- [ ] Redirects back to site

## 🎉 Next Steps

Once testing works:

1. **Create Callback Page** (to handle return from iPOS Pays)
2. **Update Order Status** (after successful payment)
3. **Get Production Credentials** (for live payments)
4. **Switch to Production** (`testMode: false`)
5. **Go Live!** 🚀

## 📞 Support

- iPOS Pays: devsupport@dejavoo.io
- Edge Function Logs: `supabase functions logs ipospay-payment`
- Browser Console: F12 → Console tab
