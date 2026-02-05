-- Fix and verify rewards columns in profiles table
-- This ensures all required columns exist for the rewards system

-- Step 1: Check if columns exist
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
    AND column_name IN ('reward_points', 'lifetime_reward_points', 'reward_tier', 'referral_count')
ORDER BY column_name;

-- Step 2: Add missing columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_reward_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_tier TEXT DEFAULT 'Bronze';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Step 3: Update NULL values to 0 for existing records
UPDATE profiles 
SET reward_points = 0 
WHERE reward_points IS NULL;

UPDATE profiles 
SET lifetime_reward_points = 0 
WHERE lifetime_reward_points IS NULL;

UPDATE profiles 
SET reward_tier = 'Bronze' 
WHERE reward_tier IS NULL;

UPDATE profiles 
SET referral_count = 0 
WHERE referral_count IS NULL;

-- Step 4: Add NOT NULL constraints (optional, for data integrity)
-- Uncomment if you want to enforce NOT NULL
-- ALTER TABLE profiles ALTER COLUMN reward_points SET NOT NULL;
-- ALTER TABLE profiles ALTER COLUMN lifetime_reward_points SET NOT NULL;
-- ALTER TABLE profiles ALTER COLUMN reward_tier SET NOT NULL;
-- ALTER TABLE profiles ALTER COLUMN referral_count SET NOT NULL;

-- Step 5: Verify the fix
SELECT 
    id,
    email,
    reward_points,
    lifetime_reward_points,
    reward_tier,
    referral_count
FROM profiles
WHERE email IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Step 6: Check if there are any users with points
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN reward_points > 0 THEN 1 END) as users_with_points,
    SUM(reward_points) as total_points,
    SUM(lifetime_reward_points) as total_lifetime_points
FROM profiles;
