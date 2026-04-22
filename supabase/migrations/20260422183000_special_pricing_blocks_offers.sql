DROP FUNCTION IF EXISTS get_product_price_with_offers(UUID);
DROP FUNCTION IF EXISTS get_product_price_with_offers(UUID, UUID);

CREATE OR REPLACE FUNCTION get_product_price_with_offers(
    p_product_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    original_price DECIMAL,
    effective_price DECIMAL,
    discount_percent DECIMAL,
    offer_badge TEXT,
    has_offer BOOLEAN,
    offer_id UUID
) AS $$
DECLARE
    v_product RECORD;
    v_offer RECORD;
BEGIN
    SELECT * INTO v_product
    FROM products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_user_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM group_pricing gp
        JOIN product_sizes ps
          ON ps.product_id = p_product_id
        CROSS JOIN LATERAL unnest(COALESCE(gp.product_arrayjson, ARRAY[]::jsonb[])) AS price_item
        WHERE gp.status = 'active'
          AND gp.group_ids IS NOT NULL
          AND EXISTS (
              SELECT 1
              FROM unnest(gp.group_ids) AS group_id
              WHERE group_id::text = p_user_id::text
          )
          AND price_item ->> 'product_id' = ps.id::text
          AND COALESCE(NULLIF(price_item ->> 'new_price', '')::DECIMAL, 0) > 0
    ) THEN
        RETURN QUERY
        SELECT
            v_product.base_price,
            v_product.base_price,
            0::DECIMAL,
            NULL::TEXT,
            false,
            NULL::UUID;
        RETURN;
    END IF;

    SELECT * INTO v_offer
    FROM get_product_active_offers(p_product_id, p_user_id)
    LIMIT 1;

    IF FOUND THEN
        IF v_offer.offer_type = 'percentage' THEN
            RETURN QUERY
            SELECT
                v_product.base_price,
                ROUND(v_product.base_price * (1 - v_offer.discount_value / 100), 2),
                v_offer.discount_value,
                v_offer.offer_badge,
                true,
                v_offer.offer_id;
        ELSIF v_offer.offer_type = 'flat' THEN
            RETURN QUERY
            SELECT
                v_product.base_price,
                GREATEST(v_product.base_price - v_offer.discount_value, 0)::DECIMAL,
                ROUND((v_offer.discount_value / v_product.base_price) * 100, 0),
                v_offer.offer_badge,
                true,
                v_offer.offer_id;
        END IF;

        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        v_product.base_price,
        v_product.base_price,
        0::DECIMAL,
        NULL::TEXT,
        false,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql STABLE;
