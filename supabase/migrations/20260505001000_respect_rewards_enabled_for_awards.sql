CREATE OR REPLACE FUNCTION public.award_review_points(
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
  v_rewards_enabled BOOLEAN;
  v_new_points INTEGER;
  v_new_lifetime INTEGER;
BEGIN
  SELECT reward_points, lifetime_reward_points, COALESCE(rewards_enabled, true)
  INTO v_current_points, v_lifetime_points, v_rewards_enabled
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_rewards_enabled IS FALSE THEN
    RETURN json_build_object('success', false, 'error', 'Rewards are disabled for this user');
  END IF;

  v_new_points := COALESCE(v_current_points, 0) + p_points;
  v_new_lifetime := COALESCE(v_lifetime_points, 0) + p_points;

  UPDATE public.profiles
  SET
    reward_points = v_new_points,
    lifetime_reward_points = v_new_lifetime
  WHERE id = p_user_id;

  UPDATE public.product_reviews
  SET points_awarded = true
  WHERE id = p_review_id;

  INSERT INTO public.reward_transactions (
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

GRANT EXECUTE ON FUNCTION public.award_review_points(UUID, INTEGER, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_referral(
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
  v_referrer_enabled BOOLEAN;
  v_referred_enabled BOOLEAN;
  v_referrer_awarded INTEGER := 0;
  v_referred_awarded INTEGER := 0;
BEGIN
  SELECT COALESCE(referral_bonus, 200)
  INTO v_referral_bonus
  FROM public.rewards_config
  LIMIT 1;

  IF v_referral_bonus IS NULL THEN
    v_referral_bonus := 200;
  END IF;

  SELECT id, referrer_id
  INTO v_referral_id, v_referrer_id
  FROM public.referrals
  WHERE referred_id = p_user_id
    AND status = 'pending'
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No pending referral found');
  END IF;

  SELECT reward_points, COALESCE(referral_count, 0), COALESCE(rewards_enabled, true)
  INTO v_referrer_points, v_referrer_count, v_referrer_enabled
  FROM public.profiles
  WHERE id = v_referrer_id;

  IF v_referrer_enabled IS TRUE THEN
    UPDATE public.profiles
    SET
      reward_points = COALESCE(v_referrer_points, 0) + v_referral_bonus,
      lifetime_reward_points = COALESCE(lifetime_reward_points, 0) + v_referral_bonus,
      referral_count = v_referrer_count + 1
    WHERE id = v_referrer_id;

    INSERT INTO public.reward_transactions (user_id, points, transaction_type, description, reference_type, reference_id)
    VALUES (v_referrer_id, v_referral_bonus, 'bonus', 'Referral bonus - friend made first purchase', 'referral', v_referral_id);

    v_referrer_awarded := v_referral_bonus;
  END IF;

  SELECT reward_points, COALESCE(rewards_enabled, true)
  INTO v_referred_points, v_referred_enabled
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_referred_enabled IS TRUE THEN
    UPDATE public.profiles
    SET
      reward_points = COALESCE(v_referred_points, 0) + v_referral_bonus,
      lifetime_reward_points = COALESCE(lifetime_reward_points, 0) + v_referral_bonus
    WHERE id = p_user_id;

    INSERT INTO public.reward_transactions (user_id, points, transaction_type, description, reference_type, reference_id)
    VALUES (p_user_id, v_referral_bonus, 'bonus', 'Welcome bonus - referred by a friend', 'referral', v_referral_id);

    v_referred_awarded := v_referral_bonus;
  END IF;

  UPDATE public.referrals
  SET
    status = 'completed',
    points_awarded = v_referrer_awarded + v_referred_awarded,
    first_order_id = p_order_id,
    completed_at = NOW()
  WHERE id = v_referral_id;

  RETURN json_build_object(
    'success', true,
    'referrer_points', v_referrer_awarded,
    'referred_points', v_referred_awarded,
    'total_awarded', v_referrer_awarded + v_referred_awarded
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_referral(UUID, UUID) TO authenticated;
