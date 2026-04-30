import { supabase } from "@/supabaseClient";

type CartSizeLike = {
  id?: string;
  size_name?: string;
  size_value?: string;
  size_unit?: string;
  quantity?: number;
};

type CartItemLike = {
  productId?: string;
  name?: string;
  sizes?: CartSizeLike[];
};

export type StockValidationIssue = {
  sizeId: string;
  productName: string;
  sizeLabel: string;
  requestedQuantity: number;
  availableStock: number;
};

export type StockValidationResult = {
  valid: boolean;
  issues: StockValidationIssue[];
  availableBySizeId: Record<string, number>;
};

const isPharmacyUser = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return String(sessionStorage.getItem("userType") || "").toLowerCase() === "pharmacy";
};

const getSizeLabel = (size: CartSizeLike) => {
  const explicitName = String(size.size_name || "").trim();
  if (explicitName) {
    return explicitName;
  }

  return [size.size_value, size.size_unit]
    .filter(Boolean)
    .join(" ")
    .trim();
};

const buildRequestedTotals = (cartItems: CartItemLike[]) => {
  const totals = new Map<string, StockValidationIssue>();

  for (const item of cartItems || []) {
    for (const size of item.sizes || []) {
      const sizeId = String(size?.id || "").trim();
      const quantity = Number(size?.quantity || 0);

      if (!sizeId || !(quantity > 0)) {
        continue;
      }

      const existing = totals.get(sizeId);
      if (existing) {
        existing.requestedQuantity += quantity;
        continue;
      }

      totals.set(sizeId, {
        sizeId,
        productName: String(item?.name || "Item").trim() || "Item",
        sizeLabel: getSizeLabel(size),
        requestedQuantity: quantity,
        availableStock: 0,
      });
    }
  }

  return totals;
};

export async function fetchAvailableStockBySizeIds(sizeIds: string[]) {
  const uniqueIds = Array.from(
    new Set(
      (sizeIds || [])
        .map((sizeId) => String(sizeId || "").trim())
        .filter(Boolean),
    ),
  );

  if (uniqueIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("product_sizes")
    .select("id, stock")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message || "Failed to fetch live stock");
  }

  return (data || []).reduce<Record<string, number>>((acc, row: { id: string; stock: number | null }) => {
    acc[String(row.id)] = Math.max(0, Number(row.stock || 0));
    return acc;
  }, {});
}

export async function validateCartStock(cartItems: CartItemLike[]): Promise<StockValidationResult> {
  const requestedTotals = buildRequestedTotals(cartItems || []);
  const sizeIds = Array.from(requestedTotals.keys());
  const availableBySizeId = await fetchAvailableStockBySizeIds(sizeIds);

  const issues: StockValidationIssue[] = [];

  for (const [sizeId, issue] of requestedTotals.entries()) {
    const availableStock = Math.max(0, Number(availableBySizeId[sizeId] || 0));
    issue.availableStock = availableStock;

    if (issue.requestedQuantity > availableStock) {
      issues.push(issue);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    availableBySizeId,
  };
}

export function formatStockValidationMessage(issues: StockValidationIssue[]) {
  if (!issues.length) {
    return "Some cart items exceed current stock.";
  }

  if (isPharmacyUser()) {
    const sortedLabels = issues
      .map((issue) => ({
        productName: issue.productName,
        label: issue.sizeLabel
          ? `${issue.productName} (${issue.sizeLabel})`
          : issue.productName,
      }))
      .sort((a, b) => {
        const productCompare = a.productName.localeCompare(b.productName);
        if (productCompare !== 0) return productCompare;
        return a.label.localeCompare(b.label);
      })
      .map((entry) => entry.label);

    const uniqueLabels = Array.from(new Set(sortedLabels));
    const previewLabels = uniqueLabels.slice(0, 3);
    const remainingCount = uniqueLabels.length - previewLabels.length;
    const itemSummary = previewLabels.join(", ");
    const suffix = remainingCount > 0 ? ` and ${remainingCount} more item${remainingCount === 1 ? "" : "s"}` : "";

    return `These items are no longer available in the requested quantity: ${itemSummary}${suffix}. Please review your cart and update it before continuing.`;
  }

  const [firstIssue, ...remainingIssues] = issues;
  const itemLabel = firstIssue.sizeLabel
    ? `${firstIssue.productName} (${firstIssue.sizeLabel})`
    : firstIssue.productName;

  const baseMessage = `${itemLabel}: requested ${firstIssue.requestedQuantity}, available ${firstIssue.availableStock}.`;

  if (!remainingIssues.length) {
    return baseMessage;
  }

  return `${baseMessage} ${remainingIssues.length} more item${remainingIssues.length === 1 ? "" : "s"} also exceed stock.`;
}

export async function assertCartStock(cartItems: CartItemLike[]) {
  const validation = await validateCartStock(cartItems);

  if (!validation.valid) {
    throw new Error(formatStockValidationMessage(validation.issues));
  }

  return validation;
}
