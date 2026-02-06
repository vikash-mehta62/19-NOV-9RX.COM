# Payment Error Debugging Guide

## Error: "Payment Failed - Edge function returned a non-2xx status code"

This error occurs when the Supabase Edge Function `process-payment` fails to execute properly.

## Common Causes & Solutions:

### 1. Missing Payment Gateway Configuration ⚠️ MOST LIKELY

**Symptoms:**
- Error message: "Payment gateway not configured"
- Error code: `NO_SETTINGS` or `CONFIG_ERROR`

**Solution:**
1. Run `CHECK_PAYMENT_SETTINGS.sql` to verify settings exist
2. If no settings found, configure Authorize.Net in Admin Settings:
   - Go to Admin Dashboard → Settings → Payments
   - Enable Authorize.Net
   - Add your API Login ID and Transaction Key
   - Set Test Mode (true for sandbox, false for production)
   - Click Save

**Alternative (SQL):**
```sql
-- Replace placeholders with actual values
INSERT INTO payment_settings (profile_id, provider, settings)
VALUES (
  'YOUR_ADMIN_PROFILE_ID'::uuid,
  'authorize_net',
  jsonb_build_object(
    'enabled', true,
    'testMode', true,
    'apiLoginId', 'YOUR_API_LOGIN_ID',
    'transactionKey', 'YOUR_TRANSACTION_KEY'
  )
)
ON CONFLICT (profile_id, provider) DO UPDATE
SET settings = EXCLUDED.settings;
```

### 2. Invalid or Missing Credentials

**Symptoms:**
- Error: "API Login ID and Transaction Key are required"
- Error code: `MISSING_CREDENTIALS` or `INVALID_CREDENTIALS_FORMAT`

**Solution:**
- Verify your Authorize.Net credentials are correct
- API Login ID should be at least 5 characters
- Transaction Key should be at least 5 characters
- Check for extra spaces or special characters

### 3. Edge Function Environment Variables Not Set

**Symptoms:**
- Edge function fails to connect to database
- Generic "Internal server error"

**Solution:**
Check Supabase Edge Function environment variables:
1. Go to Supabase Dashboard → Edge Functions → process-payment
2. Verify these environment variables are set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 4. Billing Address Mismatch

**Symptoms:**
- Error: "Your billing address does not match"
- Error code: `27`

**Solution:**
- Ensure billing address matches the card's registered address
- Verify all required fields: address, city, state, zip

### 5. Card Declined by Authorize.Net

**Symptoms:**
- Error: "Transaction failed" or "Payment was declined"
- Various error codes from Authorize.Net

**Solution:**
- Use test card numbers if in test mode:
  - Visa: 4111111111111111
  - Mastercard: 5424000000000015
  - Amex: 378282246310005
- Check card expiration date (MMYY format)
- Verify CVV is correct

## How to Debug:

### Step 1: Check Supabase Edge Function Logs
```bash
# In Supabase Dashboard:
# 1. Go to Edge Functions → process-payment
# 2. Click "Logs" tab
# 3. Look for recent errors
```

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages starting with "Edge function"

### Step 3: Test Payment Settings
Run `CHECK_PAYMENT_SETTINGS.sql` in Supabase SQL Editor

### Step 4: Verify Database Connection
```sql
-- Test if edge function can access payment_settings
SELECT * FROM payment_settings WHERE provider = 'authorize_net';
```

## Quick Fix Checklist:

- [ ] Payment settings exist in database
- [ ] Authorize.Net is enabled (`settings->>'enabled' = true`)
- [ ] API Login ID is set and valid (length > 5)
- [ ] Transaction Key is set and valid (length > 5)
- [ ] Edge function environment variables are set
- [ ] Billing address is complete and valid
- [ ] Card details are correct (if not using saved card)
- [ ] Test mode matches your credentials (sandbox vs production)

## Test Payment Flow:

### For Test Mode (Sandbox):
1. Set `testMode: true` in payment settings
2. Use test card: 4111111111111111
3. Expiry: Any future date (e.g., 1225 for Dec 2025)
4. CVV: Any 3 digits (e.g., 123)
5. Billing address: Any valid US address

### For Production:
1. Set `testMode: false` in payment settings
2. Use real Authorize.Net production credentials
3. Use real card details
4. Ensure billing address matches card

## Still Having Issues?

1. Check Supabase Edge Function logs for detailed error messages
2. Verify RLS policies allow service role to access payment_settings
3. Test with a simple payment first (no saved cards, no discounts)
4. Contact Authorize.Net support if credentials are not working

## Error Code Reference:

- `NO_SETTINGS`: Payment settings not found in database
- `CONFIG_ERROR`: Failed to load payment configuration
- `EMPTY_SETTINGS`: Settings object is null or empty
- `GATEWAY_DISABLED`: Payment gateway is disabled in settings
- `MISSING_CREDENTIALS`: API Login ID or Transaction Key missing
- `INVALID_CREDENTIALS_FORMAT`: Credentials too short or invalid format
- `INVALID_REQUEST`: Missing required payment fields
- `NETWORK_ERROR`: Failed to connect to payment service
- `PARSE_ERROR`: Invalid response from payment gateway
- `CHARGE_ERROR`: Failed to charge card
- `27`: Billing address mismatch (Authorize.Net error)
