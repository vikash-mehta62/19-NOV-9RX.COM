# Quick Start Guide - Wizard Infrastructure

## Test the Wizard in 3 Steps

### Step 1: Add the Demo Route

Open `src/App.tsx` and add this import at the top:

```tsx
import { WizardDemo } from "./components/orders/wizard";
```

Then add this route inside your `<Routes>` component:

```tsx
<Route path="/wizard-demo" element={<WizardDemo />} />
```

### Step 2: Start the Dev Server

```bash
npm run dev
```

### Step 3: View the Wizard

Open your browser to:
```
http://localhost:3000/wizard-demo
```

## What You Should See

1. **Progress Indicator** at the top showing 5 steps
2. **Step 1 (Customer)** highlighted in blue
3. **Placeholder content** in the center
4. **Cancel and Continue buttons** at the bottom

## Try These Interactions

- ✅ Click "Continue" to move to step 2
- ✅ Click "Back" to return to step 1
- ✅ Watch step 1 turn green with a checkmark
- ✅ Navigate through all 5 steps
- ✅ See "Place Order" button on the last step
- ✅ Resize browser to see responsive layouts

## Expected Behavior

### Desktop View
- Horizontal progress indicator
- Steps displayed in a row
- Connecting lines between steps

### Mobile View (< 768px)
- Vertical progress indicator
- Steps stacked vertically
- Connecting lines between steps

### Step States
- **Pending**: Gray circle with icon
- **Active**: Blue circle with icon
- **Completed**: Green circle with checkmark

## Next Steps

Once you've verified the wizard works:

1. Remove the demo route (optional)
2. Proceed to Task 2: Create Order Summary Card
3. Then implement individual step components (Tasks 3-7)

## Troubleshooting

### Issue: Route not found
**Solution**: Make sure you added the route inside the `<Routes>` component

### Issue: Import error
**Solution**: Check that the path is correct: `"./components/orders/wizard"`

### Issue: Styles not working
**Solution**: Ensure Tailwind CSS is running and the dev server is started

### Issue: Blank page
**Solution**: Check browser console for errors. Verify all dependencies are installed.

## Clean Up

To remove the demo after testing:

1. Remove the import from `App.tsx`
2. Remove the route from `App.tsx`
3. (Optional) Delete `WizardDemo.tsx` if not needed

The wizard infrastructure will remain available for use in the actual implementation.
