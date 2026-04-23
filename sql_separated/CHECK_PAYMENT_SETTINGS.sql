-- Check if payment settings exist and are properly configured
SELECT 
  id,
  provider,
  settings,
  created_at,
  updated_at
FROM payment_settings
WHERE provider = 'authorize_net'
ORDER BY created_at DESC
LIMIT 5;

-- Check if settings have required fields
SELECT 
  id,
  provider,
  (settings->>'enabled')::boolean as enabled,
  (settings->>'testMode')::boolean as test_mode,
  CASE 
    WHEN settings->>'apiLoginId' IS NOT NULL AND settings->>'apiLoginId' != '' THEN 'API Login ID: SET'
    ELSE 'API Login ID: MISSING'
  END as api_login_status,
  CASE 
    WHEN settings->>'transactionKey' IS NOT NULL AND settings->>'transactionKey' != '' THEN 'Transaction Key: SET'
    ELSE 'Transaction Key: MISSING'
  END as transaction_key_status
FROM payment_settings
WHERE provider = 'authorize_net';
