# Requirements Document

## Introduction

This document defines the requirements for fixing the product browsing flow to ensure categories, products, and variations (size/color) display correctly with proper hierarchy and no random mixing.

## Glossary

- **Category**: Top-level product grouping (e.g., CONTAINERS & CLOSURES, RX LABELS)
- **Subcategory**: Product group within a category (e.g., PUSH DOWN & TURN, LIQUID BOTTLES)
- **Product**: A single item that can have multiple size/color variations
- **Variation**: Size or color option of a product stored in product_sizes table
- **Main Page**: Entry point showing all categories as cards
- **Category Page**: Shows products filtered by selected category
- **Product Detail Page**: Shows single product with all its variations

## Requirements

### Requirement 1

**User Story:** As a customer, I want to see all categories on the main page, so that I can browse products by category.

#### Acceptance Criteria

1. WHEN a user visits the main pharmacy page THEN the system SHALL display all top-level categories as cards
2. WHEN displaying category cards THEN the system SHALL show category name, image, and product count
3. WHEN a user clicks a category card THEN the system SHALL navigate to that category's product page
4. WHEN displaying the main page THEN the system SHALL NOT show individual products or size variations

### Requirement 2

**User Story:** As a customer, I want to see only products from the selected category, so that I can find relevant items without confusion.

#### Acceptance Criteria

1. WHEN a user navigates to a category page THEN the system SHALL display ONLY products belonging to that category
2. WHEN filtering by category THEN the system SHALL NOT display products from other categories
3. WHEN a category has subcategories THEN the system SHALL show subcategory filter in sidebar
4. WHEN a user selects a subcategory THEN the system SHALL filter products to show only that subcategory

### Requirement 3

**User Story:** As a customer, I want products with multiple sizes to show all variations inline, so that I can compare and select easily.

#### Acceptance Criteria

1. WHEN a product has multiple sizes THEN the system SHALL display using the inline variation layout
2. WHEN displaying inline variations THEN the system SHALL show all available sizes with prices
3. WHEN displaying inline variations THEN the system SHALL provide add-to-cart for each size
4. WHEN a product has only one size THEN the system SHALL display as a single product card

### Requirement 4

**User Story:** As a customer, I want to view detailed product information, so that I can make informed purchase decisions.

#### Acceptance Criteria

1. WHEN a user clicks on a product THEN the system SHALL navigate to the single product detail page
2. WHEN displaying product details THEN the system SHALL show images, description, and all size options
3. WHEN displaying product details THEN the system SHALL show price per variation
4. WHEN displaying product details THEN the system SHALL use the approved layout without modifications

### Requirement 5

**User Story:** As a system administrator, I want product data to follow strict hierarchy, so that products display correctly.

#### Acceptance Criteria

1. WHEN storing product data THEN the system SHALL follow Category → Product → Variations hierarchy
2. WHEN a product has variations THEN all variations SHALL share the same product ID
3. WHEN a product has variations THEN all variations SHALL belong to the same category
4. WHEN displaying products THEN variations SHALL NOT appear as separate products
