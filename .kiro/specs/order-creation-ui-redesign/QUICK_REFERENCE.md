# Order Creation Wizard - Quick Reference Guide

## For Developers

### File Structure
```
src/
├── pages/admin/
│   └── CreateOrder.tsx                    # Main integration page
├── components/orders/wizard/
│   ├── OrderCreationWizard.tsx           # Main wizard component
│   ├── useWizardState.ts                 # Wizard state management hook
│   ├── validation.ts                     # Validation logic
│   ├── types.ts                          # TypeScript types
│   ├── WizardProgressIndicator.tsx       # Progress bar component
│   ├── WizardNavigation.tsx              # Navigation buttons
│   ├── OrderSummaryCard.tsx              # Order summary sidebar
│   ├── ErrorBoundary.tsx                 # Error handling
│   ├── steps/
│   │   ├── CustomerSelectionStep.tsx     # Step 1
│   │   ├── AddressInformationStep.tsx    # Step 2
│   │   ├── ProductSelectionStep.tsx      # Step 3
│   │   ├── ReviewOrderStep.tsx           # Step 4
│   │   └── PaymentConfirmationStep.tsx   # Step 5
│   └── __tests__/
│       ├── useWizardState.test.ts        # State management tests
│       └── validation.test.ts            # Validation tests
```

### Key Components

#### OrderCreationWizard
Main wizard component that orchestrates all steps.

**Props:**
```typescript
interface OrderCreationWizardProps {
  initialData?: any;
  onComplete?: (data: any) => void;
  onCancel?: () => void;
}
```

**Usage:**
```tsx
import { OrderCreationWizard } from "@/components/orders/wizard/OrderCreationWizard";

<OrderCreationWizard
  onComplete={handleComplete}
  onCancel={handleCancel}
/>
```

#### useWizardState Hook
Manages wizard navigation and step completion.

**Returns:**
```typescript
{
  currentStep: number;
  completedSteps: number[];
  canNavigateToStep: (step: number) => boolean;
  markStepComplete: (step: number) => void;
  goToStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}
```

**Usage:**
```tsx
const wizardState = useWizardState(5); // 5 total steps
```

#### Validation Functions
Validates each step's data.

**Available Functions:**
```typescript
validateCustomerSelection(customer)
validateAddressInformation(billing, shipping)
validateProductSelection(cartItems)
validateReviewOrder(customer, billing, shipping, cartItems)
validatePaymentConfirmation(method, terms, accuracy)
validateStep(stepNumber, data) // Master function
```

**Usage:**
```tsx
const result = await validateStep(1, { customer: selectedCustomer });
if (!result.isValid) {
  console.error(result.errors);
}
```

### Routing

**Route:** `/admin/orders/create`  
**Component:** `CreateOrder.tsx`  
**Access:** Admin only (protected route)

**Navigation:**
```tsx
// From orders list
navigate("/admin/orders/create");

// Back to orders list
navigate("/admin/orders");
```

### State Management

#### Form Data
All form data is managed locally in OrderCreationWizard using useState:
- Customer selection
- Billing address
- Shipping address
- Cart items (via useCart hook)
- Payment method
- Special instructions
- PO number
- Confirmations

#### Cart Management
Uses the existing `useCart` hook from `@/hooks/use-cart`:
```tsx
const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();
```

### Validation Rules

#### Step 1: Customer
- Customer must be selected
- Customer must have ID
- Customer must have email

#### Step 2: Address
- All address fields required
- ZIP code format: 12345 or 12345-6789
- Email format: valid email address
- Phone number required

#### Step 3: Products
- At least one product in cart
- Each product must have ID
- Quantity must be > 0
- Price must be >= 0

#### Step 4: Review
- Re-validates all previous steps
- Ensures data consistency

#### Step 5: Payment
- Payment method must be selected
- Terms must be accepted
- Accuracy must be confirmed

### Error Handling

#### Validation Errors
```tsx
// Displayed as:
// 1. Inline field errors (red text below input)
// 2. Alert banner at top of step
// 3. Toast notification
```

#### Submission Errors
```tsx
try {
  await submitOrder(data);
} catch (error) {
  toast({
    title: "Error",
    description: error.message,
    variant: "destructive",
  });
}
```

#### Error Boundary
Catches React errors and displays user-friendly message:
```tsx
<ErrorBoundary onError={(error, errorInfo) => {
  console.error(error, errorInfo);
  toast({ title: "An Error Occurred" });
}}>
  {children}
</ErrorBoundary>
```

### Styling

#### Responsive Breakpoints
```css
/* Mobile */
@media (max-width: 767px) {
  /* Single column, vertical layout */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Adjusted two-column layout */
}

/* Desktop */
@media (min-width: 1024px) {
  /* Full two-column layout */
}
```

#### Key Classes
- `animate-fade-in` - Fade in animation
- `animate-slide-up` - Slide up animation
- `wizard-animations.css` - Custom animations

### Accessibility

#### ARIA Attributes
```tsx
<div role="main" aria-label="Order Creation Wizard">
<nav aria-label="Order creation progress">
<aside aria-label="Order summary" role="complementary">
<div aria-live="assertive" aria-atomic="true">
```

#### Keyboard Navigation
- Tab: Navigate between fields
- Enter: Submit/Continue
- Escape: Close modals
- Arrow keys: Navigate in lists

### Performance Optimizations

#### React Optimizations
```tsx
// Memoize component
export const OrderCreationWizard = memo(OrderCreationWizardComponent);

// Memoize callbacks
const handleContinue = useCallback(() => { ... }, [deps]);

// Memoize calculations
const { subtotal, tax, total } = useMemo(() => { ... }, [cartItems]);
```

#### Animation Performance
- Step transitions: 300ms
- Button hovers: 150ms
- Modal animations: 200ms
- Progress updates: 250ms

### Testing

#### Run Unit Tests (when vitest is installed)
```bash
npm install -D vitest @testing-library/react @testing-library/react-hooks
npm test
```

#### Manual Testing
See `MANUAL_TESTING_CHECKLIST.md` for comprehensive test cases.

#### Build Testing
```bash
npm run build
```

### Common Tasks

#### Add a New Step
1. Create step component in `steps/` folder
2. Add step to `steps` array in OrderCreationWizard
3. Add case to `renderStepContent()` switch
4. Add validation function in `validation.ts`
5. Update `totalSteps` constant
6. Add tests

#### Modify Validation
1. Edit validation function in `validation.ts`
2. Update error messages
3. Add/update tests in `validation.test.ts`
4. Test in UI

#### Add New Field
1. Add to form state in OrderCreationWizard
2. Add to relevant step component
3. Add to validation rules
4. Add to order submission data
5. Update types in `types.ts`

#### Customize Styling
1. Edit component's className props
2. Update `wizard-animations.css` for animations
3. Test responsive behavior
4. Verify accessibility

### Debugging

#### Enable Debug Logging
```tsx
// In OrderCreationWizard.tsx
useEffect(() => {
  console.log('Current step:', wizardState.currentStep);
  console.log('Form data:', formData);
  console.log('Cart items:', cartItems);
}, [wizardState.currentStep, formData, cartItems]);
```

#### Check Validation
```tsx
const result = await validateStep(step, data);
console.log('Validation result:', result);
```

#### Monitor State Changes
```tsx
useEffect(() => {
  console.log('Wizard state changed:', wizardState);
}, [wizardState]);
```

### Troubleshooting

#### Issue: Step won't advance
**Check:**
- Validation is passing
- `canProceedFromCurrentStep()` returns true
- No console errors

#### Issue: Data not persisting
**Check:**
- State updates in useEffect
- Dependencies array is correct
- No state reset on navigation

#### Issue: Validation not working
**Check:**
- Validation function is called
- Error messages are displayed
- Toast notifications appear

#### Issue: Build fails
**Check:**
- No TypeScript errors: `npm run build`
- All imports are correct
- No circular dependencies

### Best Practices

1. **Always validate before proceeding** to next step
2. **Preserve data** when navigating backward
3. **Show loading states** during async operations
4. **Provide clear error messages** for validation failures
5. **Use TypeScript types** for all props and state
6. **Memoize expensive operations** with useMemo
7. **Memoize callbacks** with useCallback
8. **Test accessibility** with keyboard and screen reader
9. **Test responsive design** on multiple screen sizes
10. **Handle errors gracefully** with try/catch and error boundaries

### Resources

- **Full Testing Report:** `TESTING_REPORT.md`
- **Manual Test Cases:** `MANUAL_TESTING_CHECKLIST.md`
- **Completion Summary:** `TASK_15_COMPLETION_SUMMARY.md`
- **Design Document:** `design.md`
- **Requirements:** `requirements.md`
- **Task List:** `tasks.md`

### Support

For questions or issues:
1. Check this quick reference
2. Review the testing documentation
3. Check the design document
4. Review the requirements
5. Check existing tests for examples

---

**Last Updated:** November 28, 2025  
**Version:** 1.0  
**Status:** Production Ready
