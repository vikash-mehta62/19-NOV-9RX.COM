# Test Shipping Scenarios - Debug Guide

## Current Settings (From Screenshot)
- Default Shipping Rate: $20
- Handling Fee: $5
- Free Shipping: ✅ Enabled, Threshold: $300
- Auto Shipping Charges: ✅ Enabled, Threshold: $200, Amount: $10

## Test Scenarios

### Scenario 1: Customer Free Shipping
**Setup:**
- Select customer with `freeShipping = true`
- Add any products

**Expected Result:**
- Shipping: $0
- Console Log: "✅ Priority 1: Customer free shipping or no items → $0"

**If Wrong:**
- Check customer profile in database
- Verify `freeShipping` field is true
- Check sessionStorage: `sessionStorage.getItem("shipping")` should be "true"

---

### Scenario 2: Free Shipping Threshold Met
**Setup:**
- Select customer with `freeShipping = false`
- Add products: Subtotal = $350 (above $300)

**Expected Result:**
- Shipping: $0
- Console Log: "✅ Priority 2: Free shipping threshold met! Subtotal $350 >= Threshold $300 → $0"

**If Wrong:**
- Check if `free_shipping_enabled = true` in database
- Check if `free_shipping_threshold = 300` in database
- Verify subtotal calculation is correct

---

### Scenario 3: Auto Charge Applies
**Setup:**
- Select customer with `freeShipping = false`
- Add products: Subtotal = $150 (below $200)

**Expected Result:**
- Shipping: $15 ($10 auto charge + $5 handling)
- Console Log: "✅ Priority 3: Auto charge applies! Subtotal $150 < Threshold $200"
- Console Log: "Base charge: $10, Handling: $5, Total: $15"

**If Wrong:**
- Check if `auto_shipping_charge_enabled = true` in database
- Check if `auto_shipping_charge_threshold = 200` in database
- Check if `auto_shipping_charge_amount = 10` in database
- Check if `handling_fee = 5` in database

---

### Scenario 4: Default Shipping Rate
**Setup:**
- Select customer with `freeShipping = false`
- Add products: Subtotal = $250 (between $200 and $300)

**Expected Result:**
- Shipping: $25 ($20 default rate + $5 handling)
- Console Log: "✅ Priority 4: Default shipping rate: $20, Handling: $5, Total: $25"

**If Wrong:**
- Check if `default_shipping_rate = 20` in database
- Check if `handling_fee = 5` in database
- Verify subtotal is between thresholds

---

### Scenario 5: Product Shipping
**Setup:**
- Disable all shipping features in settings:
  - Free Shipping: ❌ Disabled
  - Auto Charge: ❌ Disabled
  - Default Rate: 0
- Select customer with `freeShipping = false`
- Add products with shipping_cost (e.g., Product A: $8, Product B: $12)

**Expected Result:**
- Shipping: $17 ($12 max product shipping + $5 handling)
- Console Log: "✅ Priority 5: Product shipping cost: $12, Handling: $5, Total: $17"

**If Wrong:**
- Check product `shipping_cost` field in database
- Verify handling fee is being added

---

## How to Debug

### Step 1: Open Browser Console
Press F12 or Right-click → Inspect → Console tab

### Step 2: Create Order
Go through order creation wizard

### Step 3: Check Console Logs
Look for these logs:

```
=== SHIPPING CALCULATION START ===
Cart items: 1
Customer free shipping: false
Subtotal: 239.97
Settings: {
  auto_shipping_charge_enabled: true,
  auto_shipping_charge_threshold: 200,
  auto_shipping_charge_amount: 10,
  free_shipping_enabled: true,
  free_shipping_threshold: 300,
  default_shipping_rate: 20,
  handling_fee: 5
}
```

### Step 4: Identify Which Priority Applied
Look for the ✅ log:
- Priority 1: Customer free shipping
- Priority 2: Free shipping threshold
- Priority 3: Auto charge
- Priority 4: Default rate
- Priority 5: Product shipping

### Step 5: Verify Result
Check if the shipping amount matches the expected result

---

## Common Issues

### Issue 1: Shipping Always $0
**Possible Causes:**
1. Customer has `freeShipping = true` (check profile)
2. Subtotal >= free shipping threshold
3. Settings not fetched (check console for "No shipping settings found")

**Solution:**
- Check customer profile
- Verify subtotal amount
- Check if migration was applied

---

### Issue 2: Wrong Shipping Amount
**Possible Causes:**
1. Settings not fetched correctly
2. Handling fee not added
3. Wrong priority applied

**Solution:**
- Check console logs for settings object
- Verify all 7 fields are present
- Check which priority log appears

---

### Issue 3: Settings Not Loading
**Possible Causes:**
1. Migration not applied
2. No global settings record in database
3. `is_global` column doesn't exist

**Solution:**
Run this query in Supabase SQL Editor:
```sql
SELECT 
  is_global,
  auto_shipping_charge_enabled,
  auto_shipping_charge_threshold,
  auto_shipping_charge_amount,
  free_shipping_enabled,
  free_shipping_threshold,
  default_shipping_rate,
  handling_fee
FROM settings 
WHERE is_global = true;
```

Should return 1 row with all values.

---

### Issue 4: Handling Fee Not Added
**Possible Causes:**
1. Handling fee = 0 in database
2. Free shipping applied (handling fee not added to free shipping)

**Solution:**
- Check `handling_fee` value in database
- Verify it's not a free shipping scenario

---

## Database Verification Queries

### Check Global Settings
```sql
SELECT * FROM settings WHERE is_global = true;
```

### Check Customer Free Shipping
```sql
SELECT id, first_name, last_name, "freeShipping" 
FROM profiles 
WHERE id = 'CUSTOMER_ID';
```

### Check Product Shipping Costs
```sql
SELECT id, name, shipping_cost 
FROM products 
WHERE id IN ('PRODUCT_ID_1', 'PRODUCT_ID_2');
```

---

## Quick Fix Checklist

- [ ] Migration applied? (`is_global` column exists)
- [ ] Global settings record exists? (1 row with `is_global = true`)
- [ ] All 7 shipping fields have values?
- [ ] Customer profile checked? (`freeShipping` field)
- [ ] Console logs visible? (F12 → Console)
- [ ] Correct priority applied? (Check ✅ log)
- [ ] Handling fee added correctly? (Only to paid shipping)

---

**Bhai, ye document use karke step-by-step debug karo. Console logs sabse important hain!** 🔍
