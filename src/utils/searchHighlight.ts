// Utility functions for search highlighting and matching

export interface SearchMatch {
  field: string;
  value: string;
  matchType: 'exact' | 'partial';
}

export const getSearchMatches = (product: any, searchQuery: string): SearchMatch[] => {
  if (!searchQuery.trim()) return [];
  
  const matches: SearchMatch[] = [];
  const searchTerm = searchQuery.toLowerCase().trim();
  
  // Check product name
  if (product.name?.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'Product Name',
      value: product.name,
      matchType: product.name.toLowerCase() === searchTerm ? 'exact' : 'partial'
    });
  }
  
  // Check description
  if (product.description?.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'Description',
      value: product.description,
      matchType: 'partial'
    });
  }
  
  // Check category
  if (product.category?.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'Category',
      value: product.category,
      matchType: product.category.toLowerCase() === searchTerm ? 'exact' : 'partial'
    });
  }
  
  // Check subcategory
  if (product.subcategory?.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'Subcategory',
      value: product.subcategory,
      matchType: product.subcategory.toLowerCase() === searchTerm ? 'exact' : 'partial'
    });
  }
  
  // Check product SKU
  if (product.sku?.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'Product SKU',
      value: product.sku,
      matchType: product.sku.toLowerCase() === searchTerm ? 'exact' : 'partial'
    });
  }
  
  // Check product codes
  if (product.ndcCode?.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'NDC Code',
      value: product.ndcCode,
      matchType: product.ndcCode.toLowerCase() === searchTerm ? 'exact' : 'partial'
    });
  }
  
  if (product.upcCode?.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'UPC Code',
      value: product.upcCode,
      matchType: product.upcCode.toLowerCase() === searchTerm ? 'exact' : 'partial'
    });
  }
  
  if (product.lotNumber?.toLowerCase().includes(searchTerm)) {
    matches.push({
      field: 'Lot Number',
      value: product.lotNumber,
      matchType: product.lotNumber.toLowerCase() === searchTerm ? 'exact' : 'partial'
    });
  }
  
  // Check sizes
  if (product.sizes && Array.isArray(product.sizes)) {
    product.sizes.forEach((size: any, index: number) => {
      // Check size value
      if (size.size_value?.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: `Size ${index + 1} Value`,
          value: `${size.size_value} ${size.size_unit || ''}`.trim(),
          matchType: size.size_value.toLowerCase() === searchTerm ? 'exact' : 'partial'
        });
      }
      
      // Check size unit
      if (size.size_unit?.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: `Size ${index + 1} Unit`,
          value: size.size_unit,
          matchType: size.size_unit.toLowerCase() === searchTerm ? 'exact' : 'partial'
        });
      }
      
      // Check size SKU
      if (size.sku?.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: `Size ${index + 1} SKU`,
          value: size.sku,
          matchType: size.sku.toLowerCase() === searchTerm ? 'exact' : 'partial'
        });
      }
      
      // Check size codes
      if (size.ndcCode?.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: `Size ${index + 1} NDC`,
          value: size.ndcCode,
          matchType: size.ndcCode.toLowerCase() === searchTerm ? 'exact' : 'partial'
        });
      }
      
      if (size.upcCode?.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: `Size ${index + 1} UPC`,
          value: size.upcCode,
          matchType: size.upcCode.toLowerCase() === searchTerm ? 'exact' : 'partial'
        });
      }
      
      if (size.lotNumber?.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: `Size ${index + 1} Lot`,
          value: size.lotNumber,
          matchType: size.lotNumber.toLowerCase() === searchTerm ? 'exact' : 'partial'
        });
      }
    });
  }
  
  return matches;
};

export const highlightSearchTerm = (text: string, searchQuery: string): string => {
  if (!searchQuery.trim() || !text) return text;
  
  const searchTerm = searchQuery.trim();
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
};

export const getSearchSuggestions = (searchQuery: string): string[] => {
  const suggestions: string[] = [];
  const query = searchQuery.toLowerCase().trim();
  
  // Common search patterns
  const patterns = [
    'ml', 'mg', 'oz', 'lb', 'kg', 'g', // Units
    'vial', 'bottle', 'box', 'case', 'pack', // Containers
    'tablet', 'capsule', 'liquid', 'powder', // Forms
    'sterile', 'non-sterile', 'disposable', // Properties
  ];
  
  // Size-based suggestions
  if (query.match(/^\d+/)) {
    suggestions.push(`${query}ml`, `${query}mg`, `${query}oz`);
  }
  
  // Pattern-based suggestions
  patterns.forEach(pattern => {
    if (pattern.includes(query) && pattern !== query) {
      suggestions.push(pattern);
    }
  });
  
  return suggestions.slice(0, 5); // Limit to 5 suggestions
};