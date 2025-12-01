# Design Document

## Overview

This design document outlines the transformation of the order creation interface from a narrow sidebar (Sheet component) to a full-width, multi-step wizard interface. The new design will provide a modern, intuitive user experience with clear visual feedback, responsive layouts, and efficient data entry workflows.

The redesign focuses purely on UI/UX improvements without modifying the underlying business logic, data structures, or API interactions. All existing functionality will be preserved while presenting it in a more user-friendly format.

## Architecture

### Component Structure

```
OrderCreationWizard (New)
├── WizardProgressIndicator
│   └── StepIndicator (x5)
├── WizardContent
│   ├── Step1: CustomerSelection
│   ├── Step2: AddressInformation
│   ├── Step3: ProductSelection
│   ├── Step4: ReviewOrder
│   └── Step5: PaymentConfirmation
├── OrderSummaryCard (Persistent)
│   ├── ItemsCount
│   ├── PricingBreakdown
│   └── TotalAmount
└── WizardNavigation
    ├── BackButton
    └── ContinueButton / PlaceOrderButton
```

### Integration Points

The new wizard will integrate with existing components:
- **CreateOrderForm**: Will be refactored to use the wizard wrapper
- **OrderItemsSection**: Will be embedded in Step 3
- **PaymentSection**: Will be embedded in Step 5
- **ShippingSection**: Will be embedded in Step 2
- **CustomerSelectionField**: Will be embedded in Step 1

### State Management

- Wizard state (current step, completed steps) will be managed locally using React useState
- Form data will continue to use react-hook-form as currently implemented
- Cart state will continue to use the existing useCart hook
- All existing Redux state management will remain unchanged

## Components and Interfaces

### 1. WizardProgressIndicator

**Purpose**: Display visual progress through the order creation steps

**Props**:
```typescript
interface WizardProgressIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  steps: WizardStep[];
  onStepClick?: (stepNumber: number) => void;
}

interface WizardStep {
  number: number;
  label: string;
  icon: React.ComponentType;
  description: string;
}
```

**Visual Design**:
- Horizontal layout on desktop, vertical on mobile
- Each step shows: circle with icon, step label, connecting line
- Color coding:
  - Completed: Green (#10B981) with checkmark
  - Active: Blue (#3B82F6) with step icon
  - Pending: Gray (#9CA3AF) with step icon
- Connecting lines match the state of the previous step

### 2. OrderSummaryCard

**Purpose**: Persistent sidebar showing order totals and item count

**Props**:
```typescript
interface OrderSummaryCardProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  onEditItems?: () => void;
}
```

**Visual Design**:
- Fixed position on right side (desktop) or bottom (mobile)
- White card with shadow
- Sections:
  - Header: "Order Summary" with items count badge
  - Items list (collapsible)
  - Pricing breakdown (Subtotal, Tax, Shipping)
  - Total amount (prominent, green color)
  - Notes about tax calculation and shipping

### 3. CustomerSelectionStep

**Purpose**: Step 1 - Select or create customer

**Features**:
- Search bar for existing customers
- Customer cards with name, email, phone, type badge
- "Add New Customer" button
- Selected customer details card with edit option

**Layout**:
- Search input at top
- Grid of customer cards (2-3 columns on desktop)
- Selected customer highlighted with blue border
- Details card appears below when customer selected

### 4. AddressInformationStep

**Purpose**: Step 2 - Enter billing and shipping addresses

**Features**:
- Two-column layout (Billing | Shipping)
- Each address in a card with edit button
- "Same as billing address" checkbox for shipping
- Form fields: Company Name, Street Address, Apt/Suite, City, State, ZIP, Phone

**Layout**:
- Side-by-side cards on desktop
- Stacked cards on mobile
- Inline editing within cards
- Visual indicator when addresses match

### 5. ProductSelectionStep

**Purpose**: Step 3 - Add products to order

**Features**:
- Product search and filter
- Product cards grid
- "Add Item" button opens size selection modal
- Current cart items displayed below
- Customization toggle

**Modal for Size Selection**:
- Product name and image
- Available sizes list
- Type toggle (Unit/Case) for each size
- Quantity controls (+/- buttons)
- "Add to Cart" button

**Layout**:
- Search bar and filters at top
- Product grid (3-4 columns on desktop)
- Cart items section below with remove/edit options

### 6. ReviewOrderStep

**Purpose**: Step 4 - Review all order details

**Features**:
- Customer information card with edit button
- Billing address card with edit button
- Shipping address card with edit button
- Order items list with expandable size details
- Customization options display
- Order summary (read-only)

**Layout**:
- Organized in sections with clear headings
- Edit buttons navigate back to relevant step
- All information read-only except via edit buttons
- Visual hierarchy with cards and spacing

### 7. PaymentConfirmationStep

**Purpose**: Step 5 - Select payment method and confirm order

**Features**:
- Payment method selection cards (Credit Card, ACH, Net Terms, Invoice)
- Payment-specific form fields
- Order confirmation checkboxes
- Special instructions textarea
- PO number input
- Final order summary

**Layout**:
- Payment method cards in grid (2x2)
- Selected method highlighted
- Form fields appear below selection
- Confirmation section at bottom
- Prominent "Place Order" button

### 8. WizardNavigation

**Purpose**: Navigation controls at bottom of each step

**Props**:
```typescript
interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  canContinue?: boolean;
}
```

**Visual Design**:
- Fixed at bottom of wizard content
- Back button (left) - secondary style
- Continue/Place Order button (right) - primary style
- Cancel button (left, step 1 only) - ghost style
- Loading state for Place Order button

## Data Models

### WizardState

```typescript
interface WizardState {
  currentStep: number;
  completedSteps: number[];
  canNavigateToStep: (step: number) => boolean;
  markStepComplete: (step: number) => void;
  goToStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}
```

### StepValidation

```typescript
interface StepValidation {
  step: number;
  isValid: boolean;
  errors: string[];
  validate: () => Promise<boolean>;
}
```

## Error Handling

### Validation Errors

- **Step-level validation**: Each step validates its data before allowing navigation to next step
- **Field-level validation**: Individual form fields show inline error messages
- **Summary errors**: Critical errors displayed at top of step in alert component

### Error Display Patterns

1. **Inline Field Errors**: Red text below input, red border on input
2. **Step Validation Errors**: Alert banner at top of step with list of issues
3. **Submission Errors**: Toast notification with error details
4. **Network Errors**: Retry mechanism with user-friendly error messages

### Error Recovery

- Users can navigate back to fix errors
- Form data persists when navigating between steps
- Auto-save draft orders (future enhancement)
- Clear error messages with actionable guidance

## Testing Strategy

### Unit Testing

Unit tests will verify:
1. **WizardProgressIndicator**: Correct step highlighting and completion states
2. **OrderSummaryCard**: Accurate calculation of totals
3. **Step Components**: Proper rendering of form fields and data
4. **WizardNavigation**: Correct button states and navigation logic
5. **Validation Functions**: Step validation rules work correctly

### Integration Testing

Integration tests will verify:
1. **Step Navigation**: Moving between steps preserves data
2. **Form Submission**: Complete wizard flow submits correct data
3. **Customer Selection**: Selecting customer populates addresses
4. **Product Addition**: Adding products updates order summary
5. **Payment Processing**: Payment method selection shows correct fields

### Visual Regression Testing

Visual tests will verify:
1. **Responsive Layouts**: Proper display on mobile, tablet, desktop
2. **Step Transitions**: Smooth animations between steps
3. **Component States**: Hover, focus, active, disabled states
4. **Theme Consistency**: Colors, typography, spacing match design system

### Manual Testing Checklist

- [ ] Complete order creation flow from start to finish
- [ ] Navigate backward and forward between steps
- [ ] Test on mobile device (responsive layout)
- [ ] Test on tablet device (responsive layout)
- [ ] Test with different customer types (Pharmacy, Group, Hospital)
- [ ] Test product selection with various size options
- [ ] Test all payment methods
- [ ] Test form validation at each step
- [ ] Test error handling and recovery
- [ ] Test with slow network connection
- [ ] Test browser back button behavior
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility

## Implementation Notes

### Responsive Breakpoints

```css
/* Mobile: < 768px */
- Single column layout
- Vertical progress indicator
- Order summary at bottom
- Full-width buttons

/* Tablet: 768px - 1024px */
- Two-column layout where appropriate
- Horizontal progress indicator
- Order summary in sidebar
- Standard button sizing

/* Desktop: > 1024px */
- Full two-column layout
- Horizontal progress indicator
- Fixed order summary sidebar
- Optimized spacing
```

### Animation and Transitions

- Step transitions: 300ms ease-in-out
- Button hover states: 150ms ease
- Modal open/close: 200ms ease-in-out
- Progress indicator updates: 250ms ease

### Accessibility Considerations

- Keyboard navigation support (Tab, Enter, Escape)
- ARIA labels for all interactive elements
- Focus management when navigating steps
- Screen reader announcements for step changes
- High contrast mode support
- Minimum touch target size: 44x44px

### Performance Optimizations

- Lazy load product images
- Virtualize long product lists
- Debounce search inputs
- Memoize expensive calculations
- Code split wizard steps
- Optimize re-renders with React.memo

## Migration Strategy

### Phase 1: Create New Components (No Breaking Changes)

1. Create WizardProgressIndicator component
2. Create OrderSummaryCard component
3. Create individual step components
4. Create WizardNavigation component
5. Create OrderCreationWizard wrapper

### Phase 2: Integrate with Existing Form

1. Wrap CreateOrderForm with OrderCreationWizard
2. Distribute existing sections into wizard steps
3. Add wizard state management
4. Implement step validation
5. Test thoroughly in development

### Phase 3: Update OrdersContainer

1. Replace Sheet component with full-page navigation
2. Update "Create Order" button to navigate to wizard page
3. Handle navigation state and routing
4. Update cancel/back behavior
5. Test integration with orders list

### Phase 4: Polish and Optimize

1. Add animations and transitions
2. Optimize responsive layouts
3. Improve accessibility
4. Add loading states
5. Final testing and bug fixes

## Design System Integration

### Colors

```typescript
const colors = {
  primary: '#3B82F6',      // Blue - Active step, primary buttons
  success: '#10B981',      // Green - Completed steps, totals
  warning: '#F59E0B',      // Amber - Warnings
  danger: '#EF4444',       // Red - Errors
  neutral: '#9CA3AF',      // Gray - Pending steps
  background: '#F9FAFB',   // Light gray - Page background
  card: '#FFFFFF',         // White - Card backgrounds
  border: '#E5E7EB',       // Light gray - Borders
}
```

### Typography

```typescript
const typography = {
  heading1: 'text-2xl font-bold',
  heading2: 'text-xl font-semibold',
  heading3: 'text-lg font-medium',
  body: 'text-base',
  small: 'text-sm',
  tiny: 'text-xs',
}
```

### Spacing

```typescript
const spacing = {
  section: 'space-y-6',
  card: 'p-6',
  form: 'space-y-4',
  inline: 'gap-4',
}
```

## Future Enhancements

1. **Auto-save Drafts**: Automatically save order progress
2. **Order Templates**: Save frequently used orders as templates
3. **Bulk Product Addition**: Add multiple products at once
4. **Quick Reorder**: Duplicate previous orders
5. **Address Book**: Save and manage multiple addresses
6. **Payment Profiles**: Save payment methods for faster checkout
7. **Order Notes**: Add internal notes visible only to admin
8. **Approval Workflow**: Multi-step approval for large orders
9. **Real-time Inventory**: Show live stock availability
10. **Shipping Estimates**: Calculate shipping costs in real-time
