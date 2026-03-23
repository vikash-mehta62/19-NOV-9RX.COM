-- Fix RLS policy for settings table to allow pharmacy users to read global settings
-- This fixes the issue where pharmacy login cannot fetch global shipping settings

-- Enable RLS on settings table if not already enabled
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop any overly restrictive policies (if they exist)
DROP POLICY IF EXISTS "Allow only admins to read settings" ON settings;

-- Create policy to allow ALL authenticated users to read global settings
-- This is safe because:
-- 1. Only global settings (is_global = true) are exposed
-- 2. All users need access to global shipping/tax settings for order creation
-- 3. Write access is still restricted (no INSERT/UPDATE/DELETE policies for non-admins)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read global settings"
ON settings
FOR SELECT
TO authenticated
USING (is_global = true);

-- Optional: If you want admins to read ALL settings (including non-global)
-- Uncomment this if needed:
-- CREATE POLICY IF NOT EXISTS "Allow admins to read all settings"
-- ON settings
-- FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.role IN ('admin', 'superadmin')
--   )
-- );

-- Add comment for documentation
COMMENT ON POLICY "Allow authenticated users to read global settings" ON settings IS 
'Allows all authenticated users (including pharmacy users) to read global settings like shipping rates and tax settings. This is required for order creation functionality.';
