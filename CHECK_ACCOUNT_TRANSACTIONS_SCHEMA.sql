-- Check the account_transactions table schema
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'account_transactions'
ORDER BY ordinal_position;

-- If transaction_date is DATE type, we need to alter it to TIMESTAMPTZ
-- Run this if the column is DATE type:
-- ALTER TABLE account_transactions 
-- ALTER COLUMN transaction_date TYPE TIMESTAMPTZ 
-- USING transaction_date::TIMESTAMPTZ;

-- Also check if there's a default value set
SELECT 
    pg_get_expr(d.adbin, d.adrelid) as default_value
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
WHERE c.relname = 'account_transactions'
AND a.attname = 'transaction_date';
