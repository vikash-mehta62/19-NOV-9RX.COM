-- =====================================================
-- Rewards Logic Stabilization
-- - Normalize reward_redemptions schema to app usage
-- - Move referral award timing to first paid order only
-- =====================================================

-- -----------------------------------------------------
-- 1) reward_redemptions schema alignment
-- -----------------------------------------------------
ALTER TABLE public.reward_redemptions
  ADD COLUMN IF NOT EXISTS reward_type TEXT,
  ADD COLUMN IF NOT EXISTS reward_value NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS reward_name TEXT,
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS used_in_order_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reward_redemptions_used_in_order_id_fkey'
      AND conrelid = 'public.reward_redemptions'::regclass
  ) THEN
    ALTER TABLE public.reward_redemptions
      ADD CONSTRAINT reward_redemptions_used_in_order_id_fkey
      FOREIGN KEY (used_in_order_id)
      REFERENCES public.orders(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
DECLARE
  status_constraint RECORD;
BEGIN
  FOR status_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.reward_redemptions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.reward_redemptions DROP CONSTRAINT %I',
      status_constraint.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.reward_redemptions
  ADD CONSTRAINT reward_redemptions_status_check
  CHECK (status IN ('pending', 'applied', 'used', 'expired', 'cancelled'));

UPDATE public.reward_redemptions
SET used_in_order_id = applied_to_order_id
WHERE used_in_order_id IS NULL
  AND applied_to_order_id IS NOT NULL;

UPDATE public.reward_redemptions rr
SET
  reward_type = COALESCE(rr.reward_type, ri.type),
  reward_value = COALESCE(rr.reward_value, ri.value),
  reward_name = COALESCE(rr.reward_name, ri.name)
FROM public.reward_items ri
WHERE rr.reward_item_id = ri.id;

UPDATE public.reward_redemptions
SET
  status = 'used',
  used_at = COALESCE(used_at, updated_at, created_at)
WHERE status = 'applied';

-- -----------------------------------------------------
-- 2) Referral behavior: pending at signup, award on first order
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_referral_code(
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
BEGIN
  SELECT COALESCE(referral_bonus, 200) INTO v_referral_bonus
  FROM rewards_config
  LIMIT 1;

  IF v_referral_bonus IS NULL THEN
    v_referral_bonus := 200;
  END IF;

  SELECT id, COALESCE(first_name, company_name, 'A friend')
  INTO v_referrer_id, v_referrer_name
  FROM profiles
  WHERE referral_code = UPPER(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;

  IF v_referrer_id = p_new_user_id THEN
    RETURN json_build_object('success', false, 'message', 'You cannot use your own referral code');
  END IF;

  SELECT id INTO v_existing_referral
  FROM referrals
  WHERE referred_id = p_new_user_id
  LIMIT 1;

  IF v_existing_referral IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'You have already used a referral code');
  END IF;

  UPDATE profiles
  SET referred_by = v_referrer_id
  WHERE id = p_new_user_id;

  INSERT INTO referrals (referrer_id, referred_id, status, points_awarded)
  VALUES (v_referrer_id, p_new_user_id, 'pending', 0);

  RETURN json_build_object(
    'success', true,
    'message', 'Referral applied! You and ' || v_referrer_name || ' will receive ' || v_referral_bonus || ' bonus points after your first paid order.',
    'referrer_name', v_referrer_name,
    'points_awarded', v_referral_bonus,
    'status', 'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT) TO anon;
