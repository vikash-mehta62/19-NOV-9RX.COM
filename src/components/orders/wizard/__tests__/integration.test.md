# Integration Test Plan for Wizard Validation and Navigation

## Test Scenario 1: Complete Order Flow

### Steps:
1. Start wizard at Step 1
2. Select a customer
3. Verify Continue button is enabled
4. Click Continue
5. Verify navigation to Step 2
6. Verify Step 1 is marked as complete
7. Enter billing address
8. Enter shipping address
9. Click Continue
10. Verify navigation to Step 3
11. Verify Step 2 is marked as complete
12. Add products to cart
13. Click Continue
14. Verify navigation to Step 4
15. Verify Step 3 is marked as complete
16. Review all information
17. Click Continue
18. Verify navigation to Step 5
19. Verify Step 4 is marked as complete
20. Select payment method
21. Accept terms
22. Confirm accuracy
23. Click Place Order
24. Verify order submission

### Expected Results:
- All steps complete successfully
- All 5 steps marked as complete
- Order data includes all entered information
- No validation errors displayed

## Test Scenario 2: Validation Error Handling

### Steps:
1. Start wizard at Step 1
2. Click Continue without selecting customer
3. Verify validation error displayed
4. Verify error message: "Please select a customer to continue"
5. Verify Continue button disabled
6. Select customer
7. Click Continue
8. Navigate to Step 2
9. Click Continue without entering addresses
10. Verify validation errors displayed
11. Verify multiple error messages for missing fields
12. Enter billing address only
13. Click Continue
14. Verify shipping address errors still shown
15. Enter shipping address
16. Click Continue
17. Verify navigation to Step 3

### Expected Results:
- Validation errors prevent navigation
- Error messages are clear and specific
- Errors clear when data is entered
- Multiple errors can be displayed simultaneously

## Test Scenario 3: Backward Navigation

### Steps:
1. Complete Steps 1-3
2. Navigate to Step 4
3. Click Back button
4. Verify navigation to Step 3
5. Verify cart items still present
6. Click Back button
7. Verify navigation to Step 2
8. Verify addresses still populated
9. Click Back button
10. Verify navigation to Step 1
11. Verify customer still selected
12. Verify Back button is hidden (Cancel shown instead)

### Expected Results:
- Backward navigation works at all steps
- All data persists when navigating backward
- Completed steps remain marked as complete
- First step shows Cancel instead of Back

## Test Scenario 4: Navigation Guards

### Steps:
1. Start wizard at Step 1
2. Click on Step 3 in progress indicator
3. Verify navigation blocked
4. Verify toast notification shown
5. Complete Step 1
6. Click on Step 3 in progress indicator
7. Verify navigation still blocked
8. Complete Step 2
9. Click on Step 3 in progress indicator
10. Verify navigation allowed
11. Verify Step 3 displayed

### Expected Results:
- Cannot skip steps by clicking progress indicator
- Toast notification explains why navigation blocked
- Can navigate to step after completing all previous steps
- Can navigate backward to any visited step

## Test Scenario 5: Form Data Persistence

### Steps:
1. Start wizard at Step 1
2. Select customer "John Doe"
3. Navigate to Step 2
4. Enter billing address
5. Enter shipping address
6. Navigate to Step 3
7. Add 2 products to cart
8. Navigate back to Step 2
9. Verify addresses still populated
10. Navigate back to Step 1
11. Verify "John Doe" still selected
12. Navigate forward to Step 3
13. Verify 2 products still in cart
14. Navigate to Step 4
15. Verify all data displayed correctly

### Expected Results:
- All form data persists across navigation
- Customer selection maintained
- Addresses maintained
- Cart items maintained
- Order totals calculated correctly

## Test Scenario 6: Cancel Confirmation

### Steps:
1. Start wizard at Step 1
2. Click Cancel
3. Verify no confirmation dialog (no data entered)
4. Restart wizard
5. Select customer
6. Click Cancel
7. Verify confirmation dialog shown
8. Click "Cancel" in dialog
9. Verify wizard still open
10. Click Cancel again
11. Click "OK" in dialog
12. Verify wizard closed

### Expected Results:
- No confirmation when no data entered
- Confirmation shown when data exists
- Can cancel the cancellation
- Wizard closes on confirmation

## Test Scenario 7: Dynamic Continue Button State

### Steps:
1. Start wizard at Step 1
2. Verify Continue button disabled
3. Select customer
4. Verify Continue button enabled
5. Navigate to Step 2
6. Verify Continue button disabled
7. Enter billing address only
8. Verify Continue button still disabled
9. Enter shipping address
10. Verify Continue button enabled
11. Navigate to Step 3
12. Verify Continue button disabled
13. Add product to cart
14. Verify Continue button enabled
15. Navigate to Step 5
16. Verify Continue button disabled
17. Select payment method
18. Verify Continue button still disabled
19. Accept terms
20. Verify Continue button still disabled
21. Confirm accuracy
22. Verify Continue button enabled (shows "Place Order")

### Expected Results:
- Continue button state reflects step requirements
- Button disabled until all required fields complete
- Button text changes to "Place Order" on final step
- Visual feedback is immediate

## Test Scenario 8: Validation Error Display

### Steps:
1. Navigate to Step 2
2. Enter invalid ZIP code "abc"
3. Click Continue
4. Verify error: "Billing ZIP code must be in format 12345 or 12345-6789"
5. Enter invalid email "notanemail"
6. Click Continue
7. Verify error: "Shipping email must be a valid email address"
8. Verify multiple errors displayed in list
9. Fix ZIP code
10. Click Continue
11. Verify ZIP error removed, email error remains
12. Fix email
13. Click Continue
14. Verify all errors cleared
15. Verify navigation to next step

### Expected Results:
- Invalid data triggers specific error messages
- Multiple errors can be shown simultaneously
- Errors are listed clearly in alert component
- Fixing errors removes them from list
- Page scrolls to show errors

## Manual Testing Checklist

- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on mobile device
- [ ] Test with keyboard navigation only
- [ ] Test with screen reader
- [ ] Test with slow network connection
- [ ] Test with large cart (20+ items)
- [ ] Test with very long customer names
- [ ] Test with international addresses
- [ ] Test rapid clicking of Continue button
- [ ] Test browser back button behavior
- [ ] Test page refresh during wizard
- [ ] Test with JavaScript console open for errors

## Performance Testing

- [ ] Measure time to complete full wizard flow
- [ ] Check for memory leaks during navigation
- [ ] Verify smooth animations on low-end devices
- [ ] Test with 100+ customers in selection list
- [ ] Test with 50+ products in catalog
- [ ] Verify validation runs in < 100ms
- [ ] Check bundle size impact of validation logic

## Accessibility Testing

- [ ] All form fields have labels
- [ ] Error messages are announced to screen readers
- [ ] Focus management works correctly
- [ ] Keyboard shortcuts work as expected
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets are at least 44x44px
- [ ] No keyboard traps exist
