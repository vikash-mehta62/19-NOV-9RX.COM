-- Check if credit_terms table exists and has data
SELECT 
  version,
  title,
  is_active,
  effective_date,
  LENGTH(content) as content_length
FROM credit_terms
ORDER BY effective_date DESC;

-- Check sent_credit_terms for the pharmacy user
SELECT 
  sct.id,
  sct.terms_version,
  sct.status,
  sct.sent_at,
  p.email,
  p.business_name
FROM sent_credit_terms sct
JOIN profiles p ON sct.user_id = p.id
WHERE sct.status IN ('pending', 'viewed')
ORDER BY sct.sent_at DESC;

-- Check if the terms_version in sent_credit_terms matches credit_terms
SELECT 
  sct.terms_version as sent_version,
  ct.version as available_version,
  ct.is_active,
  CASE 
    WHEN ct.version IS NULL THEN 'MISSING - Terms version not found in credit_terms table'
    WHEN ct.is_active = false THEN 'INACTIVE - Terms exist but is_active = false'
    ELSE 'OK - Terms found and active'
  END as status
FROM sent_credit_terms sct
LEFT JOIN credit_terms ct ON sct.terms_version = ct.version
WHERE sct.status IN ('pending', 'viewed')
ORDER BY sct.sent_at DESC;
