-- Check if user exists in profiles table
-- Replace 'USER_ID_HERE' with actual user ID

-- 1. Check profiles table
SELECT 
    'PROFILES TABLE' as table_name,
    id,
    display_name,
    email,
    type,
    status,
    created_at
FROM profiles 
WHERE id = '462da520-bf13-496b-91c4-d0cd190e053a';

-- 2. Check auth.users table (requires service role)
SELECT 
    'AUTH.USERS TABLE' as table_name,
    id,
    email,
    created_at,
    last_sign_in_at,
    deleted_at
FROM auth.users 
WHERE id = '462da520-bf13-496b-91c4-d0cd190e053a';

-- 3. Check related data that might prevent deletion
SELECT 
    'LOCATIONS' as related_table,
    COUNT(*) as count
FROM locations 
WHERE profile_id = '462da520-bf13-496b-91c4-d0cd190e053a'
UNION ALL
SELECT 
    'ORDERS' as related_table,
    COUNT(*) as count
FROM orders 
WHERE user_id = '462da520-bf13-496b-91c4-d0cd190e053a'
UNION ALL
SELECT 
    'REWARD_TRANSACTIONS' as related_table,
    COUNT(*) as count
FROM reward_transactions 
WHERE user_id = '462da520-bf13-496b-91c4-d0cd190e053a'
UNION ALL
SELECT 
    'WISHLIST' as related_table,
    COUNT(*) as count
FROM wishlist 
WHERE user_id = '462da520-bf13-496b-91c4-d0cd190e053a'
UNION ALL
SELECT 
    'CARTS' as related_table,
    COUNT(*) as count
FROM carts 
WHERE user_id = '462da520-bf13-496b-91c4-d0cd190e053a'
UNION ALL
SELECT 
    'ABANDONED_CARTS' as related_table,
    COUNT(*) as count
FROM abandoned_carts 
WHERE user_id = '462da520-bf13-496b-91c4-d0cd190e053a';

-- 4. Check if there are any database triggers on profiles table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
AND trigger_name LIKE '%delete%';
