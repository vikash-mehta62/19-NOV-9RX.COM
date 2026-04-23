-- Check the constraint on reward_transactions table
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'reward_transactions'::regclass
  AND contype = 'c'; -- Check constraints

-- Check what transaction_type values currently exist
SELECT DISTINCT transaction_type 
FROM reward_transactions 
ORDER BY transaction_type;

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reward_transactions'
ORDER BY ordinal_position;
