# Accessibility Testing Guide - Order Creation Wizard

This guide provides step-by-step instructions for manually testing the accessibility features of the Order Creation Wizard.

## Prerequisites

- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Screen reader software (optional but recommended):
  - Windows: NVDA (free) or JAWS
  - macOS: VoiceOver (built-in)
  - Linux: Orca

## Test 1: Keyboard-Only Navigation

### Objective
Verify that all functionality is accessible using only the keyboard.

### Steps

1. **Load the Order Creation Wizard**
   - Navigate to the Orders page
   - Click "Create Order" button
   - **Do not use the mouse from this point forward**

2. **Test Progress Indicator Navigation**
   - Press `Tab` until focus reaches the first progress step
   - Verify visible focus indicator appears
   - Press `Tab` to move through all steps
   - Press `Enter` on a completed step (if any)
   - Verify navigation works correctly

3. **Test Step 1: Customer Selection**
   - Press `Tab` to reach the search input
   - Type a search term
   - Press `Tab` to reach filter buttons
   - Press `Enter` or `Space` to activate a filter
   - Press `Tab` to reach customer cards
   - Press `Enter` or `Space` to select a customer
   - Verify customer is selected

4. **Test Navigation Controls**
   - Press `Tab` until focus reaches "Continue" button
   - Press `Enter` to proceed to next step
   - Verify step changes
   - Press `Tab` to reach "Back" button
   - Press `Enter` to go back
   - Verify step changes back

5. **Test Step 2: Address Information**
   - Press `Tab` through all form fields
   - Enter data in each field
   - Press `Tab` to reach "Same as billing" checkbox
   - Press `Space` to toggle checkbox
   - Press `Tab` to reach "Save" buttons
   - Press `Enter` to save addresses

6. **Test Step 3: Product Selection**
   - Press `Tab` to navigate through product cards
   - Press `Enter` to add a product
   - In the modal, press `Tab` through size options
   - Press `Tab` to quantity controls
   - Press `Enter` to increase/decrease quantity
   - Press `Tab` to "Add to Cart" button
   - Press `Enter` to add to cart
   - Press `Tab` to cart items
   - Press `Tab` to "Remove" button
   - Press `Enter` to remove item (if desired)

7. **Test Order Summary**
   - Press `Tab` to reach "Items in order" button
   - Press `Enter` to expand/collapse items
   - Press `Tab` to "Edit items" button
   - Press `Enter` to navigate to products step

8. **Test Step 4: Review Order**
   - Press `Tab` through all review sections
   - Press `Tab` to "Edit" buttons
   - Press `Enter` to navigate to edit step

9. **Test Step 5: Payment**
   - Press `Tab` to payment method cards
   - Press `Enter` to select payment method
   - Press `Tab` through payment form fields
   - Press `Tab` to checkboxes
   - Press `Space` to check/uncheck
   - Press `Tab` to "Place Order" button
   - Press `Enter` to submit (or cancel test)

### Expected Results
- ✅ All interactive elements are reachable via keyboard
- ✅ Focus indicators are clearly visible
- ✅ Tab order is logical and follows visual layout
- ✅ Enter/Space activates buttons and controls
- ✅ No keyboard traps (can always navigate away)
- ✅ Focus moves appropriately after actions

## Test 2: Screen Reader Testing

### Objective
Verify that screen reader users can understand and navigate the wizard.

### Steps (NVDA on Windows)

1. **Start NVDA**
   - Press `Ctrl + Alt + N` to start NVDA
   - Navigate to the Order Creation Wizard

2. **Test Landmarks**
   - Press `D` to navigate by landmark
   - Verify main, navigation, and complementary landmarks are announced
   - Verify landmark labels are descriptive

3. **Test Headings**
   - Press `H` to navigate by heading
   - Verify all major sections have headings
   - Verify heading hierarchy is logical

4. **Test Form Fields**
   - Press `F` to navigate by form field
   - Verify each field has a descriptive label
   - Verify required fields are announced as required
   - Enter invalid data and verify error messages are announced

5. **Test Buttons**
   - Press `B` to navigate by button
   - Verify all buttons have descriptive labels
   - Verify button states (disabled, pressed) are announced

6. **Test Lists**
   - Press `L` to navigate by list
   - Verify customer grid and cart items are announced as lists
   - Verify list item count is announced

7. **Test Progress Indicator**
   - Navigate to progress indicator
   - Verify current step is announced
   - Verify step status (completed, active, pending) is announced

8. **Test Validation Errors**
   - Trigger a validation error (e.g., try to continue without required data)
   - Verify error is announced immediately
   - Verify error message is descriptive

### Expected Results
- ✅ All content is announced by screen reader
- ✅ Landmarks provide clear navigation structure
- ✅ Form fields have descriptive labels
- ✅ Buttons have descriptive labels
- ✅ Lists are properly announced
- ✅ Current step and status are clear
- ✅ Errors are announced immediately
- ✅ No confusing or missing information

## Test 3: Visual Accessibility

### Objective
Verify visual accessibility features.

### Steps

1. **Test Zoom**
   - Press `Ctrl +` (or `Cmd +` on Mac) to zoom to 200%
   - Verify all content is still visible and usable
   - Verify no horizontal scrolling is required
   - Verify text doesn't overlap

2. **Test High Contrast Mode**
   - Windows: Press `Left Alt + Left Shift + Print Screen`
   - Verify all content is visible in high contrast
   - Verify focus indicators are visible
   - Verify borders and separators are visible

3. **Test Focus Indicators**
   - Navigate through wizard using Tab
   - Verify focus indicator is visible on every interactive element
   - Verify focus indicator has sufficient contrast
   - Verify focus indicator is not obscured by other elements

4. **Test Color Contrast**
   - Use a color contrast checker tool
   - Verify text has at least 4.5:1 contrast ratio
   - Verify large text has at least 3:1 contrast ratio
   - Verify focus indicators have at least 3:1 contrast ratio

5. **Test Touch Targets**
   - Use browser developer tools to measure elements
   - Verify all buttons are at least 44x44 pixels
   - Verify adequate spacing between touch targets

### Expected Results
- ✅ Content is usable at 200% zoom
- ✅ All content visible in high contrast mode
- ✅ Focus indicators are always visible
- ✅ Color contrast meets WCAG AA standards
- ✅ Touch targets are at least 44x44 pixels

## Test 4: Assistive Technology Compatibility

### Objective
Verify compatibility with various assistive technologies.

### Steps

1. **Test with Different Screen Readers**
   - Test with NVDA (Windows)
   - Test with JAWS (Windows)
   - Test with VoiceOver (macOS)
   - Verify consistent behavior across readers

2. **Test with Voice Control**
   - Enable voice control (e.g., Windows Speech Recognition)
   - Try to navigate and interact using voice commands
   - Verify all interactive elements can be activated by voice

3. **Test with Screen Magnification**
   - Enable screen magnification (e.g., Windows Magnifier)
   - Navigate through wizard
   - Verify content remains usable when magnified

### Expected Results
- ✅ Works with multiple screen readers
- ✅ Voice control can activate all interactive elements
- ✅ Content is usable with screen magnification

## Test 5: Error Handling and Validation

### Objective
Verify that errors are accessible and helpful.

### Steps

1. **Test Required Field Validation**
   - Try to continue without filling required fields
   - Verify error message appears
   - Verify error is announced to screen reader
   - Verify error message is specific and actionable

2. **Test Format Validation**
   - Enter invalid email address
   - Enter invalid ZIP code
   - Verify format errors are clear
   - Verify errors are announced

3. **Test Error Summary**
   - Trigger multiple validation errors
   - Verify error summary appears at top of step
   - Verify all errors are listed
   - Verify errors are announced

4. **Test Error Recovery**
   - Fix validation errors
   - Verify error messages disappear
   - Verify success is indicated
   - Verify focus management is appropriate

### Expected Results
- ✅ Errors are clearly indicated
- ✅ Errors are announced to screen readers
- ✅ Error messages are specific and actionable
- ✅ Error summary lists all errors
- ✅ Errors disappear when fixed
- ✅ Focus management helps error recovery

## Common Issues and Solutions

### Issue: Focus indicator not visible
**Solution**: Check CSS for outline or focus styles. Ensure sufficient contrast.

### Issue: Screen reader not announcing content
**Solution**: Check for proper ARIA labels and roles. Verify semantic HTML.

### Issue: Keyboard trap
**Solution**: Ensure all modals and overlays can be closed with Escape key.

### Issue: Tab order is confusing
**Solution**: Check DOM order matches visual order. Avoid using tabindex > 0.

### Issue: Touch targets too small
**Solution**: Ensure min-height and min-width of 44px on all interactive elements.

## Reporting Issues

When reporting accessibility issues, please include:
1. Description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Assistive technology used (if applicable)
6. Browser and version
7. Operating system

## Resources

- [NVDA Screen Reader](https://www.nvaccess.org/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

## Automated Testing

While manual testing is essential, consider using automated tools:

```bash
# Run Lighthouse accessibility audit
npm run lighthouse

# Run axe-core tests
npm run test:a11y
```

Note: Automated tools catch only ~30% of accessibility issues. Manual testing is essential.
