-- =====================================================
-- Daily Deals Integration Testing Script
-- Run these queries to verify Phase 1 implementation
-- =====================================================

-- TEST 1: Check Integration Status
-- Shows which deals have linked offers
SELECT 
  dd.id as deal_id,
  p.name as product_name,
  dd.discount_percent,
  dd.badge_type,
  dd.is_active,
  dd.offer_id,
  CASE 
    WHEN dd.offer_id IS NOT NULL THEN '✅ Integrated'
    ELSE '⚠️ Display Only'
  END as checkout_status,
  CASE 
    WHEN dd.is_active AND dd.offer_id IS NOT NULL THEN '🟢 Working'
    WHEN dd.is_active AND dd.offer_id IS NULL THEN '🟡 Homepage Only'
    ELSE '🔴 Inactive'
  END as overall_status
FROM daily_deals dd
JOIN products p ON dd.product_id = p.id
ORDER BY dd.created_at DESC;

-- TEST 2: Verify Offer Creation
-- Shows deals with their linked offers
SELECT 
  dd.id as deal_id,
  p.name as product_name,
  dd.discount_percent as deal_discount,
  o.id as offer_id,
  o.title as offer_title,
  o.discount_value as offer_discount,
  o.is_active as offer_active,
  CASE 
    WHEN dd.discount_percent = o.discount_value THEN '✅ Synced'
    ELSE '❌ Out of Sync'
  END as sync_status
FROM daily_deals dd
JOIN products p ON dd.product_id = p.id
LEFT JOIN offers o ON dd.offer_id = o.id
WHERE dd.offer_id IS NOT NULL
ORDER BY dd.created_at DESC;

-- TEST 3: Check Product-Offer Links
-- Verifies product_offers table has correct links
SELECT 
  dd.id as deal_id,
  p.name as product_name,
  po.id as product_offer_id,
  po.offer_id,
  po.is_active as link_active,
  CASE 
    WHEN po.id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ Missing Link'
  END as link_status
FROM daily_deals dd
JOIN products p ON dd.product_id = p.id
LEFT JOIN product_offers po ON po.product_id = dd.product_id AND po.offer_id = dd.offer_id
WHERE dd.offer_id IS NOT NULL
ORDER BY dd.created_at DESC;

-- TEST 4: Summary Statistics
SELECT 
  COUNT(*) as total_deals,
  COUNT(offer_id) as integrated_deals,
  COUNT(*) - COUNT(offer_id) as legacy_deals,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_deals,
  COUNT(CASE WHEN is_active = true AND offer_id IS NOT NULL THEN 1 END) as active_integrated_deals,
  ROUND(
    (COUNT(offer_id)::numeric / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as integration_percentage
FROM daily_deals;

-- TEST 5: Find Legacy Deals (Need Migration)
-- Lists deals without offer_id that need to be recreated
SELECT 
  dd.id,
  p.name as product_name,
  dd.discount_percent,
  dd.badge_type,
  dd.start_date,
  dd.end_date,
  dd.is_active,
  '⚠️ Needs Recreation' as action_needed
FROM daily_deals dd
JOIN products p ON dd.product_id = p.id
WHERE dd.offer_id IS NULL
ORDER BY dd.is_active DESC, dd.created_at DESC;

-- TEST 6: Check for Conflicts
-- Finds products with multiple active discounts
SELECT 
  p.id as product_id,
  p.name as product_name,
  COUNT(DISTINCT dd.id) as deal_count,
  COUNT(DISTINCT po.offer_id) as offer_count,
  COUNT(DISTINCT dd.id) + COUNT(DISTINCT po.offer_id) as total_discounts,
  CASE 
    WHEN COUNT(DISTINCT dd.id) + COUNT(DISTINCT po.offer_id) > 1 THEN '⚠️ Multiple Discounts'
    ELSE '✅ Single Discount'
  END as conflict_status
FROM products p
LEFT JOIN daily_deals dd ON dd.product_id = p.id AND dd.is_active = true
LEFT JOIN product_offers po ON po.product_id = p.id AND po.is_active = true
WHERE dd.id IS NOT NULL OR po.id IS NOT NULL
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT dd.id) + COUNT(DISTINCT po.offer_id) > 1
ORDER BY total_discounts DESC;

-- TEST 7: Verify Cascade Delete Works
-- This is a READ-ONLY test - shows what would be deleted
SELECT 
  dd.id as deal_id,
  p.name as product_name,
  dd.offer_id,
  o.title as offer_title,
  po.id as product_offer_id,
  'Would be deleted via CASCADE' as cascade_note
FROM daily_deals dd
JOIN products p ON dd.product_id = p.id
LEFT JOIN offers o ON dd.offer_id = o.id
LEFT JOIN product_offers po ON po.offer_id = dd.offer_id
WHERE dd.offer_id IS NOT NULL
LIMIT 5;

-- TEST 8: Check Zero Price Products in Deals
-- Identifies deals with products that have zero base price
SELECT 
  dd.id as deal_id,
  p.name as product_name,
  p.base_price,
  dd.discount_percent,
  CASE 
    WHEN p.base_price = 0 THEN '⚠️ Zero Price - Check Size Prices'
    ELSE '✅ Valid Price'
  END as price_status,
  (
    SELECT COUNT(*) 
    FROM product_sizes ps 
    WHERE ps.product_id = p.id AND ps.price > 0
  ) as valid_size_count
FROM daily_deals dd
JOIN products p ON dd.product_id = p.id
WHERE dd.is_active = true
ORDER BY p.base_price ASC;

-- TEST 9: Verify Dates and Active Status
-- Shows deals with date/status issues
SELECT 
  dd.id,
  p.name as product_name,
  dd.start_date,
  dd.end_date,
  dd.is_active,
  CASE 
    WHEN dd.start_date > CURRENT_DATE THEN '🔵 Upcoming'
    WHEN dd.end_date < CURRENT_DATE THEN '🔴 Expired'
    WHEN dd.is_active = false THEN '⚫ Inactive'
    ELSE '🟢 Active'
  END as status,
  CASE 
    WHEN dd.end_date < CURRENT_DATE AND dd.is_active = true THEN '⚠️ Should be deactivated'
    WHEN dd.start_date > CURRENT_DATE AND dd.is_active = true THEN '⚠️ Scheduled but active'
    ELSE '✅ Status OK'
  END as status_check
FROM daily_deals dd
JOIN products p ON dd.product_id = p.id
ORDER BY dd.start_date DESC;

-- TEST 10: Full Integration Health Check
-- Comprehensive status of the entire system
WITH deal_stats AS (
  SELECT 
    COUNT(*) as total_deals,
    COUNT(offer_id) as integrated,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active,
    COUNT(CASE WHEN is_active = true AND offer_id IS NOT NULL THEN 1 END) as active_integrated
  FROM daily_deals
),
offer_stats AS (
  SELECT 
    COUNT(*) as total_offers,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_offers
  FROM offers
),
link_stats AS (
  SELECT 
    COUNT(*) as total_links,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_links
  FROM product_offers
)
SELECT 
  '📊 System Health Check' as report_section,
  json_build_object(
    'daily_deals', json_build_object(
      'total', ds.total_deals,
      'integrated', ds.integrated,
      'active', ds.active,
      'active_integrated', ds.active_integrated,
      'integration_rate', ROUND((ds.integrated::numeric / NULLIF(ds.total_deals, 0)) * 100, 1) || '%'
    ),
    'offers', json_build_object(
      'total', os.total_offers,
      'active', os.active_offers
    ),
    'product_links', json_build_object(
      'total', ls.total_links,
      'active', ls.active_links
    ),
    'overall_status', CASE 
      WHEN ds.active_integrated = ds.active THEN '✅ All Active Deals Integrated'
      WHEN ds.active_integrated > 0 THEN '⚠️ Some Deals Not Integrated'
      ELSE '❌ No Integrated Deals'
    END
  ) as system_status
FROM deal_stats ds, offer_stats os, link_stats ls;

-- =====================================================
-- INSTRUCTIONS FOR USE
-- =====================================================
-- 1. Run TEST 1 to see overall integration status
-- 2. Run TEST 4 for quick summary statistics
-- 3. Run TEST 5 to find legacy deals that need recreation
-- 4. Run TEST 6 to check for discount conflicts
-- 5. Run TEST 8 to find zero-price products
-- 6. Run TEST 10 for comprehensive health check
--
-- Expected Results After Phase 1:
-- - All NEW deals should show "✅ Integrated"
-- - Legacy deals (created before Phase 1) show "⚠️ Display Only"
-- - Integration percentage should increase as new deals are created
-- - No orphaned offers or product_offer links
-- =====================================================
