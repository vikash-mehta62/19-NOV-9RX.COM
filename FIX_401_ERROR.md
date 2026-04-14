# 🔧 Fix 401 Unauthorized Error

## Problem
Edge function returns 401 because JWT verification is enabled by default.

## Solution Options

### Option 1: Via Supabase Dashboard (Easiest - No CLI needed)

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/qiaetxkxweghuoxyhvml

2. **Navigate to Edge Functions**
   - Left sidebar → Edge Functions
   - Find `ipospay-payment` function

3. **Update Function Settings**
   - Click on `ipospay-payment`
   - Go to "Settings" tab
   - Look for "JWT Verification" or "Authentication"
   - **Disable JWT verification**
   - Save changes

### Option 2: Via Supabase CLI (If installed)

```bash
# Deploy with config
supabase functions deploy ipospay-payment

# Or link and deploy
supabase link --project-ref qiaetxkxweghuoxyhvml
supabase functions deploy ipospay-payment
```

### Option 3: Update Function Code (Temporary Workaround)

If dashboard doesn't have JWT toggle, we can make the function work with or without JWT:

**File:** `supabase/functions/ipospay-payment/index.ts`

Add at the top of serve function:

```typescript
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Try to get auth header but don't fail if missing
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    // Continue regardless of auth status (for testing)
    // In production, you should validate this
    
    // Parse request body
    const body = await req.json();
    // ... rest of code
```

### Option 4: Manual Deploy via Dashboard

1. **Go to Edge Functions in Dashboard**
2. **Click "Create a new function"** or **Edit existing**
3. **Copy entire code** from `supabase/functions/ipospay-payment/index.ts`
4. **Paste in dashboard editor**
5. **Deploy**
6. **In Settings, disable JWT verification**

## Quick Test Without CLI

### Test via Browser Console

```javascript
// Test if function is accessible
fetch('https://qiaetxkxweghuoxyhvml.supabase.co/functions/v1/ipospay-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // No Authorization header
  },
  body: JSON.stringify({
    action: 'generatePaymentUrl',
    amount: 10.00,
    orderId: 'TEST-001',
    returnUrl: 'https://example.com/callback'
  })
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e));
```

If this returns 401, JWT verification is still enabled.

## Verify Current Status

### Check Function Logs

1. Go to Dashboard → Edge Functions → ipospay-payment
2. Click "Logs" tab
3. Look for any authentication errors

### Check Function Settings

1. Dashboard → Edge Functions → ipospay-payment
2. Settings tab
3. Look for:
   - JWT Verification: Should be OFF/Disabled
   - Authentication: Should be Optional or Disabled

## Alternative: Use Supabase Auth

If you can't disable JWT, modify the function to accept authenticated calls:

**File:** `supabase/functions/ipospay-payment/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      // Validate JWT if present
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
        authHeader.replace("Bearer ", "")
      );

      if (userError) {
        console.log("Auth validation failed, but continuing with hardcoded credentials");
        // Don't fail - continue with hardcoded credentials
      } else {
        console.log("Authenticated user:", user?.id);
      }
    }
    
    // Continue with hardcoded credentials regardless
    const body = await req.json();
    // ... rest of code
```

## Recommended Steps (In Order)

1. ✅ **Update config.toml** (Already done)
   ```toml
   [functions.ipospay-payment]
   verify_jwt = false
   ```

2. 🔄 **Deploy via Dashboard**
   - Go to Supabase Dashboard
   - Edge Functions → ipospay-payment
   - Copy code from local file
   - Paste and deploy
   - Check Settings → Disable JWT

3. 🧪 **Test**
   - Try payment flow
   - Check browser console
   - Check function logs

4. ✅ **Verify**
   - Should see payment URL generated
   - No 401 errors

## If Still Getting 401

### Check These:

1. **Function deployed?**
   - Dashboard shows latest deployment time

2. **JWT setting saved?**
   - Refresh dashboard
   - Check settings again

3. **Correct project?**
   - Project ID: qiaetxkxweghuoxyhvml
   - Correct function name: ipospay-payment

4. **Try incognito/private window**
   - Clear cache
   - Test again

## Contact Support

If nothing works:
- Supabase Support: https://supabase.com/dashboard/support
- Check Supabase Status: https://status.supabase.com/

## Temporary Workaround

While fixing, you can test iPOS Pays API directly:

```javascript
// Direct test without edge function
const testIPOSPays = async () => {
  const response = await fetch('https://payment.ipospays.tech/api/v1/external-payment-transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': 'YOUR_AUTH_TOKEN_HERE'
    },
    body: JSON.stringify({
      merchantAuthentication: {
        merchantId: "133526975132",
        transactionReferenceId: "TEST" + Date.now()
      },
      transactionRequest: {
        transactionType: 1,
        amount: "1000", // $10.00
        calculateFee: true,
        tipsInputPrompt: false,
        calculateTax: true
      },
      notificationOption: {
        notifyBySMS: false,
        notifyByPOST: false,
        notifyByRedirect: true,
        returnUrl: window.location.origin + "/payment/callback"
      },
      preferences: {
        integrationType: 1,
        avsVerification: true,
        eReceipt: false,
        eReceiptInputPrompt: false,
        requestCardToken: true,
        integrationVersion: "v2"
      },
      personalization: {
        merchantName: "Test Store",
        themeColor: "#4F46E5",
        payNowButtonText: "Pay Now"
      }
    })
  });
  
  const data = await response.json();
  console.log('iPOS Pays Response:', data);
  
  if (data.information) {
    window.open(data.information, '_blank');
  }
};

testIPOSPays();
```
