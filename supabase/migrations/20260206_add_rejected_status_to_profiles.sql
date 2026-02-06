-- Add 'rejected' to user_status enum
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'rejected';

-- Add rejection_reason column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
