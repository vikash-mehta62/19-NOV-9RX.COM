ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_applicable_to_check;

ALTER TABLE offers ADD CONSTRAINT offers_applicable_to_check
  CHECK (applicable_to IN ('all', 'category', 'product', 'specific_product', 'user_group', 'first_order'));

DROP FUNCTION IF EXISTS get_product_active_offers(UUID, UUID);

CREATE OR REPLACE FUNCTION get_product_active_offers(
    p_product_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    offer_id UUID,
    offer_type TEXT,
    discount_value DECIMAL,
    offer_badge TEXT,
    priority INT
) AS $$
DECLARE
    v_product RECORD;
    v_user_type TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    SELECT id, category, subcategory INTO v_product
    FROM products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_user_id IS NOT NULL THEN
        SELECT type::TEXT INTO v_user_type
        FROM profiles
        WHERE id = p_user_id;
    END IF;

    RETURN QUERY

    SELECT
        o.id as offer_id,
        o.offer_type::TEXT,
        o.discount_value,
        CASE
            WHEN o.offer_type = 'percentage' THEN o.discount_value || '% OFF'
            WHEN o.offer_type = 'flat' THEN '$' || o.discount_value || ' OFF'
            ELSE 'SPECIAL OFFER'
        END::TEXT as offer_badge,
        1 as priority
    FROM offers o
    WHERE o.id = (SELECT p.offer_id FROM products p WHERE p.id = p_product_id)
      AND o.is_active = true
      AND o.start_date <= v_now
      AND o.end_date >= v_now

    UNION ALL

    SELECT
        o.id as offer_id,
        o.offer_type::TEXT,
        o.discount_value,
        CASE
            WHEN o.offer_type = 'percentage' THEN o.discount_value || '% OFF'
            WHEN o.offer_type = 'flat' THEN '$' || o.discount_value || ' OFF'
            ELSE 'SPECIAL OFFER'
        END::TEXT as offer_badge,
        2 as priority
    FROM product_offers po
    JOIN offers o ON o.id = po.offer_id
    WHERE po.product_id = p_product_id
      AND po.is_active = true
      AND o.is_active = true
      AND o.start_date <= v_now
      AND o.end_date >= v_now
      AND (o.applicable_to = 'product' OR o.applicable_to IS NULL)

    UNION ALL

    SELECT
        o.id as offer_id,
        o.offer_type::TEXT,
        o.discount_value,
        CASE
            WHEN o.offer_type = 'percentage' THEN o.discount_value || '% OFF'
            WHEN o.offer_type = 'flat' THEN '$' || o.discount_value || ' OFF'
            ELSE 'SPECIAL OFFER'
        END::TEXT as offer_badge,
        2 as priority
    FROM offers o
    WHERE o.applicable_to = 'product'
      AND o.is_active = true
      AND o.start_date <= v_now
      AND o.end_date >= v_now
      AND o.applicable_ids IS NOT NULL
      AND p_product_id::TEXT = ANY(o.applicable_ids)

    UNION ALL

    SELECT
        o.id as offer_id,
        o.offer_type::TEXT,
        o.discount_value,
        CASE
            WHEN o.offer_type = 'percentage' THEN o.discount_value || '% OFF'
            WHEN o.offer_type = 'flat' THEN '$' || o.discount_value || ' OFF'
            ELSE 'SPECIAL OFFER'
        END::TEXT as offer_badge,
        3 as priority
    FROM offers o
    WHERE o.applicable_to = 'category'
      AND o.is_active = true
      AND o.start_date <= v_now
      AND o.end_date >= v_now
      AND o.applicable_ids IS NOT NULL
      AND (
          v_product.category = ANY(o.applicable_ids)
          OR UPPER(v_product.category) = ANY(
              SELECT UPPER(unnest(o.applicable_ids))
          )
      )

    UNION ALL

    SELECT
        o.id as offer_id,
        o.offer_type::TEXT,
        o.discount_value,
        CASE
            WHEN o.offer_type = 'percentage' THEN o.discount_value || '% OFF'
            WHEN o.offer_type = 'flat' THEN '$' || o.discount_value || ' OFF'
            ELSE 'SPECIAL OFFER'
        END::TEXT as offer_badge,
        4 as priority
    FROM offers o
    WHERE o.applicable_to = 'user_group'
      AND o.is_active = true
      AND o.start_date <= v_now
      AND o.end_date >= v_now
      AND o.user_groups IS NOT NULL
      AND p_user_id IS NOT NULL
      AND v_user_type = ANY(o.user_groups)

    UNION ALL

    SELECT
        o.id as offer_id,
        o.offer_type::TEXT,
        o.discount_value,
        CASE
            WHEN o.offer_type = 'percentage' THEN o.discount_value || '% OFF'
            WHEN o.offer_type = 'flat' THEN '$' || o.discount_value || ' OFF'
            ELSE 'SPECIAL OFFER'
        END::TEXT as offer_badge,
        5 as priority
    FROM offers o
    WHERE o.applicable_to = 'first_order'
      AND o.is_active = true
      AND o.start_date <= v_now
      AND o.end_date >= v_now
      AND p_user_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM orders
          WHERE profile_id = p_user_id
          AND status NOT IN ('cancelled', 'draft')
      )

    UNION ALL

    SELECT
        o.id as offer_id,
        o.offer_type::TEXT,
        o.discount_value,
        CASE
            WHEN o.offer_type = 'percentage' THEN o.discount_value || '% OFF'
            WHEN o.offer_type = 'flat' THEN '$' || o.discount_value || ' OFF'
            ELSE 'SPECIAL OFFER'
        END::TEXT as offer_badge,
        6 as priority
    FROM offers o
    WHERE o.applicable_to = 'all'
      AND o.is_active = true
      AND o.start_date <= v_now
      AND o.end_date >= v_now

    ORDER BY priority ASC, discount_value DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
