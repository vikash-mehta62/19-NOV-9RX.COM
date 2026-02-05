-- Fix Settings Table RLS - Remove Duplicate Policies
-- Run this in Supabase SQL Editor

-- Drop all existing duplicate policies
DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;

-- Create clean, non-duplicate policies
CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Verify the cleanup
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'settings';
