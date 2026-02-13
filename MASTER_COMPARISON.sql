
-- MASTER COMPARISON SCRIPT
-- This script will help you compare CSV data with current database

-- Step 1: Check how many orders exist in current database
SELECT 
    COUNT(*) as total_orders_in_db,
    COUNT(DISTINCT order_number) as unique_order_numbers
FROM orders
WHERE id IN (
    'e5292918-00a0-4450-bbdb-d222a62ea5e9',
    '41755432-5f54-412b-8bb0-fd86c464f7a3',
    '2d9f69b4-0227-4230-87e8-82df5240a567',
    '93d5d915-c6d2-48e5-95d2-c85a4c9e0db0',
    '64e03dc6-93b2-479f-9b83-92bdb1a28439',
    '7eaf0677-ddb2-430c-ac8e-cc6d4931c895',
    'b617fcc2-9110-4553-9a32-3b97c890ef22',
    '36df4cf9-5efa-41bb-9408-73dd8df38283',
    '630a9f7c-cd88-40df-99d5-835da1b99460',
    '74fb517b-5be9-418a-84ea-ebcb4d8fcad9'
    -- ... and 1247 more IDs
);

-- Step 2: Sample comparison - Check first 5 orders for differences
-- You can modify this to check specific fields

WITH csv_data AS (
    SELECT 
        'e5292918-00a0-4450-bbdb-d222a62ea5e9'::uuid as id,
        '9RX002289' as csv_order_number,
        'shipped' as csv_status,
        'paid' as csv_payment_status,
        310.96 as csv_total_amount
)
SELECT 
    o.id,
    o.order_number as db_order_number,
    c.csv_order_number,
    CASE WHEN o.order_number != c.csv_order_number THEN '❌ DIFFERENT' ELSE '✓ Same' END as order_number_match,
    
    o.status as db_status,
    c.csv_status,
    CASE WHEN o.status != c.csv_status THEN '❌ DIFFERENT' ELSE '✓ Same' END as status_match,
    
    o.payment_status as db_payment_status,
    c.csv_payment_status,
    CASE WHEN o.payment_status != c.csv_payment_status THEN '❌ DIFFERENT' ELSE '✓ Same' END as payment_status_match,
    
    o.total_amount as db_total_amount,
    c.csv_total_amount,
    CASE WHEN o.total_amount != c.csv_total_amount THEN '❌ DIFFERENT' ELSE '✓ Same' END as total_amount_match
FROM orders o
CROSS JOIN csv_data c
WHERE o.id = c.id;
