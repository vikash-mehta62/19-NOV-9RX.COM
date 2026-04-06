# Testing Group Pricing + Offer Fix

## Manual Testing Steps

### Setup
1. Login as a user who has group pricing (e.g., Testing Product Name 02 user)
2. Make sure "Testing Product Name 02" has group pricing applied

### Test 1: Product Showcase Page
**Expected:** Products with group pricing should NOT show offer badges

1. Navigate to product listing page
2. Find "Testing Product Name 02"
3. ✅ Check: No "10% OFF" badge should appear
4. ✅ Check: Console should show: `⚠️ Skipping offers for "Testing Product Name 02" - has group pricing`

### Test 2: Product Details Page
**Expected:** Product details should NOT show offer information

1. Click on "Testing Product Name 02"
2. ✅ Check: No offer badge at top
3. ✅ Check: No "🎁 Offer: X% off" message
4. ✅ Check: Console should show: `⚠️ Skipping offers - product has group pricing applied`
5. ✅ Check: Group pricing discount should still be visible

### Test 3: Cart - Promo Code Application
**Expected:** Promo code should be rejected with clear message

1. Add "Testing Product Name 02" to cart
2. Go to checkout/cart
3. Try to apply promo code (e.g., "WELCOME10")
4. ✅ Check: Error message appears: "Promo codes cannot be applied to products with group pricing. You're already getting a special discount!"
5. ✅ Check: Promo code is NOT applied
6. ✅ Check: Total remains same (only group pricing discount)

### Test 4: Cart - Direct Offer Application
**Expected:** Offer should be rejected with toast notification

1. Keep "Testing Product Name 02" in cart
2. Expand "Available Offers" section
3. Try to click "Apply" on any offer
4. ✅ Check: Toast notification appears: "Cannot Apply Offer - Offers cannot be applied to products with group pricing..."
5. ✅ Check: Offer is NOT applied
6. ✅ Check: Total remains same

### Test 5: Mixed Cart (Group Pricing + Regular Product)
**Expected:** Promo codes should be rejected if ANY item has group pricing

1. Add "Testing Product Name 02" (with group pricing) to cart
2. Add another product WITHOUT group pricing to cart
3. Try to apply promo code
4. ✅ Check: Promo code is rejected
5. ✅ Check: Error message explains group pricing conflict

### Test 6: Regular Product (No Group Pricing)
**Expected:** Offers should work normally

1. Remove all items from cart
2. Add a product WITHOUT group pricing
3. Try to apply promo code
4. ✅ Check: Promo code applies successfully
5. ✅ Check: Discount is calculated correctly
6. ✅ Check: Total is reduced by discount amount

### Test 7: Console Logs Verification
**Expected:** Clear logging for debugging

1. Open browser console (F12)
2. Navigate through product pages
3. ✅ Check: Group pricing detection logs appear
4. ✅ Check: Offer skip messages are clear
5. ✅ Check: No errors in console

---

## Automated Test Cases (Future)

```typescript
describe('Group Pricing + Offer Prevention', () => {
  test('should not show offers on products with group pricing', async () => {
    const product = await fetchProductWithGroupPricing();
    expect(product.hasOffer).toBe(false);
    expect(product.offerBadge).toBeNull();
  });

  test('should reject promo code when cart has group pricing products', async () => {
    const cartItems = [{ productId: 'group-pricing-product', price: 33.16 }];
    const result = await validatePromoCode('WELCOME10', 33.16, cartItems, userId);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('group pricing');
  });

  test('should allow promo code when no group pricing products', async () => {
    const cartItems = [{ productId: 'regular-product', price: 50.00 }];
    const result = await validatePromoCode('WELCOME10', 50.00, cartItems, userId);
    expect(result.valid).toBe(true);
  });
});
```

---

## Database Verification

### Check Group Pricing Table
```sql
-- Verify active group pricing rules
SELECT 
  id,
  name,
  status,
  group_ids,
  product_arrayjson
FROM group_pricing
WHERE status = 'active';
```

### Check User Group Membership
```sql
-- Check if user is in any group
SELECT 
  gp.name as group_name,
  gp.group_ids,
  gp.product_arrayjson
FROM group_pricing gp
WHERE 'USER_ID_HERE' = ANY(gp.group_ids)
  AND gp.status = 'active';
```

### Check Product Sizes with Group Pricing
```sql
-- Check which products have group pricing
SELECT 
  p.id,
  p.name,
  ps.id as size_id,
  ps.size_name,
  ps.price as original_price,
  gp.product_arrayjson
FROM products p
JOIN product_sizes ps ON ps.product_id = p.id
JOIN group_pricing gp ON gp.status = 'active'
WHERE EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(gp.product_arrayjson) as item
  WHERE (item->>'product_id')::uuid = ps.id
);
```

---

## Edge Cases to Test

1. **User not in any group**
   - ✅ Offers should work normally
   - ✅ Promo codes should work normally

2. **Product has group pricing but user not in that group**
   - ✅ Offers should work normally for that user
   - ✅ Promo codes should work normally

3. **Group pricing rule is inactive**
   - ✅ Offers should work normally
   - ✅ Promo codes should work normally

4. **Product has multiple sizes, only some with group pricing**
   - ✅ If ANY size has group pricing, block offers
   - ✅ Consistent behavior across all sizes

5. **User switches between accounts**
   - ✅ Group pricing check should use current user ID
   - ✅ Offers should update based on new user's group membership

---

## Performance Checks

1. **Database Query Count**
   - ✅ Only 1 query to `group_pricing` table per validation
   - ✅ No N+1 query problems

2. **Response Time**
   - ✅ Promo validation should complete in < 500ms
   - ✅ Product listing should not slow down

3. **Caching**
   - 🔄 Future: Cache group pricing data in Redux
   - 🔄 Future: Invalidate cache when group pricing changes

---

## Rollback Plan

If issues occur:

1. **Revert ProductShowcase.tsx**
   ```bash
   git checkout HEAD~1 src/components/pharmacy/ProductShowcase.tsx
   ```

2. **Revert promoCodeService.ts**
   ```bash
   git checkout HEAD~1 src/services/promoCodeService.ts
   ```

3. **Revert PromoAndRewardsSection.tsx**
   ```bash
   git checkout HEAD~1 src/components/orders/wizard/PromoAndRewardsSection.tsx
   ```

4. **Revert ProductDetails.tsx**
   ```bash
   git checkout HEAD~1 src/pages/ProductDetails.tsx
   ```

---

## Success Criteria

✅ All manual tests pass  
✅ No console errors  
✅ Clear user feedback messages  
✅ Group pricing still works correctly  
✅ Regular offers still work on non-group-pricing products  
✅ Performance is acceptable (< 500ms validation)  
✅ Code is maintainable and well-documented  

---

**Test Date:** April 6, 2026  
**Tester:** [Your Name]  
**Status:** 🟡 PENDING TESTING
