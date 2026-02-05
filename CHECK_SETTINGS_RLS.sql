-- Check Settings Table RLS Policies
-- Run this in Supabase SQL Editor to verify settings table configuration

-- 1. Check if RLS is enabled on settings table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'settings' AND schemaname = 'public';

-- 2. List all policies on settings table
SELECT 
    policyname,
    tablename,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'settings';

-- 3. Check settings table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. If RLS is not enabled or policies are missing, run this:
-- (Uncomment the lines below to apply)

-- Enable RLS on settings table
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
-- DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
-- DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
-- DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
-- DROP POLICY IF EXISTS "Admins can view all settings" ON settings;

-- Create RLS policies for settings table
-- CREATE POLICY "Users can view their own settings"
--   ON settings FOR SELECT
--   USING (auth.uid() = profile_id);

-- CREATE POLICY "Users can insert their own settings"
--   ON settings FOR INSERT
--   WITH CHECK (auth.uid() = profile_id);

-- CREATE POLICY "Users can update their own settings"
--   ON settings FOR UPDATE
--   USING (auth.uid() = profile_id);

-- CREATE POLICY "Admins can view all settings"
--   ON settings FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.type = 'admin'
--     )
--   );
