# Implementation Plan

- [x] 1. Create CategoryCard component





  - [x] 1.1 Create CategoryCard.tsx with props for category name, image, product count





    - Display category image, name, and product count badge
    - Add hover effects and click handler
    - _Requirements: 1.2_
  
  - [ ]* 1.2 Write property test for CategoryCard rendering
    - **Property 6: Main Page Shows No Products**
    - **Validates: Requirements 1.4**

- [x] 2. Create CategoryBrowsePage






  - [x] 2.1 Create CategoryBrowse.tsx page component

    - Fetch categories from category_configs table
    - Calculate product count per category
    - Display CategoryCard grid
    - _Requirements: 1.1, 1.2_
  


  - [x] 2.2 Add navigation to category page on card click

    - Navigate to /pharmacy/products?category={categoryName}
    - _Requirements: 1.3_

- [x] 3. Update routing in App.tsx





  - [x] 3.1 Add route for /pharmacy/categories


    - Set as new entry point for pharmacy users
    - _Requirements: 1.1_
  

  - [x] 3.2 Update /pharmacy redirect to go to /pharmacy/categories
    - Change from /pharmacy/products to /pharmacy/categories
    - _Requirements: 1.1_

- [x] 4. Checkpoint - Verify category page works





  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Modify ProductShowcase for category filtering
  - [ ] 5.1 Accept selectedCategory prop from URL params
    - Read category from URL query string
    - Pre-filter products by category
    - _Requirements: 2.1, 2.2_
  
  - [ ] 5.2 Update PharmacyFilterSidebar to work with pre-filtered data
    - Show only relevant subcategories for selected category
    - _Requirements: 2.3, 2.4_
  
  - [ ]* 5.3 Write property test for category filtering
    - **Property 1: Category Page Shows Only Matching Products**
    - **Validates: Requirements 2.1, 2.2**
  
  - [ ]* 5.4 Write property test for subcategory filtering
    - **Property 2: Subcategory Filter Correctness**
    - **Validates: Requirements 2.4**

- [ ] 6. Implement layout selection logic
  - [ ] 6.1 Add logic to determine inline vs card layout
    - Check product.sizes.length > 1 for inline layout
    - Check product.sizes.length <= 1 for card layout
    - _Requirements: 3.1, 3.4_
  
  - [ ] 6.2 Render InlineProductSizes for multi-size products
    - Use existing InlineProductSizes component
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 6.3 Render PharmacyProductCard for single-size products
    - Use existing card component
    - _Requirements: 3.4_
  
  - [ ]* 6.4 Write property test for layout selection
    - **Property 3: Multi-Size Products Use Inline Layout**
    - **Property 4: Single-Size Products Use Card Layout**
    - **Validates: Requirements 3.1, 3.4**

- [ ] 7. Update PharmacyProducts page
  - [ ] 7.1 Read category from URL query params
    - Use useSearchParams hook
    - Pass to ProductShowcase
    - _Requirements: 2.1_
  
  - [ ] 7.2 Add "Back to Categories" button
    - Navigate back to /pharmacy/categories
    - _Requirements: 1.1_
  
  - [ ] 7.3 Show category name in page header
    - Display selected category prominently
    - _Requirements: 2.1_

- [ ] 8. Checkpoint - Verify filtering and layout works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Update navigation links throughout app
  - [ ] 9.1 Update DashboardLayout sidebar link
    - Change Products link to go to /pharmacy/categories
    - _Requirements: 1.1_
  
  - [ ] 9.2 Update login redirect for pharmacy users
    - Redirect to /pharmacy/categories instead of /pharmacy/products
    - _Requirements: 1.1_

- [ ] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
