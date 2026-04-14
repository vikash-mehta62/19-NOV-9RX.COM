# iPOS Pays ACH Payment Setup Guide

## Current Status
✅ Edge function configured with `enableACH: true`  
✅ PaymentCallback handles ACH payment details  
❌ ACH option not showing on iPOS payment page

## Why ACH is Not Showing

The `enableACH: true` parameter in the API is **not enough**. According to [iPOS documentation](https://releases.ipospays.com/introducing-paya-ach), ACH must be enabled at the **merchant account level** by your ISO (Independent Sales Organization).

## Required Steps to Enable ACH

### 1. Merchant Must Be Enrolled with Paya
Your merchant account (TPN: 133526975132) must be enrolled with Paya for ACH processing.

### 2. Enable ACH at Store Level
From ISO login:
1. Go to **Merchants** tab
2. Search and select your merchant DBA
3. Click **Edit Store**
4. Click **Enable ACH Transactions**

### 3. Enable ACH at TPN Level
From ISO login:
1. Go to **S.T.E.A.M** (Settings, Terminal, Equipment, and Merchant)
2. Click **Edit Parameters**
3. Search and select TPN: **133526975132**
4. Click **Edit Parameter**
5. Navigate to **Transaction** tab
6. Under **Card Type**, enable **ACH**

## What to Do Next

### Option 1: Contact iPOS Support
Email: **devsupport@dejavoo.io**

Request:
```
Subject: Enable ACH for TPN 133526975132

Hi iPOS Support,

Please enable ACH (Paya) transactions for:
- TPN: 133526975132
- Merchant: 9RX Pharmacy
- Email: sppatel@9rx.com

We need ACH enabled at both:
1. Store level
2. TPN level (in S.T.E.A.M → Edit Parameters → Transaction → Card Type)

Thank you!
```

### Option 2: Contact Your ISO
If you have an ISO managing your account, contact them to enable ACH at both levels.

## Testing After ACH is Enabled

Once ACH is enabled, test with these credentials:

### Test ACH Details (Sandbox)
- **Routing Number**: 021000021
- **Account Number**: 123456789
- **Account Type**: Checking or Savings

### Test Card (for comparison)
- **Card Number**: 4111 1111 1111 1111
- **CVV**: 999
- **Expiry**: 12/25

## How ACH Payments Are Handled

When a customer pays via ACH, the callback will include:
- `paymentMethod`: "ACH"
- `accountType`: "checking" or "savings"
- `accountLast4`: Last 4 digits of account
- `routingNumber`: Bank routing number
- `achToken`: Token for future transactions

The system will:
1. Detect ACH payment automatically
2. Log transaction with `payment_method_type: "ach"`
3. Update order with `payment_method: "ach"`
4. Display ACH details in payment confirmation

## Deployment Checklist

Before testing:
- [ ] Deploy edge function: `supabase functions deploy ipospay-payment`
- [ ] Verify ACH enabled at store level
- [ ] Verify ACH enabled at TPN level
- [ ] Test with sandbox ACH credentials
- [ ] Verify ACH option appears on payment page
- [ ] Complete test transaction
- [ ] Verify callback handles ACH correctly

## Current Implementation

### Edge Function (`supabase/functions/ipospay-payment/index.ts`)
```typescript
preferences: {
  enableACH: true, // ✅ Already configured
  // ... other settings
}
```

### Payment Callback (`src/pages/PaymentCallback.tsx`)
```typescript
// ✅ Detects ACH automatically
const isACH = paymentMethod === "ACH" || !!accountLast4;

// ✅ Logs with correct payment method
payment_method_type: isACH ? "ach" : "card"

// ✅ Displays ACH details
ACH - Checking •••• 6789
```

## Summary

The code is ready for ACH payments. The only blocker is that ACH must be enabled at the merchant account level by iPOS/ISO. Contact iPOS support to enable it, then deploy and test.
