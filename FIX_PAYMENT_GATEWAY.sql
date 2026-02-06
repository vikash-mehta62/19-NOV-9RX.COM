-- Fix Payment Gateway Configuration
-- Run this script to ensure payment settings are properly configured

-- First, check if payment_settings table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_settings') THEN
    RAISE EXCEPTION 'payment_settings table does not exist. Run migration 20241217160000_fix_payment_settings.sql first';
  END IF;
END $$;

-- Option 1: If you have Authorize.Net credentials, insert/update them
-- IMPORTANT: Replace 'YOUR_API_LOGIN_ID' and 'YOUR_TRANSACTION_KEY' with actual values
-- IMPORTANT: Replace 'YOUR_ADMIN_PROFILE_ID' with the admin user's profile ID

/*
INSERT INTO payment_settings (
  profile_id,
  provider,
  settings
) VALUES (
  'YOUR_ADMIN_PROFILE_ID'::uuid,  -- Replace with actual admin profile ID
  'authorize_net',
  jsonb_build_object(
    'enabled', true,
    'testMode', true,  -- Set to false for production
    'apiLoginId', 'YOUR_API_LOGIN_ID',  -- Replace with actual API Login ID
    'transactionKey', 'YOUR_TRANSACTION_KEY'  -- Replace with actual Transaction Key
  )
)
ON CONFLICT (profile_id, provider) 
DO UPDATE SET
  settings = EXCLUDED.settings,
  updated_at = NOW();
*/

-- Option 2: Check current settings
SELECT 
  'Current Payment Settings:' as info,
  id,
  provider,
  (settings->>'enabled')::boolean as enabled,
  (settings->>'testMode')::boolean as test_mode,
  CASE 
    WHEN settings->>'apiLoginId' IS NOT NULL AND LENGTH(settings->>'apiLoginId') > 5 THEN 'SET (length: ' || LENGTH(settings->>'apiLoginId') || ')'
    ELSE 'MISSING or TOO SHORT'
  END as api_login_id_status,
  CASE 
    WHEN settings->>'transactionKey' IS NOT NULL AND LENGTH(settings->>'transactionKey') > 5 THEN 'SET (length: ' || LENGTH(settings->>'transactionKey') || ')'
    ELSE 'MISSING or TOO SHORT'
  END as transaction_key_status,
  created_at,
  updated_at
FROM payment_settings
WHERE provider = 'authorize_net';

-- If no settings found, you need to add them via Admin Settings → Payments in the UI
-- Or uncomment and run Option 1 above with your actual credentials
