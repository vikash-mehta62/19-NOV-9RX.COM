# Saved Cards Issue - Fixed

## Problem
When admin creates an order for a customer, admin's saved cards were showing instead of customer's saved cards.

## Root Cause
In `src/components/CreateOrderPayment.tsx`:
- Line 178: `getSavedPaymentMethods(userProfile.id)` was using admin's ID
- Line 448: `saveCardToProfile(userProfile.id, ...)` was saving card to admin's profile

## Solution Applied

### 1. Fetch Customer's Saved Cards (Line 174-176)
```typescript
// BEFORE
const methods = await getSavedPaymentMethods(userProfile.id);

// AFTER
const profileIdToUse = pId || userProfile?.id;
const methods = await getSavedPaymentMethods(profileIdToUse);
```

### 2. Save Card to Customer's Profile (Line 447-450)
```typescript
// BEFORE
const saveResult = await saveCardToProfile(
  userProfile.id,
  ...
);

// AFTER
const profileIdToSave = pId || userProfile.id;
const saveResult = await saveCardToProfile(
  profileIdToSave,
  ...
);
```

### 3. Updated useEffect Dependency (Line 192)
```typescript
// BEFORE
}, [userProfile?.id]);

// AFTER
}, [pId, userProfile?.id]); // Re-fetch when customer changes
```

## How It Works Now

1. **Admin creates order for Customer A**
   - `pId` = Customer A's ID
   - Fetches Customer A's saved cards
   - If admin saves a card, it saves to Customer A's profile

2. **Admin creates order for Customer B**
   - `pId` = Customer B's ID
   - Fetches Customer B's saved cards
   - If admin saves a card, it saves to Customer B's profile

3. **Customer creates their own order**
   - `pId` = undefined
   - Falls back to `userProfile.id` (customer's own ID)
   - Works as before

## Database Verification

Ran test script `test_saved_cards_rls.cjs`:
- ✅ All cards properly linked to their owners
- ✅ No orphaned cards
- ✅ RLS policies working correctly

Current saved cards:
1. Vikash Maheshwari (pharmacy) - Mastercard ****8785
2. Minesh Patel (pharmacy) - Visa ****7458
3. Priyanko (admin) - Mastercard ****9157

## How to Delete Admin's Card

### Option 1: SQL (Supabase Dashboard)
```sql
DELETE FROM saved_payment_methods 
WHERE profile_id = '9714768c-1e84-40d5-8d44-aa22c3e9e813'
AND id = '3a713e2e-f1f2-4770-81a2-0e9d2da76382';
```

### Option 2: UI
1. Login as admin (priyanko@admin.com)
2. Go to Payment Methods page
3. Click delete on the card

## Testing Checklist

- [ ] Admin creates order for Customer A → Shows Customer A's cards
- [ ] Admin creates order for Customer B → Shows Customer B's cards
- [ ] Admin saves card for Customer A → Card saves to Customer A
- [ ] Customer A logs in → Sees only their own cards
- [ ] Customer B logs in → Sees only their own cards
- [ ] Admin logs in → Sees only admin's cards (if any)

## Files Modified
- `src/components/CreateOrderPayment.tsx` (3 changes)

## No Database Changes Required
- RLS policies are already correct
- Table structure is correct
- Only frontend logic was fixed
