-- =====================================================
-- LIVE DATABASE DATA COMPARISON
-- Run this on LIVE database to find differences
-- =====================================================

-- STEP 1: Record Counts Comparison
-- Expected: GROUP_PRICING=11, ORDER_ITEMS=841, INVOICES=1141, ORDERS=1261
SELECT 
    'RECORD_COUNTS' as check_type,
    'GROUP_PRICING' as table_name, 
    COUNT(*) as live_count,
    11 as expected_count,
    COUNT(*) - 11 as difference
FROM group_pricing
UNION ALL
SELECT 'RECORD_COUNTS', 'ORDER_ITEMS', COUNT(*), 841, COUNT(*) - 841
FROM order_items
UNION ALL
SELECT 'RECORD_COUNTS', 'INVOICES', COUNT(*), 1141, COUNT(*) - 1141
FROM invoices
UNION ALL
SELECT 'RECORD_COUNTS', 'ORDERS', COUNT(*), 1261, COUNT(*) - 1261
FROM orders WHERE deleted_at IS NULL;

-- STEP 2: Find NEW records in LIVE (not in current DB)
-- Orders created/updated after Feb 12, 2026 10:52:34
SELECT 
    'NEW_OR_MODIFIED' as check_type,
    'ORDERS' as table_name,
    id,
    order_number,
    status,
    payment_status,
    total_amount,
    created_at,
    updated_at,
    CASE 
        WHEN created_at > '2026-02-12 10:52:34.967286+00' THEN 'NEW'
        WHEN updated_at > '2026-02-12 10:52:34.967286+00' THEN 'MODIFIED'
    END as change_type
FROM orders
WHERE (created_at > '2026-02-12 10:52:34.967286+00' 
    OR updated_at > '2026-02-12 10:52:34.967286+00')
    AND deleted_at IS NULL
ORDER BY updated_at DESC;

-- Invoices created/updated after Feb 6, 2026 10:35:15
SELECT 
    'NEW_OR_MODIFIED' as check_type,
    'INVOICES' as table_name,
    id,
    invoice_number,
    order_id,
    status::text as status,
    payment_status,
    total_amount,
    created_at,
    updated_at,
    CASE 
        WHEN created_at > '2026-02-06 10:35:15.157+00' THEN 'NEW'
        WHEN updated_at > '2026-02-06 10:35:15.157+00' THEN 'MODIFIED'
    END as change_type
FROM invoices
WHERE created_at > '2026-02-06 10:35:15.157+00' 
    OR updated_at > '2026-02-06 10:35:15.157+00'
ORDER BY updated_at DESC;

-- Order Items created/updated after Feb 5, 2026 10:45:53
SELECT 
    'NEW_OR_MODIFIED' as check_type,
    'ORDER_ITEMS' as table_name,
    id,
    order_id,
    product_name,
    quantity,
    total_price,
    created_at,
    updated_at,
    CASE 
        WHEN created_at > '2026-02-05 10:45:53.99317+00' THEN 'NEW'
        WHEN updated_at > '2026-02-05 10:45:53.99317+00' THEN 'MODIFIED'
    END as change_type
FROM order_items
WHERE created_at > '2026-02-05 10:45:53.99317+00' 
    OR updated_at > '2026-02-05 10:45:53.99317+00'
ORDER BY updated_at DESC;

-- Group Pricing created/updated after Feb 10, 2026 12:05:09
SELECT 
    'NEW_OR_MODIFIED' as check_type,
    'GROUP_PRICING' as table_name,
    id,
    name,
    discount,
    status,
    created_at,
    updated_at,
    CASE 
        WHEN created_at > '2026-02-10 12:05:09.796976+00' THEN 'NEW'
        WHEN updated_at > '2026-02-10 12:05:09.796976+00' THEN 'MODIFIED'
    END as change_type
FROM group_pricing
WHERE created_at > '2026-02-10 12:05:09.796976+00' 
    OR updated_at > '2026-02-10 12:05:09.796976+00'
ORDER BY updated_at DESC;

-- STEP 3: Data Integrity Checksums
SELECT 
    'CHECKSUM' as check_type,
    'ORDERS' as table_name,
    COUNT(*) as total_records,
    ROUND(SUM(total_amount)::numeric, 2) as sum_total_amount,
    ROUND(SUM(COALESCE(discount_amount, 0))::numeric, 2) as sum_discount,
    ROUND(SUM(COALESCE(paid_amount, 0))::numeric, 2) as sum_paid,
    ROUND(SUM(COALESCE(shipping_cost, 0))::numeric, 2) as sum_shipping
FROM orders WHERE deleted_at IS NULL
UNION ALL
SELECT 
    'CHECKSUM',
    'INVOICES',
    COUNT(*),
    ROUND(SUM(total_amount)::numeric, 2),
    ROUND(SUM(COALESCE(discount_amount, 0))::numeric, 2),
    ROUND(SUM(COALESCE(paid_amount, 0))::numeric, 2),
    ROUND(SUM(COALESCE(tax_amount, 0))::numeric, 2)
FROM invoices
UNION ALL
SELECT 
    'CHECKSUM',
    'ORDER_ITEMS',
    COUNT(*),
    ROUND(SUM(total_price)::numeric, 2),
    NULL,
    NULL,
    ROUND(SUM(quantity)::numeric, 2)
FROM order_items;

-- STEP 4: Status Distribution Comparison
SELECT 
    'STATUS_DISTRIBUTION' as check_type,
    'ORDERS' as table_name,
    status,
    COUNT(*) as count
FROM orders
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY count DESC;

SELECT 
    'STATUS_DISTRIBUTION' as check_type,
    'INVOICES' as table_name,
    status::text as status,
    COUNT(*) as count
FROM invoices
GROUP BY status
ORDER BY count DESC;

SELECT 
    'PAYMENT_STATUS_DISTRIBUTION' as check_type,
    'ORDERS' as table_name,
    payment_status,
    COUNT(*) as count
FROM orders
WHERE deleted_at IS NULL
GROUP BY payment_status
ORDER BY count DESC;

SELECT 
    'PAYMENT_STATUS_DISTRIBUTION' as check_type,
    'INVOICES' as table_name,
    payment_status,
    COUNT(*) as count
FROM invoices
GROUP BY payment_status
ORDER BY count DESC;
