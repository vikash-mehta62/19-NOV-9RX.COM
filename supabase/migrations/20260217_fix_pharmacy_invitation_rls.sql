-- =====================================================
-- FIX PHARMACY INVITATION RLS POLICIES
-- Date: February 17, 2026
-- Description: Allow pharmacies to update invitations when accepting them
-- =====================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Groups can update own invitations" ON pharmacy_invitations;

-- Recreate with pharmacy acceptance support
CREATE POLICY "Groups and pharmacies can update invitations" ON pharmacy_invitations
  FOR UPDATE USING (
    -- Groups can update their own invitations
    auth.uid() = group_id 
    OR 
    -- Pharmacies can update invitations sent to their email (for acceptance)
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- Pharmacies can update invitations they've accepted
    accepted_by = auth.uid()
    OR 
    -- Admins can update any invitation
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add policy for pharmacies to view invitations sent to them
DROP POLICY IF EXISTS "Pharmacies can view invitations sent to them" ON pharmacy_invitations;

CREATE POLICY "Pharmacies can view invitations sent to them" ON pharmacy_invitations
  FOR SELECT USING (
    -- Groups can view their own invitations
    auth.uid() = group_id 
    OR
    -- Pharmacies can view invitations sent to their email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- Pharmacies can view invitations they've accepted
    accepted_by = auth.uid()
    OR 
    -- Admins can view all invitations
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON POLICY "Groups and pharmacies can update invitations" ON pharmacy_invitations IS 
  'Allows groups to manage their invitations and pharmacies to accept invitations sent to them';

COMMENT ON POLICY "Pharmacies can view invitations sent to them" ON pharmacy_invitations IS 
  'Allows pharmacies to view invitations sent to their email address';
