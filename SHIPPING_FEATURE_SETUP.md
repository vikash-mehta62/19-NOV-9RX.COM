# Automatic Shipping Charges - Setup Guide

## Feature Overview
Orders below a specified amount automatically include shipping charges. Admins can override with documented reason.

## Setup Steps

### 1. Run Database Migration
```bash
supabase db push
```

This will add:
- `auto_shipping_charge_enabled` (boolean)
- `auto_shipping_charge_threshold` (numeric)
- `auto_shipping_charge_amount` (numeric)
- `shipping_override_reason` (text) to orders table

### 2. Configure Settings (Admin Panel)
1. Go to Admin → Settings → Shipping Settings
2. Scroll to "Automatic Shipping Charges" section
3. Enable the toggle
4. Set Threshold (e.g., $200)
5. Set Charge Amount (e.g., $12)
6. Save settings

### 3. Test the Feature

#### Test Case 1: Order Below Threshold
- Create order with subtotal < threshold (e.g., $150)
- Expected: Shipping = $12 (auto charge amount)
- Check browser console for debug logs

#### Test Case 2: Order Above Threshold
- Create order with subtotal > threshold (e.g., $250)
- Expected: Shipping = product shipping cost or $0

#### Test Case 3: Override Shipping
- On Review step, toggle "Override Shipping Charge"
- Set custom amount
- Enter reason (required)
- Complete order
- Verify reason saved in database

### 4. Debug Checklist

If shipping not showing:

1. **Check Settings Fetch**
   - Open browser console
   - Look for "=== SHIPPING CALCULATION DEBUG ==="
   - Verify "Shipping Settings" object has correct values

2. **Check Auto Charge Condition**
   - Verify `auto_shipping_charge_enabled: true`
   - Verify `auto_shipping_charge_threshold` > 0
   - Verify subtotal < threshold

3. **Check Free Shipping**
   - Verify customer doesn't have free shipping enabled
   - Check sessionStorage: `shipping` should be "false"

4. **Check Cart Items**
   - Verify cart has items
   - Check if items have `shipping_cost` property

### 5. Common Issues

**Issue: Shipping shows $0.00**
- Settings not fetched (check console)
- Auto charge disabled
- Customer has free shipping
- Subtotal >= threshold

**Issue: Double shipping charges**
- This shouldn't happen - auto charge REPLACES product shipping
- Check if default_shipping_rate is being added somewhere

**Issue: Override not working**
- Check if on Review step (step 4 for admin, step 2 for pharmacy)
- Verify reason field is filled
- Check console for errors

### 6. Database Verification

Check if settings exist:
```sql
SELECT 
  auto_shipping_charge_enabled,
  auto_shipping_charge_threshold,
  auto_shipping_charge_amount
FROM settings
LIMIT 1;
```

Check order with override:
```sql
SELECT 
  order_number,
  shipping_cost,
  shipping_override_reason
FROM orders
WHERE shipping_override_reason IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

## How It Works

### Calculation Priority
1. **Override** - If admin manually overrides, use that amount
2. **Free Shipping** - If customer has free shipping, return $0
3. **Auto Charge** - If enabled AND subtotal < threshold, use auto charge amount
4. **Product Shipping** - Otherwise, use max shipping cost from cart items

### Code Flow
```
OrderCreationWizard
  ↓
  Fetch Settings (global, no profile_id filter)
  ↓
  Calculate Shipping (with settings)
  ↓
  Display in OrderSummaryCard
  ↓
  Show Override Section (Review step)
  ↓
  Save with shipping_override_reason
```

## Files Modified

1. `src/utils/orderCalculations.ts` - Shipping calculation logic
2. `src/components/settings/ShippingSettingsSection.tsx` - Settings UI
3. `src/components/settings/settingsTypes.ts` - Settings types
4. `src/components/orders/wizard/ShippingOverrideSection.tsx` - Override UI
5. `src/components/orders/wizard/OrderCreationWizard.tsx` - Integration
6. `src/pages/pharmacy/CreateOrder.tsx` - Save override reason
7. `src/pages/admin/CreateOrder.tsx` - Save override reason
8. `supabase/migrations/20260321000000_add_auto_shipping_charge_settings.sql` - DB schema

## Support

Check browser console for detailed debug logs showing:
- Settings values
- Subtotal amount
- Threshold comparison
- Final shipping amount
- Why specific amount was chosen
