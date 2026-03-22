# Settings Types - Per-Profile vs Global

## Overview

System mein do tarah ki settings hain:

### 1. Per-Profile Settings (User-Specific) ✅
Har user ki apni alag settings - **CORRECT**

### 2. Global Settings (Organization-Wide) 🔧
Sabke liye ek hi settings - **NEEDS FIX**

---

## Per-Profile Settings (Keep As-Is)

### Payment Credentials
```typescript
// ✅ CORRECT - Har admin ke apne payment gateway credentials
.eq("profile_id", user.id)
```

**Tables:**
- `payment_settings` - Authorize.Net, FortisPay credentials
- `saved_payment_methods` - User's saved cards/ACH

**Why Per-Profile?**
- Admin A ka Authorize.Net account alag
- Admin B ka FortisPay account alag
- Security - credentials isolated

### User Data
```typescript
// ✅ CORRECT - User-specific data
.eq("profile_id", user.id)
```

**Tables:**
- `orders` - User's orders
- `locations` - Pharmacy's locations
- `invoices` - User's invoices
- `payment_transactions` - User's transactions
- `order_statements` - User's statements

**Why Per-Profile?**
- Har user ka apna data
- Privacy and security
- Role-based access

---

## Global Settings (Need Fix)

### Shipping Configuration
```typescript
// ❌ WRONG - Currently per-profile
.eq("profile_id", user.id)

// ✅ CORRECT - Should be global
.order("created_at", { ascending: true }).limit(1)
```

**Fields in `settings` table:**
- `auto_shipping_charge_enabled`
- `auto_shipping_charge_threshold`
- `auto_shipping_charge_amount`
- `default_shipping_rate`
- `free_shipping_threshold`
- `handling_fee`

**Why Global?**
- Consistent shipping rules across organization
- Admin A sets $200 threshold
- Pharmacy B follows same rule
- No confusion

### Tax Configuration
```typescript
// Should be global
.order("created_at", { ascending: true }).limit(1)
```

**Fields:**
- `tax_enabled`
- `default_tax_rate`
- `tax_label`
- `tax_included_in_price`

**Why Global?**
- Tax rules same for entire organization
- Compliance - consistent tax calculation

### Order Configuration
```typescript
// Should be global
.order("created_at", { ascending: true }).limit(1)
```

**Fields:**
- `minimum_order_amount`
- `order_number_prefix`
- `next_order_number`
- `auto_confirm_orders`

**Why Global?**
- Order numbering should be sequential
- Minimum order amount consistent

### Business Information
```typescript
// Should be global
.order("created_at", { ascending: true }).limit(1)
```

**Fields:**
- `business_name`
- `address`, `city`, `state`, `zip_code`
- `phone`, `email`
- `logo`

**Why Global?**
- One organization, one business info
- Shows on invoices, emails

### Invoice Configuration
```typescript
// Should be global
.order("created_at", { ascending: true }).limit(1)
```

**Fields:**
- `invoice_prefix`
- `next_invoice_number`
- `invoice_header_text`
- `invoice_footer_text`
- `invoice_terms_and_conditions`

**Why Global?**
- Invoice numbering sequential
- Consistent branding

---

## Files That Need Update

### 1. Payment Config (`src/config/paymentConfig.ts`)

**Current (Line 51):**
```typescript
.eq("profile_id", user.id)  // ❌ Wrong for general settings
```

**Should Be:**
```typescript
// Payment credentials - Keep per-profile ✅
.eq("profile_id", user.id)

// Card processing fee settings - Make global 🔧
.order("created_at", { ascending: true }).limit(1)
```

**Fix:**
```typescript
// Line 149 - fetchPaymentExperienceRow
async function fetchPaymentExperienceRow(): Promise<PaymentExperienceSettingsRow | null> {
  const { data, error } = await supabase
    .from("settings")
    .select(
      "card_processing_fee_enabled, card_processing_fee_percentage, card_processing_fee_pass_to_customer, invoice_notes"
    )
    .order("created_at", { ascending: true })  // Global settings
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PaymentExperienceSettingsRow;
}
```

### 2. Settings Page (`src/pages/admin/Settings.tsx`)

**Status:** ✅ Already Fixed
- Fetch: Uses global settings
- Update: Updates global settings

### 3. Order Creation (`src/components/orders/wizard/OrderCreationWizard.tsx`)

**Status:** ✅ Already Fixed
- Fetches global shipping settings

---

## Implementation Strategy

### Phase 1: Identify Settings Type ✅
- [x] Per-Profile: Payment credentials, user data
- [x] Global: Shipping, tax, order config, business info

### Phase 2: Fix Global Settings Fetch
- [x] Settings Page - Fetch global
- [x] Order Creation - Fetch global shipping
- [ ] Payment Config - Fix card fee settings fetch
- [ ] Invoice Generation - Use global invoice settings
- [ ] Email Templates - Use global business info

### Phase 3: Fix Global Settings Update
- [x] Settings Page - Update global
- [ ] Ensure all updates go to same record

---

## Testing Checklist

### Per-Profile Settings (Should Work)
- [ ] Admin A saves Authorize.Net credentials
- [ ] Admin B saves FortisPay credentials
- [ ] Both can process payments independently
- [ ] Orders filtered by profile_id correctly

### Global Settings (Should Work After Fix)
- [ ] Admin A sets shipping threshold = $200
- [ ] Admin B sees threshold = $200
- [ ] Admin B changes to $250
- [ ] Admin A sees threshold = $250
- [ ] Pharmacy order uses threshold = $250

---

## Database Query Patterns

### Per-Profile Query
```typescript
const { data } = await supabase
  .from("payment_settings")
  .select("*")
  .eq("profile_id", user.id)  // User-specific
  .maybeSingle();
```

### Global Query
```typescript
const { data } = await supabase
  .from("settings")
  .select("*")
  .order("created_at", { ascending: true })  // First = global
  .limit(1)
  .maybeSingle();
```

---

## Summary

### Keep Per-Profile:
✅ Payment credentials (payment_settings)
✅ User orders (orders)
✅ User locations (locations)
✅ User transactions (payment_transactions)
✅ User invoices (invoices)

### Make Global:
🔧 Shipping settings (settings table)
🔧 Tax settings (settings table)
🔧 Order configuration (settings table)
🔧 Business information (settings table)
🔧 Invoice configuration (settings table)
🔧 Card processing fee settings (settings table)

### Files to Update:
1. ✅ `src/pages/admin/Settings.tsx` - Done
2. ✅ `src/components/orders/wizard/OrderCreationWizard.tsx` - Done
3. 🔧 `src/config/paymentConfig.ts` - Needs fix for card fee settings
4. 🔧 Invoice generation files - Need to use global settings
5. 🔧 Email templates - Need to use global business info

**Key Principle:** 
- **Credentials & User Data** = Per-Profile
- **Business Rules & Configuration** = Global

🎯
