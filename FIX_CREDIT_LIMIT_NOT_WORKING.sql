-- Comprehensive fix for credit limit not working when creating orders
-- This addresses multiple potential issues:
-- 1. credit_limit not set in profiles
-- 2. credit_used being NULL
-- 3. available_credit not calculated properly

-- STEP 1: Ensure credit_used has a default value and is never NULL
ALTER TABLE profiles 
ALTER COLUMN credit_used SET DEFAULT 0;

UPDATE profiles 
SET credit_used = 0 
WHERE credit_used IS NULL;

-- STEP 2: Ensure credit_limit is set for users with approved credit applications
-- This syncs approved credit applications to profiles table
UPDATE profiles p
SET 
  credit_limit = ca.approved_amount::text,
  payment_terms = 'net_' || ca.net_terms,
  credit_days = ca.net_terms,
  late_payment_fee_percentage = ca.interest_rate,
  credit_status = 'good'
FROM credit_applications ca
WHERE p.id = ca.user_id
  AND ca.status = 'approved'
  AND ca.approved_amount IS NOT NULL
  AND (p.credit_limit IS NULL OR CAST(p.credit_limit AS NUMERIC) = 0);

-- STEP 3: Ensure credit_limit is set for users with active credit lines
-- This syncs user_credit_lines to profiles table
UPDATE profiles p
SET 
  credit_limit = ucl.credit_limit::text,
  payment_terms = 'net_' || ucl.net_terms,
  credit_days = ucl.net_terms,
  late_payment_fee_percentage = ucl.interest_rate,
  credit_status = 'good'
FROM user_credit_lines ucl
WHERE p.id = ucl.user_id
  AND ucl.status = 'active'
  AND ucl.credit_limit > 0
  AND (p.credit_limit IS NULL OR CAST(p.credit_limit AS NUMERIC) = 0);

-- STEP 4: If available_credit is a stored column, update it
-- (If it's a generated column, this will fail harmlessly)
DO $$
BEGIN
  UPDATE profiles 
  SET available_credit = CAST(COALESCE(credit_limit, '0') AS NUMERIC) - CAST(COALESCE(credit_used, '0') AS NUMERIC)
  WHERE available_credit IS DISTINCT FROM (CAST(COALESCE(credit_limit, '0') AS NUMERIC) - CAST(COALESCE(credit_used, '0') AS NUMERIC));
EXCEPTION
  WHEN undefined_column THEN
    -- available_credit column doesn't exist or is generated, skip
    RAISE NOTICE 'available_credit column does not exist or is generated';
END $$;

-- STEP 5: Create a trigger to automatically calculate available_credit
-- This ensures available_credit is always correct when credit_limit or credit_used changes
CREATE OR REPLACE FUNCTION update_available_credit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if available_credit column exists and is not generated
  BEGIN
    NEW.available_credit := CAST(COALESCE(NEW.credit_limit, '0') AS NUMERIC) - CAST(COALESCE(NEW.credit_used, '0') AS NUMERIC);
  EXCEPTION
    WHEN undefined_column THEN
      -- Column doesn't exist or is generated, do nothing
      NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_available_credit_trigger ON profiles;
CREATE TRIGGER update_available_credit_trigger
BEFORE INSERT OR UPDATE OF credit_limit, credit_used ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_available_credit();

-- STEP 6: Verify the fix - show users with credit
SELECT 
  p.id,
  p.email,
  p.company_name,
  p.role,
  p.credit_limit,
  p.credit_used,
  CAST(COALESCE(p.credit_limit, '0') AS NUMERIC) - CAST(COALESCE(p.credit_used, '0') AS NUMERIC) as calculated_available,
  p.credit_status,
  ucl.status as creditline_status,
  CASE 
    WHEN p.credit_limit IS NULL OR CAST(p.credit_limit AS NUMERIC) = 0 THEN '❌ No credit limit'
    WHEN p.credit_used IS NULL THEN '❌ credit_used is NULL'
    WHEN CAST(p.credit_limit AS NUMERIC) > 0 AND CAST(COALESCE(p.credit_used, '0') AS NUMERIC) = 0 THEN '✅ Ready to use'
    WHEN CAST(p.credit_limit AS NUMERIC) > CAST(COALESCE(p.credit_used, '0') AS NUMERIC) THEN '✅ Has available credit'
    ELSE '⚠️ Credit exhausted'
  END as status
FROM profiles p
LEFT JOIN user_credit_lines ucl ON p.id = ucl.user_id
WHERE CAST(COALESCE(p.credit_limit, '0') AS NUMERIC) > 0 OR ucl.credit_limit > 0
ORDER BY p.company_name;

-- STEP 7: For the specific user having issues, run this to force update
-- Replace the email with the actual user's email
DO $$
DECLARE
  v_user_id UUID;
  v_credit_limit DECIMAL(12,2);
BEGIN
  -- Find user by email (change this to the actual user's email)
  SELECT id INTO v_user_id 
  FROM profiles 
  WHERE email = 'jayvekariya2003@gmail.com' -- User with the issue
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Get approved credit amount
    SELECT approved_amount INTO v_credit_limit
    FROM credit_applications
    WHERE user_id = v_user_id
      AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no approved application, check credit line
    IF v_credit_limit IS NULL THEN
      SELECT credit_limit INTO v_credit_limit
      FROM user_credit_lines
      WHERE user_id = v_user_id
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
    
    -- Update profile if we found a credit limit
    IF v_credit_limit IS NOT NULL AND v_credit_limit > 0 THEN
      UPDATE profiles
      SET 
        credit_limit = v_credit_limit::text,
        credit_used = COALESCE(credit_used, '0'),
        credit_status = 'good'
      WHERE id = v_user_id;
      
      RAISE NOTICE 'Updated user % with credit limit %', v_user_id, v_credit_limit;
    ELSE
      RAISE NOTICE 'No approved credit found for user %', v_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'User not found';
  END IF;
END $$;

-- STEP 8: Show the result for verification
SELECT 
  p.email,
  p.company_name,
  p.credit_limit,
  p.credit_used,
  COALESCE(CAST(p.credit_limit AS NUMERIC), 0) - COALESCE(CAST(p.credit_used AS NUMERIC), 0) as available_credit,
  p.credit_status
FROM profiles p
WHERE p.email = 'jayvekariya2003@gmail.com' -- User with the issue
   OR p.company_name LIKE 'AB Testing Company';
