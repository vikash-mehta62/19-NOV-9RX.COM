# Shipping Logic Test Cases - Production Ready ✅

## Test Case 1: Profile Free Shipping (Threshold Not Met) → Custom Rate
```javascript
Profile Settings:
  free_shipping_enabled: true
  free_shipping_threshold: 100
  custom_shipping_rate: 5

Cart: $80
Expected: $5 (custom rate applies)
✅ PASS - Free shipping condition not met, fallback to custom rate
```

## Test Case 2: Profile Free Shipping (Threshold = 0) → Always Free
```javascript
Profile Settings:
  free_shipping_enabled: true
  free_shipping_threshold: 0

Cart: $50
Expected: $0 (always free)
✅ PASS - Threshold 0 means always free when enabled
```

## Test Case 3: Profile Free Shipping (Threshold Met)
```javascript
Profile Settings:
  free_shipping_enabled: true
  free_shipping_threshold: 100

Cart: $150
Expected: $0 (free shipping)
✅ PASS - Threshold met, free shipping applied
```

## Test Case 4: Profile Custom Rate Only
```javascript
Profile Settings:
  free_shipping_enabled: false
  custom_shipping_rate: 10

Cart: $200
Expected: $10 (custom rate)
✅ PASS - No free shipping, custom rate applies
```

## Test Case 5: Profile Auto Shipping
```javascript
Profile Settings:
  auto_shipping_enabled: true
  auto_shipping_threshold: 150
  auto_shipping_amount: 10

Cart: $80
Expected: $10 (auto shipping charge)
✅ PASS - Below threshold, auto charge applies
```

## Test Case 6: No Profile Settings → Global Fallback
```javascript
Profile Settings: null

Global Settings:
  free_shipping_enabled: true
  free_shipping_threshold: 200

Cart: $250
Expected: $0 (global free shipping)
✅ PASS - Profile settings absent, global rules apply
```

## Test Case 7: Complex Scenario
```javascript
Profile Settings:
  free_shipping_enabled: true
  free_shipping_threshold: 100
  custom_shipping_rate: 5
  auto_shipping_enabled: true
  auto_shipping_threshold: 50
  auto_shipping_amount: 8

Cart: $80
Expected: $5 (custom rate)
Reason: Free shipping not met (80 < 100), custom rate takes priority over auto shipping
✅ PASS - Correct priority order maintained
```

## Test Case 8: Edge Case - All Disabled
```javascript
Profile Settings:
  free_shipping_enabled: false
  custom_shipping_rate: null
  auto_shipping_enabled: false

Global Settings:
  free_shipping_enabled: false
  auto_shipping_charge_enabled: false
  default_shipping_rate: 30

Cart: $100
Expected: $30 (default rate)
✅ PASS - Falls back to default shipping rate
```

## Priority Order Summary (Production-Safe)

1. **Profile Free Shipping** - Only if enabled AND threshold met
2. **Profile Custom Rate** - Fallback if free shipping not applied
3. **Profile Auto Shipping** - Only if enabled AND below threshold
4. **Global Free Shipping** - Only if enabled AND threshold met
5. **Global Auto Shipping** - Only if enabled AND below threshold
6. **Default Shipping Rate** - Global fallback
7. **Product Shipping Cost** - Final fallback

## Edge Cases Handled ✅

- ✅ NULL vs 0 distinction
- ✅ Threshold = 0 (always free when enabled)
- ✅ Custom rate overrides auto shipping
- ✅ Profile settings override global settings
- ✅ Proper fallback chain
- ✅ Handling fee applied correctly
- ✅ Empty cart returns $0

## Migration Columns Added

```sql
profiles table:
- free_shipping_enabled (boolean, default: false)
- free_shipping_threshold (numeric, default: 0)
- custom_shipping_rate (numeric, nullable)
- auto_shipping_enabled (boolean, default: false)
- auto_shipping_threshold (numeric, default: 0)
- auto_shipping_amount (numeric, default: 0)
```

## Production Ready Checklist

- ✅ Correct priority order
- ✅ No logical conflicts
- ✅ Edge cases handled
- ✅ Backward compatible (legacy flag supported)
- ✅ Clear console logging for debugging
- ✅ Proper null/undefined checks
- ✅ Handling fee applied consistently
- ✅ Type-safe numeric conversions
