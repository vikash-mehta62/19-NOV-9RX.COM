import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { ProductFormValues } from "@/components/products/schemas/productSchema";

export const fetchProductsService = async (
  page: number,
  pageSize: number,
  category: string,
  searchQuery: string,
  includeInactive: boolean = false // Admin can see inactive products
) => {
  console.log('=== FETCH PRODUCTS SERVICE ===');
  console.log('Parameters:', { page, pageSize, category, searchQuery, includeInactive });
  
  const offset = (page - 1) * pageSize;

  // If no search query, return all products
  if (!searchQuery) {
    console.log('No search query - fetching all products');
    let query = supabase
      .from("products")
      .select(
        `
        *,
        sizes:product_sizes(*)
      `,
        { count: "exact" }
      )
      .order("squanence", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (category !== "all") {
      query = query.eq("category", category);
    }

    // Filter by active status unless admin wants to see all
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const result = await query;
    console.log('All products result:', result);
    return result;
  }

  const searchTerm = searchQuery.trim();
  console.log('Search term:', searchTerm);
  
  // First try basic product search (name, description, category)
  console.log('Trying basic product search...');
  let basicQuery = supabase
    .from("products")
    .select(
      `
      *,
      sizes:product_sizes(*)
    `,
      { count: "exact" }
    )
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
    .order("squanence", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (category !== "all") {
    basicQuery = basicQuery.eq("category", category);
  }

  // Filter by active status unless admin wants to see all
  if (!includeInactive) {
    basicQuery = basicQuery.eq("is_active", true);
  }

  const basicResult = await basicQuery;
  console.log('Basic search result:', basicResult);

  if (basicResult.data && basicResult.data.length > 0) {
    console.log('Found products in basic search, returning:', basicResult.data.length);
    return basicResult;
  }

  // If no basic results, try size-based search
  console.log('No basic results found, trying size-based search...');
  const sizeResult = await fetchProductsBySizeSearch(page, pageSize, category, searchQuery, includeInactive);
  console.log('Size search final result:', sizeResult);
  return sizeResult;
};

// Advanced search function for searching in product sizes
const fetchProductsBySizeSearch = async (
  page: number,
  pageSize: number,
  category: string,
  searchQuery: string,
  includeInactive: boolean = false
) => {
  const offset = (page - 1) * pageSize;
  const searchTerm = searchQuery.trim();

  try {
    console.log('=== SIZE SEARCH DEBUG ===');
    console.log('Search term:', searchTerm);
    
    // First, let's check what sizes exist in the database
    const { data: sampleSizes, error: sampleError } = await supabase
      .from("product_sizes")
      .select("size_value, size_unit, sku")
      .limit(5);
    
    console.log('Sample sizes in database:', sampleSizes);
    
    // Try different search approaches
    console.log('Trying size_value search...');
    const { data: sizeValueMatch } = await supabase
      .from("product_sizes")
      .select("product_id, size_value, size_unit, sku")
      .ilike("size_value", `%${searchTerm}%`);
    console.log('Size value matches:', sizeValueMatch);
    
    console.log('Trying size_unit search...');
    const { data: sizeUnitMatch } = await supabase
      .from("product_sizes")
      .select("product_id, size_value, size_unit, sku")
      .ilike("size_unit", `%${searchTerm}%`);
    console.log('Size unit matches:', sizeUnitMatch);
    
    console.log('Trying combined search...');
    // Search in product_sizes table for matching sizes
    const { data: matchingSizes, error: sizeError } = await supabase
      .from("product_sizes")
      .select("product_id, size_value, size_unit, sku, price, stock")
      .or(`size_value.ilike.%${searchTerm}%,size_unit.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);

    console.log('Combined search result:', matchingSizes);
    console.log('Search error:', sizeError);

    if (sizeError) {
      console.error("Size search error:", sizeError);
      return { data: [], error: null, count: 0 };
    }

    if (!matchingSizes || matchingSizes.length === 0) {
      console.log('No matching sizes found - trying alternative search');
      
      // Try a more flexible search
      const { data: flexibleMatch } = await supabase
        .from("product_sizes")
        .select("product_id, size_value, size_unit, sku")
        .or(`size_value::text.ilike.%${searchTerm}%,size_unit::text.ilike.%${searchTerm}%`);
      
      console.log('Flexible search result:', flexibleMatch);
      
      if (!flexibleMatch || flexibleMatch.length === 0) {
        return { data: [], error: null, count: 0 };
      }
    }

    // Use the matching sizes we found
    const sizesToUse = matchingSizes && matchingSizes.length > 0 ? matchingSizes : [];
    
    if (sizesToUse.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    // Extract unique product IDs
    const productIds = [...new Set(sizesToUse.map(size => size.product_id))];
    console.log('Product IDs with matching sizes:', productIds);

    if (productIds.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    // Now fetch products with those IDs
    let productsQuery = supabase
      .from("products")
      .select(
        `
        *,
        sizes:product_sizes(*)
      `,
        { count: "exact" }
      )
      .in("id", productIds)
      .order("squanence", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (category !== "all") {
      productsQuery = productsQuery.eq("category", category);
    }

    // Filter by active status unless admin wants to see all
    if (!includeInactive) {
      productsQuery = productsQuery.eq("is_active", true);
    }

    const result = await productsQuery;
    console.log('Final products result:', result);
    
    // Add matching size info to products for highlighting
    if (result.data) {
      result.data = result.data.map(product => ({
        ...product,
        matchingSizes: sizesToUse.filter(size => size.product_id === product.id)
      }));
      console.log('Products with matchingSizes added:', result.data);
    }

    return result;
  } catch (error) {
    console.error("Size search error:", error);
    return { data: [], error: null, count: 0 };
  }
};

export const addProductService = async (data: ProductFormValues) => {
  const productData = {
    ...(data.ndcCode && { ndcCode: data.ndcCode }),
    ...(data.upcCode && { upcCode: data.upcCode }),
    ...(data.lotNumber && { lotNumber: data.lotNumber }),
    ...(data.exipry && { exipry: data.exipry }),
    ...(data.unitToggle && { exipry: data.unitToggle }),
    sku: data.sku,
    key_features: data.key_features,
    squanence: data.squanence,
    name: data.name,
    description: data.description || "",
    category: data.category,
    subcategory: data.subcategory || null,
    base_price: data.base_price || 0,
    current_stock: data.current_stock || 0,
    min_stock: data.min_stock || 0,
    reorder_point: data.reorder_point || 0,
    quantity_per_case: data.quantityPerCase || 1,
    customization: {
      allowed: data.customization?.allowed ?? false,
      options: data.customization?.options ?? [],
      price: data.customization?.price ?? 0,
    },
    image_url: data.image_url || "",
    images: data.images || [],
    similar_products: data.similar_products || [],
  };

  console.log(data);

  const { data: newProduct, error: productError } = await supabase
    .from("products")
    .insert([productData])
    .select()
    .single();

  if (productError) {
    console.error("Error adding product:", productError);
    throw productError;
  }

  if (data.sizes && data.sizes.length > 0 && newProduct) {
    const sizesData = data.sizes.map((size) => ({
      product_id: newProduct.id,
      size_value: size.size_value || "0",
      size_unit: size.size_unit || "unit",
      price: size.price || 0,
      sku: size.sku || "",
      price_per_case: Number(size.price_per_case) || 0,

      stock: size.stock || 0,
      rolls_per_case: Number(size.rolls_per_case) || 0,
      sizeSquanence: Number(size.sizeSquanence) || 0,
      shipping_cost: Number(size.shipping_cost) || 15,
      quantity_per_case: size.quantity_per_case,
      case: size.case,
      unit: size.unit,
      groupIds: size.groupIds,
      disAllogroupIds: size.disAllogroupIds,

      ndcCode: size.ndcCode || "",
      upcCode: size.upcCode || "",
      lotNumber: size.lotNumber || "",
      exipry: size.exipry || "",
    }));

    const { error: sizesError } = await supabase
      .from("product_sizes")
      .insert(sizesData);

    if (sizesError) {
      console.error("Error adding product sizes:", sizesError);
      throw sizesError;
    }
  }

  return newProduct;
};

export const updateProductService = async (
  productId: string,
  data: ProductFormValues
) => {
  console.log("Updating product with data:", data);

  try {
    const { error: productError } = await supabase
      .from("products")
      .update({
        sku: data.sku,
        key_features: data.key_features,
        squanence: data.squanence,
        name: data.name,
        description: data.description || "",
        category: data.category,
        subcategory: data.subcategory || null,
        base_price: data.base_price || 0,
        current_stock: data.current_stock || 0,
        min_stock: data.min_stock || 0,
        reorder_point: data.reorder_point || 0,
        quantity_per_case: data.quantityPerCase || 1,
        customization: {
          allowed: data.customization?.allowed ?? false,
          options: data.customization?.options ?? [],
          price: data.customization?.price ?? 0,
        },
        image_url: data.image_url || "",
        images: data.images || [],
        updated_at: new Date().toISOString(),
        unitToggle: data.unitToggle,

        ndcCode: data.ndcCode || null,
        upcCode: data.upcCode || null,
        lotNumber: data.lotNumber || null,
        exipry: data.exipry || null,
        similar_products: data.similar_products || [],
      })
      .eq("id", productId);

    if (productError) {
      console.error("Error updating product:", productError);
      throw productError;
    }

    // Delete existing sizes

    console.log(data.sizes);

    console.log("Sizes data:", data.sizes);

    const sizesToInsert = data.sizes.filter((size) => !size.id); // New sizes
    const sizesToUpdate = data.sizes.filter((size) => size.id); // Existing sizes

    // First, insert new sizes
    if (sizesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("product_sizes")
        .insert(
          sizesToInsert.map((size) => ({
            product_id: productId,
            size_value: size.size_value || "0",
            size_unit: size.size_unit || "unit",
            price: Number(size.price) || 0,
            stock: Number(size.stock) || 0,
            price_per_case: Number(size.price_per_case) || 0,
            sku: size.sku || "",
            image: size.image || "",
            quantity_per_case: Number(size.quantity_per_case) || 1,
            rolls_per_case: Number(size.rolls_per_case) || 1,
            sizeSquanence: Number(size.sizeSquanence) || 0,
            shipping_cost: size.shipping_cost,
            case: size.case,
            groupIds: size.groupIds,
            disAllogroupIds: size.disAllogroupIds,
            unit: size.unit,

            ndcCode: size.ndcCode || "",
            upcCode: size.upcCode || "",
            lotNumber: size.lotNumber || "",
            exipry: size.exipry || "",
          }))
        );

      if (insertError) {
        console.error("Error inserting new sizes:", insertError);
        throw insertError;
      }
    }

    // Then, update existing sizes
    for (const size of sizesToUpdate) {
      const { error: updateError } = await supabase
        .from("product_sizes")
        .update({
          size_value: size.size_value || "0",
          size_unit: size.size_unit || "unit",
          price: Number(size.price) || 0,
          stock: Number(size.stock) || 0,
          price_per_case: Number(size.price_per_case) || 0,
          sku: size.sku || "",
          image: size.image || "",
          quantity_per_case: Number(size.quantity_per_case) || 1,
          rolls_per_case: Number(size.rolls_per_case) || 1,
          sizeSquanence: Number(size.sizeSquanence) || 0,
          shipping_cost: size.shipping_cost,
          case: size.case,
          groupIds: size.groupIds,
          disAllogroupIds: size.disAllogroupIds,
          unit: size.unit,
          ndcCode: size.ndcCode || "", // New field
          upcCode: size.upcCode || "", // New field
          lotNumber: size.lotNumber || "", // New field
          exipry: size.exipry || "", // New field
        })
        .eq("id", size.id);

      if (updateError) {
        console.error("Error updating size:", updateError);
        throw updateError;
      }
    }

    // 🔹 STEP 1: Fetch Group Pricing
    const { data: groupPricingData, error: fetchError } = await supabase
      .from("group_pricing")
      .select("*");

    if (fetchError) {
      console.error("Error fetching group pricing:", fetchError);
      throw fetchError;
    }

    // 🔹 STEP 2: Update product_arrayjson ke andar actual price
    const updatedGroupPricingData = groupPricingData.map((group) => {
      if (!Array.isArray(group.product_arrayjson)) return group; // Ensure it's an array

      // Update each product's actual_price where product_id matches
      const updatedProducts = group.product_arrayjson.map((product) => {
        const matchingSize = data.sizes.find(
          (size) => size.id === product.product_id
        );
        if (matchingSize) {
          product.actual_price = matchingSize.price; // ✅ New price assign
        }
        return product;
      });

      return {
        id: group.id,
        updatedJson: updatedProducts, // No need for JSON.stringify()
      };
    });

    // 🔹 STEP 3: Save updated JSON back to database
    for (const group of updatedGroupPricingData) {
      const { error: updateError } = await supabase
        .from("group_pricing")
        .update({ product_arrayjson: group.updatedJson })
        .eq("id", group.id);

      if (updateError) {
        console.error("Error updating group pricing:", updateError);
        throw updateError;
      }
    }

    // const sizesData = data.sizes.map((size) => ({
    //   product_id: productId,
    //   size_value: size.size_value || "0",
    //   size_unit: size.size_unit || "unit",
    //   price: Number(size.price) || 0,
    //   stock: Number(size.stock) || 0,
    //   price_per_case: Number(size.price_per_case) || 0,
    //   sku: size.sku || "",
    //   image:size.image|| "" ,
    //   quantity_per_case: Number(size.quantity_per_case) || 1, // ✅ Ensure conversion
    //   rolls_per_case: Number(size.rolls_per_case) || 1,
    //   sizeSquanence: Number(size.sizeSquanence) || 0,
    //   shipping_cost: size.shipping_cost, // ✅ Ensure conversion
    // }));

    // console.log(sizesData);

    // const { error: sizesError } = await supabase
    //   .from("product_sizes")
    //   .insert(sizesData)
    //   .select(); // Fetch inserted data to confirm

    // if (sizesError) {
    //   console.error("Error inserting sizes:", sizesError);
    //   throw sizesError;
    // } else {
    //   console.log("Sizes inserted successfully!");
    // }

    return { success: true };
  } catch (error) {
    console.error("Update product error:", error);
    throw error;
  }
};

export const deleteProductService = async (id: string) => {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
};

export const bulkAddProductsService = async (products: Product[]) => {
  const { error } = await supabase.from("products").insert(products);
  if (error) throw error;
};
