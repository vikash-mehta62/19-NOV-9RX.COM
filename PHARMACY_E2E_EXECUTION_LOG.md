# Pharmacy E2E Execution Log

Date: 2026-03-02  
Environment: Local (`localhost:3000`) + Supabase project configured in app

## Step 1: Automated Smoke
- `npm run build`: PASS
- `npm run test:run`: PARTIAL
  - Passed: `validation.test.ts`, `PharmacyFilterSidebar.test.ts`
  - Failed: `useWizardState.test.ts` (6 assertions; test expectations lag behind current wizard behavior)

## Step 2: Core Dependency Mapping (Pharmacy Flow)
Tables used by core pharmacy E2E path:
- `orders`
- `invoices`
- `order_activities`
- `saved_payment_methods`
- `payment_transactions`
- `account_transactions`
- `reward_transactions`
- `reward_redemptions`
- `rewards_config`
- `reward_tiers`
- `offers`
- `profiles`
- `centerize_data`

RPCs used:
- `generate_invoice_number`

Status:
- Migration coverage added for known RLS gaps (`order_activities`, `saved_payment_methods`, `payment_transactions`).
- Statement PDF runtime issue fixed (`jspdf-autotable` integration).

## Step 3: Manual E2E - Batch 1 (Run Now)

### 3.1 Products + Wishlist
1. Login as pharmacy user.
2. Open `Products` page:
   - Verify products load.
   - Verify category filter works.
3. Add 1 product to wishlist.
4. Open `Wishlist` page and confirm item appears.
5. Remove wishlist item and confirm removal.

Expected result: No 401/403/RLS errors in network tab.

### 3.2 Create Order (No Payment Path)
1. Add 1 product to cart.
2. Open `Create Order`.
3. Fill shipping/billing/confirmations.
4. Choose `Credit Account` or no-payment path.
5. Click `Place Order`.

Expected result:
- Button shows spinner until all processing is complete.
- No early success toast before completion.
- Redirect to orders list (or success terminal state).
- New order visible in `My Orders`.

### 3.3 Quick DB Checks (after order)
```sql
select id, order_number, profile_id, status, payment_status, total_amount, created_at
from public.orders
where profile_id = '<pharmacy_profile_id>'
order by created_at desc
limit 5;

select order_id, activity_type, performed_by, created_at
from public.order_activities
where order_id = '<new_order_id>'
order by created_at asc;
```

Expected:
- `orders` row exists.
- `order_activities` has at least one creation/update entry.

## Batch 1 Result
- Products: PENDING
- Wishlist add/remove: PENDING
- Create Order no-payment: PENDING
- Orders visibility: PENDING
- order_activities insert: PENDING

## Next Batch (after Batch 1 pass)
- Payment methods add/set-default/delete
- Card payment test
- ACH payment test
- Credit balance + statement download/print
- Rewards earn/redeem regression

## Step 3: Current Automated Findings (2026-03-02)

### 3.1 Build and unit baseline
- `npm run build`: PASS
- `npm run test:run`: PARTIAL
  - Passing suites: `validation.test.ts`, `PharmacyFilterSidebar.test.ts`
  - Failing suite: `useWizardState.test.ts` (6 failures; expectations mismatch vs current step-lock behavior)

### 3.2 Supabase anon/runtime probe
- Runtime anon access currently limited to storefront tables only:
  - `products`, `product_sizes`, `category_configs`, `subcategory_configs`, `blogs`
- Probe output indicates non-allowlisted tables denied at anon runtime.

### 3.3 Supabase DB lint (linked project)
Blocking DB function issues found that can affect pharmacy flows:
- `public.validate_promo_code` references non-existent `orders.user_id` (should align with `orders.profile_id`).
- `public.generate_order_number` warning: control may reach end without return.
- `public.generate_purchase_order_number` warning: control may reach end without return.
- `public.generate_invoice_number` warning: control may reach end without return.

Additional non-pharmacy blockers exist in marketing/automation RPCs (`ab_tests`, `banner_*` relations missing), noted separately.

### 3.4 Pharmacy flow impact from current findings
- Promo/reward discount validation can fail due to broken `validate_promo_code`.
- Order/invoice number RPCs may intermittently fail or return null paths if code path hits no-return branch (front-end fallback exists but this is not ideal).

### 3.5 Payment path probe (non-UI)
- `node test-direct-payment.cjs`: PASS
  - Direct Authorize.Net sandbox transaction approved.
- `node test-payment-transaction.cjs` (original): FAIL with `E00027`
  - Root cause: test script used expired card date (`12/25`).
- `test-payment-transaction.cjs` patched to use dynamic future expiry.
- `node test-payment-transaction.cjs` (patched): PASS
  - Supabase `process-payment` edge function returned success and transaction id.

## Step 5: Fixes prepared in codebase (not auto-pushed to DB)
- Added migration: `supabase/migrations/20260303123000_phase3_pharmacy_rpc_function_fixes.sql`
  - Fixes `validate_promo_code` to use `orders.profile_id`.
  - Hardens `generate_order_number`, `generate_purchase_order_number`, `generate_invoice_number` to always return.
  - Re-grants execute to `authenticated` for these pharmacy-critical RPCs.
- Updated payment probe script:
  - `test-payment-transaction.cjs` now uses dynamic future expiry to avoid false-negative `E00027`.

## Step 6: Post-migration validation (2026-03-02)
- SQL migration run status:
  - `20260303123000_phase3_pharmacy_rpc_function_fixes.sql`: APPLIED
  - `20260303124500_phase3_invoice_number_type_hotfix.sql`: APPLIED
- RPC sanity probe (service role):
  - `generate_invoice_number`: PASS (`INV-2026001378`)
  - `generate_order_number`: PASS (`ORD001000`)
  - `generate_purchase_order_number`: PASS (`PO-ORD001001`)
  - `validate_promo_code` with invalid code: PASS (returns expected invalid response, no SQL error)
- Payment probe:
  - `test-payment-transaction.cjs`: PASS (edge function approved transaction)

### Remaining lint issues (non-pharmacy-critical for current flow)
- `get_ab_test_results` references missing `ab_tests`.
- `record_banner_impression` references missing `banner_impressions`.
- `check_order_status_automation` still references `orders.user_id`.
- `get_banner_analytics` references missing `banner_analytics`.
- `get_group_pharmacies` references `profiles.phone`.

## Step 4: Execution Status (manual UI still required)
- Products list + category filters: PENDING MANUAL
- Wishlist add/remove: PENDING MANUAL
- Create order (credit/no payment) with spinner behavior: PENDING MANUAL
- Create order (card + ACH): PENDING MANUAL
- Payment methods add/default/delete: PENDING MANUAL
- Statements download/print: PENDING MANUAL
- Rewards fetch/earn/redeem: PENDING MANUAL
