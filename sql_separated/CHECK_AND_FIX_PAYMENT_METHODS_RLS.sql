-- Check and fix RLS policies for saved_payment_methods table
-- Run this in your new database

-- Step 1: Check if the table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'saved_payment_methods'
) as table_exists;

-- Step 2: Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'saved_payment_methods'
ORDER BY policyname;

-- Step 3: If table exists but no policies, create them
-- First, enable RLS
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own payment methods" ON saved_payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON saved_payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON saved_payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON saved_payment_methods;
DROP POLICY IF EXISTS "Service role full access payment methods" ON saved_payment_methods;
DROP POLICY IF EXISTS "Admin can view all payment methods" ON saved_payment_methods;

-- Create policies for users to manage their own payment methods
CREATE POLICY "Users can view own payment methods" 
ON saved_payment_methods
FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own payment methods" 
ON saved_payment_methods
FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own payment methods" 
ON saved_payment_methods
FOR UPDATE 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own payment methods" 
ON saved_payment_methods
FOR DELETE 
USING (auth.uid() = profile_id);

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access payment methods" 
ON saved_payment_methods
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Admin can view all payment methods
CREATE POLICY "Admin can view all payment methods" 
ON saved_payment_methods
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.type = 'admin'
  )
);

-- Step 4: Verify the policies were created
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'saved_payment_methods'
ORDER BY policyname;

-- Step 5: Test if a user can insert (this will show if RLS is working)
-- This query should return true if RLS is properly configured
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'saved_payment_methods';
