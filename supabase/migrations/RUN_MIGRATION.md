# How to Run the Complete Schema Migration

## Prerequisites

1. **Backup your database** (if you have existing data)
   ```bash
   # Using Supabase CLI
   supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Or using pg_dump directly
   pg_dump -h your-db-host -U postgres -d postgres > backup.sql
   ```

2. **Verify Supabase CLI is installed**
   ```bash
   supabase --version
   ```

3. **Ensure you're logged in to Supabase**
   ```bash
   supabase login
   ```

4. **Link your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

## Migration Methods

### Method 1: Supabase CLI (Recommended)

This is the safest and most recommended method.

```bash
# 1. Navigate to your project directory
cd /path/to/your/project

# 2. Check migration status
supabase db diff

# 3. Apply the migration
supabase db push

# 4. Verify the migration
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/verify_schema.sql
```

### Method 2: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `00000000000000_complete_schema_reproduction.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for completion (may take 1-2 minutes)
8. Check for any errors in the output

### Method 3: Direct psql Connection

```bash
# 1. Get your database connection string from Supabase dashboard
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# 2. Run the migration
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f supabase/migrations/00000000000000_complete_schema_reproduction.sql

# 3. Verify the migration
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f supabase/migrations/verify_schema.sql
```

### Method 4: Using a SQL Client (DBeaver, pgAdmin, etc.)

1. Connect to your Supabase database using your preferred SQL client
2. Open the migration file: `00000000000000_complete_schema_reproduction.sql`
3. Execute the entire script
4. Check the output for any errors
5. Run the verification script: `verify_schema.sql`

## Post-Migration Steps

### 1. Verify the Schema

Run the verification script to ensure everything was created correctly:

```bash
psql "your-connection-string" -f supabase/migrations/verify_schema.sql
```

Expected output should show:
- 50+ tables
- 100+ indexes
- 20+ functions
- 15+ triggers
- 80+ RLS policies

### 2. Test Critical Functionality

```sql
-- Test 1: Check if profiles table exists and has correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Test 2: Verify RLS is enabled on critical tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'orders', 'products')
ORDER BY tablename;

-- Test 3: Check if triggers are working
-- (This will be tested when you insert data)

-- Test 4: Verify functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%commission%'
ORDER BY routine_name;
```

### 3. Migrate Data (if applicable)

If you have existing data to migrate:

```bash
# Restore from backup (data only)
pg_restore --data-only -h your-db-host -U postgres -d postgres backup.sql

# Or use Supabase's data import tools
```

### 4. Update Application Configuration

After migration, update your application:

1. Clear any cached schema information
2. Restart your application servers
3. Test all critical user flows
4. Monitor logs for any database-related errors

## Troubleshooting

### Error: "relation already exists"

This is normal if you're re-running the migration. The script uses `IF NOT EXISTS` clauses, so it will skip existing objects.

### Error: "permission denied"

Ensure you're connected as a superuser or have sufficient privileges:

```sql
-- Check your role
SELECT current_user, current_database();

-- Grant necessary permissions (run as superuser)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
```

### Error: "function does not exist"

Some functions may depend on others. The migration is ordered correctly, but if you're running parts separately, ensure you run them in order.

### RLS Policies Blocking Access

If you can't access data after migration:

```sql
-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- Check your user's role
SELECT * FROM profiles WHERE id = auth.uid();

-- Re-enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

### Performance Issues After Migration

```sql
-- Analyze all tables to update statistics
ANALYZE;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
ORDER BY abs(correlation) DESC;
```

## Rollback Procedure

If you need to rollback the migration:

### Option 1: Restore from Backup

```bash
# Drop all tables (CAUTION: This will delete all data!)
psql "your-connection-string" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore from backup
psql "your-connection-string" < backup.sql
```

### Option 2: Selective Rollback

```sql
-- Drop specific tables
DROP TABLE IF EXISTS table_name CASCADE;

-- Drop specific functions
DROP FUNCTION IF EXISTS function_name CASCADE;

-- Drop specific triggers
DROP TRIGGER IF EXISTS trigger_name ON table_name;
```

## Monitoring

After migration, monitor your database:

```sql
-- Check for slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for bloat
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Best Practices

1. **Always backup before migration**
2. **Test in a staging environment first**
3. **Run during low-traffic periods**
4. **Monitor performance after migration**
5. **Keep the migration file in version control**
6. **Document any custom changes**
7. **Run ANALYZE after large data imports**

## Support

If you encounter issues:

1. Check the PostgreSQL logs for detailed error messages
2. Review the Supabase dashboard for any alerts
3. Consult the README_COMPLETE_SCHEMA.md for detailed documentation
4. Check Supabase documentation: https://supabase.com/docs
5. Review PostgreSQL documentation: https://www.postgresql.org/docs/

## Success Checklist

- [ ] Database backed up
- [ ] Migration file reviewed
- [ ] Migration executed successfully
- [ ] Verification script run
- [ ] All critical tables exist
- [ ] All functions created
- [ ] All triggers active
- [ ] RLS policies in place
- [ ] Application tested
- [ ] Performance monitored
- [ ] Documentation updated

## Next Steps

After successful migration:

1. Update your application's database schema documentation
2. Train your team on the new schema structure
3. Set up monitoring and alerting
4. Plan for future schema changes
5. Document any custom modifications

---

**Migration File**: `00000000000000_complete_schema_reproduction.sql`  
**Verification Script**: `verify_schema.sql`  
**Documentation**: `README_COMPLETE_SCHEMA.md`  
**Generated**: 2026-01-28
