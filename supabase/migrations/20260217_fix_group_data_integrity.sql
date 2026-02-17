-- =====================================================
-- FIX GROUP DATA INTEGRITY
-- Date: February 17, 2026
-- Description: Ensure group users don't have group_id set
-- =====================================================

-- Fix existing data: Group users should not have a group_id
UPDATE profiles
SET group_id = NULL
WHERE type = 'group'
AND group_id IS NOT NULL;

-- Add a check constraint to prevent this in the future
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS check_group_no_parent;

ALTER TABLE profiles
ADD CONSTRAINT check_group_no_parent
CHECK (
    (type = 'group' AND group_id IS NULL) OR
    (type != 'group')
);

COMMENT ON CONSTRAINT check_group_no_parent ON profiles IS 
  'Ensures that profiles with type=group do not have a group_id (groups cannot belong to other groups)';

-- Create a function to validate group relationships
CREATE OR REPLACE FUNCTION validate_group_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a group type, ensure no group_id
    IF NEW.type = 'group' AND NEW.group_id IS NOT NULL THEN
        RAISE EXCEPTION 'Group profiles cannot have a group_id. Groups cannot belong to other groups.';
    END IF;
    
    -- If this has a group_id, ensure it points to a valid group
    IF NEW.group_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = NEW.group_id 
            AND type = 'group'
        ) THEN
            RAISE EXCEPTION 'group_id must reference a profile with type=group';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce validation
DROP TRIGGER IF EXISTS trigger_validate_group_relationship ON profiles;

CREATE TRIGGER trigger_validate_group_relationship
    BEFORE INSERT OR UPDATE OF type, group_id ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_group_relationship();

COMMENT ON FUNCTION validate_group_relationship() IS 
  'Validates that group relationships are correct: groups have no parent, and group_id references must point to type=group';

-- Verify the fixes
DO $$
DECLARE
    invalid_groups INTEGER;
    invalid_refs INTEGER;
BEGIN
    -- Count groups with group_id (should be 0)
    SELECT COUNT(*) INTO invalid_groups
    FROM profiles
    WHERE type = 'group' AND group_id IS NOT NULL;
    
    -- Count profiles with group_id pointing to non-group (should be 0)
    SELECT COUNT(*) INTO invalid_refs
    FROM profiles p
    WHERE p.group_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM profiles g
        WHERE g.id = p.group_id AND g.type = 'group'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '   GROUP DATA INTEGRITY CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Invalid groups (type=group with group_id): %', invalid_groups;
    RAISE NOTICE 'Invalid group references: %', invalid_refs;
    RAISE NOTICE '';
    
    IF invalid_groups = 0 AND invalid_refs = 0 THEN
        RAISE NOTICE '✅ All group relationships are valid';
    ELSE
        RAISE WARNING '⚠️  Found % invalid group configurations', invalid_groups + invalid_refs;
    END IF;
    
    RAISE NOTICE '';
END $$;
