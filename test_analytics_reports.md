# Analytics Reports Testing Guide

## Testing All 6 Report Types

### Setup
1. Open the application in your browser
2. Navigate to `/admin/analytics`
3. Click on the "Reports" tab
4. Open browser console (F12) to see detailed error messages

### Test Each Report Type

#### 1. Sales Report ✓
- Select "Sales Report" radio button
- Choose format (Excel or CSV)
- Click "Generate Report"
- **Expected**: Downloads file with order details including customer names, amounts, payment status

#### 2. Product Performance ✓
- Select "Product Performance" radio button
- Choose format (Excel or CSV)
- Click "Generate Report"
- **Expected**: Downloads file with product sales data, units sold, revenue

#### 3. Store Performance ✓
- Select "Store Performance" radio button
- Choose format (Excel or CSV)
- Click "Generate Report"
- **Expected**: Downloads file with store-wise performance metrics

#### 4. Inventory Report ✓
- Select "Inventory Report" radio button
- Choose format (Excel or CSV)
- Click "Generate Report"
- **Expected**: Downloads file with stock levels, cost prices, stock values

#### 5. Financial Summary ✓
- Select "Financial Summary" radio button
- Choose format (Excel or CSV)
- Click "Generate Report"
- **Expected**: Downloads file with monthly sales vs purchase comparison

#### 6. Customer Analysis ✓
- Select "Customer Analysis" radio button
- Choose format (Excel or CSV)
- Click "Generate Report"
- **Expected**: Downloads file with customer purchase patterns, total spent, outstanding amounts

## Error Messages

All reports now have detailed error logging. If a report fails:

1. Check browser console for specific error message
2. Error will show which query failed and why
3. Common issues:
   - Missing columns in database
   - RLS policies blocking access
   - No data for selected date range

## What Was Fixed

### Previous Issues:
- ❌ Reports failing silently without error messages
- ❌ Generic "Failed to generate report" message
- ❌ No indication of which query failed

### Current Implementation:
- ✅ Detailed error messages for each query
- ✅ Console logging for debugging
- ✅ Specific error messages shown to user
- ✅ Graceful handling of empty data
- ✅ All 6 report types fully implemented

## Database Requirements

### Tables Used:
- `orders` - Main orders table
- `order_items` - Order line items
- `profiles` - Customer/store information
- `products` - Product master data
- `product_sizes` - Product variants with stock info

### Required Columns:
- `orders.poApproved` - Distinguishes purchase orders from sales orders
- `product_sizes.cost_price` - For inventory valuation
- `product_sizes.stock_quantity` - For inventory reports

## Troubleshooting

### "No Data" Message
- Check if there are orders in the selected date range
- Try expanding the date range (e.g., Last 90 days)

### "Failed to fetch..." Error
- Check RLS policies on the table mentioned in error
- Verify admin user has proper permissions
- Check if column exists in database

### Report Downloads Empty File
- This shouldn't happen with current implementation
- If it does, check console for errors
- Verify data exists in database for selected period
