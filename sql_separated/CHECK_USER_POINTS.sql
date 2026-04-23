-- Check user's current points and recent transactions
-- Replace 'jayvekariya2003@gmail.com' with the actual user email

-- Step 1: Check user's profile points
SELECT 
    id,
    email,
    first_name,
    last_name,
    reward_points,
    lifetime_reward_points,
    reward_tier,
    created_at
FROM profiles
WHERE email = 'jayvekariya2003@gmail.com';

-- Step 2: Check recent reward transactions for this user
SELECT 
    rt.id,
    rt.points,
    rt.transaction_type,
    rt.description,
    rt.created_at,
    p.email
FROM reward_transactions rt
JOIN profiles p ON rt.user_id = p.id
WHERE p.email = 'jayvekariya2003@gmail.com'
ORDER BY rt.created_at DESC
LIMIT 10;

-- Step 3: Check if reward_transactions table exists and has data
SELECT 
    COUNT(*) as total_transactions,
    SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as total_points_added,
    SUM(CASE WHEN points < 0 THEN points ELSE 0 END) as total_points_deducted
FROM reward_transactions;

-- Step 4: If transactions exist but profile points are 0, we need to sync them
-- This query will show the discrepancy
SELECT 
    p.email,
    p.reward_points as profile_points,
    COALESCE(SUM(rt.points), 0) as transaction_total,
    COALESCE(SUM(rt.points), 0) - p.reward_points as discrepancy
FROM profiles p
LEFT JOIN reward_transactions rt ON p.id = rt.user_id
WHERE p.email = 'jayvekariya2003@gmail.com'
GROUP BY p.id, p.email, p.reward_points;
