import { ProductDetails } from "../types/product.types";

export const filterProducts = (
  products: ProductDetails[],
  searchQuery: string,
  selectedCategory: string,
  priceRange: string
) => {
  return products.filter(product => {
    // Search matching
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.productId.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category matching
    const matchesCategory = selectedCategory === "all" || 
      (product.category?.toLowerCase() === selectedCategory.toLowerCase());
    
    // Price range matching
    const productPrice = product.price;
    const matchesPriceRange = priceRange === "all" ||
      (priceRange === "0-20" && productPrice <= 20) ||
      (priceRange === "21-50" && productPrice > 20 && productPrice <= 50) ||
      (priceRange === "51+" && productPrice > 50);

    return matchesSearch && matchesCategory && matchesPriceRange;
  });
};