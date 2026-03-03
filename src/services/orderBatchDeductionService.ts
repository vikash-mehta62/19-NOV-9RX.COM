import { supabase } from "@/supabaseClient";
import { BatchInventoryService } from "@/services/batchInventoryService";

type OrderSizeInput = {
  id?: string;
  quantity?: number;
  quantity_per_case?: number;
};

type OrderItemInput = {
  sizes?: OrderSizeInput[];
};

type DeductionResult = {
  alreadyDeducted: boolean;
  batchManagedSizeIds: Set<string>;
};

export async function hasOrderBatchDeductions(orderId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("batch_transactions")
    .select("id", { head: true, count: "exact" })
    .eq("reference_id", orderId)
    .eq("reference_type", "order")
    .eq("transaction_type", "sale");

  if (error) {
    // Non-admin sessions may not have access to batch tables.
    // In that case we skip this check and continue with legacy stock flow.
    if (error.code === "42501") {
      return false;
    }
    throw error;
  }

  return (count || 0) > 0;
}

export async function deductOrderBatchesWithFallback(
  orderId: string,
  items: OrderItemInput[]
): Promise<DeductionResult> {
  const alreadyDeducted = await hasOrderBatchDeductions(orderId);
  if (alreadyDeducted) {
    return {
      alreadyDeducted: true,
      batchManagedSizeIds: new Set<string>(),
    };
  }

  const batchManagedSizeIds = new Set<string>();

  for (const item of items || []) {
    for (const size of item.sizes || []) {
      const sizeId = size.id;
      const cases = Number(size.quantity || 0);
      if (!sizeId || cases <= 0) {
        continue;
      }

      const qtyPerCase = Math.max(1, Number(size.quantity_per_case || 1));
      const requestedUnits = cases * qtyPerCase;

      try {
        const availableBatches = await BatchInventoryService.getAvailableBatches(sizeId);
        if (!availableBatches || availableBatches.length === 0) {
          continue;
        }

        const allocations = await BatchInventoryService.allocateQuantity(sizeId, requestedUnits);
        if (allocations.length === 0) {
          continue;
        }

        await BatchInventoryService.deductFromBatches(allocations, orderId, "order");
        batchManagedSizeIds.add(sizeId);
      } catch (error) {
        // Keep legacy stock fallback alive if batch allocation fails for a size.
        console.warn(`Batch deduction skipped for size ${sizeId}:`, error);
      }
    }
  }

  return {
    alreadyDeducted: false,
    batchManagedSizeIds,
  };
}
