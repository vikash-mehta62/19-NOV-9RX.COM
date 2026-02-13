# Authorize.Net Payment Gateway Testing Guide

## Overview
This guide will help you test the Authorize.Net payment gateway integration in your application.

## Prerequisites
- ✅ Server is running on port 4001
- ✅ Supabase connection is configured
- ✅ Authorize.Net account (sandbox or production)

## Testing Steps

### Step 1: Run the Automated Test Script

We've created an automated test script that checks your Authorize.Net configuration:

```bash
node test-authorize-net.cjs
```

This script will:
1. ✅ Check Supabase connection
2. ✅ Verify payment settings in database
3. ✅ Test API credentials with Authorize.Net
4. ✅ Display test card numbers (if in sandbox mode)

### Step 2: Configure Authorize.Net (If Not Already Done)

#### Option A: Using the Admin Dashboard (Recommended)
1. Log in as admin to your application
2. Navigate to: **Admin Dashboard → Settings → Payments**
3. Enable Authorize.Net
4. Enter your credentials:
   - API Login ID
   - Transaction Key
   - Test Mode (enable for sandbox, disable for production)
5. Click "Test Connection" to verify
6. Save settings

#### Option B: Using SQL Script
If you prefer to configure via database:

1. Get your admin profile ID:
```sql
SELECT id, email FROM profiles WHERE role = 'admin';
```

2. Edit `FIX_PAYMENT_GATEWAY.sql` and replace:
   - `YOUR_ADMIN_PROFILE_ID` with your admin profile ID
   - `YOUR_API_LOGIN_ID` with your Authorize.Net API Login ID
   - `YOUR_TRANSACTION_KEY` with your Authorize.Net Transaction Key

3. Run the SQL script in Supabase SQL Editor

### Step 3: Get Authorize.Net Credentials

#### For Sandbox (Testing):
1. Go to: https://sandbox.authorize.net/
2. Sign up for a sandbox account (free)
3. After login, go to: **Account → Settings → API Credentials & Keys**
4. Copy your:
   - API Login ID
   - Transaction Key

#### For Production (Live):
1. Go to: https://account.authorize.net/
2. Log in to your merchant account
3. Go to: **Account → Settings → API Credentials & Keys**
4. Copy your:
   - API Login ID
   - Transaction Key

### Step 4: Test Card Numbers (Sandbox Mode Only)

When in test/sandbox mode, use these test card numbers:

| Card Type        | Card Number         | CVV | Expiry      |
|------------------|---------------------|-----|-------------|
| Visa             | 4111111111111111    | 123 | Any future  |
| Visa (13 digits) | 4007000000027       | 123 | Any future  |
| Mastercard       | 5424000000000015    | 123 | Any future  |
| American Express | 378282246310005     | 1234| Any future  |
| Discover         | 6011000000000012    | 123 | Any future  |

**Billing Address:** Any valid US address will work in sandbox mode.

### Step 5: Test Payment Flow

#### Test via Application UI:
1. Create a test order
2. Proceed to checkout
3. Enter test card details (if in sandbox mode)
4. Complete the payment
5. Verify transaction in:
   - Your application's order history
   - Authorize.Net dashboard

#### Test via API Endpoint:
```bash
# Test connection endpoint
curl -X POST http://localhost:4001/test-authorize \
  -H "Content-Type: application/json" \
  -d '{
    "apiLoginId": "YOUR_API_LOGIN_ID",
    "transactionKey": "YOUR_TRANSACTION_KEY",
    "testMode": true
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Connection successful",
  "merchantName": "Your Merchant Name"
}
```

## Troubleshooting

### Issue: "No Authorize.Net settings found in database"
**Solution:** Configure payment gateway via Admin Dashboard or run SQL script (see Step 2)

### Issue: "API credentials are invalid"
**Solution:** 
- Verify you're using the correct credentials from Authorize.Net dashboard
- Make sure testMode matches your credential type (sandbox vs production)
- Check for extra spaces or characters in credentials

### Issue: "Cannot connect to server"
**Solution:**
- Make sure server is running: `cd server && npm start`
- Verify server is on port 4001
- Check `.env` file has correct `VITE_API_BASE_URL`

### Issue: "Transaction declined"
**Solution:**
- In sandbox mode: Use test card numbers listed above
- In production mode: Verify card details are correct
- Check Authorize.Net dashboard for decline reason

### Issue: "Missing Supabase credentials"
**Solution:**
- Check `server/.env` file has:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Verification Checklist

- [ ] Test script runs without errors
- [ ] Payment settings exist in database
- [ ] API credentials are valid
- [ ] Test connection succeeds
- [ ] Can process test transaction (sandbox)
- [ ] Transaction appears in Authorize.Net dashboard
- [ ] Order status updates correctly in application

## Additional Resources

- [Authorize.Net Sandbox](https://sandbox.authorize.net/)
- [Authorize.Net Production](https://account.authorize.net/)
- [Authorize.Net API Documentation](https://developer.authorize.net/)
- [Test Card Numbers](https://developer.authorize.net/hello_world/testing_guide/)

## Support

If you encounter issues not covered in this guide:
1. Check server logs for detailed error messages
2. Review Authorize.Net dashboard for transaction details
3. Verify all environment variables are set correctly
4. Ensure database migrations are up to date

## Current Test Results

Run `node test-authorize-net.cjs` to see your current configuration status.
