-- Fix credit_used display issue
-- The problem is that credit_used column in profiles table might be NULL or not properly initialized

-- Step 1: Add default value to credit_used column if it doesn't have one
ALTER TABLE profiles 
ALTER COLUMN credit_used SET DEFAULT 0;

-- Step 2: Update all NULL credit_used values to 0
UPDATE profiles 
SET credit_used = 0 
WHERE credit_used IS NULL;

-- Step 3: Calculate actual credit used from orders and update profiles
-- This will sync the credit_used with actual order totals for credit payment method
WITH credit_orders AS (
  SELECT 
    profile_id,
    SUM(total_amount) as total_credit_used
  FROM orders
  WHERE payment_method = 'credit'
    AND status NOT IN ('cancelled', 'refunded')
  GROUP BY profile_id
),
credit_payments AS (
  SELECT 
    customer_id,
    SUM(amount) as total_paid
  FROM payment_transactions
  WHERE payment_method = 'credit'
    AND status = 'completed'
  GROUP BY customer_id
)
UPDATE profiles p
SET credit_used = COALESCE(co.total_credit_used, 0) - COALESCE(cp.total_paid, 0)
FROM credit_orders co
LEFT JOIN credit_payments cp ON co.profile_id = cp.customer_id
WHERE p.id = co.profile_id
  AND p.credit_used != (COALESCE(co.total_credit_used, 0) - COALESCE(cp.total_paid, 0));

-- Step 4: Also sync user_credit_lines.used_credit with profiles.credit_used
UPDATE user_credit_lines ucl
SET 
  used_credit = COALESCE(p.credit_used, 0),
  available_credit = ucl.credit_limit - COALESCE(p.credit_used, 0),
  updated_at = NOW()
FROM profiles p
WHERE ucl.user_id = p.id
  AND ucl.used_credit != COALESCE(p.credit_used, 0);

-- Step 5: Verify the results
SELECT 
  p.id,
  p.company_name,
  p.credit_limit,
  p.credit_used,
  p.available_credit,
  ucl.used_credit as credit_line_used,
  ucl.available_credit as credit_line_available
FROM profiles p
LEFT JOIN user_credit_lines ucl ON p.id = ucl.user_id
WHERE p.credit_limit > 0
ORDER BY p.company_name;

-- Step 6: Create a function to keep credit_used in sync
CREATE OR REPLACE FUNCTION sync_credit_used()
RETURNS TRIGGER AS $$
BEGIN
  -- When an order is created/updated with credit payment
  IF NEW.payment_method = 'credit' AND NEW.status NOT IN ('cancelled', 'refunded') THEN
    -- Calculate total credit used from all orders
    UPDATE profiles
    SET credit_used = (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM orders
      WHERE profile_id = NEW.profile_id
        AND payment_method = 'credit'
        AND status NOT IN ('cancelled', 'refunded')
    ) - (
      SELECT COALESCE(SUM(amount), 0)
      FROM payment_transactions
      WHERE customer_id = NEW.profile_id
        AND payment_method = 'credit'
        AND status = 'completed'
    )
    WHERE id = NEW.profile_id;
    
    -- Also update user_credit_lines
    UPDATE user_credit_lines
    SET 
      used_credit = (SELECT credit_used FROM profiles WHERE id = NEW.profile_id),
      available_credit = credit_limit - (SELECT credit_used FROM profiles WHERE id = NEW.profile_id),
      updated_at = NOW()
    WHERE user_id = NEW.profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS sync_credit_used_trigger ON orders;
CREATE TRIGGER sync_credit_used_trigger
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION sync_credit_used();

-- Step 7: Create a function to recalculate credit used for a specific user
CREATE OR REPLACE FUNCTION recalculate_user_credit_used(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_orders DECIMAL(12,2);
  v_total_payments DECIMAL(12,2);
  v_credit_used DECIMAL(12,2);
BEGIN
  -- Calculate total from credit orders
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_orders
  FROM orders
  WHERE profile_id = p_user_id
    AND payment_method = 'credit'
    AND status NOT IN ('cancelled', 'refunded');
  
  -- Calculate total payments made
  SELECT COALESCE(SUM(amount), 0) INTO v_total_payments
  FROM payment_transactions
  WHERE customer_id = p_user_id
    AND payment_method = 'credit'
    AND status = 'completed';
  
  -- Calculate net credit used
  v_credit_used := v_total_orders - v_total_payments;
  
  -- Update profiles
  UPDATE profiles
  SET credit_used = v_credit_used
  WHERE id = p_user_id;
  
  -- Update user_credit_lines
  UPDATE user_credit_lines
  SET 
    used_credit = v_credit_used,
    available_credit = credit_limit - v_credit_used,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'total_orders', v_total_orders,
    'total_payments', v_total_payments,
    'credit_used', v_credit_used
  );
END;
$$ LANGUAGE plpgsql;

-- Example: To recalculate credit for a specific user
-- SELECT recalculate_user_credit_used('user-uuid-here');

-- To recalculate for all users with credit lines:
-- SELECT recalculate_user_credit_used(user_id) FROM user_credit_lines;
