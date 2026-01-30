# Complete Database Schema Reproduction

## Overview

This migration file (`00000000000000_complete_schema_reproduction.sql`) is a production-grade PostgreSQL migration that reproduces the entire 9RX database schema for Supabase.

## What's Included

### 1. **Extensions**
- uuid-ossp
- pgcrypto
- pg_stat_statements

### 2. **Core Tables** (50+ tables)
- **User Management**: profiles, pharmacy_invitations, group_staff
- **Products & Catalog**: products, product_sizes, category_configs, subcategory_configs
- **Orders & Invoices**: orders, order_items, invoices, order_activities
- **Marketing**: banners, offers, product_offers, blogs, announcements, daily_deals
- **Email Marketing**: email_templates, email_campaigns, email_automations, email_logs, email_subscribers, email_queue
- **Group Management**: group_commission_history, pharmacy_invitations
- **Referral & Rewards**: referrals, product_reviews, review_helpful, wishlist, rewards_config
- **Payment System**: saved_payment_methods, payment_transactions, payment_settings
- **Credit Line System**: credit_applications, user_credit_lines, credit_invoices, credit_payments, credit_terms
- **Refunds & Adjustments**: refunds, credit_memos, credit_memo_applications, payment_adjustments
- **Misc**: carts, notifications, customer_documents, newsletter_subscribers
- **Analytics**: banner_analytics, ab_tests, banner_impressions

### 3. **Indexes** (100+ indexes)
- Performance-optimized indexes on all critical columns
- Composite indexes for complex queries
- Partial indexes for filtered queries

### 4. **Functions** (20+ functions)
- `update_updated_at_column()` - Auto-update timestamps
- `generate_referral_code()` - Generate unique referral codes
- `ensure_referral_code()` - Ensure profiles have referral codes
- `calculate_order_commission()` - Auto-calculate group commissions
- `update_group_total_commission()` - Update group commission totals
- `log_order_creation()` - Log order creation activities
- `log_order_update()` - Log order update activities
- `ensure_single_default_payment_method()` - Ensure only one default payment method
- `generate_refund_number()` - Generate refund numbers
- `generate_credit_memo_number()` - Generate credit memo numbers
- `apply_credit_memo()` - Apply credit memos to orders
- `issue_credit_memo()` - Issue new credit memos
- `record_banner_impression()` - Track banner impressions and clicks

### 5. **Triggers** (15+ triggers)
- Auto-generate referral codes on profile insert
- Calculate commissions on order insert/update
- Log order activities automatically
- Update timestamps on record updates
- Ensure single default payment method

### 6. **Views**
- `group_analytics` - Aggregated group performance metrics

### 7. **RLS Policies** (80+ policies)
- Comprehensive row-level security for all tables
- User-specific data access controls
- Admin override policies
- Public access for appropriate data

### 8. **Storage Buckets**
- Documents bucket with appropriate policies

## Features

### ✅ Deterministic
- Uses `IF NOT EXISTS` clauses throughout
- Safe to run multiple times
- No data loss on re-run

### ✅ Re-runnable
- `DROP TRIGGER IF EXISTS` before creating triggers
- `DROP POLICY IF EXISTS` before creating policies
- `ON CONFLICT DO NOTHING` for default data

### ✅ Preserves Naming
- Exact column names from existing schema
- Preserves case sensitivity (e.g., "poApproved")
- Maintains all constraints and defaults

### ✅ Production-Ready
- Comprehensive error handling
- Security-first approach with RLS
- Performance-optimized with indexes
- Well-documented with comments

## Usage

### Running the Migration

#### Option 1: Supabase CLI
```bash
supabase db push
```

#### Option 2: Direct SQL Execution
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/00000000000000_complete_schema_reproduction.sql
```

#### Option 3: Supabase Dashboard
1. Go to SQL Editor in Supabase Dashboard
2. Copy and paste the migration file
3. Click "Run"

### Verification

After running the migration, verify the schema:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Important Notes

### 1. **Base Tables Not Included**
This migration assumes that Supabase's auth schema is already in place. If you need to create the auth schema, run Supabase's initialization first.

### 2. **Data Not Included**
This migration creates the schema structure only. No data is included. To migrate data:
- Use `pg_dump` with `--data-only` flag
- Or use Supabase's data import tools

### 3. **Customization Required**
Some tables may need adjustment based on your actual schema:
- Review column types and constraints
- Adjust default values as needed
- Modify RLS policies for your security requirements

### 4. **Storage Buckets**
The migration creates a `documents` bucket. Ensure your Supabase project has storage enabled.

### 5. **Extensions**
Ensure your database has the required extensions enabled. Most Supabase projects have these by default.

## Schema Sections

### Section 1: Extensions
PostgreSQL extensions required for the application.

### Section 2: Helper Functions
Utility functions used by triggers and application logic.

### Section 3: Core Tables
All application tables with columns, constraints, and defaults.

### Section 4: Views
Materialized and regular views for complex queries.

### Section 5: Critical Functions
Business logic functions for commissions, credits, etc.

### Section 6: Triggers
Automated actions on data changes.

### Section 7: RLS Policies
Row-level security for data access control.

### Section 8: Storage Policies
File storage access control.

### Section 9: Default Data
Initial configuration and settings.

## Maintenance

### Adding New Tables
1. Add table definition in Section 3
2. Add indexes after table definition
3. Enable RLS in Section 7
4. Add RLS policies in Section 7

### Modifying Existing Tables
1. Use `ALTER TABLE IF EXISTS`
2. Use `ADD COLUMN IF NOT EXISTS`
3. Update related indexes if needed
4. Update RLS policies if access patterns change

### Performance Tuning
- Monitor slow queries with `pg_stat_statements`
- Add indexes for frequently queried columns
- Use `EXPLAIN ANALYZE` to optimize queries
- Consider partitioning for large tables

## Troubleshooting

### Migration Fails
1. Check PostgreSQL logs for detailed errors
2. Verify all dependencies are in place
3. Ensure sufficient database permissions
4. Check for naming conflicts

### RLS Blocking Queries
1. Verify user authentication
2. Check policy conditions
3. Use `SECURITY DEFINER` functions for admin operations
4. Test policies with different user roles

### Performance Issues
1. Run `ANALYZE` on all tables
2. Check for missing indexes
3. Review query execution plans
4. Consider materialized views for complex queries

## Support

For issues or questions:
- Review Supabase documentation: https://supabase.com/docs
- Check PostgreSQL documentation: https://www.postgresql.org/docs/
- Review migration logs for specific errors

## Version History

- **v1.0** (2026-01-28): Initial complete schema reproduction
  - 50+ tables
  - 100+ indexes
  - 20+ functions
  - 15+ triggers
  - 80+ RLS policies

## License

This migration is part of the 9RX application and follows the same license terms.
