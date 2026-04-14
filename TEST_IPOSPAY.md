# 🧪 iPOS Pays Testing Guide (Hardcoded Credentials)

## ✅ What Changed

Edge function ab database se credentials nahi lega - sab hardcoded hai!

## 🔧 Step 1: Update Credentials in Edge Function

**File:** `supabase/functions/ipospay-payment/index.ts`

**Find this section (lines 10-25):**
```typescript
const IPOSPAY_CONFIG = {
  enabled: true,
  testMode: true, // true = Sandbox, false = Production
  
  // 📝 SANDBOX CREDENTIALS (for testing)
  sandbox: {
    tpn: "YOUR_SANDBOX_TPN_HERE",           
    authToken: "YOUR_SANDBOX_AUTH_TOKEN_HERE",
  },
  
  // 🚀 PRODUCTION CREDENTIALS (for live)
  production: {
    tpn: "YOUR_PRODUCTION_TPN_HERE",
    authToken: "YOUR_PRODUCTION_AUTH_TOKEN_HERE",
  },
};
```

**Update with your credentials:**
```typescript
const IPOSPAY_CONFIG = {
  enabled: true,
  testMode: true, // Keep true for testing
  
  sandbox: {
    tpn: "1234567890",  // Your actual sandbox TPN
    authToken: "f0bed899539742309eebd8XXXX7edcf615888XXXXXXXX", // Your actual token
  },
  
  production: {
    tpn: "YOUR_PRODUCTION_TPN_HERE",
    authToken: "YOUR_PRODUCTION_AUTH_TOKEN_HERE",
  },
};
```

## 🚀 Step 2: Deploy Edge Function

```bash
# Deploy
supabase functions deploy ipospay-payment

# Check logs
supabase functions logs ipospay-payment
```

## 🧪 Step 3: Test from Browser Console

**Open your app in browser, then open Console (F12)**

```javascript
// Test payment URL generation
const testPayment = async () => {
  const response = await fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/ipospay-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'generatePaymentUrl',
      amount: 10.00,
      orderId: 'TEST-001',
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      returnUrl: window.location.origin + '/payment/callback',
      failureUrl: window.location.origin + '/payment/callback',
      cancelUrl: window.location.origin + '/payment/cancel',
    })
  });
  
  const data = await response.json();
  console.log('Response:', data);
  
  if (data.success && data.paymentUrl) {
    console.log('✅ Payment URL:', data.paymentUrl);
    console.log('📝 Transaction Ref:', data.transactionReferenceId);
    
    // Open payment page
    window.open(data.paymentUrl, '_blank');
  } else {
    console.error('❌ Error:', data.error);
  }
};

// Run test
testPayment();
```

## 🎯 Step 4: Test from Your Payment Page

**Update your payment handler:**

```typescript
// In your payment component (where "Pay $102.88" button is)
const handlePayment = async () => {
  try {
    const result = await processPaymentIPOSPay(
      totalAmount,      // 102.88
      orderId,          // "ORD-12345"
      customerName,     // "EMail Test"
      customerEmail,    // "test@example.com"
      customerMobile,   // "+1234567890" (optional)
      `Order #${orderNumber}` // description
    );
    
    if (result.success && result.paymentUrl) {
      // Save for callback
      localStorage.setItem('pending_payment', JSON.stringify({
        transactionReferenceId: result.transactionReferenceId,
        orderId,
        amount: totalAmount,
      }));
      
      // Redirect to iPOS Pays
      window.location.href = result.paymentUrl;
    } else {
      toast.error(result.error || "Payment failed");
    }
  } catch (error) {
    console.error('Payment error:', error);
    toast.error("Failed to initiate payment");
  }
};
```

## 🃏 Test Cards (Sandbox)

```
✅ Success Card:
   Number: 4111111111111111
   Expiry: 12/25
   CVV: 123
   Name: Test User

❌ Decline Card:
   Number: 4000000000000002
   Expiry: 12/25
   CVV: 123
   Name: Test User
```

## 📋 Testing Checklist

### Edge Function:
- [ ] Credentials updated in `IPOSPAY_CONFIG`
- [ ] `testMode: true` for sandbox
- [ ] Function deployed successfully
- [ ] No errors in logs

### Browser Test:
- [ ] Console test returns payment URL
- [ ] Can open payment URL in new tab
- [ ] iPOS Pays page loads correctly
- [ ] Can enter test card details

### Payment Flow:
- [ ] Click "Pay Now" on your order page
- [ ] Redirects to iPOS Pays
- [ ] Can complete payment
- [ ] Redirects back to your site
- [ ] Payment status displays

## 🐛 Troubleshooting

### "iPOS Pays credentials not configured"
**Solution:** Update `IPOSPAY_CONFIG` in edge function with your TPN and Auth Token

### "Invalid Merchant Id"
**Solution:** 
- Check TPN is correct (no spaces)
- Make sure `testMode: true` matches your credentials (sandbox vs production)

### "Invalid Auth Token"
**Solution:**
- Regenerate token in iPOS Pays dashboard
- Copy entire token (no spaces)
- Update in `IPOSPAY_CONFIG.sandbox.authToken`

### "Payment URL not generated"
**Solution:**
- Check edge function logs: `supabase functions logs ipospay-payment`
- Look for error messages
- Verify credentials are correct

### Edge Function Logs:
```bash
# View real-time logs
supabase functions logs ipospay-payment --follow

# View last 100 lines
supabase functions logs ipospay-payment --limit 100
```

## 📊 Expected Flow

1. **User clicks "Pay Now"**
   ```
   Your Site → processPaymentIPOSPay() → Edge Function
   ```

2. **Edge Function generates URL**
   ```
   Edge Function → iPOS Pays API → Returns payment URL
   ```

3. **User redirects to iPOS Pays**
   ```
   Your Site → iPOS Pays Payment Page
   ```

4. **User enters card details**
   ```
   iPOS Pays Page → User enters 4111111111111111
   ```

5. **Payment processes**
   ```
   iPOS Pays → Payment Gateway → Success/Failure
   ```

6. **User redirects back**
   ```
   iPOS Pays → Your Site (/payment/callback?responseCode=200&...)
   ```

## 🎉 Success Indicators

### In Edge Function Logs:
```
iPOS Pay request: { action: 'generatePaymentUrl' }
Using iPOS Pays environment: SANDBOX
TPN: 1234567890
Generating payment URL: { transactionReferenceId: 'ABC123...', amount: 10, ... }
Calling iPOS Pays API: https://payment.ipospays.tech/api/v1/external-payment-transaction
iPOS Pays response: { message: 'Url generated Successful', information: 'https://...' }
```

### In Browser Console:
```javascript
Response: {
  success: true,
  paymentUrl: "https://payment.ipospays.tech/api/v1/externalPay?t=...",
  transactionReferenceId: "ABC123XYZ",
  message: "Payment URL generated successfully"
}
```

### On iPOS Pays Page:
- Your merchant name displays
- Amount shows correctly ($10.00)
- Can enter card details
- "Pay Now" button works

## 🔄 Switch to Production

When ready for production:

1. **Get production credentials** from iPOS Pays
2. **Update edge function:**
   ```typescript
   const IPOSPAY_CONFIG = {
     enabled: true,
     testMode: false, // ← Change to false
     
     sandbox: { ... },
     
     production: {
       tpn: "YOUR_PRODUCTION_TPN",
       authToken: "YOUR_PRODUCTION_TOKEN",
     },
   };
   ```
3. **Deploy:** `supabase functions deploy ipospay-payment`
4. **Test with real card** (small amount like $0.01)
5. **Go live!** 🚀

## 📞 Get Credentials

**Email:** devsupport@dejavoo.io

**Subject:** iPOS Pays Sandbox Credentials Request

**Body:**
```
Hello,

I need sandbox credentials for testing iPOS Pays integration:
- Sandbox TPN (Terminal Provider Number)
- Sandbox Auth Token

Thank you!
```

**You'll receive:**
- TPN: 10-digit number
- Auth Token: Long alphanumeric string
- Dashboard access

## ✅ Quick Start Commands

```bash
# 1. Update credentials in edge function
code supabase/functions/ipospay-payment/index.ts

# 2. Deploy
supabase functions deploy ipospay-payment

# 3. Watch logs
supabase functions logs ipospay-payment --follow

# 4. Test in browser console (see Step 3 above)
```

## 🎯 Next Steps

1. ✅ Update credentials in edge function
2. ✅ Deploy edge function
3. ✅ Test from browser console
4. ✅ Test from your payment page
5. ✅ Complete test payment
6. ✅ Verify callback works
7. 🚀 Get production credentials
8. 🚀 Switch to production
9. 🚀 Go live!
