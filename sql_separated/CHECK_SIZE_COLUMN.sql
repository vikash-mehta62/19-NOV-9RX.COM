-- Check if is_active column exists in product_sizes table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'product_sizes' 
AND column_name = 'is_active';

-- If the above returns no rows, the column doesn't exist yet
-- Run the migration file: supabase/migrations/20260217_add_size_active_status.sql

-- Check current RLS policies on product_sizes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'product_sizes';
