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
  console.log('🔵 ========== BATCH DEDUCTION START ==========');
  console.log('🔵 Order ID:', orderId);
  console.log('🔵 Items:', JSON.stringify(items, null, 2));
  
  const alreadyDeducted = await hasOrderBatchDeductions(orderId);
  if (alreadyDeducted) {
    console.log('✅ Batch already deducted for this order');
    return {
      alreadyDeducted: true,
      batchManagedSizeIds: new Set<string>(),
    };
  }

  const batchManagedSizeIds = new Set<string>();
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of items || []) {
    console.log('🔵 Processing item:', item);
    
    if (!item.sizes || item.sizes.length === 0) {
      console.log('⚠️ Item has no sizes, skipping');
      continue;
    }

    for (const size of item.sizes || []) {
      const sizeId = size.id;
      const cases = Number(size.quantity || 0);
      
      console.log(`🔵 Processing size: ${sizeId}, cases: ${cases}`);
      
      if (!sizeId || cases <= 0) {
        console.log(`⚠️ Invalid size data - sizeId: ${sizeId}, cases: ${cases}`);
        skippedCount++;
        continue;
      }

      const qtyPerCase = Math.max(1, Number(size.quantity_per_case || 1));
      const requestedUnits = cases * qtyPerCase;
      
      console.log(`🔵 Size ${sizeId}: ${cases} cases × ${qtyPerCase} units/case = ${requestedUnits} total units`);

      try {
        const availableBatches = await BatchInventoryService.getAvailableBatches(sizeId);
        console.log(`🔵 Available batches for size ${sizeId}:`, availableBatches?.length || 0);
        
        if (!availableBatches || availableBatches.length === 0) {
          console.log(`⚠️ No batches available for size ${sizeId}, will use product_sizes fallback`);
          skippedCount++;
          continue;
        }

        const allocations = await BatchInventoryService.allocateQuantity(sizeId, requestedUnits);
        console.log(`🔵 Allocations for size ${sizeId}:`, allocations?.length || 0);
        
        if (allocations.length === 0) {
          console.log(`⚠️ No allocations possible for size ${sizeId}, will use product_sizes fallback`);
          skippedCount++;
          continue;
        }

        await BatchInventoryService.deductFromBatches(allocations, orderId, "order");
        batchManagedSizeIds.add(sizeId);
        processedCount++;
        console.log(`✅ Batch deduction successful for size ${sizeId}`);
      } catch (error) {
        console.error(`❌ Batch deduction error for size ${sizeId}:`, error);
        errorCount++;
        // Keep legacy stock fallback alive if batch allocation fails for a size.
      }
    }
  }

  console.log('🔵 ========== BATCH DEDUCTION SUMMARY ==========');
  console.log(`✅ Successfully processed: ${processedCount} sizes`);
  console.log(`⚠️ Skipped (no batches): ${skippedCount} sizes`);
  console.log(`❌ Errors: ${errorCount} sizes`);
  console.log('🔵 Batch managed size IDs:', Array.from(batchManagedSizeIds));
  console.log('🔵 ========== BATCH DEDUCTION END ==========');

  return {
    alreadyDeducted: false,
    batchManagedSizeIds,
  };
}
