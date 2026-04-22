import { supabase } from "@/integrations/supabase/client";

type GroupPricingProductEntry = {
  product_id?: string;
  new_price?: string | number | null;
};

type GroupPricingRow = {
  group_ids?: string[] | null;
  product_arrayjson?: GroupPricingProductEntry[] | null;
};

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const hasValidSpecialPricingEntries = (row: GroupPricingRow) =>
  Array.isArray(row.product_arrayjson) &&
  row.product_arrayjson.some((entry) => {
    const entryId = String(entry?.product_id || "").trim();
    const nextPrice = Number(entry?.new_price);
    return entryId.length > 0 && Number.isFinite(nextPrice) && nextPrice > 0;
  });

async function getActiveSpecialPricingRows(
  userId: string | undefined
): Promise<GroupPricingRow[]> {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("group_pricing")
    .select("group_ids, product_arrayjson")
    .contains("group_ids", [userId])
    .eq("status", "active");

  if (error) {
    console.error("Error fetching special pricing:", error);
    return [];
  }

  return (data || []) as GroupPricingRow[];
}

export async function hasAnyActiveSpecialPricing(
  userId: string | undefined
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("group_pricing")
    .select("group_ids, product_arrayjson")
    .contains("group_ids", [userId])
    .eq("status", "active");

  if (error) {
    console.error("Error checking active special pricing:", error);
    return false;
  }

  return ((data || []) as GroupPricingRow[]).some(hasValidSpecialPricingEntries);
}

export async function getSpecialPricingSizeMap(
  userId: string | undefined,
  sizeIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const uniqueSizeIds = unique(sizeIds);

  if (!userId || uniqueSizeIds.length === 0) {
    return result;
  }

  const data = await getActiveSpecialPricingRows(userId);

  ((data || []) as GroupPricingRow[]).forEach((group) => {
    if (!Array.isArray(group.product_arrayjson)) {
      return;
    }

    group.product_arrayjson.forEach((entry) => {
      const sizeId = entry.product_id;
      const nextPrice = Number(entry.new_price);

      if (!sizeId || !uniqueSizeIds.includes(sizeId) || !Number.isFinite(nextPrice) || nextPrice <= 0) {
        return;
      }

      if (!result.has(sizeId)) {
        result.set(sizeId, nextPrice);
      }
    });
  });

  return result;
}

export async function getSpecialPricingSizeIds(
  userId: string | undefined,
  sizeIds: string[]
): Promise<string[]> {
  const specialPricingMap = await getSpecialPricingSizeMap(userId, sizeIds);
  return Array.from(specialPricingMap.keys());
}

export async function getSpecialPricingProductIdsForProducts(
  userId: string | undefined,
  productIds: string[]
): Promise<Set<string>> {
  const result = new Set<string>();
  const uniqueProductIds = unique(productIds);

  if (!userId || uniqueProductIds.length === 0) {
    return result;
  }

  const { data: sizeRows, error } = await supabase
    .from("product_sizes")
    .select("id, product_id")
    .in("product_id", uniqueProductIds);

  if (error) {
    console.error("Error fetching product sizes for special pricing:", error);
    return result;
  }

  const rows = (sizeRows || []) as Array<{ id: string; product_id: string }>;
  const specialPricingSizeIds = await getSpecialPricingSizeIds(
    userId,
    rows.map((row) => row.id)
  );
  const specialPricingSet = new Set(specialPricingSizeIds);

  rows.forEach((row) => {
    if (specialPricingSet.has(row.id)) {
      result.add(row.product_id);
    }
  });

  return result;
}

export async function hasSpecialPricingForProduct(
  userId: string | undefined,
  productId: string
): Promise<boolean> {
  const productIds = await getSpecialPricingProductIdsForProducts(userId, [productId]);
  return productIds.has(productId);
}

export async function hasSpecialPricingForSize(
  userId: string | undefined,
  sizeId: string
): Promise<boolean> {
  const sizeIds = await getSpecialPricingSizeIds(userId, [sizeId]);
  return sizeIds.includes(sizeId);
}
