-- Add state_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS state_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.state_id IS 'State ID field for user profiles';