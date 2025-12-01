# Validation and Navigation Verification

## Manual Verification Steps

### Step 1: Customer Selection Validation

1. **Test: Navigate without selecting customer**
   - Action: Click "Continue" without selecting a customer
   - Expected: Error message "Please select a customer to continue"
   - Expected: Cannot proceed to step 2

2. **Test: Select customer and proceed**
   - Action: Select a customer from the list
   - Action: Click "Continue"
   - Expected: Step 1 marked as complete
   - Expected: Navigate to step 2

3. **Test: Navigate back to step 1**
   - Action: Click "Back" button
   - Expected: Return to step 1
   - Expected: Selected customer still shown

### Step 2: Address Information Validation

1. **Test: Navigate without addresses**
   - Action: Click "Continue" without entering addresses
   - Expected: Error messages for missing billing and shipping addresses
   - Expected: Cannot proceed to step 3

2. **Test: Invalid ZIP code**
   - Action: Enter billing address with ZIP "abc123"
   - Action: Click "Save Billing Address"
   - Expected: Error message "Billing ZIP code must be in format 12345 or 12345-6789"

3. **Test: Invalid email**
   - Action: Enter shipping address with email "invalid-email"
   - Action: Click "Save Shipping Address"
   - Expected: Error message "Shipping email must be a valid email address"

4. **Test: Same as billing checkbox**
   - Action: Complete billing address
   - Action: Check "Same as billing address"
   - Expected: Shipping address auto-filled with billing address
   - Expected: Can proceed to step 3

5. **Test: Complete addresses and proceed**
   - Action: Enter valid billing and shipping addresses
   - Action: Click "Continue"
   - Expected: Step 2 marked as complete
   - Expected: Navigate to step 3

### Step 3: Product Selection Validation

1. **Test: Navigate without products**
   - Action: Click "Continue" without adding products
   - Expected: Error message "Please add at least one product to your order"
   - Expected: Cannot proceed to step 4

2. **Test: Add products and proceed**
   - Action: Add one or more products to cart
   - Action: Click "Continue"
   - Expected: Step 3 marked as complete
   - Expected: Navigate to step 4

3. **Test: Navigate back and verify cart**
   - Action: Click "Back" button
   - Expected: Return to step 3
   - Expected: Cart items still shown

### Step 4: Review Order Validation

1. **Test: Review all information**
   - Action: View customer information card
   - Expected: Shows selected customer details
   - Action: View billing address card
   - Expected: Shows entered billing address
   - Action: View shipping address card
   - Expected: Shows entered shipping address
   - Action: View order items
   - Expected: Shows all cart items with details

2. **Test: Edit customer**
   - Action: Click "Edit" button on customer card
   - Expected: Navigate back to step 1
   - Expected: Customer still selected

3. **Test: Edit addresses**
   - Action: Click "Edit" button on address card
   - Expected: Navigate back to step 2
   - Expected: Addresses still filled

4. **Test: Edit products**
   - Action: Click "Edit" button on products card
   - Expected: Navigate back to step 3
   - Expected: Cart items still present

5. **Test: Proceed to payment**
   - Action: Click "Continue"
   - Expected: Step 4 marked as complete
   - Expected: Navigate to step 5

### Step 5: Payment Confirmation Validation

1. **Test: Submit without confirmations**
   - Action: Click "Place Order" without checking confirmations
   - Expected: Error messages for missing confirmations
   - Expected: Cannot submit order

2. **Test: Submit without terms acceptance**
   - Action: Check "accuracy confirmed" only
   - Action: Click "Place Order"
   - Expected: Error message "You must accept the terms and conditions to continue"
   - Expected: Cannot submit order

3. **Test: Submit without accuracy confirmation**
   - Action: Check "terms accepted" only
   - Action: Click "Place Order"
   - Expected: Error message "Please confirm that all order details are accurate"
   - Expected: Cannot submit order

4. **Test: Complete order submission**
   - Action: Select payment method
   - Action: Check both confirmation boxes
   - Action: Click "Place Order"
   - Expected: Loading state shown
   - Expected: Success toast notification
   - Expected: onComplete callback called with order data

### Navigation Guard Tests

1. **Test: Cannot skip steps**
   - Action: From step 1, try to click on step 3 in progress indicator
   - Expected: Toast notification "Cannot Navigate"
   - Expected: Remain on step 1

2. **Test: Can navigate to completed steps**
   - Action: Complete steps 1, 2, 3
   - Action: Click on step 1 in progress indicator
   - Expected: Navigate to step 1
   - Expected: All data preserved

3. **Test: Sequential navigation**
   - Action: Complete all steps in order
   - Expected: Each step marked as complete
   - Expected: Can navigate to any completed step
   - Expected: Cannot skip ahead

4. **Test: Cancel with data**
   - Action: Enter some data in any step
   - Action: Click "Cancel"
   - Expected: Confirmation dialog shown
   - Expected: If confirmed, onCancel callback called

5. **Test: Cancel without data**
   - Action: Click "Cancel" on step 1 without selecting customer
   - Expected: No confirmation dialog
   - Expected: onCancel callback called immediately

### Data Persistence Tests

1. **Test: Forward and backward navigation**
   - Action: Complete steps 1-3
   - Action: Go back to step 1
   - Action: Go forward to step 3
   - Expected: All data preserved (customer, addresses, cart)

2. **Test: Edit and return**
   - Action: Complete all steps to step 5
   - Action: Go back to step 2
   - Action: Modify shipping address
   - Action: Navigate forward to step 5
   - Expected: Modified address shown in review
   - Expected: Other data unchanged

3. **Test: Multiple edits**
   - Action: Complete wizard to step 4
   - Action: Edit customer (step 1)
   - Action: Edit addresses (step 2)
   - Action: Edit products (step 3)
   - Action: Return to step 4
   - Expected: All changes reflected in review

## Validation Logic Verification

### Customer Validation
```typescript
// Valid customer
{
  id: "123",
  name: "John Doe",
  email: "john@example.com",
  phone: "555-1234",
  type: "Pharmacy"
}
// Result: ✅ Valid

// Invalid customer (missing email)
{
  id: "123",
  name: "John Doe",
  email: "",
  phone: "555-1234",
  type: "Pharmacy"
}
// Result: ❌ Error: "Selected customer is missing email address"
```

### Address Validation
```typescript
// Valid billing address
{
  street: "123 Main St",
  city: "Springfield",
  state: "IL",
  zip_code: "62701"
}
// Result: ✅ Valid

// Invalid ZIP code
{
  street: "123 Main St",
  city: "Springfield",
  state: "IL",
  zip_code: "abc123"
}
// Result: ❌ Error: "Billing ZIP code must be in format 12345 or 12345-6789"

// Valid extended ZIP
{
  street: "123 Main St",
  city: "Springfield",
  state: "IL",
  zip_code: "62701-1234"
}
// Result: ✅ Valid
```

### Product Validation
```typescript
// Valid cart item
{
  productId: "prod-1",
  name: "Test Product",
  quantity: 2,
  price: 10.99,
  image: "/test.jpg",
  shipping_cost: 5.0
}
// Result: ✅ Valid

// Invalid quantity
{
  productId: "prod-1",
  name: "Test Product",
  quantity: 0,
  price: 10.99
}
// Result: ❌ Error: "Item 1 must have a quantity greater than 0"

// Invalid price
{
  productId: "prod-1",
  name: "Test Product",
  quantity: 2,
  price: -5
}
// Result: ❌ Error: "Item 1 has an invalid price"
```

### Payment Validation
```typescript
// Valid payment confirmation
{
  paymentMethod: "credit_card",
  termsAccepted: true,
  accuracyConfirmed: true
}
// Result: ✅ Valid

// Missing confirmations
{
  paymentMethod: "credit_card",
  termsAccepted: false,
  accuracyConfirmed: false
}
// Result: ❌ Errors:
// - "You must accept the terms and conditions to continue"
// - "Please confirm that all order details are accurate"
```

## Expected Behavior Summary

### ✅ Validation Working
- All steps validate required fields
- Clear error messages displayed
- Cannot proceed without valid data
- Errors cleared on successful validation

### ✅ Navigation Working
- Cannot skip steps
- Can navigate backward freely
- Steps marked as complete
- Progress indicator shows status

### ✅ Data Persistence Working
- All form data preserved
- Changes reflected across steps
- Edit functionality works
- Final submission includes all data

### ✅ Error Handling Working
- Validation errors shown in alert
- Toast notifications for navigation errors
- Scroll to top on errors
- Clear, actionable messages

## Success Criteria

All of the following should be true:
- ✅ Cannot proceed to next step without valid data
- ✅ Cannot skip steps in sequence
- ✅ Can navigate backward to any visited step
- ✅ All form data persists during navigation
- ✅ Validation errors are clear and specific
- ✅ Progress indicator shows correct status
- ✅ Final submission includes all validated data
- ✅ User receives feedback for all actions
