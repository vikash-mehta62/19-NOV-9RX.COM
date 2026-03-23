# Global Shipping Settings Empty - Troubleshooting Guide

## 🔴 Problem
Pharmacy login me global shipping settings empty (all zeros) aa rahi hai.

## 🔍 Root Cause Analysis

### Possible Causes:
1. **Database me `settings` table me `is_global = true` wali row nahi hai**
2. **Required columns missing hai `settings` table me**
3. **Migration run nahi hua hai**
4. **RLS policies block kar rahi hai pharmacy user ko**

---

## ✅ Solution Steps

### Step 1: Check Console Logs

Browser console me ye logs check karo:

**Expected (Working):**
```
🔍 Fetching global shipping settings...
✅ Global shipping settings fetched successfully: {
  auto_shipping_charge_enabled: false,
  auto_shipping_charge_threshold: 100,
  auto_shipping_charge_amount: 15,
  free_shipping_enabled: true,
  free_shipping_threshold: 200,
  default_shipping_rate: 10,
  handling_fee: 2
}
```

**Problem (Not Working):**
```
🔍 Fetching global shipping settings...
⚠️ No global shipping settings found in database (is_global = true row missing)
💡 Using default shipping settings (all zeros)
💡 Tip: Go to Admin Settings page to configure global shipping settings
```

---

### Step 2: Run Diagnostic Query

Database me ye query run karo:

```sql
-- Check if settings table has required columns
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'settings' 
  AND table_schema = 'public'
  AND column_name IN (
    'is_global',
    'auto_shipping_charge_enabled',
    'auto_shipping_charge_threshold',
    'auto_shipping_charge_amount',
    'free_shipping_enabled',
    'free_shipping_threshold',
    'default_shipping_rate',
    'handling_fee'
  );
```

**Expected Result:** 8 rows (all columns present)

**If columns missing:** Run migration `20260321000000_add_auto_shipping_charge_settings.sql`

---

### Step 3: Check if Global Settings Row Exists

```sql
SELECT * FROM settings WHERE is_global = true LIMIT 1;
```

**Expected Result:** 1 row with shipping settings

**If no row found:** Insert default global settings:

```sql
INSERT INTO settings (
  is_global,
  auto_shipping_charge_enabled,
  auto_shipping_charge_threshold,
  auto_shipping_charge_amount,
  free_shipping_enabled,
  free_shipping_threshold,
  default_shipping_rate,
  handling_fee
) VALUES (
  true,
  false,
  100,
  15,
  true,
  200,
  10,
  2
)
RETURNING *;
```

---

### Step 4: Check RLS Policies

```sql
-- Check if pharmacy users can read settings table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'settings';
```

**Required:** Pharmacy users should have SELECT permission on settings table

**If blocked:** Add RLS policy:

```sql
-- Allow all authenticated users to read global settings
CREATE POLICY "Allow authenticated users to read global settings"
ON settings
FOR SELECT
TO authenticated
USING (is_global = true);
```

---

### Step 5: Verify from Admin Settings Page

1. Login as **Admin**
2. Go to **Settings** page
3. Scroll to **Shipping Settings** section
4. Check if values are set:
   - Auto Shipping Charge: Enabled/Disabled
   - Auto Shipping Threshold: (e.g., 100)
   - Auto Shipping Amount: (e.g., 15)
   - Free Shipping: Enabled/Disabled
   - Free Shipping Threshold: (e.g., 200)
   - Default Shipping Rate: (e.g., 10)
   - Handling Fee: (e.g., 2)

5. If all zeros, **update the values** and click **Save**

---

## 🧪 Testing After Fix

### Test 1: Admin Order Creation
1. Login as Admin
2. Create new order
3. Select customer
4. Add products
5. Check console logs:
   ```
   ✅ Global shipping settings fetched successfully: {...}
   ```
6. Verify shipping calculation uses global settings

### Test 2: Pharmacy Login
1. Login as Pharmacy
2. Create new order
3. Add products
4. Check console logs:
   ```
   ✅ Global shipping settings fetched successfully: {...}
   ```
5. Verify shipping calculation uses global settings

### Test 3: Quick Order
1. Login as Admin
2. Go to Quick Order
3. Select customer
4. Add products
5. Check console logs:
   ```
   ✅ [QuickOrder] Global shipping settings fetched: {...}
   ```
6. Verify shipping calculation

---

## 📊 Expected Behavior After Fix

### Scenario 1: Customer with NO profile settings
```
Customer: No profile shipping settings
Global: auto_shipping_threshold = 100, amount = 15
Cart: $50
Expected: $15 shipping (global auto charge)
```

### Scenario 2: Customer with profile settings
```
Customer: custom_shipping_rate = 5
Global: auto_shipping_threshold = 100, amount = 15
Cart: $50
Expected: $5 shipping (profile overrides global)
```

### Scenario 3: Free shipping threshold met
```
Customer: No profile settings
Global: free_shipping_threshold = 200
Cart: $250
Expected: $0 shipping (global free shipping)
```

---

## 🔧 Quick Fix Commands

### If settings table missing columns:
```bash
# Run migration
psql -d your_database -f supabase/migrations/20260321000000_add_auto_shipping_charge_settings.sql
```

### If global settings row missing:
```sql
-- Insert default global settings
INSERT INTO settings (
  is_global,
  auto_shipping_charge_enabled,
  auto_shipping_charge_threshold,
  auto_shipping_charge_amount,
  free_shipping_enabled,
  free_shipping_threshold,
  default_shipping_rate,
  handling_fee
) VALUES (
  true,
  false,
  100,
  15,
  true,
  200,
  10,
  2
);
```

### If RLS blocking pharmacy users:
```sql
-- Add RLS policy for authenticated users
CREATE POLICY "Allow authenticated users to read global settings"
ON settings
FOR SELECT
TO authenticated
USING (is_global = true);
```

---

## 📝 Console Logs Reference

### Working Logs:
```
🔍 Fetching global shipping settings...
✅ Global shipping settings fetched successfully: {
  auto_shipping_charge_enabled: false,
  auto_shipping_charge_threshold: 100,
  auto_shipping_charge_amount: 15,
  free_shipping_enabled: true,
  free_shipping_threshold: 200,
  default_shipping_rate: 10,
  handling_fee: 2
}

=== SHIPPING CALCULATION START ===
Cart items: 3
Customer free shipping (legacy): false
Subtotal: 75
Global Settings: {
  auto_shipping_charge_enabled: false,
  auto_shipping_charge_threshold: 100,
  auto_shipping_charge_amount: 15,
  ...
}
Profile Settings: null
✅ Priority 6: Default shipping rate: 10, Handling: 2, Total: 12
=== SHIPPING CALCULATION END ===
```

### Problem Logs:
```
🔍 Fetching global shipping settings...
⚠️ No global shipping settings found in database (is_global = true row missing)
💡 Using default shipping settings (all zeros)

=== SHIPPING CALCULATION START ===
Cart items: 3
Customer free shipping (legacy): false
Subtotal: 75
Global Settings: {
  auto_shipping_charge_enabled: false,
  auto_shipping_charge_threshold: 0,
  auto_shipping_charge_amount: 0,
  ...
}
Profile Settings: null
✅ Priority 7: Product shipping cost: 0, Handling: 0, Total: 0
=== SHIPPING CALCULATION END ===
```

---

## ✅ Verification Checklist

- [ ] Console shows "✅ Global shipping settings fetched successfully"
- [ ] Global settings object has non-zero values
- [ ] Shipping calculation uses global settings (not all zeros)
- [ ] Admin Settings page shows correct values
- [ ] Pharmacy login can fetch global settings
- [ ] Quick Order can fetch global settings
- [ ] Profile settings override global settings (when set)

---

## 🚀 Next Steps After Fix

1. Test all three modes (Admin, Pharmacy, Quick Order)
2. Verify console logs show correct settings
3. Test shipping calculation with different cart amounts
4. Test profile settings override global settings
5. Update ViewProfileModal UI (manual update required)

---

**Status:** Improved logging added - Check console to identify exact issue
**Files Modified:** 
- `src/components/orders/wizard/OrderCreationWizard.tsx`
- `src/components/orders/QuickOrderCreation.tsx`
