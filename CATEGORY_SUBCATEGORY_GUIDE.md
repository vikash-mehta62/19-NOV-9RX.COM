# Category & Subcategory Management Guide

## Overview
This guide explains how to use the new category and subcategory system in the Add Product modal.

## Database Setup

### 1. Run SQL Queries
Execute the SQL queries in `SQL_QUERIES.sql` file in your Supabase SQL Editor:

```sql
-- This will create:
-- 1. subcategory_configs table
-- 2. Insert predefined categories
-- 3. Insert predefined subcategories
```

The SQL file includes:
- Table creation for `subcategory_configs`
- RLS policies
- Insert statements for all categories and subcategories
- Useful query examples for management

### 2. Categories Structure
The following categories and subcategories are pre-configured:

#### CONTAINERS & CLOSURES
- PUSH DOWN & TURN
- THUMB – CLICK
- LIQUID BOTTLES
- OINTMENT JARS

#### RX LABELS
- DIRECT THERMAL RX LABELS
- LASER LABELS

#### COMPLIANCE PACKAGING
- HEAT SEAL CARDS – SINGLE DOSE
- COLD SEAL CARDS – SINGLE DOSE
- BLISTERS – SINGLE DOSE
- COLD SEAL LABELS – MULTI DOSE
- BLISTERS – MULTI DOSE
- COLD SEAL BLISTER & CARDS COMBO – MULTI DOSE

#### RX PAPER BAGS
- FLAT BOTTOM STOCK RX BAGS
- SQUARE BOTTOM STOCK RX BAGS

#### ORAL SYRINGES & ACCESSORIES
- ORAL SYRINGES
- FITMENTS & ADAPTERS

#### OTHER SUPPLY
- MEDICINE SHIPPING SUPPLY
- CORRUGATED BOXES

## Features

### 1. Add Product Modal
When adding a new product:
1. Select a **Category** from the dropdown
2. Choose a **Subcategory** using tabs:
   - **Select Tab**: Choose from predefined subcategories for the selected category
   - **Custom Tab**: Enter a custom subcategory name

### 2. Category Management (Admin Settings)
Navigate to **Admin Settings** to manage categories and subcategories:

#### Add Category
1. Click "Add Category" button
2. Enter category name
3. Click "Add"

#### Edit Category
1. Click the edit icon next to a category
2. Modify the category name
3. Click "Update"

#### Add Subcategory
1. Select a category from the dropdown
2. Click "Add Subcategory" button
3. Enter subcategory name
4. Click "Add"

#### Edit Subcategory
1. Select a category to view its subcategories
2. Click the edit icon next to a subcategory
3. Modify the subcategory name
4. Click "Update"

## Technical Details

### Database Tables

#### category_configs
```sql
- id (bigserial)
- category_name (text, unique)
- size_units (text[])
- default_unit (text)
- has_rolls (boolean)
- requires_case (boolean)
```

#### subcategory_configs
```sql
- id (bigserial)
- category_name (text)
- subcategory_name (text)
- created_at (timestamp)
- updated_at (timestamp)
- UNIQUE(category_name, subcategory_name)
```

### Product Schema
The product schema now includes:
```typescript
{
  category: string
  subcategory?: string  // Optional field
}
```

## Usage Examples

### Adding a Product with Subcategory
1. Open Add Product modal
2. Select "CONTAINERS & CLOSURES" as category
3. In subcategory field, switch to "Select" tab
4. Choose "LIQUID BOTTLES" from dropdown
5. Fill in other product details
6. Save

### Adding a Product with Custom Subcategory
1. Open Add Product modal
2. Select "OTHER SUPPLY" as category
3. In subcategory field, switch to "Custom" tab
4. Type "Custom Packaging Material"
5. Fill in other product details
6. Save

## Notes
- Subcategories are filtered based on the selected category
- You must select a category before choosing/entering a subcategory
- Custom subcategories are not saved to the database automatically
- Only predefined subcategories from the database appear in the "Select" tab
- The system automatically refreshes category data when changes are made
