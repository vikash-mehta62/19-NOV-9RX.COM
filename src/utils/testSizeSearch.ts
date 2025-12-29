import { supabase } from "@/supabaseClient";

// Test function to check size search
export const testSizeSearch = async (searchTerm: string) => {
  console.log('Testing size search for:', searchTerm);
  
  try {
    // First, let's see what sizes exist in the database
    const { data: allSizes, error: allSizesError } = await supabase
      .from("product_sizes")
      .select("id, product_id, size_value, size_unit, sku")
      .limit(10);
    
    console.log('Sample sizes in database:', allSizes);
    
    if (allSizesError) {
      console.error('Error fetching all sizes:', allSizesError);
      return;
    }
    
    // Now test the search
    const sizeConditions = [
      `size_value.ilike.%${searchTerm}%`,
      `size_unit.ilike.%${searchTerm}%`,
      `sku.ilike.%${searchTerm}%`
    ];

    const { data: matchingSizes, error: searchError } = await supabase
      .from("product_sizes")
      .select("product_id, size_value, size_unit, sku, price, stock")
      .or(sizeConditions.join(','));
    
    console.log('Matching sizes for search term:', matchingSizes);
    
    if (searchError) {
      console.error('Size search error:', searchError);
      return;
    }
    
    if (matchingSizes && matchingSizes.length > 0) {
      const productIds = [...new Set(matchingSizes.map(size => size.product_id))];
      console.log('Product IDs with matching sizes:', productIds);
      
      // Fetch the actual products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, category")
        .in("id", productIds);
      
      console.log('Products with matching sizes:', products);
      
      if (productsError) {
        console.error('Products fetch error:', productsError);
      }
    } else {
      console.log('No matching sizes found');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Function to get all unique size values and units for reference
export const getSizeReference = async () => {
  try {
    const { data: sizes, error } = await supabase
      .from("product_sizes")
      .select("size_value, size_unit")
      .not("size_value", "is", null)
      .not("size_unit", "is", null);
    
    if (error) {
      console.error('Error fetching size reference:', error);
      return;
    }
    
    const uniqueSizes = [...new Set(sizes?.map(s => `${s.size_value}${s.size_unit}`))];
    console.log('Available sizes in database:', uniqueSizes.sort());
    
    const uniqueUnits = [...new Set(sizes?.map(s => s.size_unit))];
    console.log('Available units in database:', uniqueUnits.sort());
    
  } catch (error) {
    console.error('Reference fetch error:', error);
  }
};