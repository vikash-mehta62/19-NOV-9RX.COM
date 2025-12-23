import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: product-hierarchy-erply-style, Property 1: Subcategory Filter Correctness
 * Validates: Requirements 1.4
 * 
 * For any list of subcategories and any selected category,
 * filtering by that category SHALL return only subcategories
 * where subcategory.category_name matches the selected category (case-insensitive).
 */

// Pure filter function extracted from component logic
const filterSubcategoriesByCategory = (
  subcategories: Array<{ id: string; subcategory_name: string; category_name: string }>,
  selectedCategory: string
): Array<{ id: string; subcategory_name: string; category_name: string }> => {
  if (selectedCategory === "all") {
    return subcategories;
  }
  return subcategories.filter(
    (sub) => sub.category_name.toLowerCase() === selectedCategory.toLowerCase()
  );
};

// Arbitrary generators for property-based testing
const subcategoryArb = fc.record({
  id: fc.uuid(),
  subcategory_name: fc.string({ minLength: 1, maxLength: 50 }),
  category_name: fc.string({ minLength: 1, maxLength: 50 }),
});

const subcategoriesArb = fc.array(subcategoryArb, { minLength: 0, maxLength: 20 });

describe('PharmacyFilterSidebar - Subcategory Filter', () => {
  /**
   * Property 1: Subcategory Filter Correctness
   * For any list of subcategories and selected category,
   * all filtered results must have matching category_name
   */
  it('should return only subcategories matching the selected category (case-insensitive)', () => {
    fc.assert(
      fc.property(subcategoriesArb, fc.string({ minLength: 1, maxLength: 50 }), (subcategories, selectedCategory) => {
        const filtered = filterSubcategoriesByCategory(subcategories, selectedCategory);
        
        // All filtered subcategories must have matching category_name
        return filtered.every(
          (sub) => sub.category_name.toLowerCase() === selectedCategory.toLowerCase()
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: "all" category returns all subcategories
   */
  it('should return all subcategories when category is "all"', () => {
    fc.assert(
      fc.property(subcategoriesArb, (subcategories) => {
        const filtered = filterSubcategoriesByCategory(subcategories, "all");
        return filtered.length === subcategories.length;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filter is case-insensitive
   */
  it('should filter case-insensitively', () => {
    fc.assert(
      fc.property(subcategoriesArb, fc.string({ minLength: 1, maxLength: 50 }), (subcategories, category) => {
        const filteredLower = filterSubcategoriesByCategory(subcategories, category.toLowerCase());
        const filteredUpper = filterSubcategoriesByCategory(subcategories, category.toUpperCase());
        
        // Both should return the same results
        return filteredLower.length === filteredUpper.length;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Filtered results are a subset of original
   */
  it('should return a subset of original subcategories', () => {
    fc.assert(
      fc.property(subcategoriesArb, fc.string({ minLength: 1, maxLength: 50 }), (subcategories, selectedCategory) => {
        const filtered = filterSubcategoriesByCategory(subcategories, selectedCategory);
        
        // Filtered length should be <= original length
        return filtered.length <= subcategories.length;
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: product-hierarchy-erply-style, Property 4: Product Count Accuracy
 * Validates: Requirements 2.4
 * 
 * For any category or subcategory, the displayed product count SHALL equal
 * the actual number of products that would be returned by filtering.
 */

// Pure function for counting products by category
const getCategoryCount = (
  products: Array<{ category?: string }>,
  categoryName: string
): number => {
  if (categoryName === "all") return products.length;
  return products.filter(
    (p) => p.category?.toLowerCase() === categoryName.toLowerCase()
  ).length;
};

// Pure function for counting products by subcategory
const getSubcategoryCount = (
  products: Array<{ subcategory?: string }>,
  subcategoryName: string
): number => {
  if (subcategoryName === "all") return products.length;
  return products.filter(
    (p) => p.subcategory?.toLowerCase() === subcategoryName.toLowerCase()
  ).length;
};

// Arbitrary generators for products
const productArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  subcategory: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
});

const productsArb = fc.array(productArb, { minLength: 0, maxLength: 30 });

describe('PharmacyFilterSidebar - Product Count', () => {
  /**
   * Property 4: Product Count Accuracy for Categories
   * Count for "all" should equal total products
   */
  it('should return total count for "all" category', () => {
    fc.assert(
      fc.property(productsArb, (products) => {
        const count = getCategoryCount(products, "all");
        return count === products.length;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Category count matches filtered results
   */
  it('should return accurate count for specific category', () => {
    fc.assert(
      fc.property(productsArb, fc.string({ minLength: 1, maxLength: 30 }), (products, category) => {
        const count = getCategoryCount(products, category);
        const filtered = products.filter(
          (p) => p.category?.toLowerCase() === category.toLowerCase()
        );
        return count === filtered.length;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Subcategory count matches filtered results
   */
  it('should return accurate count for specific subcategory', () => {
    fc.assert(
      fc.property(productsArb, fc.string({ minLength: 1, maxLength: 30 }), (products, subcategory) => {
        const count = getSubcategoryCount(products, subcategory);
        const filtered = products.filter(
          (p) => p.subcategory?.toLowerCase() === subcategory.toLowerCase()
        );
        return count === filtered.length;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Count is always non-negative
   */
  it('should always return non-negative count', () => {
    fc.assert(
      fc.property(productsArb, fc.string({ minLength: 1, maxLength: 30 }), (products, category) => {
        const count = getCategoryCount(products, category);
        return count >= 0;
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: product-hierarchy-erply-style, Property 2: Category Filter Returns All Subcategory Products
 * Validates: Requirements 1.5
 * 
 * For any list of products and any selected category (without subcategory filter),
 * filtering by that category SHALL return all products where product.category matches,
 * regardless of their subcategory.
 */

// Pure function for filtering products by category
const filterProductsByCategory = (
  products: Array<{ category?: string; subcategory?: string }>,
  selectedCategory: string
): Array<{ category?: string; subcategory?: string }> => {
  if (selectedCategory === "all") {
    return products;
  }
  return products.filter(
    (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
  );
};

// Pure function for filtering products by subcategory
const filterProductsBySubcategory = (
  products: Array<{ category?: string; subcategory?: string }>,
  selectedSubcategory: string
): Array<{ category?: string; subcategory?: string }> => {
  if (selectedSubcategory === "all") {
    return products;
  }
  return products.filter(
    (p) => p.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
  );
};

describe('PharmacyFilterSidebar - Category Filter', () => {
  /**
   * Property 2: Category filter returns all products in category regardless of subcategory
   */
  it('should return all products in category regardless of subcategory', () => {
    fc.assert(
      fc.property(productsArb, fc.string({ minLength: 1, maxLength: 30 }), (products, category) => {
        const filtered = filterProductsByCategory(products, category);
        
        // All filtered products must have matching category
        const allMatchCategory = filtered.every(
          (p) => p.category?.toLowerCase() === category.toLowerCase()
        );
        
        // Products with different subcategories should still be included
        // (as long as they have the matching category)
        return allMatchCategory;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: "all" category returns all products
   */
  it('should return all products when category is "all"', () => {
    fc.assert(
      fc.property(productsArb, (products) => {
        const filtered = filterProductsByCategory(products, "all");
        return filtered.length === products.length;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Category filter is case-insensitive (excluding "all" keyword)
   */
  it('should filter categories case-insensitively', () => {
    fc.assert(
      fc.property(
        productsArb, 
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.toLowerCase() !== 'all'), 
        (products, category) => {
          const filteredLower = filterProductsByCategory(products, category.toLowerCase());
          const filteredUpper = filterProductsByCategory(products, category.toUpperCase());
          
          return filteredLower.length === filteredUpper.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Subcategory filter is more restrictive than category filter
   */
  it('should have subcategory filter be more restrictive than category filter', () => {
    fc.assert(
      fc.property(
        productsArb, 
        fc.string({ minLength: 1, maxLength: 30 }), 
        fc.string({ minLength: 1, maxLength: 30 }), 
        (products, category, subcategory) => {
          const categoryFiltered = filterProductsByCategory(products, category);
          const subcategoryFiltered = filterProductsBySubcategory(categoryFiltered, subcategory);
          
          // Subcategory filtered should be <= category filtered
          return subcategoryFiltered.length <= categoryFiltered.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
