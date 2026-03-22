-- Make settings table truly global by removing profile_id dependency
-- This migration creates a single global settings record

-- Step 1: Drop the unique constraint on profile_id
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_profile_id_key;

-- Step 2: Make profile_id nullable (it already is, but ensuring)
ALTER TABLE settings ALTER COLUMN profile_id DROP NOT NULL;

-- Step 3: Add a new column to mark global settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

-- Step 4: Create a unique constraint to ensure only one global settings record
CREATE UNIQUE INDEX IF NOT EXISTS settings_global_unique_idx ON settings (is_global) WHERE is_global = true;

-- Step 5: Mark the first/oldest settings record as global
UPDATE settings 
SET is_global = true 
WHERE id = (
  SELECT id 
  FROM settings 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Step 6: Add comment
COMMENT ON COLUMN settings.is_global IS 'Marks this as the global settings record used organization-wide. Only one record should have this set to true.';

-- Step 7: Create a helper function to get global settings
CREATE OR REPLACE FUNCTION get_global_settings()
RETURNS SETOF settings
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM settings WHERE is_global = true LIMIT 1;
$$;

COMMENT ON FUNCTION get_global_settings() IS 'Returns the global settings record used organization-wide';

-- Step 8: Create a helper function to update global settings
CREATE OR REPLACE FUNCTION update_global_settings(settings_data jsonb)
RETURNS settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  global_record settings;
  settings_id uuid;
BEGIN
  -- Get the global settings ID
  SELECT id INTO settings_id FROM settings WHERE is_global = true LIMIT 1;
  
  -- If no global settings exist, create one
  IF settings_id IS NULL THEN
    INSERT INTO settings (is_global, updated_at)
    VALUES (true, now())
    RETURNING * INTO global_record;
    RETURN global_record;
  END IF;
  
  -- Update the global settings
  UPDATE settings
  SET updated_at = now()
  WHERE id = settings_id
  RETURNING * INTO global_record;
  
  RETURN global_record;
END;
$$;

COMMENT ON FUNCTION update_global_settings(jsonb) IS 'Updates the global settings record. Creates one if it does not exist.';
