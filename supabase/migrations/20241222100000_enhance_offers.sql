-- Enhance offers table with additional columns

-- Add user_groups column for targeting specific user types
ALTER TABLE offers ADD COLUMN IF NOT EXISTS user_groups TEXT[];
-- Add tracking columns for analytics
ALTER TABLE offers ADD COLUMN IF NOT EXISTS total_discount_given DECIMAL(12,2) DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
-- Add first_order option to applicable_to
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_applicable_to_check;
ALTER TABLE offers ADD CONSTRAINT offers_applicable_to_check 
  CHECK (applicable_to IN ('all', 'category', 'product', 'user_group', 'first_order'));
-- Create index for promo code lookups
CREATE INDEX IF NOT EXISTS idx_offers_promo_code ON offers(promo_code) WHERE promo_code IS NOT NULL;
-- Create index for active offers
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active, start_date, end_date) WHERE is_active = true;
-- Function to validate and apply promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR,
  p_user_id UUID,
  p_order_amount DECIMAL
)
RETURNS TABLE (
  valid BOOLEAN,
  offer_id UUID,
  discount_type VARCHAR,
  discount_value DECIMAL,
  max_discount DECIMAL,
  message TEXT
) AS $$
DECLARE
  v_offer RECORD;
  v_user_type VARCHAR;
  v_is_first_order BOOLEAN;
BEGIN
  -- Find the offer
  SELECT * INTO v_offer FROM offers 
  WHERE promo_code = UPPER(p_code) 
    AND is_active = true
    AND start_date <= NOW()
    AND end_date >= NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Invalid or expired promo code'::TEXT;
    RETURN;
  END IF;

  -- Check usage limit
  IF v_offer.usage_limit IS NOT NULL AND v_offer.used_count >= v_offer.usage_limit THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Promo code usage limit reached'::TEXT;
    RETURN;
  END IF;

  -- Check minimum order amount
  IF v_offer.min_order_amount IS NOT NULL AND p_order_amount < v_offer.min_order_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 
      ('Minimum order amount is $' || v_offer.min_order_amount)::TEXT;
    RETURN;
  END IF;

  -- Check first order restriction
  IF v_offer.applicable_to = 'first_order' THEN
    SELECT COUNT(*) = 0 INTO v_is_first_order FROM orders WHERE user_id = p_user_id AND status != 'cancelled';
    IF NOT v_is_first_order THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'This offer is only for first orders'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check user group restriction
  IF v_offer.applicable_to = 'user_group' AND v_offer.user_groups IS NOT NULL THEN
    SELECT type INTO v_user_type FROM profiles WHERE id = p_user_id;
    IF v_user_type IS NULL OR NOT (v_user_type = ANY(v_offer.user_groups)) THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'This offer is not available for your account type'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Valid promo code
  RETURN QUERY SELECT 
    true, 
    v_offer.id, 
    v_offer.offer_type, 
    v_offer.discount_value, 
    v_offer.max_discount_amount,
    'Promo code applied successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;
-- Function to apply promo code (increment usage)
CREATE OR REPLACE FUNCTION apply_promo_code(
  p_offer_id UUID,
  p_discount_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE offers 
  SET 
    used_count = used_count + 1,
    total_discount_given = COALESCE(total_discount_given, 0) + p_discount_amount,
    total_orders = COALESCE(total_orders, 0) + 1
  WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql;
