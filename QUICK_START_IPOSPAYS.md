# 🚀 iPOS Pays Quick Start Guide

## ✅ What I've Done For You

1. ✅ Created `iPosPayService.ts` - Complete service layer
2. ✅ Updated `PaymentSectionEnhanced.tsx` - Added iPOS Pays UI
3. ✅ Created implementation guides

## 🎯 What You Need To Do (Step by Step)

### Step 1: Get Testing Credentials (5 minutes)

**Email to:** devsupport@dejavoo.io

**Subject:** Request for iPOS Pays Sandbox Credentials

**Body:**
```
Hello,

I would like to integrate iPOS Pays into my application.
Please provide me with:
- Sandbox TPN (Terminal Provider Number)
- Sandbox Auth Token
- Access to sandbox dashboard

Thank you!
```

**You'll receive:**
- TPN: XXXXXXXXXX (10-digit number)
- Auth Token: f0bed899539742309eebd8XXXX...
- Dashboard URL: https://sandbox.ipospays.tech

---

### Step 2: Update Settings Types (2 minutes)

**File:** `src/components/settings/settingsTypes.ts`

**Find this section** (around line 50-100):
```typescript
export interface SettingsFormValues {
  // ... existing fields
  authorize_net_enabled: boolean;
  authorize_net_api_login_id: string;
  // ... more fields
```

**Add these 4 lines:**
```typescript
  // iPOS Pays Settings
  ipospay_enabled: boolean;
  ipospay_tpn: string;
  ipospay_auth_token: string;
  ipospay_test_mode: boolean;
```

**Find defaultValues** (around line 200-300):
```typescript
export const defaultValues: SettingsFormValues = {
  // ... existing defaults
  authorize_net_enabled: false,
  authorize_net_api_login_id: "",
  // ... more defaults
```

**Add these 4 lines:**
```typescript
  // iPOS Pays defaults
  ipospay_enabled: false,
  ipospay_tpn: "",
  ipospay_auth_token: "",
  ipospay_test_mode: true,
```

---

### Step 3: Update Settings Page (10 minutes)

**File:** `src/pages/admin/Settings.tsx`

#### 3a. Update buildGeneralSettingsPayload function

**Find:**
```typescript
const buildGeneralSettingsPayload = (values: SettingsFormValues) => {
  const {
    authorize_net_enabled,
    authorize_net_api_login_id,
    authorize_net_transaction_key,
    authorize_net_test_mode,
    fortispay_enabled,
```

**Add after fortispay_test_mode:**
```typescript
    ipospay_enabled,
    ipospay_tpn,
    ipospay_auth_token,
    ipospay_test_mode,
```

#### 3b. Update fetchSettings function

**Find this section** (around line 150-200):
```typescript
      const { data: fortisPayData, error: fortisPayError } = await supabase
        .from("payment_settings")
        .select("settings")
        .eq("provider", "fortispay")
        .eq("profile_id", userProfile.id)
        .maybeSingle();
```

**Add AFTER that block:**
```typescript
      // Fetch iPOS Pays settings
      const { data: iPosPayData, error: iPosPayError } = await supabase
        .from("payment_settings")
        .select("settings")
        .eq("provider", "ipospay")
        .eq("profile_id", userProfile.id)
        .maybeSingle();

      if (iPosPayError) {
        console.error("Error fetching iPOS Pay settings:", iPosPayError);
      }
```

**Find where fortisPaySettings is defined:**
```typescript
      const fortisPaySettings = fortisPayData?.settings
        ? (fortisPayData.settings as unknown as FortisPaySettings)
        : {
            enabled: false,
            // ... defaults
          };
```

**Add AFTER that:**
```typescript
      const iPosPaySettings = iPosPayData?.settings
        ? (iPosPayData.settings as unknown as { enabled: boolean; tpn: string; authToken: string; testMode: boolean })
        : {
            enabled: false,
            tpn: "",
            authToken: "",
            testMode: true,
          };
```

**Find combinedSettings:**
```typescript
      const combinedSettings = {
        ...(settingsData || defaultValues),
        authorize_net_enabled: paymentSettings.enabled,
        // ... more settings
        fortispay_test_mode: fortisPaySettings.testMode,
```

**Add AFTER fortispay_test_mode:**
```typescript
        ipospay_enabled: iPosPaySettings.enabled,
        ipospay_tpn: iPosPaySettings.tpn,
        ipospay_auth_token: iPosPaySettings.authToken,
        ipospay_test_mode: iPosPaySettings.testMode,
```

#### 3c. Update saveSettings function

**Find where FortisPay settings are saved:**
```typescript
      // Save FortisPay settings
      const { error: fortisPayError } = await supabase
        .from("payment_settings")
        .upsert(
          {
            profile_id: userProfile.id,
            provider: "fortispay",
            settings: fortisPaySettings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "profile_id,provider",
          }
        );

      if (fortisPayError) {
        console.error("FortisPay settings save error:", fortisPayError);
        toast.error(`Failed to save FortisPay settings: ${fortisPayError.message}`);
        return;
      }
```

**Add AFTER that block:**
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
          {
            onConflict: "profile_id,provider",
          }
        );

      if (iPosPayError) {
        console.error("iPOS Pay settings save error:", iPosPayError);
        toast.error(`Failed to save iPOS Pay settings: ${iPosPayError.message}`);
        return;
      }
```

---

### Step 4: Test the Settings UI (2 minutes)

1. Run your app: `npm run dev`
2. Go to Settings → Payments tab
3. You should see "iPOS Pays Payment Gateway" card
4. Try enabling it and entering dummy credentials
5. Click "Save Changes"
6. Refresh page - settings should persist

---

### Step 5: Create Supabase Edge Function (5 minutes)

**Create file:** `supabase/functions/ipospay-payment/index.ts`

Copy the complete code from `IPOS_PAYS_IMPLEMENTATION_GUIDE.md` Step 4.

**Deploy:**
```bash
supabase functions deploy ipospay-payment
```

---

### Step 6: Update Payment Service (5 minutes)

**File:** `src/services/paymentService.ts`

**Add at the END of the file:**
```typescript
// ============================================
// iPOS PAYS PAYMENT FUNCTIONS
// ============================================

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
      return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
}

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
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

---

### Step 7: Update Your Payment Flow (10 minutes)

**Find where you currently process payments** (probably in checkout/order component)

**Current code might look like:**
```typescript
const result = await processCardPayment(cardData, billingAddress, amount, invoiceNumber);
```

**Replace with:**
```typescript
// Check if iPOS Pays is enabled
const { data: settings } = await supabase
  .from("payment_settings")
  .select("settings")
  .eq("provider", "ipospay")
  .eq("profile_id", userProfile.id)
  .single();

if (settings?.settings?.enabled) {
  // Use iPOS Pays
  const result = await processPaymentIPOSPay(
    amount,
    orderId,
    customerName,
    customerEmail,
    customerMobile,
    description
  );
  
  if (result.success && result.paymentUrl) {
    // Redirect to iPOS Pays payment page
    window.location.href = result.paymentUrl;
  } else {
    toast.error(result.error || "Failed to initiate payment");
  }
} else {
  // Use existing Authorize.Net
  const result = await processCardPayment(cardData, billingAddress, amount, invoiceNumber);
  // ... handle result
}
```

---

### Step 8: Create Payment Callback Page (5 minutes)

**Create file:** `src/pages/PaymentCallback.tsx`

Copy the complete code from `IPOS_PAYS_IMPLEMENTATION_GUIDE.md` Step 6.

**Add route in your router:**
```typescript
<Route path="/payment/callback" element={<PaymentCallback />} />
<Route path="/payment/cancel" element={<PaymentCancelled />} />
```

---

## 🧪 Testing Checklist

### In Settings:
- [ ] iPOS Pays section appears
- [ ] Can enable/disable iPOS Pays
- [ ] Can toggle test mode
- [ ] Can enter TPN and Auth Token
- [ ] Settings save successfully
- [ ] Settings persist after refresh

### Payment Flow:
- [ ] Click "Pay Now" redirects to iPOS Pays
- [ ] iPOS Pays page loads correctly
- [ ] Can enter test card: 4111111111111111
- [ ] Payment processes successfully
- [ ] Redirects back to your site
- [ ] Payment status displays correctly

### Test Cards (Sandbox):
```
Success: 4111111111111111
Decline: 4000000000000002
Expiry: Any future date (12/25)
CVV: 123
```

---

## 🐛 Common Issues & Solutions

### "iPOS Pays not configured"
**Solution:** Make sure you saved settings and enabled iPOS Pays

### "Invalid TPN"
**Solution:** Double-check TPN is exactly as provided (no spaces)

### "Invalid Auth Token"
**Solution:** Regenerate token in iPOS Pays dashboard

### "Payment URL not generated"
**Solution:** Check browser console for errors, verify edge function is deployed

### "Callback not working"
**Solution:** Make sure route `/payment/callback` exists in your router

---

## 📞 Need Help?

1. Check `IPOS_PAYS_IMPLEMENTATION_GUIDE.md` for detailed docs
2. Email: devsupport@dejavoo.io
3. Docs: https://docs.ipospays.com

---

## 🎉 You're Done!

Once all steps are complete:
1. Test in sandbox thoroughly
2. Request production credentials
3. Switch to production mode
4. Test with real card (small amount)
5. Go live! 🚀
