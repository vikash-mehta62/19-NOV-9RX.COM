# Complete User Import Guide - Dusre Database Se Import Kaise Kare

## ⚠️ IMPORTANT: Pehle Ye Padho!

Ye guide aapko step-by-step batayega ki kaise dusre Supabase database se users, identities, aur profiles ko import kare. Ye process **IRREVERSIBLE** hai, toh pehle backup zaroor le lo!

---

## 📋 Pre-Import Checklist

- [ ] Current database ka FULL BACKUP le liya
- [ ] Source database (jahan se import karna hai) ka access hai
- [ ] Source database ka backup/export ready hai
- [ ] Settings table preserve karna hai (global settings)
- [ ] New admin user credentials ready hai

---

## 🔄 Complete Import Process

### STEP 1: Current Database Reset Karo

Pehle current database se saare users aur related data delete karo:

```sql
-- FK constraints temporarily disable karo
SET session_replication_role = 'replica';

-- Settings preserve karo (profile_id NULL kar do)
UPDATE settings SET profile_id = NULL;

-- Saare tables se data delete karo
DELETE FROM group_status_audit;
DELETE FROM order_activities;
DELETE FROM alert_history;
DELETE FROM pharmacy_invitation_audit;
DELETE FROM credit_penalty_history;
DELETE FROM group_commission_history;
DELETE FROM terms_acceptance_history;
DELETE FROM account_transactions;
DELETE FROM ach_transactions;
DELETE FROM payment_transactions;
DELETE FROM credit_payments;
DELETE FROM payment_adjustments;
DELETE FROM refunds;
DELETE FROM payment_reconciliation_batches;
DELETE FROM saved_payment_methods;
DELETE FROM payment_settings;
DELETE FROM credit_applications;
DELETE FROM credit_invoices;
DELETE FROM credit_memo_applications;
DELETE FROM credit_memos;
DELETE FROM user_credit_lines;
DELETE FROM sent_credit_terms;
DELETE FROM invoices;
DELETE FROM orders;
DELETE FROM reward_redemptions;
DELETE FROM reward_transactions;
DELETE FROM customer_documents;
DELETE FROM customer_notes;
DELETE FROM customer_tasks;
DELETE FROM customers;
DELETE FROM abandoned_carts;
DELETE FROM carts;
DELETE FROM locations;
DELETE FROM addresses;
DELETE FROM product_reviews;
DELETE FROM review_helpful;
DELETE FROM product_batches;
DELETE FROM cycle_counts;
DELETE FROM stock_adjustments;
DELETE FROM stock_transfers;
DELETE FROM batch_movements;
DELETE FROM expiry_alerts;
DELETE FROM notifications;
DELETE FROM email_subscribers;
DELETE FROM alerts;
DELETE FROM user_preferences;
DELETE FROM saved_searches;
DELETE FROM search_history;
DELETE FROM custom_dashboards;
DELETE FROM automation_executions;
DELETE FROM automation_rules;
DELETE FROM group_staff;
DELETE FROM pharmacy_invitations;
DELETE FROM referrals;
DELETE FROM ach_authorization_details;
DELETE FROM terms_documents;
DELETE FROM password_reset_requests;
DELETE FROM launch_password_resets;
DELETE FROM quickbooks_tokens;
DELETE FROM inventory_transactions;  -- ⚠️ Ye missing tha!

-- Profiles delete karo (pehle self-reference NULL karo)
UPDATE profiles SET referred_by = NULL;
DELETE FROM profiles;

-- Auth tables delete karo
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- FK constraints wapas enable karo
SET session_replication_role = 'origin';
```

### STEP 2: Verify Deletion

Check karo ki sab kuch delete ho gaya:

```sql
SELECT 
    'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'settings', COUNT(*) FROM settings;
```

**Expected Result:**
- All tables: 0 rows
- settings: 1 row (preserved!)

---

### STEP 3: Source Database Se Data Export Karo

Source database (jahan se import karna hai) pe ye queries run karo:

#### 3A. Export auth.users

```sql
-- Source database pe run karo
COPY (
    SELECT 
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at
    FROM auth.users
    ORDER BY created_at
) TO '/tmp/auth_users_export.csv' WITH CSV HEADER;
```

#### 3B. Export auth.identities

```sql
-- Source database pe run karo
COPY (
    SELECT 
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    FROM auth.identities
    ORDER BY created_at
) TO '/tmp/auth_identities_export.csv' WITH CSV HEADER;
```

#### 3C. Export profiles

```sql
-- Source database pe run karo
COPY (
    SELECT 
        id,
        email,
        first_name,
        last_name,
        phone,
        type,
        role,
        status,
        business_name,
        license_number,
        tax_id,
        dea_number,
        npi_number,
        state_license_number,
        controlled_substance_license,
        pharmacy_permit_number,
        ncpdp_number,
        nabp_number,
        medicaid_provider_id,
        medicare_provider_id,
        address,
        city,
        state,
        zip_code,
        country,
        avatar_url,
        referred_by,
        referral_code,
        reward_points,
        total_spent,
        order_count,
        last_order_date,
        notes,
        created_at,
        updated_at,
        email_verified,
        phone_verified,
        onboarding_completed,
        terms_accepted,
        terms_accepted_at,
        terms_version,
        privacy_accepted,
        privacy_accepted_at,
        privacy_version,
        signature_data,
        signature_date,
        free_shipping
    FROM profiles
    ORDER BY created_at
) TO '/tmp/profiles_export.csv' WITH CSV HEADER;
```

---

### STEP 4: CSV Files Download Karo

Source database server se ye files download karo:
- `/tmp/auth_users_export.csv`
- `/tmp/auth_identities_export.csv`
- `/tmp/profiles_export.csv`

---

### STEP 5: Target Database Me Import Karo

Ab apne current (target) database me import karo:

#### 5A. Import auth.users

```sql
-- FK constraints disable karo
SET session_replication_role = 'replica';

-- CSV file se import karo
COPY auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
) FROM '/path/to/auth_users_export.csv' WITH CSV HEADER;
```

#### 5B. Import auth.identities

```sql
COPY auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) FROM '/path/to/auth_identities_export.csv' WITH CSV HEADER;
```

#### 5C. Import profiles

```sql
COPY profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    type,
    role,
    status,
    business_name,
    license_number,
    tax_id,
    dea_number,
    npi_number,
    state_license_number,
    controlled_substance_license,
    pharmacy_permit_number,
    ncpdp_number,
    nabp_number,
    medicaid_provider_id,
    medicare_provider_id,
    address,
    city,
    state,
    zip_code,
    country,
    avatar_url,
    referred_by,
    referral_code,
    reward_points,
    total_spent,
    order_count,
    last_order_date,
    notes,
    created_at,
    updated_at,
    email_verified,
    phone_verified,
    onboarding_completed,
    terms_accepted,
    terms_accepted_at,
    terms_version,
    privacy_accepted,
    privacy_accepted_at,
    privacy_version,
    signature_data,
    signature_date,
    free_shipping
) FROM '/path/to/profiles_export.csv' WITH CSV HEADER;

-- FK constraints wapas enable karo
SET session_replication_role = 'origin';
```

---

### STEP 6: Verify Import

Check karo ki sab kuch sahi se import hua:

```sql
-- Count check karo
SELECT 
    'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;

-- Sample data check karo
SELECT id, email, role, type FROM profiles LIMIT 10;
SELECT id, email, created_at FROM auth.users LIMIT 10;
```

---

### STEP 7: Admin User Ko Settings Se Link Karo

Ek admin user ko global settings se link karo:

```sql
-- Admin user ka ID nikalo
SELECT id, email, role FROM profiles WHERE role = 'admin' LIMIT 1;

-- Settings update karo
UPDATE settings 
SET profile_id = 'PASTE_ADMIN_USER_ID_HERE'
WHERE is_global = true;
```

---

## 🔧 Alternative Method: Direct Database Connection

Agar dono databases ek hi network pe hai, toh direct import kar sakte ho:

```sql
-- Target database pe run karo
-- Pehle foreign data wrapper setup karo (one-time)

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER source_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host 'source-db-host', dbname 'source-db-name', port '5432');

CREATE USER MAPPING FOR CURRENT_USER
SERVER source_db
OPTIONS (user 'source-username', password 'source-password');

-- Foreign tables create karo
CREATE FOREIGN TABLE source_users (
    id uuid,
    email text,
    encrypted_password text,
    -- ... all columns
) SERVER source_db OPTIONS (schema_name 'auth', table_name 'users');

CREATE FOREIGN TABLE source_profiles (
    id uuid,
    email text,
    -- ... all columns
) SERVER source_db OPTIONS (schema_name 'public', table_name 'profiles');

-- Direct insert karo
SET session_replication_role = 'replica';

INSERT INTO auth.users SELECT * FROM source_users;
INSERT INTO auth.identities SELECT * FROM source_identities;
INSERT INTO profiles SELECT * FROM source_profiles;

SET session_replication_role = 'origin';
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "inventory_transactions_created_by_fkey" Error

**Solution:** Reset query me `inventory_transactions` table add karo:

```sql
DELETE FROM inventory_transactions;
```

### Issue 2: UUID Conflicts

Agar same UUIDs already exist:

```sql
-- Check conflicts
SELECT id FROM auth.users WHERE id IN (SELECT id FROM source_users);

-- Option 1: Delete conflicting users
DELETE FROM auth.users WHERE id IN (SELECT id FROM source_users);

-- Option 2: Generate new UUIDs (NOT RECOMMENDED - breaks relationships)
```

### Issue 3: Email Already Exists

```sql
-- Find duplicates
SELECT email, COUNT(*) 
FROM auth.users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Delete duplicates (keep oldest)
DELETE FROM auth.users 
WHERE id NOT IN (
    SELECT MIN(id) FROM auth.users GROUP BY email
);
```

### Issue 4: CSV File Path Issues

Windows pe path aise use karo:
```sql
COPY ... FROM 'C:\\Users\\YourName\\Downloads\\auth_users_export.csv' WITH CSV HEADER;
```

Linux/Mac pe:
```sql
COPY ... FROM '/home/username/auth_users_export.csv' WITH CSV HEADER;
```

---

## ✅ Post-Import Checklist

- [ ] All users imported successfully
- [ ] All identities linked correctly
- [ ] All profiles created
- [ ] Admin user can login
- [ ] Settings linked to admin
- [ ] No FK constraint errors
- [ ] Sample data verified
- [ ] Old database backed up
- [ ] New database tested

---

## 📞 Need Help?

Agar koi issue aaye toh:

1. Error message copy karo
2. Ye query run karo aur result share karo:
```sql
SELECT 
    table_name, 
    constraint_name, 
    column_name 
FROM information_schema.key_column_usage 
WHERE referenced_table_name = 'profiles' 
OR referenced_table_name = 'users';
```

3. Ye bhi check karo:
```sql
SELECT COUNT(*) as total_users FROM auth.users;
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT COUNT(*) as total_identities FROM auth.identities;
```

---

## 🎯 Quick Summary

1. **Backup** - Pehle backup lo
2. **Reset** - Current database clean karo
3. **Export** - Source se CSV export karo
4. **Import** - Target me CSV import karo
5. **Verify** - Sab kuch check karo
6. **Link** - Admin ko settings se link karo
7. **Test** - Login test karo

Done! 🎉
