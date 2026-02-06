-- =====================================================
-- CHECK PRODUCT & PRODUCT_SIZE DEPENDENCIES
-- This script checks what will be affected if you delete products
-- =====================================================

-- 1. Check foreign key constraints on products table
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name IN ('products', 'product_sizes')
ORDER BY tc.table_name;

-- 2. Check order_items structure and constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- 3. Check if order_items has product_id or size_id
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column,
    rc.delete_rule
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
LEFT JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'order_items'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 4. Check invoices structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- 5. Sample data from order_items to see structure
SELECT 
    id,
    order_id,
    product_id,
    size_id,
    product_name,
    size_name,
    quantity,
    price
FROM order_items
LIMIT 5;

-- 6. Count existing orders and invoices
SELECT 
    'orders' as table_name,
    COUNT(*) as total_count
FROM orders
UNION ALL
SELECT 
    'order_items',
    COUNT(*)
FROM order_items
UNION ALL
SELECT 
    'invoices',
    COUNT(*)
FROM invoices;
