# Size-Based Inventory Management System

## Overview
A comprehensive inventory management system that allows tracking and managing stock at the size variation level for each product.

## Features Implemented

### 1. Size Inventory Service (`src/services/sizeInventoryService.ts`)
Core service for managing size-level inventory operations:
- **Update Size Inventory**: Modify stock, pricing, SKU, and pharmaceutical codes
- **Adjust Size Stock**: Increase/decrease stock with reason tracking
- **Low Stock Alerts**: Get sizes below threshold
- **Bulk Operations**: Update multiple sizes simultaneously
- **Statistics**: Get comprehensive inventory metrics

### 2. Size Inventory Table (`src/components/inventory/SizeInventoryTable.tsx`)
Main dashboard component featuring:
- **Stats Cards**: Total products, sizes, low stock count, total value
- **Expandable Product Rows**: Click to view all size variations
- **Search & Filter**: Search by product name, SKU, category, or size
- **Stock Status Indicators**: Color-coded badges (Out of Stock, Critical, Low, Medium, Good)
- **CSV Export**: Export all inventory data
- **Inline Editing**: Click edit button on any size to modify

### 3. Size Stock Edit Modal (`src/components/inventory/SizeStockEditModal.tsx`)
Comprehensive editing interface with two tabs:

#### Details Tab
- **Stock Information**: Current stock, quantity per case
- **Pricing**: Price per unit, price per case
- **Product Details**: SKU, NDC code, UPC code, lot number, expiry date

#### Quick Adjust Tab
- **Stock Adjustment**: Increase or decrease stock
- **Reason Codes**: Damaged, Expired, Theft, Found, Correction, Return, Sample, Write Off, Received, Other
- **Notes**: Add detailed notes for audit trail
- **Live Preview**: See new stock level before applying

### 4. Size Low Stock Alerts (`src/components/inventory/SizeLowStockAlerts.tsx`)
Dedicated alert system for sizes:
- **Critical Alerts**: Sizes with 5 or fewer units
- **Warning Alerts**: Sizes with 6-20 units
- **Visual Progress Bars**: Stock level visualization
- **Product Context**: Shows parent product name and category
- **Quick Actions**: Reorder button for each size

### 5. Enhanced Inventory Page (`src/pages/admin/Inventory.tsx`)
Tabbed interface with four sections:
1. **Size Inventory**: Main size-level management table
2. **Low Stock**: Combined view of size and product alerts
3. **Reports**: Existing inventory reports
4. **Expiry**: Expiry alerts dashboard

## How to Use

### Viewing Inventory
1. Navigate to Admin → Inventory Management
2. Default view shows "Size Inventory" tab
3. See stats cards at top: Total Products, Total Sizes, Low Stock Sizes, Total Value
4. Browse products in the table

### Expanding Product Details
1. Click the chevron icon in the "Actions" column
2. View all size variations in a grid layout
3. Each size card shows:
   - Size value and unit
   - Stock status badge
   - Current stock
   - Price
   - Quantity per case
   - Edit button

### Editing Size Inventory
1. Click "Edit Inventory" button on any size card
2. Choose between two tabs:
   - **Details**: Update all size information
   - **Quick Adjust**: Fast stock adjustments

#### Using Details Tab
1. Modify stock, pricing, or product details
2. Update pharmaceutical codes (NDC, UPC, Lot Number, Expiry)
3. Click "Save Changes"

#### Using Quick Adjust Tab
1. Select adjustment type (Increase/Decrease)
2. Enter quantity
3. Select reason code
4. Add optional notes
5. Preview new stock level
6. Click "Apply Adjustment"

### Monitoring Low Stock
1. Click "Low Stock" tab
2. View size-level alerts on the left
3. View product-level alerts on the right
4. Critical items (≤5 units) shown in red
5. Warning items (6-20 units) shown in amber

### Searching Inventory
1. Use search bar in Size Inventory tab
2. Search by:
   - Product name
   - Product SKU
   - Category
   - Size value
   - Size SKU

### Exporting Data
1. Click "Export" button in Size Inventory table
2. Downloads CSV with all inventory data
3. Includes: Product name, SKU, size details, stock, pricing

## Database Schema

### product_sizes Table
Key fields used:
- `id`: Unique identifier
- `product_id`: Parent product reference
- `size_value`: Size value (e.g., "500")
- `size_unit`: Unit (e.g., "ml", "count")
- `sku`: Size-specific SKU
- `price`: Price per unit
- `price_per_case`: Case pricing
- `stock`: Current stock level
- `quantity_per_case`: Units per case
- `ndcCode`: National Drug Code
- `upcCode`: Universal Product Code
- `lotNumber`: Batch/lot number
- `exipry`: Expiration date

## Stock Status Levels

| Stock Level | Status | Color | Badge |
|------------|--------|-------|-------|
| 0 | Out of Stock | Red | bg-red-500 |
| 1-10 | Critical | Red | bg-red-400 |
| 11-20 | Low | Amber | bg-amber-400 |
| 21-50 | Medium | Blue | bg-blue-400 |
| 51+ | Good | Green | bg-emerald-400 |

## Reason Codes for Adjustments

1. **Damaged Goods**: Products damaged in storage/transit
2. **Expired Products**: Items past expiration date
3. **Theft/Loss**: Missing inventory
4. **Found Inventory**: Discovered during cycle count
5. **System Correction**: Fix data entry errors
6. **Customer Return**: Returned items
7. **Sample/Demo**: Used for samples
8. **Write Off**: Permanent removal
9. **Received Stock**: New stock received
10. **Other**: Custom reason with notes

## Best Practices

### Stock Management
- Update stock immediately after receiving shipments
- Use Quick Adjust for fast updates
- Always select appropriate reason code
- Add notes for significant adjustments

### Low Stock Monitoring
- Check Low Stock tab daily
- Set reorder points appropriately
- Monitor critical items (≤5 units) closely
- Plan reorders for warning items (6-20 units)

### Data Accuracy
- Keep pharmaceutical codes updated
- Verify expiry dates regularly
- Maintain accurate pricing
- Update SKUs when changed

### Reporting
- Export data regularly for backup
- Review inventory reports weekly
- Track stock movement trends
- Monitor expiry alerts

## Future Enhancements (Not Yet Implemented)

### Planned Features
1. **Batch Operations**: Select multiple sizes for bulk updates
2. **Stock Transfer**: Move stock between sizes
3. **Reorder Automation**: Auto-generate purchase orders
4. **Analytics**: Size-level sales performance
5. **Barcode Integration**: Scan to update inventory
6. **Mobile App**: Mobile inventory management
7. **Real-time Sync**: Live updates across users
8. **Audit Trail**: Complete history of all changes

## Troubleshooting

### Issue: Stock not updating
- Check browser console for errors
- Verify database connection
- Ensure proper permissions

### Issue: Low stock alerts not showing
- Verify threshold settings (default: 20 units)
- Check if sizes have stock data
- Refresh the page

### Issue: Export not working
- Check browser popup blocker
- Verify CSV download permissions
- Try different browser

## Technical Details

### Technologies Used
- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **State Management**: React hooks
- **Notifications**: Sonner toast

### Performance Optimizations
- Lazy loading for large datasets
- Debounced search
- Optimistic UI updates
- Efficient database queries
- Pagination ready (not yet implemented)

## Support

For issues or questions:
1. Check this documentation
2. Review console logs
3. Verify database schema
4. Test with sample data
5. Contact development team

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready
