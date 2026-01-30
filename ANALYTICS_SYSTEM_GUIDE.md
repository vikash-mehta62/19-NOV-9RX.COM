# Analytics & Reporting System - Admin Guide

## Overview
A comprehensive analytics and reporting system for admin users to analyze business performance, generate reports, and make data-driven decisions.

## Features

### 1. **Product Analytics**
- Top performing products by revenue
- Sales by category (pie chart)
- Product performance details table
- Key metrics:
  - Total revenue from products
  - Units sold
  - Unique products sold
  - Average order value

### 2. **Store Analytics**
- Top 20 stores by revenue
- Revenue trend over time
- Store performance details
- Key metrics:
  - Total stores
  - Active stores (with orders)
  - Total revenue
  - Average revenue per store

### 3. **Sales vs Purchase Analytics**
- Monthly comparison of sales and purchases
- Gross profit calculation
- Profit margin trends
- AR Aging analysis
- Key metrics:
  - Total sales revenue
  - Total purchase costs
  - Gross profit
  - Profit margin percentage

### 4. **Report Generator**
Generate and export detailed reports in Excel or CSV format:

#### Available Reports:
1. **Sales Report**
   - Complete sales analysis with orders and revenue
   - Customer details
   - Payment status
   - Order items

2. **Product Performance Report**
   - Product-wise sales analysis
   - Category breakdown
   - Revenue and quantity metrics

3. **Store Performance Report**
   - Store/pharmacy-wise performance
   - Order counts and revenue
   - Payment tracking

4. **Financial Summary Report**
   - Monthly sales vs purchase comparison
   - Profit analysis
   - Margin calculations

5. **Inventory Report** (Coming soon)
   - Stock levels
   - Inventory valuation

6. **Customer Analysis** (Coming soon)
   - Customer behavior
   - Purchase patterns

## How to Use

### Accessing Analytics
1. Login as admin
2. Navigate to **System > Analytics** in the sidebar
3. Select date range using the date picker

### Viewing Analytics
- Use tabs to switch between different analytics views:
  - **Overview**: Sales vs Purchase comparison
  - **Products**: Product performance metrics
  - **Stores**: Store performance analysis
  - **Reports**: Generate and export reports

### Generating Reports
1. Go to the **Reports** tab
2. Select report type
3. Choose export format (Excel or CSV)
4. Configure options (include details, etc.)
5. Click **Generate Report**
6. Report will be downloaded automatically

### Date Range Selection
- Use the date picker to select custom date ranges
- Quick presets available:
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - This Year

### Refreshing Data
- Click the **Refresh** button to reload latest data
- Data is automatically fetched when changing date ranges

## Technical Details

### Components Structure
```
src/pages/admin/Analytics.tsx                    # Main analytics page
src/components/admin/analytics/
  ├── ProductAnalytics.tsx                       # Product performance
  ├── StoreAnalytics.tsx                         # Store performance
  ├── SalesVsPurchaseAnalytics.tsx              # Financial analysis
  ├── ReportGenerator.tsx                        # Report generation
  ├── DateRangePicker.tsx                        # Date range selector
  └── index.ts                                   # Exports
```

### Data Sources
- **Orders**: `orders` table with order items
- **Products**: `products` table with sizes and pricing
- **Stores**: `profiles` table (pharmacy, hospital, group types)
- **Inventory**: `product_sizes` table with stock data

### Export Formats
- **Excel (.xlsx)**: Full formatting, auto-sized columns
- **CSV (.csv)**: Plain text, compatible with all spreadsheet apps

### Dependencies
- `recharts`: Charts and visualizations
- `xlsx`: Excel file generation
- `date-fns`: Date formatting
- `react-day-picker`: Date range picker

## Future Enhancements

### Planned Features:
1. **Real-time Dashboard**
   - Live updates using Supabase subscriptions
   - Real-time sales tracking

2. **Advanced Filters**
   - Filter by category, store type, payment status
   - Multi-select filters

3. **Predictive Analytics**
   - Sales forecasting
   - Inventory predictions
   - Trend analysis

4. **Custom Reports**
   - Build custom reports with drag-and-drop
   - Save report templates
   - Schedule automated reports

5. **Email Reports**
   - Schedule reports to be emailed
   - Daily/weekly/monthly summaries

6. **Comparison Views**
   - Year-over-year comparison
   - Period-over-period analysis

7. **Export to PDF**
   - PDF reports with charts
   - Professional formatting

## Performance Optimization

### Current Optimizations:
- Efficient database queries with proper indexing
- Data aggregation at query level
- Lazy loading of components
- Memoized calculations

### Best Practices:
- Use appropriate date ranges (avoid very large ranges)
- Refresh data only when needed
- Export reports during off-peak hours for large datasets

## Troubleshooting

### Common Issues:

**No data showing:**
- Check date range selection
- Verify orders exist in the selected period
- Check database connection

**Slow loading:**
- Reduce date range
- Check network connection
- Clear browser cache

**Export fails:**
- Check browser download settings
- Ensure sufficient disk space
- Try different export format

**Charts not displaying:**
- Refresh the page
- Check browser console for errors
- Ensure data is available for the period

## Support

For issues or feature requests:
1. Check this documentation
2. Review error messages in browser console
3. Contact development team

## Version History

### v1.0.0 (Current)
- Initial release
- Product, Store, and Financial analytics
- Report generation (Excel/CSV)
- Date range filtering
- Responsive design

---

**Last Updated**: January 2026
**Maintained By**: Development Team
