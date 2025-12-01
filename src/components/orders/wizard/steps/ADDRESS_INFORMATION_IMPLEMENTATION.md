# Address Information Step Implementation

## Overview
The Address Information step (Step 2) of the order creation wizard allows administrators to enter billing and shipping addresses for an order.

## Features Implemented

### 1. Billing Address Card
- Company name field (optional)
- Attention field (optional)
- Street address field (required)
- City, State, ZIP code fields (required)
- Inline editing with save button
- Edit button when address is saved
- Validation for all required fields
- ZIP code format validation (12345 or 12345-6789)

### 2. Shipping Address Card
- Full name field (required) - auto-populated from customer
- Email field (required) - auto-populated from customer
- Phone field (required) - auto-populated from customer
- Street address field (required)
- City, State, ZIP code fields (required)
- Inline editing with save button
- Edit button when address is saved
- Validation for all required fields
- Email format validation
- ZIP code format validation

### 3. "Same as Billing" Functionality
- Checkbox to copy billing address to shipping address
- Automatically populates shipping address fields
- Disables shipping address editing when checked
- Maintains customer contact information (name, email, phone)
- Visual indicator when addresses match

### 4. Validation
- Real-time field validation
- Required field validation
- Email format validation
- ZIP code format validation (5 digits or 5+4 format)
- Error messages displayed inline below fields
- Red border on invalid fields
- Prevents navigation to next step if validation fails

### 5. Responsive Design
- Two-column layout on desktop (billing | shipping)
- Stacked layout on mobile
- Touch-friendly input fields
- Proper spacing and padding

### 6. User Experience
- Auto-population of customer information
- Clear visual feedback for editing state
- Blue border on cards being edited
- Green checkmark icon on save buttons
- Alert messages when addresses are not entered
- Smooth transitions between edit and view modes

## Component Structure

```typescript
AddressInformationStep
├── Billing Address Card
│   ├── Header (with edit button)
│   ├── Form Fields (when editing)
│   │   ├── Company Name
│   │   ├── Attention
│   │   ├── Street Address *
│   │   ├── City *
│   │   ├── State *
│   │   └── ZIP Code *
│   └── Display View (when saved)
└── Shipping Address Card
    ├── Header (with edit button)
    ├── "Same as Billing" Checkbox
    ├── Form Fields (when editing)
    │   ├── Full Name *
    │   ├── Email *
    │   ├── Phone *
    │   ├── Street Address *
    │   ├── City *
    │   ├── State *
    │   └── ZIP Code *
    └── Display View (when saved)
```

## Props Interface

```typescript
interface AddressInformationStepProps {
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  onBillingAddressChange: (address: BillingAddress) => void;
  onShippingAddressChange: (address: ShippingAddress) => void;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}
```

## Data Types

```typescript
interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

interface BillingAddress extends Address {
  company_name?: string;
  attention?: string;
}

interface ShippingAddress extends Address {
  fullName: string;
  email: string;
  phone: string;
}
```

## Integration with Wizard

The component is integrated into the OrderCreationWizard:
- Renders on step 2
- Receives customer information from step 1
- Validates addresses before allowing navigation to step 3
- Stores address data in wizard form state
- Continue button is disabled until both addresses are valid

## Validation Rules

### Billing Address
- Street: Required, non-empty
- City: Required, non-empty
- State: Required, non-empty
- ZIP Code: Required, must match format `\d{5}(-\d{4})?`

### Shipping Address
- Full Name: Required, non-empty
- Email: Required, must be valid email format
- Phone: Required, non-empty
- Street: Required, non-empty
- City: Required, non-empty
- State: Required, non-empty
- ZIP Code: Required, must match format `\d{5}(-\d{4})?`

## Usage Example

```typescript
<AddressInformationStep
  billingAddress={billingAddress}
  shippingAddress={shippingAddress}
  onBillingAddressChange={handleBillingAddressChange}
  onShippingAddressChange={handleShippingAddressChange}
  customerName={selectedCustomer?.name}
  customerEmail={selectedCustomer?.email}
  customerPhone={selectedCustomer?.phone}
/>
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **1.1**: Multi-step wizard interface with address step
- **1.2**: Progress indicator shows address step
- **1.5**: Data preservation when navigating between steps
- **3.1-3.5**: Responsive design for all screen sizes
- **5.1**: Customer information displayed in cards
- **5.2**: Billing address in separate card with edit button
- **5.3**: Shipping address with "Same as billing" option
- **5.4**: Inline editing without navigation

## Future Enhancements

1. Address autocomplete/validation using Google Places API
2. Save multiple addresses to customer profile
3. Address book for quick selection
4. International address support
5. Address verification service integration
