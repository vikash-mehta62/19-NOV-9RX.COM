# 🚀 Deploy iPOS Pays Edge Function

## ✅ What's Ready

1. ✅ Edge function created: `supabase/functions/ipospay-payment/index.ts`
2. ✅ Payment service updated with iPOS Pays functions
3. ✅ Settings UI updated with iPOS Pays section

## 📋 Deployment Steps

### Step 1: Deploy Edge Function (2 minutes)

```bash
# Make sure you're logged in to Supabase
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy ipospay-payment
```

**Expected output:**
```
Deploying function ipospay-payment...
Function ipospay-payment deployed successfully!
```

### Step 2: Verify Deployment

1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. You should see `ipospay-payment` listed
4. Click on it to see logs

### Step 3: Test Edge Function

```bash
# Test with curl (replace YOUR_ANON_KEY and YOUR_USER_TOKEN)
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ipospay-payment' \
  -H 'Authorization: Bearer YOUR_USER_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "generatePaymentUrl",
    "amount": 10.00,
    "orderId": "TEST-001",
    "returnUrl": "https://yoursite.com/payment/callback"
  }'
```

## 🧪 Testing in Your App

### Step 1: Get Test Credentials

**Email:** devsupport@dejavoo.io

**Request:**
```
Subject: iPOS Pays Sandbox Credentials

Hello,

I need sandbox credentials for testing:
- Sandbox TPN
- Sandbox Auth Token

Thank you!
```

### Step 2: Configure in Settings

1. Run your app: `npm run dev`
2. Go to: `http://localhost:3000/admin/settings`
3. Click "Payments" tab
4. Scroll to "iPOS Pays Payment Gateway"
5. Enable iPOS Pays
6. Enable "Test Mode"
7. Enter TPN and Auth Token
8. Click "Save Changes"

### Step 3: Test Payment Flow

**Option A: Test from your payment page**
1. Go to the screenshot page you showed (Order payment)
2. Click "Pay Now"
3. Should redirect to iPOS Pays

**Option B: Test with code**
```typescript
import { processPaymentIPOSPay } from "@/services/paymentService";

// In your payment handler
const result = await processPaymentIPOSPay(
  99.98,           // amount
  "ORD-12345",     // orderId
  "EMail Test",    // customerName
  "test@example.com", // customerEmail
  "+1234567890",   // customerMobile (optional)
  "Test Order"     // description
);

if (result.success && result.paymentUrl) {
  // Redirect to iPOS Pays
  window.location.href = result.paymentUrl;
} else {
  console.error("Payment error:", result.error);
  alert(result.error);
}
```

### Step 4: Test Cards (Sandbox)

```
Success Card:
  Number: 4111111111111111
  Expiry: 12/25
  CVV: 123
  Name: Test User

Decline Card:
  Number: 4000000000000002
  Expiry: 12/25
  CVV: 123
  Name: Test User
```

## 🔍 Where to Use iPOS Pays

### Current Payment Flow (from screenshot)

**File to update:** Find where "Pay $102.88" button is handled

**Current code probably looks like:**
```typescript
const handlePayment = async () => {
  // Current Authorize.Net flow
  const result = await processCardPayment(...);
}
```

**Update to:**
```typescript
const handlePayment = async () => {
  // Check if iPOS Pays is enabled
  const iPosPayEnabled = await isIPOSPayEnabled();
  
  if (iPosPayEnabled) {
    // Use iPOS Pays (redirect flow)
    const result = await processPaymentIPOSPay(
      totalAmount,
      orderId,
      customerName,
      customerEmail,
      customerMobile,
      `Order #${orderNumber}`
    );
    
    if (result.success && result.paymentUrl) {
      // Save transaction reference before redirect
      localStorage.setItem('pending_payment', JSON.stringify({
        transactionReferenceId: result.transactionReferenceId,
        orderId: orderId,
        amount: totalAmount,
      }));
      
      // Redirect to iPOS Pays
      window.location.href = result.paymentUrl;
    } else {
      toast.error(result.error || "Failed to initiate payment");
    }
  } else {
    // Use existing Authorize.Net flow
    const result = await processCardPayment(...);
    // ... existing handling
  }
}
```

## 📄 Create Payment Callback Page

**File:** `src/pages/PaymentCallback.tsx`

```typescript
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { parseCallbackResponse, isPaymentSuccessful, getPaymentStatusText } from "@/services/iPosPayService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    // Get pending payment info
    const pendingPayment = localStorage.getItem('pending_payment');
    
    // Parse callback data from URL params
    const responseCode = searchParams.get("responseCode");
    const responseMessage = searchParams.get("responseMessage");
    const transactionId = searchParams.get("transactionId");
    const transactionReferenceId = searchParams.get("transactionReferenceId");
    const amount = searchParams.get("amount");
    const totalAmount = searchParams.get("totalAmount");
    const cardType = searchParams.get("cardType");
    const cardLast4Digit = searchParams.get("cardLast4Digit");

    if (responseCode) {
      const data = parseCallbackResponse({
        responseCode: parseInt(responseCode),
        responseMessage: responseMessage || "",
        transactionId: transactionId || "",
        transactionReferenceId: transactionReferenceId || "",
        amount: parseFloat(amount || "0") / 100, // Convert from cents
        totalAmount: parseFloat(totalAmount || "0") / 100,
        cardType,
        cardLast4Digit,
        transactionType: 1,
      });

      setPaymentData(data);
      
      // Clear pending payment
      localStorage.removeItem('pending_payment');
      
      // TODO: Update order status in database
      // if (isPaymentSuccessful(data)) {
      //   updateOrderStatus(orderId, 'paid');
      // }
      
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Payment Response</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              No payment data received. Please try again.
            </p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const success = isPaymentSuccessful(paymentData);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Payment Successful
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                Payment Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{getPaymentStatusText(paymentData)}</p>
          </div>

          {paymentData.transactionId && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Transaction ID</p>
              <p className="font-mono text-sm">{paymentData.transactionId}</p>
            </div>
          )}

          {paymentData.totalAmount > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-medium text-lg">${paymentData.totalAmount.toFixed(2)}</p>
            </div>
          )}

          {paymentData.cardType && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium">
                {paymentData.cardType} ending in {paymentData.cardLast4Digit}
              </p>
            </div>
          )}

          <Button onClick={() => navigate("/admin/orders")} className="w-full">
            Back to Orders
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Add route in your router:**
```typescript
<Route path="/payment/callback" element={<PaymentCallback />} />
<Route path="/payment/cancel" element={<PaymentCancelled />} />
```

## 🐛 Troubleshooting

### "iPOS Pays not configured"
- Go to Settings → Payments
- Enable iPOS Pays
- Enter TPN and Auth Token
- Save settings

### "Failed to deploy function"
```bash
# Check if logged in
supabase status

# Re-login if needed
supabase login

# Try deploy again
supabase functions deploy ipospay-payment
```

### "Payment URL not generated"
- Check browser console for errors
- Check Supabase Edge Function logs
- Verify TPN and Auth Token are correct
- Make sure Test Mode matches your credentials

### Edge Function Logs
```bash
# View logs
supabase functions logs ipospay-payment

# Or in Supabase Dashboard:
# Edge Functions → ipospay-payment → Logs
```

## ✅ Deployment Checklist

- [ ] Edge function deployed successfully
- [ ] Settings UI shows iPOS Pays section
- [ ] Can enable/disable iPOS Pays
- [ ] Can enter TPN and Auth Token
- [ ] Settings save successfully
- [ ] Payment flow redirects to iPOS Pays
- [ ] Can complete test payment
- [ ] Callback page receives payment status
- [ ] Order status updates correctly

## 🎉 You're Ready!

Once deployed and tested:
1. Get production credentials from iPOS Pays
2. Disable Test Mode
3. Enter production credentials
4. Test with real card (small amount)
5. Go live! 🚀

## 📞 Support

- iPOS Pays: devsupport@dejavoo.io
- Documentation: https://docs.ipospays.com
- Your edge function logs: Supabase Dashboard → Edge Functions
