# Order Statement Components

This directory contains components and services for generating and downloading order statements in PDF format.

## Structure

```
src/components/order-statement/
├── OrderStatementDateSelector.tsx  # Date range selection component
├── index.ts                       # Component exports
├── __tests__/
│   └── integration.test.ts        # Integration tests
└── README.md                      # This file

src/services/
└── orderStatementService.ts       # Order data fetching and processing service

src/types/
└── orderStatement.ts              # TypeScript interfaces and types

src/utils/
└── orderPDFConfig.ts              # PDF configuration and formatting utilities

src/test/
└── setup.ts                       # Test setup configuration
```

## Components

### OrderStatementDateSelector
- Provides date range selection interface
- Validates date ranges according to requirements
- Handles user interactions for statement generation
- Requirements: 1.2, 1.3, 1.4, 1.5, 5.2

## Services

### OrderStatementGenerationService
- Fetches order data from Supabase
- Validates financial calculations
- Generates order statement data structures
- Requirements: 3.1, 3.2, 3.3, 3.4

## Configuration

### PDF Configuration (orderPDFConfig.ts)
- Landscape A4 format settings
- Professional styling and colors
- Currency formatting utilities
- Table structure and layout
- Requirements: 2.1, 2.2, 2.4, 6.1, 6.2, 6.3, 6.4

## Testing

### Test Framework Setup
- Vitest configuration for property-based testing
- Fast-check library for property generation
- JSdom environment for component testing
- Mock Supabase client for isolated testing

### Test Files
- `orderStatementService.test.ts` - Service unit tests
- `integration.test.ts` - Component integration tests

## Usage

```typescript
import { OrderStatementDateSelector } from '@/components/order-statement';
import { orderStatementService } from '@/services/orderStatementService';

// Use the date selector component
<OrderStatementDateSelector
  onDateRangeChange={(start, end) => console.log('Date range:', start, end)}
  onDownload={(start, end) => handleDownload(start, end)}
  isGenerating={false}
/>

// Use the service directly
const response = await orderStatementService.generateOrderStatementData({
  userId: 'user-id',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  includeZeroActivity: true
});
```

## Requirements Mapping

- **1.1, 2.1, 3.1**: Project structure and interfaces ✅
- **1.2, 1.3, 1.4, 1.5**: Date range selection and validation ✅
- **2.1, 2.2, 2.4**: PDF configuration and formatting ✅
- **3.1, 3.2, 3.3, 3.4**: Order data fetching and processing ✅
- **5.2**: Calendar widget functionality ✅
- **6.1, 6.2, 6.3, 6.4**: Professional PDF appearance ✅

## Next Steps

This completes Task 1 setup. The following tasks will build upon this foundation:

1. **Task 2**: Implement the date selector component UI integration
2. **Task 3**: Complete order data service implementation
3. **Task 4**: Create landscape PDF generator
4. **Task 5**: Implement currency formatting and summary sections
5. **Task 6**: Add PDF download mechanism
6. **Task 7**: Add loading states and user feedback
7. **Task 8**: Integrate into user profile Orders tab