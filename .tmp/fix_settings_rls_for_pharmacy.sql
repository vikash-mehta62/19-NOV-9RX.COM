-- Fix RLS policy for settings table
-- Allow pharmacy users to read global settings

-- First, check if RLS is enabled on settings table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'settings';

-- Check existing policies
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
WHERE tablename = 'settings';

-- Drop existing restrictive policy if exists (optional)
-- DROP POLICY IF EXISTS "Allow only admins to read settings" ON settings;

-- Create policy to allow ALL authenticated users to read global settings
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read global settings"
ON settings
FOR SELECT
TO authenticated
USING (is_global = true);

-- OR if you want to allow all authenticated users to read ALL settings:
-- CREATE POLICY IF NOT EXISTS "Allow authenticated users to read all settings"
-- ON settings
-- FOR SELECT
-- TO authenticated
-- USING (true);

-- Verify the policy was created
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'settings' AND policyname = 'Allow authenticated users to read global settings';
