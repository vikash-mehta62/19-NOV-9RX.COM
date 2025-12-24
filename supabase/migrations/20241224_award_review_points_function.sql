-- =====================================================
-- 1. UPDATE RLS POLICY - Allow users to update their own reward_points
-- =====================================================

-- Drop existing update policy if exists
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new policy that allows users to update their own profile including reward_points
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. RPC FUNCTION - Award review points (fixed UUID type)
-- =====================================================

CREATE OR REPLACE FUNCTION award_review_points(
  p_user_id UUID,
  p_points INTEGER,
  p_review_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_points INTEGER;
  v_lifetime_points INTEGER;
  v_new_points INTEGER;
  v_new_lifetime INTEGER;
BEGIN
  -- Get current points
  SELECT reward_points, lifetime_reward_points 
  INTO v_current_points, v_lifetime_points
  FROM profiles 
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Calculate new points
  v_new_points := COALESCE(v_current_points, 0) + p_points;
  v_new_lifetime := COALESCE(v_lifetime_points, 0) + p_points;

  -- Update profile
  UPDATE profiles 
  SET 
    reward_points = v_new_points,
    lifetime_reward_points = v_new_lifetime
  WHERE id = p_user_id;

  -- Mark review as points awarded
  UPDATE product_reviews 
  SET points_awarded = true 
  WHERE id = p_review_id;

  -- Log transaction
  INSERT INTO reward_transactions (
    user_id, 
    points, 
    transaction_type, 
    description, 
    reference_type, 
    reference_id
  ) VALUES (
    p_user_id,
    p_points,
    'bonus',
    'Review bonus - thank you for your feedback!',
    'review',
    p_review_id
  );

  RETURN json_build_object(
    'success', true, 
    'new_points', v_new_points,
    'new_lifetime', v_new_lifetime,
    'points_awarded', p_points
  );
END;
$$;

GRANT EXECUTE ON FUNCTION award_review_points(UUID, INTEGER, UUID) TO authenticated;

-- =====================================================
-- 3. RPC FUNCTION - Apply referral code (works without login - SECURITY DEFINER)
-- Awards points immediately on signup
-- =====================================================

CREATE OR REPLACE FUNCTION apply_referral_code(
  p_new_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_name TEXT;
  v_existing_referral UUID;
  v_referral_bonus INTEGER;
  v_referrer_points INTEGER;
  v_referrer_lifetime INTEGER;
  v_referrer_count INTEGER;
  v_new_user_points INTEGER;
  v_referral_id UUID;
BEGIN
  -- Get referral bonus from config
  SELECT COALESCE(referral_bonus, 200) INTO v_referral_bonus
  FROM rewards_config LIMIT 1;
  
  IF v_referral_bonus IS NULL THEN
    v_referral_bonus := 200;
  END IF;

  -- Find referrer by code
  SELECT id, COALESCE(first_name, company_name, 'A friend')
  INTO v_referrer_id, v_referrer_name
  FROM profiles
  WHERE referral_code = UPPER(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;

  -- Can't refer yourself
  IF v_referrer_id = p_new_user_id THEN
    RETURN json_build_object('success', false, 'message', 'You cannot use your own referral code');
  END IF;

  -- Check if already referred
  SELECT id INTO v_existing_referral
  FROM referrals
  WHERE referred_id = p_new_user_id
  LIMIT 1;

  IF v_existing_referral IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'You have already used a referral code');
  END IF;

  -- Update new user's profile with referrer info
  UPDATE profiles
  SET referred_by = v_referrer_id
  WHERE id = p_new_user_id;

  -- Create referral record (completed immediately)
  INSERT INTO referrals (referrer_id, referred_id, status, points_awarded, completed_at)
  VALUES (v_referrer_id, p_new_user_id, 'completed', v_referral_bonus, NOW())
  RETURNING id INTO v_referral_id;

  -- Award points to REFERRER
  SELECT reward_points, lifetime_reward_points, COALESCE(referral_count, 0)
  INTO v_referrer_points, v_referrer_lifetime, v_referrer_count
  FROM profiles WHERE id = v_referrer_id;

  UPDATE profiles
  SET 
    reward_points = COALESCE(v_referrer_points, 0) + v_referral_bonus,
    lifetime_reward_points = COALESCE(v_referrer_lifetime, 0) + v_referral_bonus,
    referral_count = v_referrer_count + 1
  WHERE id = v_referrer_id;

  -- Log transaction for referrer
  INSERT INTO reward_transactions (user_id, points, transaction_type, description, reference_type, reference_id)
  VALUES (v_referrer_id, v_referral_bonus, 'bonus', 'Referral bonus - new user signed up with your code', 'referral', v_referral_id);

  -- Award points to NEW USER
  SELECT reward_points INTO v_new_user_points
  FROM profiles WHERE id = p_new_user_id;

  UPDATE profiles
  SET 
    reward_points = COALESCE(v_new_user_points, 0) + v_referral_bonus,
    lifetime_reward_points = COALESCE(v_new_user_points, 0) + v_referral_bonus
  WHERE id = p_new_user_id;

  -- Log transaction for new user
  INSERT INTO reward_transactions (user_id, points, transaction_type, description, reference_type, reference_id)
  VALUES (p_new_user_id, v_referral_bonus, 'bonus', 'Welcome bonus - signed up with referral code', 'referral', v_referral_id);

  RETURN json_build_object(
    'success', true,
    'message', 'Referral applied! You both earned ' || v_referral_bonus || ' bonus points!',
    'referrer_name', v_referrer_name,
    'points_awarded', v_referral_bonus
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_referral_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_referral_code(UUID, TEXT) TO anon;

-- =====================================================
-- 4. RPC FUNCTION - Complete referral and award points (on first order)
-- =====================================================

CREATE OR REPLACE FUNCTION complete_referral(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id UUID;
  v_referrer_id UUID;
  v_referral_bonus INTEGER;
  v_referrer_points INTEGER;
  v_referred_points INTEGER;
  v_referrer_count INTEGER;
BEGIN
  -- Get referral bonus from config
  SELECT COALESCE(referral_bonus, 200) INTO v_referral_bonus
  FROM rewards_config
  LIMIT 1;

  -- Find pending referral for this user
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM referrals
  WHERE referred_id = p_user_id AND status = 'pending'
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No pending referral found');
  END IF;

  -- Update referral status
  UPDATE referrals
  SET 
    status = 'completed',
    points_awarded = v_referral_bonus,
    first_order_id = p_order_id,
    completed_at = NOW()
  WHERE id = v_referral_id;

  -- Award points to referrer
  SELECT reward_points, COALESCE(referral_count, 0)
  INTO v_referrer_points, v_referrer_count
  FROM profiles WHERE id = v_referrer_id;

  UPDATE profiles
  SET 
    reward_points = COALESCE(v_referrer_points, 0) + v_referral_bonus,
    lifetime_reward_points = COALESCE(lifetime_reward_points, 0) + v_referral_bonus,
    referral_count = v_referrer_count + 1
  WHERE id = v_referrer_id;

  -- Log transaction for referrer
  INSERT INTO reward_transactions (user_id, points, transaction_type, description, reference_type, reference_id)
  VALUES (v_referrer_id, v_referral_bonus, 'bonus', 'Referral bonus - friend made first purchase', 'referral', v_referral_id);

  -- Award points to referred user
  SELECT reward_points INTO v_referred_points
  FROM profiles WHERE id = p_user_id;

  UPDATE profiles
  SET 
    reward_points = COALESCE(v_referred_points, 0) + v_referral_bonus,
    lifetime_reward_points = COALESCE(lifetime_reward_points, 0) + v_referral_bonus
  WHERE id = p_user_id;

  -- Log transaction for referred user
  INSERT INTO reward_transactions (user_id, points, transaction_type, description, reference_type, reference_id)
  VALUES (p_user_id, v_referral_bonus, 'bonus', 'Welcome bonus - referred by a friend', 'referral', v_referral_id);

  RETURN json_build_object(
    'success', true,
    'referrer_points', v_referral_bonus,
    'referred_points', v_referral_bonus,
    'total_awarded', v_referral_bonus * 2
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_referral(UUID, UUID) TO authenticated;
