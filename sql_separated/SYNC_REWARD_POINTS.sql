-- Sync reward points from transactions to profile
-- This fixes cases where transactions exist but profile points are not updated

-- Step 1: Check current state
SELECT 
    'BEFORE SYNC' as status,
    p.email,
    p.reward_points as current_profile_points,
    COALESCE(SUM(rt.points), 0) as total_from_transactions,
    COALESCE(SUM(rt.points), 0) - p.reward_points as difference
FROM profiles p
LEFT JOIN reward_transactions rt ON p.id = rt.user_id
WHERE p.email = 'jayvekariya2003@gmail.com'
GROUP BY p.id, p.email, p.reward_points;

-- Step 2: Sync points from transactions to profile
-- This will update the profile with the correct total from all transactions
UPDATE profiles p
SET 
    reward_points = COALESCE((
        SELECT SUM(points) 
        FROM reward_transactions 
        WHERE user_id = p.id
    ), 0),
    lifetime_reward_points = COALESCE((
        SELECT SUM(CASE WHEN points > 0 THEN points ELSE 0 END)
        FROM reward_transactions 
        WHERE user_id = p.id
    ), 0)
WHERE p.email = 'jayvekariya2003@gmail.com';

-- Step 3: Verify the sync
SELECT 
    'AFTER SYNC' as status,
    p.email,
    p.reward_points as updated_profile_points,
    p.lifetime_reward_points as updated_lifetime_points,
    COALESCE(SUM(rt.points), 0) as total_from_transactions,
    COALESCE(SUM(rt.points), 0) - p.reward_points as difference
FROM profiles p
LEFT JOIN reward_transactions rt ON p.id = rt.user_id
WHERE p.email = 'jayvekariya2003@gmail.com'
GROUP BY p.id, p.email, p.reward_points, p.lifetime_reward_points;

-- Step 4: Show recent transactions for verification
SELECT 
    rt.points,
    rt.transaction_type,
    rt.description,
    rt.created_at
FROM reward_transactions rt
JOIN profiles p ON rt.user_id = p.id
WHERE p.email = 'jayvekariya2003@gmail.com'
ORDER BY rt.created_at DESC;
