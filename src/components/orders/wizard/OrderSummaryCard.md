# OrderSummaryCard Component

## Overview

The `OrderSummaryCard` is a persistent component that displays order totals, item counts, and pricing breakdowns throughout the order creation wizard. It provides users with a clear, always-visible summary of their order.

## Features

### ✅ Implemented Features

1. **Persistent Display**
   - Sticky sidebar positioning on desktop (lg breakpoint and above)
   - Full-width positioning at bottom on mobile
   - Always visible during order creation process

2. **Items Count Badge**
   - Displays total quantity of items in cart
   - Blue badge with count
   - Automatically updates when items change

3. **Collapsible Items List**
   - Expandable/collapsible list of cart items
   - Shows product image, name, quantity, and price
   - Scrollable when list exceeds max height
   - Optional "Edit items" button

4. **Pricing Breakdown**
   - Subtotal display
   - Tax calculation display
   - Shipping cost display (shows "FREE" when $0)
   - Clear separation between line items

5. **Total Amount Display**
   - Prominent green text for total
   - Large font size (2xl)
   - Bold styling for emphasis

6. **Responsive Design**
   - Desktop: Fixed sidebar on right (sticky positioning)
   - Tablet: Maintains sidebar layout
   - Mobile: Full-width card below content
   - Touch-friendly interactions

7. **Informational Notes**
   - Tax calculation note
   - Shipping cost variation note
   - Subtle gray background for notes section

## Props Interface

```typescript
interface OrderSummaryCardProps {
  items: CartItem[];           // Array of cart items
  subtotal: number;            // Subtotal before tax and shipping
  tax: number;                 // Tax amount
  shipping: number;            // Shipping cost (0 for free)
  total: number;               // Total amount (subtotal + tax + shipping)
  onEditItems?: () => void;    // Optional callback for editing items
  className?: string;          // Optional additional CSS classes
}
```

## Usage Examples

### Basic Usage

```tsx
import { OrderSummaryCard } from "@/components/orders/wizard";
import { useCart } from "@/hooks/use-cart";

function OrderWizard() {
  const { cartItems } = useCart();
  
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const shipping = cartItems.reduce((sum, item) => sum + item.shipping_cost, 0);
  const total = subtotal + tax + shipping;

  return (
    <OrderSummaryCard
      items={cartItems}
      subtotal={subtotal}
      tax={tax}
      shipping={shipping}
      total={total}
    />
  );
}
```

### With Edit Functionality

```tsx
<OrderSummaryCard
  items={cartItems}
  subtotal={subtotal}
  tax={tax}
  shipping={shipping}
  total={total}
  onEditItems={() => navigateToProductsStep()}
/>
```

### In Wizard Layout (Desktop Sidebar)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Main content - 2 columns */}
  <div className="lg:col-span-2">
    <WizardStepContent />
  </div>
  
  {/* Order Summary - 1 column, sticky sidebar */}
  <div className="lg:col-span-1">
    <OrderSummaryCard
      items={cartItems}
      subtotal={subtotal}
      tax={tax}
      shipping={shipping}
      total={total}
      onEditItems={handleEditItems}
    />
  </div>
</div>
```

## Responsive Behavior

### Desktop (≥1024px)
- Positioned as sticky sidebar on right
- Takes 1/3 of grid width
- Sticks to top with 2rem offset
- Height adjusts to content

### Tablet (768px - 1023px)
- Similar to desktop layout
- May adjust spacing for smaller screens

### Mobile (<768px)
- Full width card
- Positioned below main content
- No sticky behavior
- Stacks vertically with other elements

## Styling

### Color Scheme
- **Background**: White (`bg-white`)
- **Border**: Gray 200 (`border-gray-200`)
- **Badge**: Blue 100 background, Blue 700 text
- **Total**: Green 600 (`text-green-600`)
- **Text**: Gray scale for hierarchy

### Typography
- **Header**: 18px, semibold
- **Total**: 24px, bold
- **Line items**: 14px, medium
- **Notes**: 12px, regular

### Spacing
- **Card padding**: 24px (p-6)
- **Section spacing**: 12px (space-y-3)
- **Item spacing**: 12px gap

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Keyboard navigable buttons
- Screen reader friendly labels
- Touch-friendly tap targets (44x44px minimum)

## Integration Points

### Cart Hook
Uses `useCart()` hook from `@/hooks/use-cart` to access cart items:
```typescript
const { cartItems } = useCart();
```

### Cart Item Type
Expects items matching the `CartItem` interface:
```typescript
interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  shipping_cost: number;
  // ... other fields
}
```

## Requirements Validation

### ✅ Requirement 1.3
"WHEN viewing the order creation interface THEN the system SHALL display an Order Summary card on the right side showing items count, subtotal, tax, shipping, and total"
- **Status**: Implemented
- Items count badge displays total quantity
- All pricing components visible
- Positioned on right side (desktop)

### ✅ Requirement 3.1
"WHEN viewing on desktop THEN the system SHALL display the form in a two-column layout with Order Summary on the right"
- **Status**: Implemented
- Uses CSS Grid with 2:1 column ratio
- Order Summary in right column
- Sticky positioning for visibility

### ✅ Requirement 3.2
"WHEN viewing on tablet THEN the system SHALL adjust the layout to maintain readability"
- **Status**: Implemented
- Responsive breakpoints handle tablet sizes
- Layout adjusts appropriately
- Maintains readability

### ✅ Requirement 3.3
"WHEN viewing on mobile THEN the system SHALL stack elements vertically and show Order Summary at the bottom"
- **Status**: Implemented
- Single column layout on mobile
- Order Summary appears below content
- Full width for mobile screens

## Testing

### Manual Testing Checklist
- [ ] Verify items count badge updates correctly
- [ ] Test collapsible items list expand/collapse
- [ ] Verify pricing calculations are accurate
- [ ] Test "Edit items" button functionality
- [ ] Verify responsive behavior on desktop
- [ ] Verify responsive behavior on tablet
- [ ] Verify responsive behavior on mobile
- [ ] Test with empty cart
- [ ] Test with free shipping (shipping = 0)
- [ ] Test with many items (scrolling)
- [ ] Verify sticky positioning on desktop
- [ ] Test keyboard navigation
- [ ] Test with screen reader

### Visual Regression Tests
- Desktop layout with sidebar
- Mobile layout stacked
- Empty cart state
- Free shipping display
- Expanded items list
- Collapsed items list

## Future Enhancements

1. **Discount Support**
   - Add discount/coupon line item
   - Show savings amount
   - Display discount code

2. **Estimated Delivery**
   - Show estimated delivery date
   - Display shipping method

3. **Save for Later**
   - Allow saving cart for future orders
   - Quick reorder functionality

4. **Print Summary**
   - Print-friendly version
   - PDF export option

5. **Currency Support**
   - Multi-currency display
   - Currency conversion

## Related Components

- `OrderCreationWizard` - Parent wizard component
- `WizardProgressIndicator` - Progress tracking
- `WizardNavigation` - Navigation controls
- `useCart` - Cart state management hook

## Files

- `OrderSummaryCard.tsx` - Main component
- `OrderSummaryCard.demo.tsx` - Demo/testing component
- `OrderSummaryCard.md` - This documentation
- `types.ts` - TypeScript interfaces
- `index.ts` - Exports
