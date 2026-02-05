-- Diagnostic query to check user's credit status
-- Replace 'USER_EMAIL_HERE' with the actual pharmacy user's email

-- Check 1: Profile credit settings
SELECT 
  id,
  email,
  company_name,
  role,
  credit_limit,
  credit_used,
  available_credit,
  payment_terms,
  credit_status,
  credit_days,
  late_payment_fee_percentage
FROM profiles
WHERE email = 'jayvekariya2003@gmail.com' -- Replace with actual email
   OR company_name LIKE 'AB Testing Company'; -- Or search by company name

-- Check 2: User credit lines
SELECT 
  ucl.id,
  ucl.user_id,
  p.email,
  p.company_name,
  ucl.credit_limit,
  ucl.available_credit,
  ucl.used_credit,
  ucl.net_terms,
  ucl.interest_rate,
  ucl.status,
  ucl.payment_score,
  ucl.approved_at,
  ucl.created_at
FROM user_credit_lines ucl
JOIN profiles p ON ucl.user_id = p.id
WHERE p.email = 'jayvekariya2003@gmail.com' -- Replace with actual email
   OR p.company_name LIKE 'AB Testing Company';

-- Check 3: Credit applications
SELECT 
  ca.id,
  p.email,
  p.company_name,
  ca.requested_amount,
  ca.approved_amount,
  ca.status,
  ca.net_terms,
  ca.interest_rate,
  ca.created_at,
  ca.reviewed_at
FROM credit_applications ca
JOIN profiles p ON ca.user_id = p.id
WHERE p.email = 'jayvekariya2003@gmail.com' -- Replace with actual email
   OR p.company_name LIKE 'AB Testing Company'
ORDER BY ca.created_at DESC;

-- Check 4: Sent credit terms
SELECT 
  sct.id,
  p.email,
  p.company_name,
  sct.credit_limit,
  sct.net_terms,
  sct.interest_rate,
  sct.status,
  sct.sent_at,
  sct.responded_at
FROM sent_credit_terms sct
JOIN profiles p ON sct.user_id = p.id
WHERE p.email = 'jayvekariya2003@gmail.com' -- Replace with actual email
   OR p.company_name LIKE 'AB Testing Company'
ORDER BY sct.sent_at DESC;

-- Check 5: Orders with credit payment
SELECT 
  o.id,
  o.order_number,
  p.email,
  p.company_name,
  o.total_amount,
  o.payment_method,
  o.status,
  o.created_at
FROM orders o
JOIN profiles p ON o.profile_id = p.id
WHERE o.payment_method = 'credit'
  AND (p.email = 'jayvekariya2003@gmail.com' OR p.company_name LIKE 'AB Testing Company')
ORDER BY o.created_at DESC;

-- Check 6: Summary comparison
SELECT 
  p.email,
  p.company_name,
  p.credit_limit as profile_credit_limit,
  p.credit_used as profile_credit_used,
  p.available_credit as profile_available_credit,
  ucl.credit_limit as creditline_limit,
  ucl.used_credit as creditline_used,
  ucl.available_credit as creditline_available,
  ucl.status as creditline_status,
  CASE 
    WHEN p.credit_limit IS NULL THEN '❌ No credit_limit in profiles'
    WHEN CAST(p.credit_limit AS NUMERIC) = 0 THEN '❌ Credit limit is 0'
    WHEN ucl.credit_limit IS NULL THEN '⚠️ No credit line record'
    WHEN CAST(p.credit_limit AS NUMERIC) != ucl.credit_limit THEN '⚠️ Mismatch between profile and credit line'
    ELSE '✅ OK'
  END as status_check
FROM profiles p
LEFT JOIN user_credit_lines ucl ON p.id = ucl.user_id
WHERE p.email = 'jayvekariya2003@gmail.com' -- Replace with actual email
   OR p.company_name LIKE 'AB Testing Company';

-- Check 7: If credit_limit is NULL or 0, this might be the issue
-- Run this to see all users with approved credit but no limit set
SELECT 
  p.id,
  p.email,
  p.company_name,
  ca.approved_amount,
  ca.status as application_status,
  p.credit_limit as profile_limit,
  ucl.credit_limit as creditline_limit,
  CASE 
    WHEN p.credit_limit IS NULL OR CAST(p.credit_limit AS NUMERIC) = 0 THEN '❌ ISSUE: Profile credit_limit not set'
    WHEN ucl.credit_limit IS NULL THEN '❌ ISSUE: No credit line created'
    ELSE '✅ OK'
  END as issue
FROM credit_applications ca
JOIN profiles p ON ca.user_id = p.id
LEFT JOIN user_credit_lines ucl ON p.id = ucl.user_id
WHERE ca.status = 'approved'
  AND (p.credit_limit IS NULL OR CAST(p.credit_limit AS NUMERIC) = 0 OR ucl.credit_limit IS NULL);
