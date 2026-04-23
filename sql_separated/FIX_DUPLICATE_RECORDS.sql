-- =====================================================
-- FIX DUPLICATE RECORDS IN launch_password_resets
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Check for duplicates
SELECT 
  profile_id,
  email,
  COUNT(*) as duplicate_count
FROM launch_password_resets
GROUP BY profile_id, email
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Delete duplicate records (keep only the most recent one)
WITH ranked_records AS (
  SELECT 
    id,
    profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY profile_id 
      ORDER BY created_at DESC, updated_at DESC
    ) as rn
  FROM launch_password_resets
)
DELETE FROM launch_password_resets
WHERE id IN (
  SELECT id 
  FROM ranked_records 
  WHERE rn > 1
);

-- Step 3: Add unique constraint to prevent future duplicates
ALTER TABLE launch_password_resets
DROP CONSTRAINT IF EXISTS launch_password_resets_profile_id_unique;

ALTER TABLE launch_password_resets
ADD CONSTRAINT launch_password_resets_profile_id_unique 
UNIQUE (profile_id);

-- Step 4: Verify cleanup
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT profile_id) as unique_profiles
FROM launch_password_resets;

-- Step 5: Check if any duplicates remain
SELECT 
  profile_id,
  email,
  COUNT(*) as count
FROM launch_password_resets
GROUP BY profile_id, email
HAVING COUNT(*) > 1;

-- If the above query returns no rows, cleanup was successful!

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the constraint was added
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'launch_password_resets'::regclass
AND conname = 'launch_password_resets_profile_id_unique';

-- View all records for a specific user
-- SELECT * FROM launch_password_resets WHERE email = 'jayvekariya2003@gmail.com';

DO $$
BEGIN
  RAISE NOTICE '✅ Duplicate records cleanup complete!';
  RAISE NOTICE '✅ Unique constraint added to prevent future duplicates';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify no duplicates remain (query above should return 0 rows)';
  RAISE NOTICE '2. Test password reset flow again';
  RAISE NOTICE '3. Monitor for any new issues';
END $$;
