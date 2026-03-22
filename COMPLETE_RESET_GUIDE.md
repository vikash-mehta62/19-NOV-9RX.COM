# Complete Database Reset - Step by Step Guide

## ⚠️ CRITICAL WARNING ⚠️

**This will DELETE EVERYTHING:**
- All users (authentication)
- All profiles
- All identities (Google, email, etc.)
- All orders
- All invoices
- All locations
- All payment settings
- All reward data
- All carts
- Everything related to users

**This is COMPLETELY IRREVERSIBLE!**

---

## Before You Start

### 1. Take Full Backup
Go to Supabase Dashboard → Database → Backups → Create Backup

### 2. Export Important Data (Optional)
If you want to keep some data:
- Go to Table Editor
- Select table → Export as CSV
- Save files locally

### 3. Verify You Have Admin Access
You need service role access to delete auth.users

---

## Step-by-Step Reset Process

### Step 1: Open SQL Editor
1. Go to Supabase Dashboard
2. Click on "SQL Editor" in left sidebar
3. Click "New Query"

### Step 2: Run Verification Query (BEFORE deletion)
Copy and paste this query to see what will be deleted:

```sql
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'locations', COUNT(*) FROM locations;
```

**Review the counts carefully!**

### Step 3: Run Complete Reset Query
Copy the entire query from `RESET_AUTH_AND_PROFILES.sql` file (the COMPLETE RESET section) and paste in SQL Editor.

Click "Run" button.

### Step 4: Verify Deletion (AFTER deletion)
Run the verification query again:

```sql
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities
UNION ALL
SELECT 'auth.sessions', COUNT(*) FROM auth.sessions
UNION ALL
SELECT 'auth.refresh_tokens', COUNT(*) FROM auth.refresh_tokens
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'payment_settings', COUNT(*) FROM payment_settings
UNION ALL
SELECT 'reward_transactions', COUNT(*) FROM reward_transactions
UNION ALL
SELECT 'carts', COUNT(*) FROM carts;
```

**All counts should be 0!**

### Step 5: Logout from Application
1. Go to your application
2. Logout (if logged in)
3. Clear browser cache/cookies
4. Close all browser tabs

---

## After Reset - Import New Data

### Option 1: Manual Import via Dashboard
1. Go to Table Editor
2. Select table
3. Click "Insert" → "Insert row"
4. Or use "Import data" if you have CSV files

### Option 2: SQL Import
1. Prepare your SQL INSERT statements
2. Go to SQL Editor
3. Paste and run INSERT queries

### Option 3: API Import
Use your application's signup/registration flow to create new users

---

## Common Issues & Solutions

### Issue 1: "Permission denied" error
**Cause:** Not using service role key
**Solution:** 
- Go to Settings → API
- Copy "service_role" key (not anon key)
- Use service role in SQL Editor

### Issue 2: "Foreign key constraint" error
**Cause:** Deleting in wrong order
**Solution:** Use the provided query which deletes in correct order

### Issue 3: Some data still remains
**Cause:** Some tables not included in delete query
**Solution:** Check which tables have data:
```sql
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public';
```
Then manually delete from those tables.

### Issue 4: Can't login after reset
**Cause:** All users deleted including admins
**Solution:** Create new admin user via Supabase Dashboard:
1. Go to Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Create user
5. Then manually insert into profiles table

---

## Quick Recovery (If Something Goes Wrong)

### If you have a backup:
1. Go to Database → Backups
2. Select your backup
3. Click "Restore"
4. Wait for restoration to complete

### If you don't have a backup:
You'll need to re-import all data manually. This is why backup is CRITICAL!

---

## Checklist Before Running Reset

- [ ] Full backup taken
- [ ] Important data exported (if needed)
- [ ] Verified what will be deleted (ran verification query)
- [ ] Confirmed you have service role access
- [ ] Confirmed you want to delete EVERYTHING
- [ ] Ready to re-import new data
- [ ] Logged out from application
- [ ] Informed team members (if applicable)

---

## Final Confirmation

**Are you absolutely sure you want to:**
- Delete ALL users?
- Delete ALL authentication data?
- Delete ALL profiles?
- Delete ALL orders?
- Delete ALL invoices?
- Delete ALL related data?

**This cannot be undone!**

If YES, proceed with Step 1 above.
If NO, close this document and reconsider.

---

**Bhai, bahut careful rehna! Backup zaroor lena!** ⚠️
