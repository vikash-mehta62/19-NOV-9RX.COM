-- Drop and recreate functions with support for all offer types
DROP FUNCTION IF EXISTS get_product_active_offers(UUID);
DROP FUNCTION IF EXISTS get_product_price_with_offers(UUID);

-- Enhanced function to get active offers for a product (all types supported)
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
    v_user RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get product details
    SELECT id, category, subcategory INTO v_product 
    FROM products 
    WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get user details if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT id, type, role, group_id INTO v_user 
        FROM profiles 
        WHERE id = p_user_id;
    END IF;

    -- Return all active offers that apply to this product
    -- Priority: 1 = direct product, 2 = product_offers, 3 = category, 4 = user_group, 5 = first_order, 6 = all
    RETURN QUERY
    
    -- 1. Direct product offer
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
    
    -- 2. Linked offers via product_offers (specific products)
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
    
    -- 3. Category-based offers
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
    
    -- 4. User group-based offers (if user provided)
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
      AND v_user.type::TEXT = ANY(o.user_groups)
    
    UNION ALL
    
    -- 5. First order only offers (requires checking order history - handled at checkout)
    -- Note: This is a placeholder - actual first order check should be done at checkout
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
      -- Check if user has no previous orders
      AND NOT EXISTS (
          SELECT 1 FROM orders 
          WHERE user_id = p_user_id 
          AND status NOT IN ('cancelled', 'draft')
      )
    
    UNION ALL
    
    -- 6. All products offers
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
    LIMIT 1;  -- Return only the best offer
END;
$$ LANGUAGE plpgsql STABLE;

-- Enhanced function to get product effective price with all offer types
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
    -- Get product
    SELECT * INTO v_product FROM products WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get the best active offer for this product
    SELECT * INTO v_offer FROM get_product_active_offers(p_product_id, p_user_id) LIMIT 1;

    IF FOUND THEN
        -- Calculate effective price based on offer type
        IF v_offer.offer_type = 'percentage' THEN
            RETURN QUERY SELECT 
                v_product.base_price,
                ROUND(v_product.base_price * (1 - v_offer.discount_value / 100), 2),
                v_offer.discount_value,
                v_offer.offer_badge,
                true,
                v_offer.offer_id;
        ELSIF v_offer.offer_type = 'flat' THEN
            RETURN QUERY SELECT 
                v_product.base_price,
                GREATEST(v_product.base_price - v_offer.discount_value, 0)::DECIMAL,
                ROUND((v_offer.discount_value / v_product.base_price) * 100, 0),
                v_offer.offer_badge,
                true,
                v_offer.offer_id;
        END IF;
        RETURN;
    END IF;

    -- No offer
    RETURN QUERY SELECT 
        v_product.base_price,
        v_product.base_price,
        0::DECIMAL,
        NULL::TEXT,
        false,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql STABLE;;
