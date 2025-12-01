# Wizard Infrastructure Verification Guide

This guide helps verify that the wizard infrastructure components are working correctly.

## Manual Verification Steps

### 1. Visual Verification

To visually verify the wizard infrastructure:

1. **Add a test route** to your `App.tsx`:
```tsx
import { WizardDemo } from "@/components/orders/wizard";

// Add this route in your Routes component:
<Route path="/wizard-demo" element={<WizardDemo />} />
```

2. **Navigate to the demo page**:
   - Start the dev server: `npm run dev`
   - Open browser to: `http://localhost:3000/wizard-demo`

3. **Verify the following**:

#### Progress Indicator
- [ ] 5 steps are displayed (Customer, Address, Products, Review, Payment)
- [ ] Step 1 is highlighted in blue (active)
- [ ] Other steps are gray (pending)
- [ ] Each step has an icon
- [ ] Steps are connected with lines
- [ ] On mobile, steps are displayed vertically
- [ ] On desktop, steps are displayed horizontally

#### Navigation
- [ ] "Cancel" button appears on step 1
- [ ] "Continue" button appears on the right
- [ ] Clicking "Continue" moves to step 2
- [ ] Step 1 turns green with checkmark
- [ ] Step 2 becomes active (blue)
- [ ] "Back" button appears on step 2
- [ ] Clicking "Back" returns to step 1
- [ ] Data is preserved when navigating back/forward

#### Step Transitions
- [ ] Smooth animations between steps
- [ ] Progress indicator updates correctly
- [ ] Navigation buttons update appropriately
- [ ] Last step shows "Place Order" instead of "Continue"

#### Responsive Design
- [ ] Test on mobile viewport (< 768px)
- [ ] Test on tablet viewport (768px - 1024px)
- [ ] Test on desktop viewport (> 1024px)
- [ ] Layout adjusts appropriately for each size

### 2. Component Integration Verification

Verify that components can be imported and used:

```tsx
import {
  OrderCreationWizard,
  WizardProgressIndicator,
  WizardNavigation,
  useWizardState,
  WizardDemo,
} from "@/components/orders/wizard";

// All imports should work without errors
```

### 3. Hook Functionality Verification

Test the `useWizardState` hook in a component:

```tsx
import { useWizardState } from "@/components/orders/wizard";

function TestComponent() {
  const wizard = useWizardState(5);
  
  console.log("Current step:", wizard.currentStep); // Should be 1
  console.log("Completed steps:", wizard.completedSteps); // Should be []
  
  // Test navigation
  wizard.goToNextStep();
  console.log("After next:", wizard.currentStep); // Should be 2
  console.log("Completed:", wizard.completedSteps); // Should be [1]
  
  return <div>Check console for hook output</div>;
}
```

### 4. TypeScript Verification

Verify TypeScript types are working:

```tsx
import type {
  WizardStep,
  WizardState,
  WizardProgressIndicatorProps,
  WizardNavigationProps,
  OrderCreationWizardProps,
} from "@/components/orders/wizard";

// All type imports should work without errors
// IDE should provide autocomplete for these types
```

### 5. Accessibility Verification

Test accessibility features:

#### Keyboard Navigation
- [ ] Tab key moves focus through interactive elements
- [ ] Enter key activates buttons
- [ ] Escape key cancels (when implemented)
- [ ] Focus is visible on all interactive elements

#### Screen Reader
- [ ] Step indicators have proper ARIA labels
- [ ] Active step has `aria-current="step"`
- [ ] Buttons have descriptive labels
- [ ] Step changes are announced (to be enhanced)

#### Visual
- [ ] Sufficient color contrast for all text
- [ ] Focus indicators are visible
- [ ] Touch targets are at least 44x44px
- [ ] Text is readable at all sizes

### 6. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

### 7. Performance Verification

Check performance:
- [ ] No console errors
- [ ] Smooth animations (60fps)
- [ ] Fast step transitions
- [ ] No memory leaks when navigating

## Expected Console Output

When using the WizardDemo component, you should see:

```
// When clicking through all steps:
Current step: 1
Current step: 2
Current step: 3
Current step: 4
Current step: 5

// When completing the wizard:
Order completed with data: {}
```

## Common Issues and Solutions

### Issue: Components not rendering
**Solution**: Check that all imports are correct and the route is properly configured.

### Issue: Styles not applied
**Solution**: Ensure Tailwind CSS is properly configured and the dev server is running.

### Issue: Navigation not working
**Solution**: Check browser console for errors. Verify that the `useWizardState` hook is being called correctly.

### Issue: TypeScript errors
**Solution**: Run `npx tsc --noEmit` to check for type errors. Ensure all dependencies are installed.

## Success Criteria

The wizard infrastructure is working correctly if:

1. ✅ All 5 steps are visible in the progress indicator
2. ✅ Navigation between steps works smoothly
3. ✅ Step states update correctly (pending → active → completed)
4. ✅ Back/Continue buttons function properly
5. ✅ Responsive layouts work on all screen sizes
6. ✅ No TypeScript or console errors
7. ✅ Animations are smooth
8. ✅ Accessibility features work

## Next Steps

After verifying the infrastructure:

1. Implement the OrderSummaryCard component (Task 2)
2. Implement individual step components (Tasks 3-7)
3. Add step validation logic (Task 8)
4. Integrate with existing CreateOrderForm (Task 9)
5. Update OrdersContainer to use wizard (Task 10)

## Reporting Issues

If you find any issues during verification:

1. Note the specific step where the issue occurs
2. Check browser console for errors
3. Verify your environment setup
4. Document the issue with screenshots if possible
5. Check that all dependencies are installed: `npm install`
