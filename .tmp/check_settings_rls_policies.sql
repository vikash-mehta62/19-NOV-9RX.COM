-- Check current RLS policies on settings table

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'settings';

-- 2. Check all existing policies on settings table
SELECT 
  schemaname,
  tablename,
  policyname as "Policy Name",
  permissive as "Permissive",
  roles as "Roles",
  cmd as "Command",
  qual as "USING Clause",
  with_check as "WITH CHECK Clause"
FROM pg_policies 
WHERE tablename = 'settings'
ORDER BY policyname;

-- 3. Check if global settings row exists
SELECT 
  id,
  is_global,
  auto_shipping_charge_enabled,
  auto_shipping_charge_threshold,
  auto_shipping_charge_amount,
  free_shipping_enabled,
  free_shipping_threshold,
  default_shipping_rate,
  handling_fee
FROM settings 
WHERE is_global = true;

-- 4. Test query as if you're a pharmacy user (simulated)
-- This will show what a pharmacy user can see
SET ROLE authenticated;
SELECT * FROM settings WHERE is_global = true;
RESET ROLE;
