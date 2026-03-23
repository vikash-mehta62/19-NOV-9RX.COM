# RLS Policy Fix - Pharmacy Cannot Read Global Settings

## 🔴 Problem Identified

**Symptoms:**
- Admin login: Global settings load ✅
- Pharmacy login: Global settings empty (all zeros) ❌
- Console shows: `⚠️ No global shipping settings found in database`

**Root Cause:**
RLS (Row Level Security) policy on `settings` table is blocking pharmacy users from reading global settings.

---

## ✅ Solution: Add RLS Policy for Authenticated Users

### Quick Fix (Run This SQL):

```sql
-- Enable RLS on settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow ALL authenticated users to read global settings
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read global settings"
ON settings
FOR SELECT
TO authenticated
USING (is_global = true);
```

### Or Run Migration:

```bash
# Run the migration file
psql -d your_database -f supabase/migrations/20260322000001_fix_settings_rls_for_pharmacy.sql
```

---

## 🔍 How to Verify the Issue

### Step 1: Check if RLS is enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'settings';
```

**Expected:** `rowsecurity = true`

### Step 2: Check existing policies
```sql
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'settings';
```

**Problem:** No policy allowing pharmacy users to SELECT

**Solution:** Policy with `TO authenticated` and `USING (is_global = true)`

---

## 🧪 Testing After Fix

### Test 1: Pharmacy Login
1. Login as pharmacy user
2. Go to order creation page
3. Check console logs:

**Before Fix:**
```
🔍 Fetching global shipping settings...
⚠️ No global shipping settings found in database (is_global = true row missing)
💡 Using default shipping settings (all zeros)
```

**After Fix:**
```
🔍 Fetching global shipping settings...
✅ Global shipping settings fetched successfully: {
  auto_shipping_charge_enabled: true,
  auto_shipping_charge_threshold: 100,
  auto_shipping_charge_amount: 15,
  free_shipping_enabled: true,
  free_shipping_threshold: 200,
  default_shipping_rate: 10,
  handling_fee: 2
}
```

### Test 2: Admin Login
Should still work (no change):
```
✅ Global shipping settings fetched successfully: {...}
```

### Test 3: Shipping Calculation
**Before Fix:**
```
Global Settings: {
  auto_shipping_charge_enabled: false,
  auto_shipping_charge_threshold: 0,
  auto_shipping_charge_amount: 0,
  ...all zeros...
}
✅ Priority 7: Product shipping cost: 0, Handling: 0, Total: 0
```

**After Fix:**
```
Global Settings: {
  auto_shipping_charge_enabled: true,
  auto_shipping_charge_threshold: 100,
  auto_shipping_charge_amount: 15,
  ...proper values...
}
✅ Priority 5: Global auto charge! Subtotal 43.73 < Threshold 100
   Base charge: 15, Handling: 2, Total: 17
```

---

## 🔒 Security Considerations

### Why This is Safe:

1. **Read-Only Access**: Policy only allows SELECT (read), not INSERT/UPDATE/DELETE
2. **Global Settings Only**: Policy restricts to `is_global = true` rows only
3. **Authenticated Users**: Only logged-in users can access (not public)
4. **Required for Functionality**: All users need global settings for order creation

### What's Protected:

- **Write Access**: Only admins can modify settings (no write policies for pharmacy)
- **Non-Global Settings**: User-specific settings remain private
- **Unauthenticated Access**: Public users cannot access settings

---

## 📋 Complete RLS Policy Structure

### Recommended Policies:

```sql
-- 1. Allow all authenticated users to read global settings
CREATE POLICY "Allow authenticated users to read global settings"
ON settings
FOR SELECT
TO authenticated
USING (is_global = true);

-- 2. Allow admins to read ALL settings (optional)
CREATE POLICY "Allow admins to read all settings"
ON settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- 3. Allow admins to modify settings
CREATE POLICY "Allow admins to modify settings"
ON settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Wrong: Overly Restrictive Policy
```sql
-- This blocks pharmacy users!
CREATE POLICY "Admin only"
ON settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### ✅ Correct: Allow Authenticated Users
```sql
-- This allows pharmacy users to read global settings
CREATE POLICY "Allow authenticated users to read global settings"
ON settings
FOR SELECT
TO authenticated
USING (is_global = true);
```

---

## 🔧 Troubleshooting

### Issue: Policy not working after creation

**Check 1: RLS is enabled**
```sql
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
```

**Check 2: Policy exists**
```sql
SELECT * FROM pg_policies WHERE tablename = 'settings';
```

**Check 3: Policy syntax is correct**
```sql
-- Should show: cmd = 'SELECT', roles = '{authenticated}'
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'settings';
```

### Issue: Still getting empty settings

**Check 1: Global settings row exists**
```sql
SELECT * FROM settings WHERE is_global = true;
```

**Check 2: User is authenticated**
```sql
SELECT auth.uid(); -- Should return user ID, not NULL
```

**Check 3: Clear browser cache and refresh**

---

## 📊 Before vs After Comparison

### Before Fix:
| User Type | Global Settings | Shipping Calculation | Issue |
|-----------|----------------|---------------------|-------|
| Admin | ✅ Loaded | ✅ Works | None |
| Pharmacy | ❌ Empty (zeros) | ❌ Wrong ($0) | RLS blocks |

### After Fix:
| User Type | Global Settings | Shipping Calculation | Issue |
|-----------|----------------|---------------------|-------|
| Admin | ✅ Loaded | ✅ Works | None |
| Pharmacy | ✅ Loaded | ✅ Works | Fixed! |

---

## ✅ Verification Checklist

After applying the fix:

- [ ] Run migration or SQL query
- [ ] Verify policy exists: `SELECT * FROM pg_policies WHERE tablename = 'settings'`
- [ ] Login as pharmacy user
- [ ] Go to order creation page
- [ ] Check console: Should show "✅ Global shipping settings fetched successfully"
- [ ] Verify global settings object has non-zero values
- [ ] Add products to cart
- [ ] Verify shipping is calculated correctly (not $0)
- [ ] Test admin login (should still work)

---

## 🚀 Next Steps

1. **Run the migration:**
   ```bash
   psql -d your_database -f supabase/migrations/20260322000001_fix_settings_rls_for_pharmacy.sql
   ```

2. **Verify in console:**
   - Pharmacy login
   - Check for "✅ Global shipping settings fetched successfully"

3. **Test shipping calculation:**
   - Add products
   - Verify shipping amount is correct

4. **Apply ViewProfileModal UI update:**
   - See `.tmp/VIEWPROFILEMODAL_MANUAL_UPDATE_INSTRUCTIONS.md`

---

**Files Created:**
- `supabase/migrations/20260322000001_fix_settings_rls_for_pharmacy.sql` - Migration file
- `.tmp/fix_settings_rls_for_pharmacy.sql` - Diagnostic queries
- `.tmp/RLS_POLICY_FIX_GUIDE.md` - This guide

**Status:** ✅ Fix ready - Run migration to apply
