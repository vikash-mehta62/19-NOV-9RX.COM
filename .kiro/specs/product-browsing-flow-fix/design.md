# Design Document

## Overview

This design fixes the product browsing flow to implement a proper eCommerce hierarchy: Categories → Products → Variations. The main page will show category cards, category pages will show filtered products with inline variations, and the product detail page remains unchanged.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Categories Page                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │CONTAINERS│ │RX LABELS│ │RX PAPER │ │  ORAL   │           │
│  │& CLOSURES│ │         │ │  BAGS   │ │SYRINGES │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
└───────┼──────────┼──────────┼──────────┼───────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Category Page                              │
│  Sidebar          │  Products Grid                           │
│  ┌──────────┐    │  ┌─────────────────────────────────┐    │
│  │Categories │    │  │ Product with sizes → Inline     │    │
│  │Subcategory│    │  │ Product without sizes → Card    │    │
│  └──────────┘    │  └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Product Detail Page                          │
│  (Existing approved layout - no changes)                     │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. CategoryBrowsePage (New Component)
- **Location**: `src/pages/pharmacy/CategoryBrowse.tsx`
- **Purpose**: Main entry page showing all categories as cards
- **Props**: None
- **State**: categories[], loading
- **Behavior**: Fetches from category_configs, displays as clickable cards

### 2. PharmacyProducts (Modified)
- **Location**: `src/pages/pharmacy/Products.tsx`
- **Purpose**: Category page showing filtered products
- **Changes**: 
  - Accept category param from URL
  - Filter products by category
  - Show inline variations for multi-size products

### 3. CategoryCard (New Component)
- **Location**: `src/components/pharmacy/components/CategoryCard.tsx`
- **Purpose**: Display single category as a card
- **Props**: category, productCount, onClick

### 4. ProductShowcase (Modified)
- **Location**: `src/components/pharmacy/ProductShowcase.tsx`
- **Changes**:
  - Accept selectedCategory prop
  - Pre-filter products by category if provided
  - Determine display mode (inline vs card) based on sizes count

## Data Models

### Existing Tables (No Changes)
```sql
-- category_configs
id, category_name, size_units, default_unit, has_rolls, requires_case

-- subcategory_configs  
id, subcategory_name, category_name

-- products
id, name, category, subcategory, base_price, image_url, sku, ...

-- product_sizes
id, product_id, size_value, size_unit, price, sku, image, ...
```

### Data Flow
1. Main Page: Fetch category_configs → Display as cards
2. Category Page: Fetch products WHERE category = selected → Display with variations
3. Product Detail: Fetch product + product_sizes WHERE product_id = id

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Category Page Shows Only Matching Products
*For any* selected category and product list, all displayed products must have a category field that matches the selected category (case-insensitive).
**Validates: Requirements 2.1, 2.2**

### Property 2: Subcategory Filter Correctness
*For any* selected subcategory and product list, all displayed products must have a subcategory field that matches the selected subcategory (case-insensitive).
**Validates: Requirements 2.4**

### Property 3: Multi-Size Products Use Inline Layout
*For any* product with sizes.length > 1, the product must be rendered using the inline variation layout component.
**Validates: Requirements 3.1**

### Property 4: Single-Size Products Use Card Layout
*For any* product with sizes.length <= 1, the product must be rendered using the single product card component.
**Validates: Requirements 3.4**

### Property 5: All Variations Share Product ID
*For any* product and its sizes, all size records must have product_id equal to the product's id.
**Validates: Requirements 5.2**

### Property 6: Main Page Shows No Products
*For any* state of the main categories page, the page must not render individual product cards or size variations.
**Validates: Requirements 1.4**

## Error Handling

- **Empty Category**: Show "No products found" message with link back to categories
- **Invalid Category**: Redirect to main categories page
- **Failed Data Fetch**: Show error toast and retry button
- **Missing Product Images**: Use placeholder image

## Testing Strategy

### Unit Tests
- CategoryCard renders correctly with props
- CategoryBrowsePage fetches and displays categories
- Product filtering by category works correctly
- Inline vs card layout selection logic

### Property-Based Tests
- Use fast-check library for property testing
- Test category filtering with random product data
- Test layout selection with random size counts
- Test subcategory filtering with random data

### Integration Tests
- Navigation from categories to category page
- Navigation from product to detail page
- Filter state persistence across navigation
