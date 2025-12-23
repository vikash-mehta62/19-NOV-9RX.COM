-- Create group_staff table for managing staff members within groups
CREATE TABLE IF NOT EXISTS group_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff', -- 'manager', 'staff', 'viewer'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'active', 'pending', 'inactive'
  permissions TEXT[] DEFAULT '{}', -- Array of permission strings
  phone VARCHAR(50),
  notes TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique email per group
  UNIQUE(group_id, email)
);
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_staff_group_id ON group_staff(group_id);
CREATE INDEX IF NOT EXISTS idx_group_staff_email ON group_staff(email);
CREATE INDEX IF NOT EXISTS idx_group_staff_status ON group_staff(status);
-- Enable RLS
ALTER TABLE group_staff ENABLE ROW LEVEL SECURITY;
-- Policy: Group admins can manage their own staff
CREATE POLICY "Group admins can view their staff"
  ON group_staff FOR SELECT
  USING (group_id = auth.uid());
CREATE POLICY "Group admins can insert staff"
  ON group_staff FOR INSERT
  WITH CHECK (group_id = auth.uid());
CREATE POLICY "Group admins can update their staff"
  ON group_staff FOR UPDATE
  USING (group_id = auth.uid());
CREATE POLICY "Group admins can delete their staff"
  ON group_staff FOR DELETE
  USING (group_id = auth.uid());
-- Add comment
COMMENT ON TABLE group_staff IS 'Staff members managed by group administrators';
