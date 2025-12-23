# Requirements Document

## Introduction

This document specifies the requirements for implementing an Erply-style product hierarchy system. The system will organize products in a clear Category → Subcategory → Product structure, where each product (identified by Size like "8 DRAM", "1 OZ") can have multiple SKU variations (color variants like AMBER, WHITE). The sidebar filter will display the full hierarchy, and the product grid will properly filter based on category and subcategory selections.

## Glossary

- **Category**: Top-level product grouping (e.g., "CONTAINERS & CLOSURES", "RX LABELS", "COMPLIANCE PACKAGING")
- **Subcategory**: Second-level grouping under a category (e.g., "PUSH DOWN & TURN", "THERMAL-CLEAR", "LIQUID BOTTLES")
- **Product**: A specific item identified by its size/capacity (e.g., "8 DRAM", "1 OZ", "13 DRAM")
- **Product Size/Variant**: Individual SKU variations of a product, typically color variants (e.g., "8 DRAM AMBER", "8 DRAM WHITE")
- **SKU**: Stock Keeping Unit - unique identifier for each product variant
- **Quantity Per Case**: Number of units included in a case/bulk purchase

## Requirements

### Requirement 1: Hierarchical Category-Subcategory Structure

**User Story:** As a pharmacy user, I want products organized in a Category → Subcategory → Product hierarchy, so that I can easily navigate and find products like in Erply.

#### Acceptance Criteria

1. WHEN a user views the product catalog THEN the System SHALL display products grouped by their assigned category and subcategory
2. WHEN a category contains subcategories THEN the System SHALL show subcategories as nested items under the parent category in the filter sidebar
3. WHEN a product is created or edited THEN the System SHALL require both a category and subcategory assignment
4. WHEN a subcategory is selected THEN the System SHALL filter products to show only those belonging to that specific subcategory
5. WHEN a category is selected without a subcategory THEN the System SHALL show all products from all subcategories within that category

### Requirement 2: Sidebar Filter with Full Hierarchy Display

**User Story:** As a pharmacy user, I want the sidebar filter to show the complete Category → Subcategory hierarchy, so that I can drill down to specific product groups.

#### Acceptance Criteria

1. WHEN the filter sidebar loads THEN the System SHALL display all categories as expandable/collapsible sections
2. WHEN a user clicks on a category THEN the System SHALL expand to show all subcategories under that category
3. WHEN a user selects a subcategory THEN the System SHALL highlight both the subcategory and its parent category as active filters
4. WHEN products are filtered THEN the System SHALL display the count of products for each category and subcategory
5. WHEN a user clears filters THEN the System SHALL collapse all expanded categories and show all products

### Requirement 3: Product-Size Relationship

**User Story:** As a pharmacy user, I want each product (like "8 DRAM") to display all its size/color variants (like "8 DRAM AMBER", "8 DRAM WHITE"), so that I can see all available options.

#### Acceptance Criteria

1. WHEN a product card is displayed THEN the System SHALL show the product name (size identifier like "8 DRAM")
2. WHEN a product has multiple SKU variants THEN the System SHALL display the number of available variants on the product card
3. WHEN a user clicks on a product THEN the System SHALL show all SKU variants with their individual SKU codes, prices, and stock levels
4. WHEN displaying product variants THEN the System SHALL show the color/type as part of the variant name (e.g., "AMBER", "WHITE", "CLEAR")
5. WHEN a variant is out of stock THEN the System SHALL visually indicate the out-of-stock status while still displaying the variant

### Requirement 4: Product Display with Erply-Style Information

**User Story:** As a pharmacy user, I want each product to display SKU, color (in name), size value, and quantity per case, so that I have all ordering information visible.

#### Acceptance Criteria

1. WHEN a product variant is displayed THEN the System SHALL show the SKU code prominently
2. WHEN a product variant is displayed THEN the System SHALL show the size value and unit (e.g., "8 DRAM", "1 OZ", "16 OZ")
3. WHEN a product variant is displayed THEN the System SHALL show the quantity per case (e.g., "385/CASE", "500 LABELS/ROLL")
4. WHEN a product has a color variant THEN the System SHALL include the color in the product name or as a visible attribute
5. WHEN displaying pricing THEN the System SHALL show the price per case and optionally price per unit

### Requirement 5: Subcategory Management

**User Story:** As an admin, I want to manage subcategories and their relationship to categories, so that I can maintain the product hierarchy.

#### Acceptance Criteria

1. WHEN an admin creates a subcategory THEN the System SHALL require selecting a parent category
2. WHEN an admin views subcategories THEN the System SHALL display them grouped by their parent category
3. WHEN a category is deleted THEN the System SHALL prevent deletion if subcategories exist under it
4. WHEN a subcategory is deleted THEN the System SHALL prevent deletion if products are assigned to it
5. WHEN editing a subcategory THEN the System SHALL allow changing the parent category

### Requirement 6: Filter State Persistence

**User Story:** As a pharmacy user, I want my filter selections to persist during my session, so that I don't lose my place when navigating.

#### Acceptance Criteria

1. WHEN a user selects category and subcategory filters THEN the System SHALL maintain those selections when viewing product details and returning
2. WHEN a user refreshes the page THEN the System SHALL restore the previous filter state from the session
3. WHEN a user navigates to a different section and returns THEN the System SHALL restore the filter state
4. WHEN a user explicitly clears filters THEN the System SHALL reset all filter selections to default

### Requirement 7: Search Within Hierarchy

**User Story:** As a pharmacy user, I want to search for products while respecting the current category/subcategory filter, so that I can find specific items within a product group.

#### Acceptance Criteria

1. WHEN a user searches with a category filter active THEN the System SHALL search only within that category
2. WHEN a user searches with a subcategory filter active THEN the System SHALL search only within that subcategory
3. WHEN search results are displayed THEN the System SHALL show which category and subcategory each result belongs to
4. WHEN a user clears the search THEN the System SHALL maintain the current category/subcategory filter
