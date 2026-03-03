# Pharmacy E2E Test Plan (Order to Payment)

## 1. Scope
This plan validates pharmacy-side flow end-to-end:
- `Products`
- `Create Order`
- `Wishlist`
- `My Orders`
- `Invoices`
- `Statements` (download/print)
- `Credit Balance`
- `Payment Methods`
- `Rewards`
- `Settings`

Primary objective: verify the full path from product selection -> order placement -> payment handling -> documents/history consistency.

## 2. Preconditions
1. Use test environment only (never production for card/ACH test tokens).
2. Run latest security/RLS migrations, especially:
   - `20260303001000_phase3_pharmacy_operations_restore.sql`
   - `20260303005500_phase3_order_activities_insert_rls_relax_hotfix.sql`
   - `20260303012000_phase3_saved_payment_methods_authenticated_access_hotfix.sql`
3. Confirm pharmacy test account exists and can log in.
4. Confirm at least 3 active products with stock:
   - Standard product
   - Product with size variants
   - Product with category/subcategory mapping
5. Confirm one admin test account exists for approval actions.

## 3. Test Data
Use fixed test users:
- `pharmacy_user_1` (regular pharmacy)
- `admin_user_1`

Use test payment data:
- Card: non-live test number accepted by your gateway sandbox.
- ACH: sandbox test account/routing.
- Credit: pharmacy with configured credit limit (example: `$1000`).

## 4. Execution Order
Run in this sequence to catch dependency issues:
1. Login + Session + Navigation
2. Product & Wishlist
3. Create Order (all payment methods)
4. Orders/Invoices/Statements consistency
5. Credit Balance
6. Rewards
7. Settings/Profile persistence
8. RLS isolation checks

## 5. Detailed Test Cases

## A. Auth + Navigation
1. Login as pharmacy user.
   - Expect: dashboard loads, no auth redirect loop.
2. Open each sidebar module once.
   - Expect: no blank page, no 403/401 in console/network.

## B. Products + Wishlist
1. Products list loads with category filters.
   - Expect: products visible, category/subcategory render correctly.
2. Add item to wishlist from product page.
   - Expect: success toast, item visible in Wishlist.
3. Remove wishlist item.
   - Expect: item removed, no RLS error.

## C. Create Order - Core
1. Add 2-3 products to cart (include one size-based item).
2. Open `Create Order`.
3. Fill shipping/billing + terms + confirmation.
4. Place order with each payment path:
   - `Card`
   - `ACH` (if enabled in UI)
   - `Credit Account`
5. Validate spinner behavior:
   - Expect: `Place Order` button spinner stays until all async processing completes.
   - Expect: no early success toast before completion.

## D. Payment Path Matrix
1. Card success
   - Expect: order created, payment transaction logged, order status/payment status updated.
2. Card fail (declined/invalid test case)
   - Expect: user-friendly error, no partial inconsistent order/payment rows.
3. ACH success
   - Expect: transaction created, status reflects ACH flow.
4. Credit success (within limit)
   - Expect: order accepted for credit flow, credit usage updates correctly.
5. Credit failure (exceeds limit)
   - Expect: blocked with clear message, no order mutation.

## E. Orders, Invoices, Statements
1. Verify new order appears in `My Orders`.
2. Open order detail.
   - Expect: items, totals, payment method, timeline/activity visible.
3. Verify invoice creation behavior:
   - Paid/zero-total order: invoice generated.
   - Credit processing order: expected invoice flow per business rule.
4. Open `Statements`, download PDF, print PDF.
   - Expect: download works, no `doc.autoTable` runtime error.

## F. Payment Methods
1. Add card in `Payment Methods`.
   - Expect: save success, row present in `saved_payment_methods`.
2. Set default payment method.
   - Expect: only one default method for profile.
3. Soft-delete method.
   - Expect: removed from active list, no RLS error.

## G. Credit Balance
1. Open `Credit Balance`.
   - Expect: credit line, utilization, invoices, and history load.
2. Pay credit (test payment).
   - Expect: transaction recorded; balances update consistently.

## H. Rewards
1. Load rewards page.
   - Expect: points/tier/redemption values load.
2. Place eligible non-credit order.
   - Expect: points earned transaction recorded once.
3. Redeem points/reward on next order.
   - Expect: discount applied, redemption status moves correctly.

## I. Settings
1. Update profile/settings fields.
   - Expect: persist after refresh and relogin.

## 6. DB Verification Queries (Run after each major flow)
Use with test pharmacy `profile_id` and `order_id`:

```sql
-- Orders
select id, order_number, profile_id, status, payment_status, total_amount, created_at
from public.orders
where profile_id = '<pharmacy_profile_id>'
order by created_at desc
limit 20;

-- Order items
select order_id, product_id, quantity, created_at
from public.order_items
where order_id = '<order_id>';

-- Activities
select order_id, activity_type, performed_by, created_at
from public.order_activities
where order_id = '<order_id>'
order by created_at asc;

-- Payment methods
select id, profile_id, method_type, is_default, is_active, created_at
from public.saved_payment_methods
where profile_id = '<pharmacy_profile_id>'
order by created_at desc;

-- Payment transactions
select id, profile_id, order_id, transaction_type, amount, status, created_at
from public.payment_transactions
where profile_id = '<pharmacy_profile_id>'
order by created_at desc
limit 20;

-- Rewards
select user_id, transaction_type, points, reference_id, created_at
from public.reward_transactions
where user_id = '<pharmacy_profile_id>'
order by created_at desc
limit 20;
```

## 7. RLS Security Checks
1. As `pharmacy_user_1`, attempt reading another pharmacy's payment methods/order rows via UI/API.
   - Expect: denied/no rows.
2. As `pharmacy_user_1`, insert `saved_payment_methods` with `profile_id` of another user.
   - Expect: blocked by RLS.
3. As admin, verify visibility across users where expected.

## 8. Exit Criteria
Release candidate is acceptable when all are true:
1. 0 Critical / 0 High defects open.
2. 100% pass for Create Order + Payment matrix.
3. 100% pass for Statements PDF download/print.
4. No RLS 403 errors in pharmacy happy-path flows.
5. DB consistency checks pass for each tested order.

## 9. Scorecard (100)
- Auth & Navigation: 10
- Products & Wishlist: 10
- Create Order Core: 20
- Payment Matrix (Card/ACH/Credit): 20
- Orders/Invoices/Statements: 15
- Payment Methods: 10
- Credit Balance: 10
- Rewards: 5

Final status:
- `90-100`: Pass
- `75-89`: Conditional pass (fixes required)
- `<75`: Fail

