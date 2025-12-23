-- Fix RLS policies for announcements table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to active announcements" ON announcements;
DROP POLICY IF EXISTS "Allow admin full access to announcements" ON announcements;
DROP POLICY IF EXISTS "Allow authenticated users to read announcements" ON announcements;
DROP POLICY IF EXISTS "Enable read access for all users" ON announcements;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON announcements;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON announcements;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON announcements;
-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
-- Allow anyone to read active announcements (for display)
CREATE POLICY "Anyone can read active announcements"
ON announcements FOR SELECT
USING (is_active = true);
-- Allow authenticated users full access (for admin management)
CREATE POLICY "Authenticated users can manage announcements"
ON announcements FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Also allow anon to insert for testing (can be removed in production)
CREATE POLICY "Allow anon insert for testing"
ON announcements FOR INSERT
TO anon
WITH CHECK (true);
