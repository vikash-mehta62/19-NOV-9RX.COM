import { supabase } from "@/integrations/supabase/client";

type QueryError = { code?: string; message?: string; details?: string } | null;

const isMissingDisplayOrderColumn = (error: QueryError) =>
  !!error &&
  (error.code === "42703" ||
    (typeof error.message === "string" && error.message.includes("display_order")));

const isSubcategoryPkCollision = (error: QueryError) =>
  !!error &&
  error.code === "23505" &&
  (typeof error.message === "string" && error.message.includes("subcategory_configs_pkey"));

export interface CategoryTreeItem {
  id: number;
  category_name: string;
  size_units?: string[];
  default_unit?: string;
  has_rolls?: boolean;
  requires_case?: boolean;
  image_url?: string;
  display_order?: number | null;
}

export interface SubcategoryTreeItem {
  id: number;
  category_name: string;
  subcategory_name: string;
  display_order?: number | null;
}

export interface CategoryDeleteGuard {
  allowed: boolean;
  productCount: number;
  subcategoryCount: number;
}

export interface SubcategoryDeleteGuard {
  allowed: boolean;
  productCount: number;
}

export interface InsertSubcategoryInput {
  category_name: string;
  subcategory_name: string;
  display_order?: number | null;
}

export const fetchOrderedCategories = async (): Promise<CategoryTreeItem[]> => {
  const withDisplayOrder = await supabase
    .from("category_configs")
    .select("*")
    .order("display_order", { ascending: true })
    .order("category_name", { ascending: true });

  if (!withDisplayOrder.error) {
    return (withDisplayOrder.data || []) as CategoryTreeItem[];
  }

  if (!isMissingDisplayOrderColumn(withDisplayOrder.error)) {
    throw withDisplayOrder.error;
  }

  const fallback = await supabase
    .from("category_configs")
    .select("*")
    .order("category_name", { ascending: true });

  if (fallback.error) {
    throw fallback.error;
  }

  return (fallback.data || []) as CategoryTreeItem[];
};

export const fetchOrderedSubcategories = async (
  categoryName?: string
): Promise<SubcategoryTreeItem[]> => {
  const baseWithOrder = supabase
    .from("subcategory_configs")
    .select("*")
    .order("display_order", { ascending: true })
    .order("subcategory_name", { ascending: true });

  const withDisplayOrder = categoryName
    ? await baseWithOrder.eq("category_name", categoryName)
    : await baseWithOrder;

  if (!withDisplayOrder.error) {
    return (withDisplayOrder.data || []) as SubcategoryTreeItem[];
  }

  if (!isMissingDisplayOrderColumn(withDisplayOrder.error)) {
    throw withDisplayOrder.error;
  }

  const baseFallback = supabase
    .from("subcategory_configs")
    .select("*")
    .order("subcategory_name", { ascending: true });

  const fallback = categoryName
    ? await baseFallback.eq("category_name", categoryName)
    : await baseFallback;

  if (fallback.error) {
    throw fallback.error;
  }

  return (fallback.data || []) as SubcategoryTreeItem[];
};

export const canDeleteCategory = async (
  categoryName: string
): Promise<CategoryDeleteGuard> => {
  const [{ count: productCount, error: productError }, { count: subcategoryCount, error: subError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category", categoryName),
      supabase
        .from("subcategory_configs")
        .select("id", { count: "exact", head: true })
        .eq("category_name", categoryName),
    ]);

  if (productError) throw productError;
  if (subError) throw subError;

  const safeProductCount = productCount || 0;
  const safeSubcategoryCount = subcategoryCount || 0;

  return {
    allowed: safeProductCount === 0 && safeSubcategoryCount === 0,
    productCount: safeProductCount,
    subcategoryCount: safeSubcategoryCount,
  };
};

export const canDeleteSubcategory = async (
  categoryName: string,
  subcategoryName: string
): Promise<SubcategoryDeleteGuard> => {
  // Get products for this subcategory
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id")
    .eq("category", categoryName)
    .eq("subcategory", subcategoryName);

  if (productsError) throw productsError;

  if (!products || products.length === 0) {
    return {
      allowed: true,
      productCount: 0,
    };
  }

  // Count sizes for these products
  const productIds = products.map(p => p.id);
  const { count: sizeCount, error: sizeError } = await supabase
    .from("product_sizes")
    .select("id", { count: "exact", head: true })
    .in("product_id", productIds);

  if (sizeError) throw sizeError;

  const actualProductCount = sizeCount || 0;
  
  return {
    allowed: actualProductCount === 0,
    productCount: actualProductCount,
  };
};

export const deleteCategoryById = async (id: number) => {
  const { error } = await supabase.from("category_configs").delete().eq("id", id);
  if (error) throw error;
};

export const deleteSubcategoryById = async (id: number) => {
  // First, get the subcategory details
  const { data: subcategory, error: fetchError } = await supabase
    .from("subcategory_configs")
    .select("category_name, subcategory_name")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  if (subcategory) {
    // Delete products without sizes (placeholders)
    const { data: products } = await supabase
      .from("products")
      .select("id, sizes:product_sizes(id)")
      .eq("category", subcategory.category_name)
      .eq("subcategory", subcategory.subcategory_name);

    if (products) {
      const productsWithoutSizes = products.filter(
        (p: any) => !p.sizes || p.sizes.length === 0
      );

      for (const product of productsWithoutSizes) {
        await supabase.from("products").delete().eq("id", product.id);
      }
    }
  }

  // Delete the subcategory config
  const { error } = await supabase.from("subcategory_configs").delete().eq("id", id);
  if (error) throw error;
};

export const insertSubcategorySafely = async (
  payload: InsertSubcategoryInput
): Promise<SubcategoryTreeItem> => {
  const firstAttempt = await supabase
    .from("subcategory_configs")
    .insert(payload)
    .select("*")
    .single();

  if (!firstAttempt.error && firstAttempt.data) {
    return firstAttempt.data as SubcategoryTreeItem;
  }

  if (!isSubcategoryPkCollision(firstAttempt.error)) {
    throw firstAttempt.error;
  }

  const latestId = await supabase
    .from("subcategory_configs")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestId.error) {
    throw latestId.error;
  }

  const maxId = Number(latestId.data?.id || 0);
  if (!Number.isFinite(maxId)) {
    throw firstAttempt.error;
  }

  const retryAttempt = await supabase
    .from("subcategory_configs")
    .insert({ ...payload, id: maxId + 1 } as InsertSubcategoryInput & { id: number })
    .select("*")
    .single();

  if (retryAttempt.error || !retryAttempt.data) {
    throw retryAttempt.error || firstAttempt.error;
  }

  return retryAttempt.data as SubcategoryTreeItem;
};
