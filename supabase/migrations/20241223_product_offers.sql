-- Product-level offers/promotions
-- This allows applying specific offers directly to products

-- Add offer-related columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_badge TEXT;
-- e.g., "20% OFF", "SALE", "HOT DEAL"

-- Create product_offers junction table for multiple offers per product
CREATE TABLE IF NOT EXISTS product_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    offer_price DECIMAL(10,2), -- Override price when this offer is active
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, offer_id)
);
-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_product_offers_product ON product_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_offers_offer ON product_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_products_offer ON products(offer_id) WHERE offer_id IS NOT NULL;
-- Function to get product's effective price considering offers
CREATE OR REPLACE FUNCTION get_product_effective_price(p_product_id UUID)
RETURNS TABLE (
    original_price DECIMAL,
    effective_price DECIMAL,
    discount_percent DECIMAL,
    offer_badge TEXT,
    has_offer BOOLEAN
) AS $$
DECLARE
    v_product RECORD;
    v_offer RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get product
    SELECT * INTO v_product FROM products WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Check direct product offer
    IF v_product.offer_id IS NOT NULL 
       AND v_product.offer_start_date <= v_now 
       AND v_product.offer_end_date >= v_now 
       AND v_product.offer_price IS NOT NULL THEN
        RETURN QUERY SELECT 
            v_product.price,
            v_product.offer_price,
            ROUND(((v_product.price - v_product.offer_price) / v_product.price) * 100, 0),
            v_product.offer_badge,
            true;
        RETURN;
    END IF;

    -- Check linked offers
    SELECT o.* INTO v_offer 
    FROM product_offers po
    JOIN offers o ON o.id = po.offer_id
    WHERE po.product_id = p_product_id
      AND po.is_active = true
      AND o.is_active = true
      AND o.start_date <= v_now
      AND o.end_date >= v_now
    ORDER BY 
        CASE WHEN po.offer_price IS NOT NULL THEN 0 ELSE 1 END,
        o.discount_value DESC
    LIMIT 1;

    IF FOUND THEN
        -- Calculate effective price based on offer type
        IF v_offer.offer_type = 'percentage' THEN
            RETURN QUERY SELECT 
                v_product.price,
                ROUND(v_product.price * (1 - v_offer.discount_value / 100), 2),
                v_offer.discount_value,
                (v_offer.discount_value || '% OFF')::TEXT,
                true;
        ELSIF v_offer.offer_type = 'flat' THEN
            RETURN QUERY SELECT 
                v_product.price,
                GREATEST(v_product.price - v_offer.discount_value, 0)::DECIMAL,
                ROUND((v_offer.discount_value / v_product.price) * 100, 0),
                ('$' || v_offer.discount_value || ' OFF')::TEXT,
                true;
        END IF;
        RETURN;
    END IF;

    -- No offer
    RETURN QUERY SELECT 
        v_product.price,
        v_product.price,
        0::DECIMAL,
        NULL::TEXT,
        false;
END;
$$ LANGUAGE plpgsql;
-- Enable RLS
ALTER TABLE product_offers ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Anyone can view product_offers" ON product_offers FOR SELECT USING (true);
CREATE POLICY "Admins can manage product_offers" ON product_offers FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
