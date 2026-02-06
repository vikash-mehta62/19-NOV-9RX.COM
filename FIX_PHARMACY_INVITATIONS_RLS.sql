-- =====================================================
-- FIX: Row Level Security for pharmacy_invitations table
-- Date: February 5, 2026
-- Error: "new row violates row-level security policy for table pharmacy_invitations"
-- =====================================================

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Groups can view own invitations" ON pharmacy_invitations;
DROP POLICY IF EXISTS "Groups can create invitations" ON pharmacy_invitations;
DROP POLICY IF EXISTS "Groups can update own invitations" ON pharmacy_invitations;
DROP POLICY IF EXISTS "Admin can manage invitations" ON pharmacy_invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON pharmacy_invitations;
DROP POLICY IF EXISTS "Pharmacies can accept invitations" ON pharmacy_invitations;

-- Step 2: Ensure RLS is enabled
ALTER TABLE pharmacy_invitations ENABLE ROW LEVEL SECURITY;

-- Step 3: Create comprehensive policies

-- Policy 1: Groups can view their own invitations
CREATE POLICY "Groups can view own invitations" ON pharmacy_invitations
  FOR SELECT USING (
    auth.uid() = group_id 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy 2: Groups can create invitations (INSERT)
-- This is the key fix - allowing groups to insert invitations where they are the group_id
CREATE POLICY "Groups can create invitations" ON pharmacy_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = group_id 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy 3: Groups can update their own invitations
CREATE POLICY "Groups can update own invitations" ON pharmacy_invitations
  FOR UPDATE USING (
    auth.uid() = group_id 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    auth.uid() = group_id 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy 4: Groups can delete their own invitations
CREATE POLICY "Groups can delete own invitations" ON pharmacy_invitations
  FOR DELETE USING (
    auth.uid() = group_id 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy 5: Admin full access (catch-all)
CREATE POLICY "Admin can manage invitations" ON pharmacy_invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy 6: Anyone can view invitations by token (for accepting invitations)
CREATE POLICY "Anyone can view invitations by token" ON pharmacy_invitations
  FOR SELECT USING (true);

-- Policy 7: Allow pharmacies to update invitation status when accepting
CREATE POLICY "Pharmacies can accept invitations" ON pharmacy_invitations
  FOR UPDATE USING (
    status = 'pending' 
    AND expires_at > NOW()
  ) WITH CHECK (
    status IN ('accepted', 'declined')
  );

-- =====================================================
-- VERIFICATION: Check policies were created
-- =====================================================
-- Run this query to verify:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'pharmacy_invitations';

-- =====================================================
-- ALTERNATIVE FIX: If above doesn't work, bypass RLS for service role
-- Only use this if absolutely necessary
-- =====================================================
-- ALTER TABLE pharmacy_invitations FORCE ROW LEVEL SECURITY;

-- =====================================================
-- DEBUG: Check current user and group_id match
-- =====================================================
-- SELECT 
--   auth.uid() as current_user_id,
--   p.type as user_type,
--   p.role as user_role
-- FROM profiles p 
-- WHERE p.id = auth.uid();
