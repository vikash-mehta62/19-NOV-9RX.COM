-- ⚡ QUICK FIX: A/B Tests RLS Error
-- Copy and run this in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/qiaetxkxweghuoxyhvml/editor

-- Drop restrictive policies
DROP POLICY IF EXISTS "Admin can manage A/B tests" ON ab_tests;
DROP POLICY IF EXISTS "Public can manage A/B tests" ON ab_tests;

-- Create permissive policies (allows all operations)
CREATE POLICY "Allow all operations on ab_tests" 
ON ab_tests 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ✅ Done! Try creating an A/B test again.
