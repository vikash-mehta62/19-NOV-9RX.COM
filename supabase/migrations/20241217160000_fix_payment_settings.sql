-- Fix payment_settings table for upsert operations
-- Add unique constraint on profile_id and provider

-- First, check if the table exists and create it if not
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'authorize_net',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payment_settings_profile_provider_unique'
  ) THEN
    ALTER TABLE payment_settings 
    ADD CONSTRAINT payment_settings_profile_provider_unique 
    UNIQUE (profile_id, provider);
  END IF;
END $$;
-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own payment settings" ON payment_settings;
DROP POLICY IF EXISTS "Users can insert their own payment settings" ON payment_settings;
DROP POLICY IF EXISTS "Users can update their own payment settings" ON payment_settings;
DROP POLICY IF EXISTS "Admins can view all payment settings" ON payment_settings;
DROP POLICY IF EXISTS "Service role can access all payment settings" ON payment_settings;
-- Users can view their own payment settings
CREATE POLICY "Users can view their own payment settings"
  ON payment_settings FOR SELECT
  USING (auth.uid() = profile_id);
-- Users can insert their own payment settings
CREATE POLICY "Users can insert their own payment settings"
  ON payment_settings FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
-- Users can update their own payment settings
CREATE POLICY "Users can update their own payment settings"
  ON payment_settings FOR UPDATE
  USING (auth.uid() = profile_id);
-- Service role can access all (for edge functions)
CREATE POLICY "Service role can access all payment settings"
  ON payment_settings FOR ALL
  USING (auth.role() = 'service_role');
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_settings_profile_provider 
  ON payment_settings(profile_id, provider);
