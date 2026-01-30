# Admin Analytics Components

Smart analytics and reporting system for comprehensive business intelligence.

## Components

### 1. ProductAnalytics
Analyzes product performance with sales data, category distribution, and detailed metrics.

**Features:**
- Top 10 products by revenue (bar chart)
- Sales by category (pie chart)
- Product performance table
- Real-time stats: revenue, units sold, avg order value

**Usage:**
```tsx
<ProductAnalytics dateRange={{ from: Date, to: Date }} refresh={boolean} />
```

### 2. StoreAnalytics
Tracks store/pharmacy performance across the platform.

**Features:**
- Top 20 stores by revenue (bar chart)
- Revenue trend over time (line chart)
- Store performance details table
- Active vs total stores tracking

**Usage:**
```tsx
<StoreAnalytics dateRange={{ from: Date, to: Date }} refresh={boolean} />
```

### 3. SalesVsPurchaseAnalytics
Financial analysis comparing sales revenue with purchase costs.

**Features:**
- Sales vs Purchase comparison (composed chart)
- Profit margin trend (line chart)
- Monthly breakdown table
- Gross profit and margin calculations
- Alert for negative profit periods

**Usage:**
```tsx
<SalesVsPurchaseAnalytics dateRange={{ from: Date, to: Date }} refresh={boolean} />
```

### 4. ReportGenerator
Generate and export comprehensive reports in multiple formats.

**Features:**
- 6 report types (Sales, Products, Stores, Inventory, Financial, Customer)
- Export to Excel (.xlsx) or CSV (.csv)
- Configurable options
- Auto-sized columns in Excel
- Preview before generation

**Usage:**
```tsx
<ReportGenerator dateRange={{ from: Date, to: Date }} />
```

### 5. DateRangePicker
Date range selector with presets for easy filtering.

**Features:**
- Calendar-based date selection
- Quick presets (7, 30, 90 days, This Year)
- Dual month view
- Formatted display

**Usage:**
```tsx
<DateRangePicker 
  dateRange={{ from: Date, to: Date }}
  onDateRangeChange={(range) => setDateRange(range)}
/>
```

## Data Flow

```
User selects date range
    ↓
Component fetches data from Supabase
    ↓
Data is aggregated and processed
    ↓
Charts and tables are rendered
    ↓
User can export reports
```

## Database Queries

All components use optimized queries with:
- Date range filtering
- Void/deleted record exclusion
- Proper joins for related data
- Aggregation at database level

## Performance

- Efficient indexing (see migration file)
- Memoized calculations
- Lazy loading
- Optimized re-renders

## Customization

### Adding New Report Types

1. Add report type to `reportTypes` array in `ReportGenerator.tsx`
2. Create generation function (e.g., `generateCustomReport`)
3. Add case in `handleGenerateReport` switch statement

### Adding New Charts

1. Import chart type from `recharts`
2. Process data into required format
3. Add chart component with proper configuration
4. Style with theme colors

### Modifying Date Presets

Edit the `presets` array in `DateRangePicker.tsx`:
```tsx
const presets = [
  { label: "Custom Label", days: number }
];
```

## Dependencies

- `recharts`: ^2.x - Charts and visualizations
- `xlsx`: ^0.18.x - Excel file generation
- `date-fns`: ^2.x - Date formatting
- `react-day-picker`: ^8.x - Date picker

## Best Practices

1. **Date Ranges**: Keep ranges reasonable (< 1 year) for performance
2. **Refresh**: Only refresh when necessary to avoid excessive queries
3. **Export**: Generate reports during off-peak hours for large datasets
4. **Error Handling**: All components handle errors gracefully
5. **Loading States**: Show skeletons while data loads

## Troubleshooting

**Charts not showing:**
- Check if data array is empty
- Verify data format matches chart requirements
- Check browser console for errors

**Slow queries:**
- Reduce date range
- Check database indexes
- Review query complexity

**Export fails:**
- Check browser permissions
- Verify data is not too large
- Try different format

## Future Enhancements

- [ ] Real-time updates with Supabase subscriptions
- [ ] Advanced filtering (category, store type, etc.)
- [ ] Comparison views (YoY, MoM)
- [ ] PDF export with charts
- [ ] Scheduled email reports
- [ ] Custom report builder
- [ ] Predictive analytics
- [ ] Data export to external BI tools

## Contributing

When adding new features:
1. Follow existing component patterns
2. Add TypeScript types
3. Include loading and error states
4. Update this README
5. Add tests (when test suite is available)

---

**Version**: 1.0.0
**Last Updated**: January 2026
