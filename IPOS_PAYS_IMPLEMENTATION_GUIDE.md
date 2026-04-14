# iPOS Pays Complete Implementation Guide

## 🎯 Goal
Replace Authorize.Net with iPOS Pays for ALL transactions (Cards + ACH) with MINIMAL code changes.

## 📋 Prerequisites

### 1. Get iPOS Pays Credentials

#### For Testing (Sandbox):
1. Contact iPOS Pays: **devsupport@dejavoo.io**
2. Request:
   - Sandbox TPN (Terminal Provider Number)
   - Sandbox Auth Token
   - Sandbox account access
3. You'll receive:
   ```
   TPN: XXXXXXXXXX (10-digit number)
   Auth Token: f0bed899539742309eebd8XXXX7edcf615888XXXXXXXX
   Sandbox URL: https://payment.ipospays.tech
   ```

#### For Production (Live):
1. Complete merchant onboarding with iPOS Pays
2. Get production credentials:
   ```
   TPN: XXXXXXXXXX (production)
   Auth Token: [production token]
   Production URL: https://payment.ipospays.com
   ```

### 2. Test Cards (Sandbox Only)
```
Card Number: 4111111111111111 (Visa)
Expiry: Any future date (e.g., 12/25)
CVV: 123
```

## 🔧 Implementation Steps

### Step 1: Update Settings Types

**File:** `src/components/settings/settingsTypes.ts`

Add these fields to `SettingsFormValues`:
```typescript
// iPOS Pays Settings
ipospay_enabled: boolean;
ipospay_tpn: string;
ipospay_auth_token: string;
ipospay_test_mode: boolean;
```

Add to `defaultValues`:
```typescript
ipospay_enabled: false,
ipospay_tpn: "",
ipospay_auth_token: "",
ipospay_test_mode: true,
```

### Step 2: Update Settings UI

**File:** `src/components/settings/PaymentSectionEnhanced.tsx`

Add iPOS Pays configuration card AFTER the Authorize.Net card.

### Step 3: Update Settings Page

**File:** `src/pages/admin/Settings.tsx`

In `buildGeneralSettingsPayload`, add:
```typescript
const {
  authorize_net_enabled,
  authorize_net_api_login_id,
  authorize_net_transaction_key,
  authorize_net_test_mode,
  ipospay_enabled,        // ADD THIS
  ipospay_tpn,            // ADD THIS
  ipospay_auth_token,     // ADD THIS
  ipospay_test_mode,      // ADD THIS
  fortispay_enabled,
  // ... rest
} = values;
```

In `saveSettings`, add iPOS Pays settings save:
```typescript
// Save iPOS Pays settings
const iPosPaySettings = {
  enabled: normalizedData.ipospay_enabled,
  tpn: normalizedData.ipospay_tpn,
  authToken: normalizedData.ipospay_auth_token,
  testMode: normalizedData.ipospay_test_mode,
};

const { error: iPosPayError } = await supabase
  .from("payment_settings")
  .upsert(
    {
      profile_id: userProfile.id,
      provider: "ipospay",
      settings: iPosPaySettings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,provider" }
  );

if (iPosPayError) {
  console.error("iPOS Pay settings save error:", iPosPayError);
  toast.error(`Failed to save iPOS Pay settings: ${iPosPayError.message}`);
  return;
}
```

In `fetchSettings`, add iPOS Pays fetch:
```typescript
const { data: iPosPayData, error: iPosPayError } = await supabase
  .from("payment_settings")
  .select("settings")
  .eq("provider", "ipospay")
  .eq("profile_id", userProfile.id)
  .maybeSingle();

if (iPosPayError) {
  console.error("Error fetching iPOS Pay settings:", iPosPayError);
}

const iPosPaySettings = iPosPayData?.settings
  ? (iPosPayData.settings as unknown as { enabled: boolean; tpn: string; authToken: string; testMode: boolean })
  : {
      enabled: false,
      tpn: "",
      authToken: "",
      testMode: true,
    };

const combinedSettings = {
  ...(settingsData || defaultValues),
  // ... existing settings
  ipospay_enabled: iPosPaySettings.enabled,
  ipospay_tpn: iPosPaySettings.tpn,
  ipospay_auth_token: iPosPaySettings.authToken,
  ipospay_test_mode: iPosPaySettings.testMode,
} as SettingsFormValues;
```

### Step 4: Create Supabase Edge Function

**File:** `supabase/functions/ipospay-payment/index.ts`

This is a NEW edge function for iPOS Pays:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { action, ...params } = body;

    // Get iPOS Pays settings
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from("payment_settings")
      .select("settings")
      .eq("provider", "ipospay")
      .eq("profile_id", user.id)
      .single();

    if (settingsError || !settingsData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "iPOS Pays not configured",
          errorCode: "MISSING_CREDENTIALS",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settings = settingsData.settings as any;
    if (!settings.enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "iPOS Pays is disabled",
          errorCode: "GATEWAY_DISABLED",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = settings.testMode
      ? "https://payment.ipospays.tech/api/v1"
      : "https://payment.ipospays.com/api/v1";

    if (action === "generatePaymentUrl") {
      // Generate payment URL
      const transactionReferenceId = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase();
      
      const payload = {
        merchantAuthentication: {
          merchantId: settings.tpn,
          transactionReferenceId,
        },
        transactionRequest: {
          transactionType: 1, // 1 = SALE
          amount: Math.round(params.amount * 100).toString(), // Convert to cents
          calculateFee: params.calculateFee ?? true,
          tipsInputPrompt: params.tipsInputPrompt ?? false,
          calculateTax: params.calculateTax ?? true,
        },
        notificationOption: {
          notifyBySMS: false,
          mobileNumber: "",
          notifyByPOST: false,
          authHeader: "",
          postAPI: "",
          notifyByRedirect: true,
          returnUrl: params.returnUrl,
          failureUrl: params.failureUrl || params.returnUrl,
          cancelUrl: params.cancelUrl || params.returnUrl,
        },
        preferences: {
          integrationType: 1, // 1 = E-Commerce
          avsVerification: true,
          eReceipt: !!params.customerEmail || !!params.customerMobile,
          eReceiptInputPrompt: !params.customerEmail && !params.customerMobile,
          customerName: params.customerName || "",
          customerEmail: params.customerEmail || "",
          customerMobile: params.customerMobile || "",
          requestCardToken: true,
          shortenURL: false,
          sendPaymentLink: false,
          integrationVersion: "v2",
        },
        personalization: {
          merchantName: params.merchantName || "",
          logoUrl: params.logoUrl || "",
          themeColor: params.themeColor || "#4F46E5",
          description: params.description || "",
          payNowButtonText: "Pay Now",
          buttonColor: params.themeColor || "#4F46E5",
          cancelButtonText: "Cancel",
          disclaimer: "",
        },
      };

      const response = await fetch(`${baseUrl}/external-payment-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": settings.authToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.message === "Url generated Successful" || data.message === "URL generated successfully") {
        return new Response(
          JSON.stringify({
            success: true,
            paymentUrl: data.information,
            transactionReferenceId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: data.errors?.[0]?.message || "Failed to generate payment URL",
            errors: data.errors,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (action === "queryPaymentStatus") {
      // Query payment status
      const queryUrl = settings.testMode
        ? "https://api.ipospays.tech/v1/queryPaymentStatus"
        : "https://api.ipospays.com/v1/queryPaymentStatus";

      const response = await fetch(
        `${queryUrl}?tpn=${settings.tpn}&transactionReferenceId=${params.transactionReferenceId}`,
        {
          method: "GET",
          headers: {
            "Authorization": settings.authToken,
          },
        }
      );

      const data = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          data: data.iposHPResponse,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("iPOS Pay error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
```

### Step 5: Update Payment Flow

**File:** `src/services/paymentService.ts`

Add new function for iPOS Pays:

```typescript
// Process payment via iPOS Pays (redirect-based)
export async function processPaymentIPOSPay(
  amount: number,
  orderId: string,
  customerName?: string,
  customerEmail?: string,
  customerMobile?: string,
  description?: string
): Promise<{ success: boolean; paymentUrl?: string; error?: string; transactionReferenceId?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("ipospay-payment", {
      body: {
        action: "generatePaymentUrl",
        amount,
        orderId,
        customerName,
        customerEmail,
        customerMobile,
        description,
        returnUrl: `${window.location.origin}/payment/callback`,
        failureUrl: `${window.location.origin}/payment/callback`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        calculateFee: true,
        calculateTax: true,
        tipsInputPrompt: false,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (data?.success) {
      return {
        success: true,
        paymentUrl: data.paymentUrl,
        transactionReferenceId: data.transactionReferenceId,
      };
    }

    return {
      success: false,
      error: data?.error || "Failed to generate payment URL",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Query iPOS Pays payment status
export async function queryIPOSPayStatus(
  transactionReferenceId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("ipospay-payment", {
      body: {
        action: "queryPaymentStatus",
        transactionReferenceId,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data?.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Step 6: Create Payment Callback Page

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
        amount: parseFloat(amount || "0"),
        totalAmount: parseFloat(totalAmount || "0"),
        cardType,
        cardLast4Digit,
        transactionType: 1,
      });

      setPaymentData(data);
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

          <Button onClick={() => navigate("/")} className="w-full">
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🧪 Testing Guide

### 1. Setup Testing Environment

1. Get sandbox credentials from iPOS Pays
2. In Settings → Payments:
   - Enable iPOS Pays
   - Enter TPN
   - Enter Auth Token
   - Enable "Test Mode"
   - Save settings

### 2. Test Payment Flow

1. Create an order/invoice
2. Click "Pay Now"
3. You'll be redirected to iPOS Pays payment page
4. Use test card: `4111111111111111`, Expiry: `12/25`, CVV: `123`
5. Complete payment
6. You'll be redirected back to your site

### 3. Verify Payment

- Check transaction in iPOS Pays dashboard
- Check payment_transactions table in Supabase
- Verify order status updated

## 🚀 Production Deployment

### 1. Get Production Credentials
- Contact iPOS Pays for production onboarding
- Get production TPN and Auth Token

### 2. Update Settings
- In Settings → Payments:
  - Disable "Test Mode"
  - Enter production credentials
  - Save settings

### 3. Test with Real Card
- Use a real card with small amount ($0.01)
- Verify transaction appears in production dashboard

## 📊 Database Schema

No changes needed! iPOS Pays uses existing `payment_settings` table:

```sql
-- Already exists
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  provider TEXT, -- 'ipospay'
  settings JSONB, -- { enabled, tpn, authToken, testMode }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, provider)
);
```

## 🔄 Migration Strategy

### Phase 1: Parallel Running (Recommended)
- Keep Authorize.Net enabled
- Enable iPOS Pays
- Let users choose payment method
- Monitor both gateways

### Phase 2: Gradual Migration
- Make iPOS Pays default
- Keep Authorize.Net as fallback
- Monitor for issues

### Phase 3: Full Migration
- Disable Authorize.Net
- Use only iPOS Pays
- Remove Authorize.Net code (optional)

## ⚠️ Important Notes

1. **PCI Compliance**: iPOS Pays handles all card data - you never see it
2. **Redirect Flow**: User leaves your site temporarily
3. **Callback Handling**: Must handle return URL properly
4. **Transaction Reference**: Save it to query status later
5. **Amount Format**: Always multiply by 100 (dollars to cents)

## 🆘 Troubleshooting

### "Invalid Merchant Id"
- Check TPN is correct
- Verify you're using correct environment (sandbox/production)

### "Invalid Auth Token"
- Regenerate token in iPOS Pays dashboard
- Make sure no extra spaces

### "Payment URL not generated"
- Check all required fields are provided
- Verify return URLs are HTTPS (production)
- Check amount is > 0

### "Callback not received"
- Verify return URL is accessible
- Check for CORS issues
- Test with ngrok for local development

## 📞 Support

- Email: devsupport@dejavoo.io
- Documentation: https://docs.ipospays.com
- Phone: Contact your ISO

## ✅ Checklist

- [ ] Get sandbox credentials
- [ ] Update settingsTypes.ts
- [ ] Update PaymentSectionEnhanced.tsx
- [ ] Update Settings.tsx
- [ ] Create ipospay-payment edge function
- [ ] Deploy edge function
- [ ] Update paymentService.ts
- [ ] Create PaymentCallback.tsx
- [ ] Add route for /payment/callback
- [ ] Test in sandbox
- [ ] Get production credentials
- [ ] Test in production
- [ ] Monitor transactions
