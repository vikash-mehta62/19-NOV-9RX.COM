# Purchase Order Approval Fix - Complete Solution

## Problem
After approving or rejecting a purchase order, the database was NOT being updated. The `poApproved`, `poRejected`, and `status` fields remained unchanged.

## Root Causes

### 1. Missing Status Field Update
In `src/components/orders/table/OrderDetailsSheet.tsx`, the approval and rejection handlers were updating:
- `poApproved` / `poRejected` flags
- `po_handling_charges` / `po_fred_charges`

But they were **NOT updating the `status` field**.

### 2. Missing RLS Policy for Admin Updates ⚠️ **CRITICAL**
The orders table had RLS policies that only allowed:
- Users to update their own orders (`profile_id = auth.uid()`)
- No policy for admins to update ANY order

**Problem:** In Purchase Orders, the `profile_id` is the VENDOR's ID, not the admin's ID. When an admin tries to approve a PO, the update fails silently because the RLS policy blocks it!

### 3. Missing Error Handling
The update query didn't check for errors, so failures were silent and undetected.

## Solutions Applied

### Fix 1: Add Status Field Updates
Updated both approval and rejection flows to include `status` field:

**Approval Flow:**
```typescript
const { data: updateData, error: updateError } = await supabase
  .from("orders")
  .update({
    poApproved: true,
    poRejected: false,
    po_handling_charges: handling,
    po_fred_charges: fred,
    status: "approved",  // ✅ ADDED
  })
  .eq("id", order.id);
```

**Rejection Flow:**
```typescript
const { data: updateData, error: updateError } = await supabase
  .from("orders")
  .update({
    poApproved: false,
    poRejected: true,
    po_handling_charges: 0,
    po_fred_charges: 0,
    status: "rejected",  // ✅ ADDED
  })
  .eq("id", order.id);
```

### Fix 2: Add Admin RLS Policy ⭐ **CRITICAL FIX**
Created new RLS policy to allow admins to update ANY order:

```sql
CREATE POLICY "Admins can update all orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### Fix 3: Add Error Handling
Added proper error checking and logging:

```typescript
if (updateError) {
  console.error("❌ Failed to update PO approval status:", updateError);
  throw new Error(`Database update failed: ${updateError.message}`);
}

console.log("✅ PO approval updated successfully:", updateData);
```

## Impact
- ✅ Admins can now successfully approve/reject purchase orders
- ✅ Database updates work correctly with proper RLS permissions
- ✅ Status field is properly tracked ("approved" / "rejected")
- ✅ Errors are caught and logged for debugging
- ✅ UI components filtering by status will work correctly
- ✅ Reporting and analytics based on status will be accurate

## Testing Steps
1. Login as admin
2. Create a new purchase order (profile_id will be vendor's ID)
3. Open the PO and click "Approve Purchase"
4. Enter handling and freight charges
5. Verify in database:
   - `poApproved` should be `true`
   - `status` should be `"approved"`
   - `po_handling_charges` and `po_fred_charges` should be set
6. Check browser console for success log: "✅ PO approval updated successfully"

## Files Modified
1. `src/components/orders/table/OrderDetailsSheet.tsx` - Added status updates and error handling
2. `supabase/migrations/20260216_add_admin_update_orders_policy.sql` - New RLS policy for admin updates

## Database Verification Query
```sql
-- Check if PO was approved correctly
SELECT 
  order_number,
  status,
  "poApproved",
  "poRejected",
  po_handling_charges,
  po_fred_charges,
  profile_id,
  updated_at
FROM orders
WHERE order_number LIKE 'PO-%'
ORDER BY created_at DESC
LIMIT 5;

-- Verify admin can update orders
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'orders'
AND cmd = 'UPDATE';
```

## Why This Was Failing Before
1. Admin user (auth.uid() = admin_id) tried to update order
2. Order has profile_id = vendor_id (not admin_id)
3. RLS policy checked: `profile_id = auth.uid()` → FALSE
4. Update was blocked silently by RLS
5. No error was thrown or logged
6. Frontend showed success but database wasn't updated

## Why It Works Now
1. Admin user (auth.uid() = admin_id) tries to update order
2. New RLS policy checks: "Is this user an admin?" → TRUE
3. Update is allowed regardless of profile_id
4. Database is updated successfully
5. Success is logged in console
6. If any error occurs, it's caught and displayed

---
**Status:** ✅ FIXED (Complete Solution)
**Date:** February 16, 2026
**Critical Fix:** RLS Policy for Admin Updates
