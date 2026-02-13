-- =====================================================
-- Integrate Daily Deals with Offers System
-- This migration links daily deals to the offers system
-- so that discounts apply at checkout
-- =====================================================

-- Step 1: Add offer_id column to daily_deals table
ALTER TABLE daily_deals 
ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE CASCADE;

-- Step 2: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_daily_deals_offer_id ON daily_deals(offer_id);

-- Step 3: Add comment explaining the column
COMMENT ON COLUMN daily_deals.offer_id IS 'Reference to auto-created offer that applies discount at checkout. When a daily deal is created, an offer is automatically generated and linked here.';

-- Step 4: Verification
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'daily_deals' 
    AND column_name = 'offer_id'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE '✅ Column daily_deals.offer_id created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create daily_deals.offer_id column';
  END IF;
END $$;

-- Step 5: Show current state
SELECT 
  COUNT(*) as total_deals,
  COUNT(offer_id) as deals_with_offers,
  COUNT(*) - COUNT(offer_id) as deals_without_offers
FROM daily_deals;
