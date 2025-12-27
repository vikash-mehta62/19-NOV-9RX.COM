# Payment Tracking Testing Guide

## Test Scenarios

### 1. Legacy Paid Order Edit Test
**Scenario**: Edit a paid order that doesn't have payment transaction records

**Steps**:
1. Find a paid order (payment_status = 'paid') 
2. Check payment_transactions table - should be empty for this order
3. Edit the order items to increase the total amount
4. Verify payment adjustment modal appears
5. Check that modal shows:
   - Original Amount: $X
   - Paid Amount: $X (green)
   - New Amount: $Y
   - Balance Due: $Z (red)

**Expected Result**: 
- Legacy payment transaction record is automatically created
- Payment adjustment modal shows correct breakdown
- Balance due is calculated properly

### 2. New Order Payment Flow Test
**Scenario**: Create new order and test payment tracking

**Steps**:
1. Create new order with items
2. Mark as paid through payment system
3. Edit order to add more items
4. Verify payment adjustment modal

**Expected Result**:
- Payment transactions are properly recorded
- Balance due calculation is accurate
- Payment adjustment options work correctly

### 3. Partial Payment Test
**Scenario**: Test partial payment handling

**Steps**:
1. Create order for $400
2. Process payment for $200
3. Check order details in all tabs
4. Edit order to change amount

**Expected Result**:
- Payment status shows "Partial"
- Paid amount: $200 (green)
- Balance due: $200 (red)
- Payment adjustment handles partial payments

### 4. Refund Handling Test
**Scenario**: Test refund processing

**Steps**:
1. Create paid order for $400
2. Process refund for $100
3. Check payment summary
4. Edit order items

**Expected Result**:
- Paid amount: $300 (after refund)
- Balance calculations account for refunds
- Payment adjustment works with refunded amounts

### 5. UI Component Tests

#### PaymentTab Component
**Test Points**:
- [ ] Shows paid amount in green
- [ ] Shows balance due in red highlight
- [ ] Displays partial payment status correctly
- [ ] Payment method information is accurate
- [ ] Transaction ID shows for paid orders

#### OverviewTab Component  
**Test Points**:
- [ ] Payment status badge shows correct color
- [ ] Order summary includes paid/balance breakdown
- [ ] Balance due is prominently displayed
- [ ] Payment summary is accurate

#### ItemsTab Component
**Test Points**:
- [ ] Edit mode triggers payment adjustment for paid orders
- [ ] Legacy transaction creation works
- [ ] Payment adjustment modal integration
- [ ] Order total calculations are correct

#### PaymentAdjustmentModal
**Test Points**:
- [ ] Shows original vs new amount clearly
- [ ] Paid amount is displayed in green
- [ ] Balance due is highlighted in red
- [ ] Payment options are appropriate
- [ ] Customer credit information is accurate

### 6. Database Verification Tests

#### Payment Transactions Table
**Check**:
```sql
SELECT * FROM payment_transactions WHERE order_id = 'ORDER_ID';
```
- [ ] Legacy records are created with 'legacy_record' type
- [ ] Payment amounts are correct
- [ ] Refunds are recorded as negative amounts
- [ ] Transaction status is appropriate

#### Orders Table
**Check**:
```sql
SELECT payment_status, total_amount FROM orders WHERE id = 'ORDER_ID';
```
- [ ] Payment status reflects actual payment state
- [ ] Total amount is updated after edits

#### Account Transactions
**Check**:
```sql
SELECT * FROM account_transactions WHERE reference_id = 'ORDER_ID';
```
- [ ] Credit transactions are recorded
- [ ] Balance calculations are correct

### 7. Edge Cases

#### Zero Amount Orders
**Test**: Order with $0 total
**Expected**: No payment adjustment needed

#### Discount Orders
**Test**: Order with large discount
**Expected**: Correct total calculation including discount

#### Tax Changes
**Test**: Edit order with tax implications
**Expected**: Tax included in balance due calculation

#### Multiple Edits
**Test**: Edit same order multiple times
**Expected**: Payment tracking remains accurate

### 8. Performance Tests

#### Large Order Lists
**Test**: Load page with 100+ orders
**Expected**: Payment status loads quickly

#### Real-time Updates
**Test**: Payment adjustment in one tab, check other tabs
**Expected**: Updates reflect immediately

### 9. User Experience Tests

#### Admin User Flow
1. [ ] Can see all payment information clearly
2. [ ] Payment adjustment process is intuitive
3. [ ] Balance due is prominently displayed
4. [ ] Actions are clearly labeled

#### Customer View
1. [ ] Payment status is clear
2. [ ] Balance due is visible if applicable
3. [ ] Payment links work correctly

### 10. Integration Tests

#### Payment Gateway
**Test**: Process actual payments
**Expected**: Transaction records are created correctly

#### Email Notifications
**Test**: Send payment links
**Expected**: Correct balance due in emails

#### Invoice Generation
**Test**: Generate invoices for modified orders
**Expected**: Invoices show correct paid/due amounts

## Test Data Setup

### Sample Orders for Testing

```sql
-- Legacy paid order (no transaction records)
INSERT INTO orders (id, payment_status, total_amount, items) VALUES 
('legacy-paid-1', 'paid', 249.00, '[{"name":"Test Item","sizes":[{"quantity":1,"price":249}]}]');

-- Partially paid order
INSERT INTO orders (id, payment_status, total_amount) VALUES 
('partial-1', 'pending', 400.00);

INSERT INTO payment_transactions (order_id, amount, status, transaction_type) VALUES 
('partial-1', 200.00, 'completed', 'payment');

-- Order with refund
INSERT INTO orders (id, payment_status, total_amount) VALUES 
('refund-1', 'paid', 300.00);

INSERT INTO payment_transactions (order_id, amount, status, transaction_type) VALUES 
('refund-1', 400.00, 'completed', 'payment'),
('refund-1', 100.00, 'completed', 'refund');
```

## Automated Test Scripts

### Jest Test Example
```javascript
describe('Payment Tracking', () => {
  test('calculates balance due correctly', () => {
    const totalAmount = 400;
    const paidAmount = 249;
    const balanceDue = Math.max(0, totalAmount - paidAmount);
    expect(balanceDue).toBe(151);
  });

  test('handles legacy orders', async () => {
    const paymentSummary = await calculatePaymentSummary('legacy-paid-1', 400, 'paid');
    expect(paymentSummary.paidAmount).toBe(400); // Should assume full payment for legacy
    expect(paymentSummary.balanceDue).toBe(0);
  });
});
```

## Manual Testing Checklist

### Before Release
- [ ] All test scenarios pass
- [ ] UI components display correctly
- [ ] Database records are accurate
- [ ] Performance is acceptable
- [ ] Edge cases are handled
- [ ] User experience is smooth

### Post-Release Monitoring
- [ ] Monitor payment transaction creation
- [ ] Check for any payment calculation errors
- [ ] Verify customer payment flows
- [ ] Monitor system performance

## Common Issues & Solutions

### Issue: Payment adjustment modal not showing
**Solution**: Check if order has payment_status = 'paid' and amount difference > 0

### Issue: Incorrect balance due calculation
**Solution**: Verify payment_transactions table has correct records

### Issue: Legacy orders not working
**Solution**: Ensure legacy transaction creation is working in ItemsTab

### Issue: UI not updating after payment
**Solution**: Check if components are using the payment summary hook

## Success Criteria

✅ **Payment tracking is accurate** - Balance due always reflects actual amounts owed
✅ **Legacy orders work** - Old paid orders can be edited without issues  
✅ **UI is clear** - Users understand payment status and amounts due
✅ **Performance is good** - Payment calculations don't slow down the system
✅ **Data integrity** - All payment transactions are properly recorded