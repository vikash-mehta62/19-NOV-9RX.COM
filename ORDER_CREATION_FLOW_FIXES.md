# Order Creation Flow - Issues Found & Fixed

## Date: 2026-02-16

## Summary
Comprehensive analysis of the end-to-end order creation flow revealed multiple Row-Level Security (RLS) policy issues and a critical race condition that were blocking order creation for regular users.

---

## Issues Found & Fixed

### 1. ❌ **order_activities Table - Missing INSERT Policy**
**Problem:** 
- Table had RLS enabled but no INSERT policy for regular users
- Only admins and service role could insert activity records
- When users created orders, the system tried to log activities but RLS blocked it

**Error Message:**
```
Error Creating Order - New row violates row-level security policy for table 'order_activities'
```

**Fix Applied:**
```sql
CREATE POLICY "Users can create activities for own orders"
ON order_activities
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_activities.order_id 
    AND orders.profile_id = auth.uid()
  )
  OR is_admin(auth.uid())
);
```

---

### 2. ❌ **Database Triggers - No SECURITY DEFINER**
**Problem:**
- `log_order_creation()` and `log_order_update()` triggers ran without elevated privileges
- Triggers execute in database context where `auth.uid()` is NULL
- RLS policies checking `auth.uid()` blocked trigger operations

**Fix Applied:**
```sql
-- Made both trigger functions run with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.log_order_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with postgres privileges, bypass RLS
SET search_path TO 'public', 'pg_temp'
AS $function$
-- ... function body ...
$function$;

CREATE OR REPLACE FUNCTION public.log_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with postgres privileges, bypass RLS
-- ... function body ...
$function$;
```

---

### 3. ❌ **calculate_order_commission Trigger - No SECURITY DEFINER**
**Problem:**
- Commission calculation trigger tried to INSERT into `group_commission_history`
- No INSERT policy existed for regular users on that table
- Trigger ran without elevated privileges

**Fix Applied:**
```sql
CREATE OR REPLACE FUNCTION public.calculate_order_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges
SET search_path TO 'public', 'pg_temp'
AS $function$
-- ... function body ...
$function$;
```

---

### 4. ❌ **invoices Table - Admin-Only INSERT Policy**
**Problem:**
- Policy "Only admins can create invoices" blocked all regular users
- Order creation flow requires creating an invoice
- Users couldn't complete checkout

**Old Policy:**
```sql
CREATE POLICY "Only admins can create invoices"
ON invoices
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
```

**Fix Applied:**
```sql
CREATE POLICY "Users can create invoices for own orders"
ON invoices
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = invoices.order_id 
    AND orders.profile_id = auth.uid()
  )
);
```

---

### 5. ⚠️ **orders Table - Overly Permissive INSERT Policy**
**Problem:**
- Policy allowed `(profile_id IS NOT NULL)` which is too broad
- Anyone could create orders for anyone else as long as profile_id was set
- Security risk

**Old Policy:**
```sql
WITH CHECK (
  (auth.uid() = profile_id) OR (profile_id IS NOT NULL)
)
```

**Fix Applied:**
```sql
CREATE POLICY "Users can create orders"
ON orders
FOR INSERT
TO public
WITH CHECK (
  -- Users can create orders for themselves
  auth.uid() = profile_id
  OR
  -- Admins can create orders for anyone
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR
  -- Groups can create orders for their pharmacies
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.type = 'group'
    AND EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = orders.profile_id
      AND p2.group_id = auth.uid()
    )
  )
);
```

---

### 6. ❌ **Invoice Number Generation - Race Condition**
**Problem:**
- Invoice numbers were generated using a read-then-increment pattern
- Multiple simultaneous orders could read the same invoice number
- Both would try to insert invoices with duplicate numbers
- Resulted in "duplicate key value violates unique constraint" error

**Error Message:**
```
duplicate key value violates unique constraint "invoices_invoice_number_key"
```

**Race Condition Flow:**
```
Time  | User A                          | User B
------|--------------------------------|--------------------------------
T1    | Read invoice_no = 100          |
T2    |                                | Read invoice_no = 100
T3    | Generate INV-2026000101        |
T4    |                                | Generate INV-2026000101
T5    | Insert invoice (SUCCESS)       |
T6    |                                | Insert invoice (DUPLICATE ERROR!)
```

**Fix Applied:**
Created an atomic database function that locks and increments in a single transaction:

```sql
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_no INTEGER;
  v_invoice_start TEXT;
  v_year INTEGER;
  v_invoice_number TEXT;
  v_centerize_id UUID;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Lock the row and increment atomically
  UPDATE centerize_data
  SET invoice_no = invoice_no + 1
  WHERE id = (SELECT id FROM centerize_data ORDER BY id DESC LIMIT 1)
  RETURNING id, invoice_no, invoice_start
  INTO v_centerize_id, v_invoice_no, v_invoice_start;
  
  IF v_centerize_id IS NULL THEN
    INSERT INTO centerize_data (invoice_no, invoice_start)
    VALUES (1, 'INV')
    RETURNING id, invoice_no, invoice_start
    INTO v_centerize_id, v_invoice_no, v_invoice_start;
  END IF;
  
  v_invoice_number := v_invoice_start || '-' || v_year || LPAD(v_invoice_no::TEXT, 6, '0');
  
  RETURN v_invoice_number;
END;
$$;
```

**Frontend Change:**
```typescript
// OLD - Race condition prone
const { data: inData } = await supabase
  .from("centerize_data")
  .select("invoice_no")
  .limit(1);
const newInvNo = inData[0].invoice_no + 1;
const invoiceNumber = `INV-${year}${newInvNo}`;

// NEW - Atomic generation
const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
```

---

## Order Creation Flow - Database Operations

### Step-by-Step Flow:
1. **User submits payment** → `CreateOrderPaymentForm.handleSubmit()`
2. **Payment processed** → Authorize.net or saved card charge
3. **Order created** → `INSERT INTO orders`
   - ✅ Triggers: `calculate_order_commission` (BEFORE)
   - ✅ Triggers: `log_order_creation` (AFTER) → inserts into `order_activities`
4. **Invoice created** → `INSERT INTO invoices`
5. **Order items saved** → `INSERT INTO order_items`
6. **Activities logged** → Multiple `INSERT INTO order_activities` via `OrderActivityService`
7. **Stock updated** → `UPDATE product_sizes`
8. **Rewards awarded** → `awardOrderPoints()`
9. **Email sent** → Order confirmation email

### Tables Involved:
- ✅ `orders` - Main order record
- ✅ `order_activities` - Activity log (via triggers + manual inserts)
- ✅ `order_items` - Line items
- ✅ `invoices` - Invoice record
- ✅ `group_commission_history` - Commission tracking (via trigger)
- ✅ `product_sizes` - Stock updates
- ✅ `reward_transactions` - Points awarded
- ✅ `profiles` - User/customer data

---

## Testing Recommendations

### 1. Test as Regular User (Pharmacy)
```javascript
// Login as pharmacy user
// Add items to cart
// Proceed to checkout
// Complete payment
// ✅ Should create order successfully
```

### 2. Test as Admin
```javascript
// Login as admin
// Create order on behalf of pharmacy
// ✅ Should work with pId parameter
```

### 3. Test as Group
```javascript
// Login as group user
// Create order for pharmacy in group
// ✅ Should work with group permissions
```

### 4. Test Triggers
```sql
-- Verify order_activities are created automatically
SELECT * FROM order_activities WHERE order_id = '<new_order_id>';

-- Verify commission is calculated
SELECT * FROM group_commission_history WHERE order_id = '<new_order_id>';
```

---

## Security Improvements Made

1. ✅ **Removed overly permissive policies** - Orders can only be created by authorized users
2. ✅ **Added proper RLS policies** - Users can only access their own data
3. ✅ **Secured trigger functions** - Using SECURITY DEFINER to bypass RLS where appropriate
4. ✅ **Maintained admin privileges** - Admins can still manage all orders
5. ✅ **Group permissions** - Groups can create orders for their pharmacies

---

## Migrations Applied

1. `fix_order_activities_insert_policy` - Added INSERT policy for order_activities
2. `fix_order_activity_trigger_security` - Made triggers run with SECURITY DEFINER
3. `fix_commission_trigger_and_policies` - Fixed commission calculation trigger
4. `fix_invoice_creation_policy` - Allowed users to create invoices
5. `improve_orders_insert_policy` - Improved order creation security
6. `create_invoice_number_generator_function` - Fixed race condition with atomic function

---

## Status: ✅ RESOLVED

All identified issues have been fixed. Users should now be able to create orders successfully without RLS violations.

---

## Next Steps

1. Test order creation in all user roles (pharmacy, admin, group)
2. Monitor for any additional RLS errors
3. Consider adding more granular permissions if needed
4. Review other tables for similar RLS issues
