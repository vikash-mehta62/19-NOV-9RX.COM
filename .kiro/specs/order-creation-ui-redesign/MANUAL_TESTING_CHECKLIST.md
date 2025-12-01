# Order Creation Wizard - Manual Testing Checklist

Use this checklist to manually test the Order Creation Wizard. Check off each item as you complete it.

## Pre-Testing Setup

- [ ] Log in as an admin user
- [ ] Navigate to `/admin/orders`
- [ ] Ensure you have test customer data available
- [ ] Ensure you have test product data available
- [ ] Clear browser cache and cookies
- [ ] Test in incognito/private mode

## Test 1: Basic Order Creation Flow

### Step 1: Customer Selection
- [ ] Click "Create Order" button from orders list
- [ ] Verify wizard opens at Step 1
- [ ] Verify progress indicator shows Step 1 active
- [ ] Verify Order Summary card is visible
- [ ] Search for a customer
- [ ] Select a customer from the list
- [ ] Verify customer details appear
- [ ] Verify "Continue" button becomes enabled
- [ ] Click "Continue"

### Step 2: Address Information
- [ ] Verify navigation to Step 2
- [ ] Verify Step 1 is marked complete (green checkmark)
- [ ] Verify billing address fields are present
- [ ] Fill in billing address
- [ ] Verify shipping address fields are present
- [ ] Fill in shipping address
- [ ] Test "Same as billing" checkbox
- [ ] Verify "Continue" button becomes enabled
- [ ] Click "Continue"

### Step 3: Product Selection
- [ ] Verify navigation to Step 3
- [ ] Verify Step 2 is marked complete
- [ ] Search for a product
- [ ] Click "Add Item" on a product
- [ ] Verify size selection modal opens
- [ ] Select a size
- [ ] Adjust quantity using +/- buttons
- [ ] Click "Add to Cart"
- [ ] Verify product appears in cart
- [ ] Verify Order Summary updates with correct totals
- [ ] Add at least 2 more products
- [ ] Verify "Continue" button becomes enabled
- [ ] Click "Continue"

### Step 4: Review Order
- [ ] Verify navigation to Step 4
- [ ] Verify Step 3 is marked complete
- [ ] Verify customer information is displayed correctly
- [ ] Verify billing address is displayed correctly
- [ ] Verify shipping address is displayed correctly
- [ ] Verify all cart items are displayed
- [ ] Verify quantities and prices are correct
- [ ] Verify subtotal, tax, shipping, and total are correct
- [ ] Click "Edit" button on customer info
- [ ] Verify navigation back to Step 1
- [ ] Navigate forward to Step 4 again
- [ ] Click "Continue"

### Step 5: Payment & Confirmation
- [ ] Verify navigation to Step 5
- [ ] Verify Step 4 is marked complete
- [ ] Verify payment method cards are displayed
- [ ] Select "Credit Card" payment method
- [ ] Verify credit card fields appear
- [ ] Check "I accept the terms and conditions"
- [ ] Check "I confirm all order details are accurate"
- [ ] Verify "Place Order" button becomes enabled
- [ ] Click "Place Order"
- [ ] Verify loading state appears
- [ ] Verify success toast notification
- [ ] Verify navigation back to orders list
- [ ] Verify new order appears in the list

## Test 2: Validation Testing

### Step 1 Validation
- [ ] Navigate to Step 1
- [ ] Click "Continue" without selecting a customer
- [ ] Verify error message appears
- [ ] Verify toast notification shows
- [ ] Verify cannot proceed to Step 2

### Step 2 Validation
- [ ] Select a customer and proceed to Step 2
- [ ] Click "Continue" with empty billing address
- [ ] Verify error messages for required fields
- [ ] Fill billing address with invalid ZIP code (e.g., "abc")
- [ ] Verify ZIP code validation error
- [ ] Fill shipping address with invalid email
- [ ] Verify email validation error
- [ ] Correct all errors
- [ ] Verify can proceed to Step 3

### Step 3 Validation
- [ ] Proceed to Step 3 with empty cart
- [ ] Click "Continue"
- [ ] Verify error message about empty cart
- [ ] Add at least one product
- [ ] Verify can proceed to Step 4

### Step 5 Validation
- [ ] Proceed to Step 5
- [ ] Click "Place Order" without selecting payment method
- [ ] Verify error message
- [ ] Select payment method
- [ ] Click "Place Order" without checking confirmations
- [ ] Verify error messages for both checkboxes
- [ ] Check both confirmations
- [ ] Verify can place order

## Test 3: Navigation Testing

### Forward Navigation
- [ ] Start at Step 1
- [ ] Try clicking on Step 3 in progress indicator
- [ ] Verify cannot skip steps (toast notification)
- [ ] Complete Step 1 and proceed to Step 2
- [ ] Try clicking on Step 4 in progress indicator
- [ ] Verify cannot skip steps
- [ ] Complete all steps sequentially
- [ ] Verify all steps marked complete

### Backward Navigation
- [ ] Complete all steps to Step 5
- [ ] Click "Back" button
- [ ] Verify navigation to Step 4
- [ ] Verify data is preserved
- [ ] Click on Step 2 in progress indicator
- [ ] Verify navigation to Step 2
- [ ] Verify data is preserved
- [ ] Navigate forward to Step 5 again
- [ ] Verify all data still preserved

### Cancel Navigation
- [ ] Start creating an order
- [ ] Add some data (customer, address, products)
- [ ] Click "Cancel" button on Step 1
- [ ] Verify confirmation dialog appears
- [ ] Click "Cancel" in dialog
- [ ] Verify stays on wizard
- [ ] Click "Cancel" button again
- [ ] Click "OK" in confirmation dialog
- [ ] Verify navigation back to orders list

## Test 4: Data Persistence

### Between Steps
- [ ] Enter customer information in Step 1
- [ ] Proceed to Step 2
- [ ] Go back to Step 1
- [ ] Verify customer is still selected
- [ ] Proceed through all steps
- [ ] Go back to each step
- [ ] Verify all data is preserved

### Cart Management
- [ ] Add 3 products to cart
- [ ] Navigate to Step 4
- [ ] Go back to Step 3
- [ ] Verify all 3 products still in cart
- [ ] Remove 1 product
- [ ] Navigate to Step 4
- [ ] Verify Order Summary reflects removal
- [ ] Go back to Step 3
- [ ] Verify product is still removed

## Test 5: Order Summary Testing

### Real-time Updates
- [ ] Start at Step 3
- [ ] Note the subtotal in Order Summary
- [ ] Add a product
- [ ] Verify subtotal updates immediately
- [ ] Add another product
- [ ] Verify subtotal updates again
- [ ] Verify tax calculation updates
- [ ] Verify total updates correctly

### Calculations
- [ ] Add products with known prices
- [ ] Manually calculate expected subtotal
- [ ] Verify subtotal matches
- [ ] Manually calculate expected tax (8%)
- [ ] Verify tax matches
- [ ] Manually calculate expected total
- [ ] Verify total matches

### Edit Items Link
- [ ] Navigate to Step 4 or 5
- [ ] Click "Edit Items" in Order Summary
- [ ] Verify navigation to Step 3
- [ ] Modify cart
- [ ] Navigate forward
- [ ] Verify changes reflected

## Test 6: Responsive Design Testing

### Desktop (> 1024px)
- [ ] Open wizard on desktop browser
- [ ] Verify two-column layout
- [ ] Verify Order Summary on right side
- [ ] Verify horizontal progress indicator
- [ ] Verify all content is readable
- [ ] Verify no horizontal scrolling

### Tablet (768px - 1024px)
- [ ] Resize browser to tablet width
- [ ] Verify layout adjusts appropriately
- [ ] Verify Order Summary remains visible
- [ ] Verify progress indicator is readable
- [ ] Verify buttons are touch-friendly
- [ ] Verify no content overflow

### Mobile (< 768px)
- [ ] Resize browser to mobile width
- [ ] Verify single column layout
- [ ] Verify Order Summary moves to bottom
- [ ] Verify vertical progress indicator (if implemented)
- [ ] Verify all buttons are large enough
- [ ] Verify text is readable
- [ ] Verify no horizontal scrolling
- [ ] Test on actual mobile device

## Test 7: Accessibility Testing

### Keyboard Navigation
- [ ] Use only keyboard (no mouse)
- [ ] Tab through all form fields
- [ ] Verify logical tab order
- [ ] Press Enter to submit forms
- [ ] Press Escape to close modals
- [ ] Verify focus indicators are visible
- [ ] Complete entire order using only keyboard

### Screen Reader Testing
- [ ] Enable screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Navigate through wizard
- [ ] Verify all labels are read correctly
- [ ] Verify step changes are announced
- [ ] Verify error messages are announced
- [ ] Verify button purposes are clear
- [ ] Verify form fields have labels

### Visual Accessibility
- [ ] Enable high contrast mode
- [ ] Verify all content is visible
- [ ] Verify focus indicators are clear
- [ ] Verify color is not sole indicator
- [ ] Zoom to 200%
- [ ] Verify content is still usable
- [ ] Verify no text overlap

## Test 8: Error Handling Testing

### Network Errors
- [ ] Disable network connection
- [ ] Try to submit order
- [ ] Verify error message appears
- [ ] Verify user-friendly error text
- [ ] Re-enable network
- [ ] Verify can retry submission

### Session Expiration
- [ ] Start creating an order
- [ ] Clear session storage
- [ ] Try to proceed to next step
- [ ] Verify appropriate error handling
- [ ] Verify redirect to login (if applicable)

### Invalid Data
- [ ] Enter extremely long text in fields
- [ ] Verify field length limits
- [ ] Enter special characters
- [ ] Verify proper handling
- [ ] Enter SQL injection attempts
- [ ] Verify proper sanitization

## Test 9: Payment Method Testing

### Credit Card
- [ ] Select Credit Card payment method
- [ ] Verify credit card fields appear
- [ ] Verify card number field
- [ ] Verify expiry date field
- [ ] Verify CVV field
- [ ] Verify billing ZIP field

### ACH
- [ ] Select ACH payment method
- [ ] Verify ACH-specific fields appear
- [ ] Verify routing number field
- [ ] Verify account number field

### Net Terms
- [ ] Select Net Terms payment method
- [ ] Verify terms-specific fields appear
- [ ] Verify PO number field

### Invoice
- [ ] Select Invoice payment method
- [ ] Verify invoice-specific fields appear
- [ ] Verify special instructions field

## Test 10: Customer Type Testing

### Pharmacy Customer
- [ ] Select a Pharmacy customer
- [ ] Complete order creation
- [ ] Verify order is created correctly
- [ ] Verify customer type is preserved

### Group Customer
- [ ] Select a Group customer
- [ ] Complete order creation
- [ ] Verify order is created correctly
- [ ] Verify customer type is preserved

### Hospital Customer
- [ ] Select a Hospital customer
- [ ] Complete order creation
- [ ] Verify order is created correctly
- [ ] Verify customer type is preserved

## Test 11: Edge Cases

### Empty States
- [ ] Navigate to Step 3 with no products available
- [ ] Verify appropriate message
- [ ] Navigate to Step 1 with no customers
- [ ] Verify appropriate message

### Large Data Sets
- [ ] Add 20+ products to cart
- [ ] Verify performance is acceptable
- [ ] Verify scrolling works
- [ ] Verify totals calculate correctly

### Special Characters
- [ ] Enter customer name with special characters
- [ ] Enter address with special characters
- [ ] Enter special instructions with emojis
- [ ] Verify all data is saved correctly

### Concurrent Edits
- [ ] Start creating an order
- [ ] Open another tab
- [ ] Modify customer data in other tab
- [ ] Return to wizard
- [ ] Verify data consistency

## Test 12: Browser Compatibility

### Chrome
- [ ] Test complete flow in Chrome
- [ ] Verify all features work
- [ ] Verify animations are smooth
- [ ] Verify no console errors

### Firefox
- [ ] Test complete flow in Firefox
- [ ] Verify all features work
- [ ] Verify animations are smooth
- [ ] Verify no console errors

### Safari
- [ ] Test complete flow in Safari
- [ ] Verify all features work
- [ ] Verify animations are smooth
- [ ] Verify no console errors

### Edge
- [ ] Test complete flow in Edge
- [ ] Verify all features work
- [ ] Verify animations are smooth
- [ ] Verify no console errors

## Test 13: Performance Testing

### Load Time
- [ ] Measure initial wizard load time
- [ ] Verify loads in < 2 seconds
- [ ] Measure step transition time
- [ ] Verify transitions in < 300ms

### Responsiveness
- [ ] Click buttons rapidly
- [ ] Verify no double submissions
- [ ] Type quickly in form fields
- [ ] Verify no input lag
- [ ] Add many products quickly
- [ ] Verify cart updates smoothly

### Memory Usage
- [ ] Open browser dev tools
- [ ] Monitor memory usage
- [ ] Navigate through all steps multiple times
- [ ] Verify no memory leaks
- [ ] Verify memory usage is reasonable

## Test 14: Integration Testing

### Orders List Integration
- [ ] Create an order
- [ ] Verify it appears in orders list
- [ ] Verify order number is correct
- [ ] Verify order status is "new"
- [ ] Verify order total is correct

### Customer Data Integration
- [ ] Select a customer
- [ ] Verify customer data loads correctly
- [ ] Verify billing address pre-fills (if available)
- [ ] Verify customer type is correct

### Product Data Integration
- [ ] View products in Step 3
- [ ] Verify product images load
- [ ] Verify product prices are correct
- [ ] Verify product sizes are correct
- [ ] Verify product availability

## Test 15: Final Verification

### Complete Order Flow
- [ ] Create a complete order from start to finish
- [ ] Use realistic data
- [ ] Verify order is created in database
- [ ] Verify order can be viewed in orders list
- [ ] Verify order details are correct
- [ ] Verify order can be processed further

### Documentation
- [ ] Verify all features match requirements
- [ ] Verify all acceptance criteria are met
- [ ] Verify no undocumented features
- [ ] Verify no missing features

### Sign-off
- [ ] All tests passed
- [ ] No critical bugs found
- [ ] No major bugs found
- [ ] Minor bugs documented (if any)
- [ ] Ready for production

---

## Test Results Summary

**Date Tested:** _______________  
**Tested By:** _______________  
**Browser:** _______________  
**Device:** _______________  

**Total Tests:** 200+  
**Tests Passed:** _____  
**Tests Failed:** _____  
**Bugs Found:** _____  

**Overall Status:** [ ] PASS [ ] FAIL

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
