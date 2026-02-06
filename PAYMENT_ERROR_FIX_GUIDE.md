# Payment Error Fix Guide

## Error: "Payment Failed - Edge function returned a non-2xx status code"

### Quick Diagnosis

Run this command to check your payment configuration:
```bash
node test_payment_config.cjs
```

This will tell you exactly what's wrong.

---

## Most Likely Cause: Missing Payment Gateway Configuration

The Authorize.Net payment gateway is not configured in your database.

### Solution 1: Configure via Admin UI (Recommended)

1. **Log in as Admin**
2. **Navigate to:** Admin Dashboard → Settings → Payments
3. **Enable Authorize.Net**
4. **Add Credentials:**
   - API Login ID (from Authorize.Net dashboard)
   - Transaction Key (from Authorize.Net dashboard)
5. **Set Test Mode:**
   - ✅ Enable for Sandbox/Testing
   - ❌ Disable for Production
6. **Click Save**

### Solution 2: Configure via SQL

1. **Get your admin profile ID:**
```sql
SELECT id, email FROM profiles WHERE role = 'admin' LIMIT 1;
```

2. **Insert payment settings:**
```sql
INSERT INTO payment_settings (profile_id, provider, settings)
VALUES (
  'YOUR_ADMIN_PROFILE_ID'::uuid,  -- Replace with actual ID from step 1
  'authorize_net',
  jsonb_build_object(
    'enabled', true,
    'testMode', true,  -- Set to false for production
    'apiLoginId', 'YOUR_API_LOGIN_ID',  -- Get from Authorize.Net
    'transactionKey', 'YOUR_TRANSACTION_KEY'  -- Get from Authorize.Net
  )
)
ON CONFLICT (profile_id, provider) DO UPDATE
SET settings = EXCLUDED.settings, updated_at = NOW();
```

---

## How to Get Authorize.Net Credentials

### For Testing (Sandbox):
1. Go to https://developer.authorize.net/
2. Sign up for a sandbox account (free)
3. Get your sandbox credentials:
   - API Login ID
   - Transaction Key

### For Production:
1. Go to https://account.authorize.net/
2. Log in to your merchant account
3. Navigate to: Account → Settings → API Credentials & Keys
4. Generate new Transaction Key if needed
5. Copy API Login ID and Transaction Key

---

## Verification Steps

### Step 1: Check Configuration
```bash
node test_payment_config.cjs
```

Expected output:
```
✅ Payment settings found
✅ Enabled: Yes
✅ API Login ID: Set
✅ Transaction Key: Set
✅ Payment gateway is properly configured!
```

### Step 2: Check Database
Run `CHECK_PAYMENT_SETTINGS.sql` in Supabase SQL Editor

### Step 3: Test Payment
Use test card in sandbox mode:
- **Card Number:** 4111111111111111
- **Expiry:** 1225 (Dec 2025)
- **CVV:** 123
- **Billing Address:** Any valid US address

---

## Other Possible Causes

### 2. Edge Function Environment Variables Missing

**Check:**
1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → process-payment
3. Verify environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Fix:**
These should be automatically set by Supabase. If missing, contact Supabase support.

### 3. Invalid Credentials

**Symptoms:**
- Error: "API credentials appear to be invalid"
- Error code: `INVALID_CREDENTIALS_FORMAT`

**Fix:**
- Verify credentials are correct (no extra spaces)
- API Login ID must be > 5 characters
- Transaction Key must be > 5 characters
- Ensure you're using sandbox credentials with testMode: true

### 4. Billing Address Mismatch

**Symptoms:**
- Error: "Your billing address does not match"

**Fix:**
- Ensure billing address matches card's registered address
- Fill in all required fields: address, city, state, zip

### 5. Card Declined

**Symptoms:**
- Error: "Transaction failed" or "Payment was declined"

**Fix:**
- Use valid test card numbers in sandbox mode
- Check expiration date format (MMYY)
- Verify CVV is correct

---

## Debugging Tools

### 1. Check Supabase Edge Function Logs
1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → process-payment
3. Click "Logs" tab
4. Look for recent errors with detailed messages

### 2. Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for error messages from the payment service

### 3. Run Diagnostic Script
```bash
node test_payment_config.cjs
```

---

## Quick Fix Checklist

- [ ] Run `node test_payment_config.cjs`
- [ ] Payment settings exist in database
- [ ] Authorize.Net is enabled
- [ ] API Login ID is set (length > 5)
- [ ] Transaction Key is set (length > 5)
- [ ] Test mode matches your credentials
- [ ] Billing address is complete
- [ ] Card details are correct

---

## Still Not Working?

1. **Check Edge Function Logs** in Supabase Dashboard for detailed error messages
2. **Verify RLS Policies** allow service role to access payment_settings:
```sql
SELECT * FROM payment_settings WHERE provider = 'authorize_net';
```
3. **Test with Simple Payment** (no saved cards, no discounts)
4. **Contact Support** if credentials are not working

---

## Test Card Numbers (Sandbox Only)

| Card Type   | Number              | CVV | Expiry      |
|-------------|---------------------|-----|-------------|
| Visa        | 4111111111111111    | 123 | Any future  |
| Mastercard  | 5424000000000015    | 123 | Any future  |
| Amex        | 378282246310005     | 1234| Any future  |
| Discover    | 6011000000000012    | 123 | Any future  |

**Note:** These only work in Test Mode (sandbox). Use real cards in production.

---

## Need Help?

1. Run the diagnostic: `node test_payment_config.cjs`
2. Check `DEBUG_PAYMENT_ERROR.md` for detailed troubleshooting
3. Review Supabase Edge Function logs
4. Check browser console for client-side errors
