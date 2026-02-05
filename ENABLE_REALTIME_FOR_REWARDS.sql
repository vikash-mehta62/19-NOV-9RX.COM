-- Enable real-time updates for rewards system
-- This ensures that points updates are immediately reflected in the UI

-- 1. Enable real-time for profiles table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 2. Enable real-time for reward_transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE reward_transactions;

-- 3. Verify real-time is enabled
SELECT 
    schemaname,
    tablename,
    'Real-time enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('profiles', 'reward_transactions')
ORDER BY tablename;

-- 4. Check if there are any RLS policies blocking updates
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('profiles', 'reward_transactions')
ORDER BY tablename, policyname;

-- Note: If tables are not showing up in the publication, you may need to:
-- 1. Go to Supabase Dashboard > Database > Replication
-- 2. Enable replication for 'profiles' and 'reward_transactions' tables
-- 3. Or run this in the Supabase SQL Editor
