-- =====================================================
-- EXPORT CURRENT DATABASE DATA
-- Run this on CURRENT (connected) database
-- =====================================================

-- 1. Export GROUP_PRICING data with checksums
SELECT 
    'GROUP_PRICING' as table_name,
    COUNT(*) as total_records,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as latest_update,
    STRING_AGG(DISTINCT status, ', ') as statuses
FROM group_pricing;

SELECT 
    id,
    name,
    discount,
    min_quantity,
    max_quantity,
    product_id,
    status,
    discount_type,
    created_at,
    updated_at
FROM group_pricing
ORDER BY updated_at DESC;

-- 2. Export ORDER_ITEMS data
SELECT 
    'ORDER_ITEMS' as table_name,
    COUNT(*) as total_records,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as latest_update,
    SUM(quantity) as total_quantity,
    SUM(total_price) as total_value
FROM order_items;

SELECT 
    id,
    order_id,
    product_id,
    product_name,
    sku,
    quantity,
    unit_price,
    total_price,
    product_size_id,
    notes,
    created_at,
    updated_at
FROM order_items
ORDER BY updated_at DESC;

-- 3. Export INVOICES data
SELECT 
    'INVOICES' as table_name,
    COUNT(*) as total_records,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as latest_update,
    STRING_AGG(DISTINCT status::text, ', ') as statuses,
    STRING_AGG(DISTINCT payment_status, ', ') as payment_statuses,
    SUM(total_amount) as total_invoice_amount
FROM invoices;

SELECT 
    id,
    invoice_number,
    order_id,
    profile_id,
    status,
    payment_status,
    amount,
    tax_amount,
    discount_amount,
    total_amount,
    paid_amount,
    void,
    voidReason,
    cancelReason,
    purchase_number_external,
    created_at,
    updated_at,
    paid_at
FROM invoices
ORDER BY updated_at DESC;

-- 4. Export ORDERS data
SELECT 
    'ORDERS' as table_name,
    COUNT(*) as total_records,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as latest_update,
    STRING_AGG(DISTINCT status, ', ') as statuses,
    STRING_AGG(DISTINCT payment_status, ', ') as payment_statuses,
    SUM(total_amount) as total_order_amount
FROM orders
WHERE deleted_at IS NULL;

SELECT 
    id,
    order_number,
    profile_id,
    status,
    payment_status,
    total_amount,
    shipping_cost,
    tax_amount,
    discount_amount,
    paid_amount,
    commission_amount,
    invoice_number,
    invoice_created,
    void,
    voidReason,
    poApproved,
    poRejected,
    cancelReason,
    purchase_number_external,
    order_type,
    payment_terms,
    payment_method,
    group_id,
    location_id,
    created_at,
    updated_at,
    deleted_at
FROM orders
ORDER BY updated_at DESC;
