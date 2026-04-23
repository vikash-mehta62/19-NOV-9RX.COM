-- =====================================================
-- REWARD POINTS DIAGNOSTIC SCRIPT
-- Run this in your Supabase SQL Editor to check why points are not being awarded
-- =====================================================

-- 1. Check if rewards system is enabled
SELECT 
    '1. REWARDS CONFIG' as check_name,
    program_enabled,
    points_per_dollar,
    referral_bonus,
    review_bonus,
    birthday_bonus
FROM rewards_config
LIMIT 1;

-- 2. Check recent orders (last 7 days) and their reward transactions
SELECT 
    '2. RECENT ORDERS & REWARD TRANSACTIONS' as check_name,
    o.id as order_id,
    o.order_number,
    o.profile_id,
    o.grand_total,
    o.payment_method,
    o.status,
    o.created_at as order_date,
    rt.id as transaction_id,
    rt.points,
    rt.transaction_type,
    rt.description,
    rt.created_at as points_awarded_at,
    CASE 
        WHEN rt.id IS NULL THEN '❌ NO POINTS AWARDED'
        ELSE '✅ POINTS AWARDED'
    END as points_status
FROM orders o
LEFT JOIN reward_transactions rt ON rt.reference_id = o.id AND rt.reference_type = 'order'
WHERE o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 20;

-- 3. Check profiles with recent orders but missing reward points
SELECT 
    '3. USERS WITH ORDERS BUT NO POINTS' as check_name,
    p.id,
    p.email,
    p.first_name,
    p.company_name,
    p.reward_points,
    p.lifetime_reward_points,
    COUNT(o.id) as total_orders,
    SUM(o.grand_total) as total_spent,
    MAX(o.created_at) as last_order_date
FROM profiles p
INNER JOIN orders o ON o.profile_id = p.id
WHERE o.created_at > NOW() - INTERVAL '7 days'
    AND o.payment_method != 'credit'  -- Credit orders don't earn points
    AND o.status != 'cancelled'
GROUP BY p.id, p.email, p.first_name, p.company_name, p.reward_points, p.lifetime_reward_points
HAVING p.reward_points = 0 OR p.reward_points IS NULL
ORDER BY last_order_date DESC
LIMIT 10;

-- 4. Check if reward_transactions table exists and has data
SELECT 
    '4. REWARD TRANSACTIONS TABLE CHECK' as check_name,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN transaction_type = 'earn' THEN 1 END) as earn_transactions,
    COUNT(CASE WHEN transaction_type = 'redeem' THEN 1 END) as redeem_transactions,
    COUNT(CASE WHEN transaction_type = 'bonus' THEN 1 END) as bonus_transactions,
    MAX(created_at) as last_transaction_date
FROM reward_transactions;

-- 5. Check for duplicate reward transactions (same order awarded twice)
SELECT 
    '5. DUPLICATE REWARD TRANSACTIONS' as check_name,
    reference_id as order_id,
    COUNT(*) as duplicate_count,
    SUM(points) as total_points_awarded
FROM reward_transactions
WHERE reference_type = 'order'
    AND transaction_type = 'earn'
GROUP BY reference_id
HAVING COUNT(*) > 1
LIMIT 10;

-- 6. Sample of successful reward transactions
SELECT 
    '6. SAMPLE SUCCESSFUL TRANSACTIONS' as check_name,
    rt.id,
    rt.user_id,
    p.email,
    rt.points,
    rt.transaction_type,
    rt.description,
    rt.reference_type,
    rt.reference_id,
    rt.created_at
FROM reward_transactions rt
LEFT JOIN profiles p ON p.id = rt.user_id
WHERE rt.transaction_type = 'earn'
    AND rt.reference_type = 'order'
ORDER BY rt.created_at DESC
LIMIT 5;

-- 7. Check profiles table for reward_points column
SELECT 
    '7. PROFILES TABLE STRUCTURE' as check_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
    AND column_name IN ('reward_points', 'lifetime_reward_points', 'reward_tier')
ORDER BY column_name;

-- 8. Check if there are any orders without profile_id
SELECT 
    '8. ORDERS WITHOUT PROFILE_ID' as check_name,
    COUNT(*) as orders_without_profile,
    MAX(created_at) as latest_order_date
FROM orders
WHERE profile_id IS NULL
    AND created_at > NOW() - INTERVAL '7 days';
