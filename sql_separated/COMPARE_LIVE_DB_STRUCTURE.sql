-- =====================================================
-- DATABASE STRUCTURE COMPARISON SCRIPT
-- Run this on LIVE database to compare with current DB
-- =====================================================

-- 1. GROUP_PRICING TABLE STRUCTURE
SELECT 
    'GROUP_PRICING' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'group_pricing'
ORDER BY ordinal_position;

-- 2. ORDER_ITEMS TABLE STRUCTURE
SELECT 
    'ORDER_ITEMS' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'order_items'
ORDER BY ordinal_position;

-- 3. INVOICES TABLE STRUCTURE
SELECT 
    'INVOICES' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'invoices'
ORDER BY ordinal_position;

-- 4. ORDERS TABLE STRUCTURE
SELECT 
    'ORDERS' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'orders'
ORDER BY ordinal_position;
