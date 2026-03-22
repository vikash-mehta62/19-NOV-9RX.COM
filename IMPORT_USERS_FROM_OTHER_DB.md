# Import Users from Another Database - Complete Guide

## Method 1: Export and Import via SQL (RECOMMENDED)

### Step 1: Export from Source Database

Go to **Source Database** → SQL Editor and run:

```sql
-- Export auth.users
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
ORDER BY created_at;
```

**Save the result as CSV** (click "Download CSV" button)

### Step 2: Export auth.identities

```sql
-- Export auth.identities
SELECT 
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
FROM auth.identities
ORDER BY created_at;
```

**Save as CSV**

### Step 3: Export profiles

```sql
-- Export profiles
SELECT * FROM profiles
ORDER BY created_at;
```

**Save as CSV**

---

## Step 4: Import to Target Database

### Option A: Using SQL INSERT (For Small Data)

Go to **Target Database** → SQL Editor:

```sql
-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Insert into auth.users
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    -- ... (all other columns)
    created_at,
    updated_at
) VALUES
('user-id-1', 'instance-id', 'authenticated', 'authenticated', 'user1@example.com', 'encrypted-password', '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00'),
('user-id-2', 'instance-id', 'authenticated', 'authenticated', 'user2@example.com', 'encrypted-password', '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00');
-- Add more rows...

-- Insert into auth.identities
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES
('identity-id-1', 'user-id-1', '{"sub":"user-id-1","email":"user1@example.com"}', 'email', '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00');
-- Add more rows...

-- Insert into profiles
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    type,
    role,
    status,
    created_at,
    updated_at
) VALUES
('user-id-1', 'user1@example.com', 'John', 'Doe', 'pharmacy', 'user', 'active', '2024-01-01 00:00:00', '2024-01-01 00:00:00');
-- Add more rows...

-- Re-enable triggers
SET session_replication_role = 'origin';
```

### Option B: Using CSV Import (For Large Data)

1. **Prepare CSV files** from Step 1-3
2. **Go to Target Database** → Table Editor
3. **Select table** (auth.users, auth.identities, profiles)
4. **Click "Import data"** → Upload CSV
5. **Map columns** correctly
6. **Click "Import"**

**Note:** CSV import may not work for auth tables due to security. Use SQL method instead.

---

## Method 2: Using Supabase CLI (ADVANCED)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Link to Source Database

```bash
supabase link --project-ref SOURCE_PROJECT_REF
```

### Step 3: Dump Database

```bash
supabase db dump -f source_dump.sql
```

### Step 4: Link to Target Database

```bash
supabase link --project-ref TARGET_PROJECT_REF
```

### Step 5: Import Dump

```bash
supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < source_dump.sql
```

---

## Method 3: Using pg_dump and psql (EXPERT)

### Step 1: Get Connection Strings

**Source Database:**
- Go to Settings → Database → Connection String
- Copy "Connection string" (URI format)

**Target Database:**
- Same as above

### Step 2: Dump Specific Tables

```bash
pg_dump "SOURCE_CONNECTION_STRING" \
  -t auth.users \
  -t auth.identities \
  -t public.profiles \
  --data-only \
  --column-inserts \
  > users_dump.sql
```

### Step 3: Import to Target

```bash
psql "TARGET_CONNECTION_STRING" < users_dump.sql
```

---

## Method 4: Manual Export/Import via Supabase Dashboard

### Step 1: Export from Source

1. Go to **Source Database** → Table Editor
2. Select **auth.users** table
3. Click **"..."** menu → **"Export as CSV"**
4. Repeat for **auth.identities** and **profiles**

### Step 2: Convert CSV to SQL

Use this Python script or online tool:

```python
import csv
import json

# Read CSV
with open('auth_users.csv', 'r') as f:
    reader = csv.DictReader(f)
    users = list(reader)

# Generate SQL
with open('insert_users.sql', 'w') as f:
    f.write("SET session_replication_role = 'replica';\n\n")
    
    for user in users:
        # Escape single quotes
        email = user['email'].replace("'", "''")
        
        sql = f"""
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, 
    created_at, updated_at, role, aud
) VALUES (
    '{user['id']}',
    '{email}',
    '{user['encrypted_password']}',
    '{user['email_confirmed_at']}',
    '{user['created_at']}',
    '{user['updated_at']}',
    'authenticated',
    'authenticated'
);
"""
        f.write(sql)
    
    f.write("\nSET session_replication_role = 'origin';\n")
```

### Step 3: Run Generated SQL

Copy the generated SQL and run in **Target Database** → SQL Editor

---

## Important Notes

### 1. Password Hashes
- `encrypted_password` field contains bcrypt hashes
- These will work in the new database
- Users can login with same passwords

### 2. UUIDs
- Keep the same `id` values from source database
- This maintains relationships with other tables

### 3. Timestamps
- Preserve `created_at`, `updated_at` timestamps
- Use original values from source database

### 4. Identity Data
- `identity_data` in auth.identities is JSONB
- Format: `{"sub":"user-id","email":"user@example.com"}`
- Must match user_id

### 5. Instance ID
- `instance_id` should be the same for all users
- Get from existing user in target database:
  ```sql
  SELECT DISTINCT instance_id FROM auth.users LIMIT 1;
  ```

---

## Complete Import Script Template

```sql
-- ============================================
-- COMPLETE USER IMPORT SCRIPT
-- ============================================

-- Step 1: Disable triggers
SET session_replication_role = 'replica';

-- Step 2: Get instance_id from target database
-- Run this first and note the instance_id:
-- SELECT DISTINCT instance_id FROM auth.users LIMIT 1;

-- Step 3: Insert users
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
) VALUES
-- Replace with your actual data from source database
('USER_ID_1', 'INSTANCE_ID', 'authenticated', 'authenticated', 'user1@example.com', 'ENCRYPTED_PASSWORD', '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00', '{"provider":"email","providers":["email"]}', '{}', false, NULL),
('USER_ID_2', 'INSTANCE_ID', 'authenticated', 'authenticated', 'user2@example.com', 'ENCRYPTED_PASSWORD', '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00', '{"provider":"email","providers":["email"]}', '{}', false, NULL);

-- Step 4: Insert identities
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES
('IDENTITY_ID_1', 'USER_ID_1', '{"sub":"USER_ID_1","email":"user1@example.com"}', 'email', NULL, '2024-01-01 00:00:00', '2024-01-01 00:00:00'),
('IDENTITY_ID_2', 'USER_ID_2', '{"sub":"USER_ID_2","email":"user2@example.com"}', 'email', NULL, '2024-01-01 00:00:00', '2024-01-01 00:00:00');

-- Step 5: Insert profiles
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    type,
    role,
    status,
    created_at,
    updated_at
) VALUES
('USER_ID_1', 'user1@example.com', 'John', 'Doe', 'pharmacy', 'user', 'active', '2024-01-01 00:00:00', '2024-01-01 00:00:00'),
('USER_ID_2', 'user2@example.com', 'Jane', 'Smith', 'hospital', 'user', 'active', '2024-01-01 00:00:00', '2024-01-01 00:00:00');

-- Step 6: Re-enable triggers
SET session_replication_role = 'origin';

-- Step 7: Verify import
SELECT COUNT(*) as total_users FROM auth.users;
SELECT COUNT(*) as total_identities FROM auth.identities;
SELECT COUNT(*) as total_profiles FROM profiles;
```

---

## Verification After Import

```sql
-- Check users imported
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- Check identities imported
SELECT user_id, provider, identity_data FROM auth.identities;

-- Check profiles imported
SELECT id, email, type, role FROM profiles ORDER BY created_at;

-- Verify relationships
SELECT 
    u.email,
    i.provider,
    p.first_name,
    p.last_name,
    p.type
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at;
```

---

## Troubleshooting

### Issue 1: "duplicate key value violates unique constraint"
**Solution:** User with same ID already exists. Delete existing user first or use different ID.

### Issue 2: "permission denied for table users"
**Solution:** Use service role key, not anon key. Go to Settings → API → Copy service_role key.

### Issue 3: "invalid input syntax for type json"
**Solution:** Check identity_data format. Must be valid JSON: `{"sub":"user-id","email":"user@example.com"}`

### Issue 4: Users can't login after import
**Solution:** Check encrypted_password was copied correctly. Password hashes must be exact.

---

**Bhai, Method 1 (SQL Export/Import) sabse safe hai. CSV export karo aur SQL INSERT statements banao!** 📊
