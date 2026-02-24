import { supabase } from '@/integrations/supabase/client';

export interface ProductBatch {
  id: string;
  product_id: string;
  product_size_id: string;
  batch_number: string;
  lot_number: string;
  manufacturing_date?: string;
  expiry_date?: string;
  quantity: number;
  quantity_available: number;
  cost_per_unit?: number;
  supplier_id?: string;
  status: string;
  notes?: string;
  received_date: string;
  created_at: string;
  updated_at: string;
}

export interface BatchTransaction {
  id: string;
  batch_id: string;
  transaction_type: 'receive' | 'sale' | 'adjustment' | 'return' | 'expired' | 'damaged';
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface BatchAllocation {
  batch_id: string;
  lot_number: string;
  quantity: number;
  expiry_date?: string;
}

export class BatchInventoryService {
  /**
   * Get all batches for a specific product size
   */
  static async getBatchesBySize(productSizeId: string): Promise<ProductBatch[]> {
    const { data, error } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_size_id', productSizeId)
      .eq('status', 'active')
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .order('received_date', { ascending: true });

    if (error) {
      console.error('Error fetching batches:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get batches with available quantity (FIFO order)
   */
  static async getAvailableBatches(productSizeId: string): Promise<ProductBatch[]> {
    const { data, error } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_size_id', productSizeId)
      .eq('status', 'active')
      .gt('quantity_available', 0)
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .order('received_date', { ascending: true });

    if (error) {
      console.error('Error fetching available batches:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a new batch (when receiving inventory)
   */
  static async createBatch(batch: Partial<ProductBatch>): Promise<ProductBatch | null> {
    const { data, error } = await supabase
      .from('product_batches')
      .insert({
        product_id: batch.product_id,
        product_size_id: batch.product_size_id,
        batch_number: batch.batch_number,
        lot_number: batch.lot_number,
        manufacturing_date: batch.manufacturing_date,
        expiry_date: batch.expiry_date,
        quantity: batch.quantity,
        quantity_available: batch.quantity, // Initially all quantity is available
        cost_per_unit: batch.cost_per_unit,
        supplier_id: batch.supplier_id,
        status: 'active',
        notes: batch.notes,
        received_date: batch.received_date || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating batch:', error);
      throw error;
    }

    // Update product_sizes stock quantity
    if (data && batch.product_size_id) {
      try {
        // Get current stock
        const { data: sizeData, error: sizeError } = await supabase
          .from('product_sizes')
          .select('stock')
          .eq('id', batch.product_size_id)
          .single();

        if (!sizeError && sizeData) {
          const currentStock = Number(sizeData.stock) || 0;
          const newStock = currentStock + Number(batch.quantity);

          // Update stock
          await supabase
            .from('product_sizes')
            .update({ 
              stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', batch.product_size_id);
        }
      } catch (stockError) {
        console.error('Error updating product_sizes stock:', stockError);
        // Don't throw - batch was created successfully
      }
    }

    // Record transaction
    if (data) {
      await this.recordTransaction({
        batch_id: data.id,
        transaction_type: 'receive',
        quantity: batch.quantity!,
        notes: `Received batch ${batch.batch_number}`,
      });
    }

    return data;
  }

  /**
   * Allocate quantity from batches using FIFO logic
   * Returns array of batch allocations
   */
  static async allocateQuantity(
    productSizeId: string,
    requestedQuantity: number
  ): Promise<BatchAllocation[]> {
    const batches = await this.getAvailableBatches(productSizeId);
    const allocations: BatchAllocation[] = [];
    let remainingQuantity = requestedQuantity;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const availableQty = Number(batch.quantity_available);
      const allocateQty = Math.min(availableQty, remainingQuantity);

      if (allocateQty > 0) {
        allocations.push({
          batch_id: batch.id,
          lot_number: batch.lot_number,
          quantity: allocateQty,
          expiry_date: batch.expiry_date,
        });

        remainingQuantity -= allocateQty;
      }
    }

    if (remainingQuantity > 0) {
      throw new Error(`Insufficient stock. Need ${remainingQuantity} more units.`);
    }

    return allocations;
  }

  /**
   * Deduct quantity from batches (for sales)
   */
  static async deductFromBatches(
    allocations: BatchAllocation[],
    referenceId?: string,
    referenceType?: string
  ): Promise<boolean> {
    try {
      let productSizeId: string | null = null;
      let totalDeducted = 0;

      for (const allocation of allocations) {
        // Get batch info to find product_size_id
        const { data: batchData } = await supabase
          .from('product_batches')
          .select('product_size_id, quantity_available')
          .eq('id', allocation.batch_id)
          .single();

        if (batchData) {
          productSizeId = batchData.product_size_id;
          totalDeducted += allocation.quantity;

          // Update batch quantity
          const { error: updateError } = await supabase.rpc('deduct_batch_quantity', {
            p_batch_id: allocation.batch_id,
            p_quantity: allocation.quantity,
          });

          if (updateError) {
            // Fallback to manual update if function doesn't exist
            await supabase
              .from('product_batches')
              .update({
                quantity_available: Number(batchData.quantity_available) - allocation.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq('id', allocation.batch_id);
          }
        }

        // Record transaction
        await this.recordTransaction({
          batch_id: allocation.batch_id,
          transaction_type: 'sale',
          quantity: allocation.quantity,
          reference_id: referenceId,
          reference_type: referenceType,
          notes: `Sale from lot ${allocation.lot_number}`,
        });
      }

      // Update product_sizes stock quantity
      if (productSizeId && totalDeducted > 0) {
        try {
          const { data: sizeData, error: sizeError } = await supabase
            .from('product_sizes')
            .select('stock')
            .eq('id', productSizeId)
            .single();

          if (!sizeError && sizeData) {
            const currentStock = Number(sizeData.stock) || 0;
            const newStock = Math.max(0, currentStock - totalDeducted);

            await supabase
              .from('product_sizes')
              .update({ 
                stock: newStock,
                updated_at: new Date().toISOString()
              })
              .eq('id', productSizeId);
          }
        } catch (stockError) {
          console.error('Error updating product_sizes stock:', stockError);
          // Don't throw - batches were deducted successfully
        }
      }

      return true;
    } catch (error) {
      console.error('Error deducting from batches:', error);
      throw error;
    }
  }

  /**
   * Record a batch transaction
   */
  static async recordTransaction(transaction: Partial<BatchTransaction>): Promise<void> {
    const { error } = await supabase.from('batch_transactions').insert({
      batch_id: transaction.batch_id,
      transaction_type: transaction.transaction_type,
      quantity: transaction.quantity,
      reference_id: transaction.reference_id,
      reference_type: transaction.reference_type,
      notes: transaction.notes,
    });

    if (error) {
      console.error('Error recording transaction:', error);
    }
  }

  /**
   * Get batch transaction history
   */
  static async getBatchTransactions(batchId: string): Promise<BatchTransaction[]> {
    const { data, error } = await supabase
      .from('batch_transactions')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get expiring batches (within specified days)
   */
  static async getExpiringBatches(days: number = 90): Promise<ProductBatch[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('product_batches')
      .select(`
        *,
        product_sizes!inner (
          id,
          size_value,
          size_unit,
          sku,
          products!inner (
            id,
            name,
            category
          )
        )
      `)
      .eq('status', 'active')
      .gt('quantity_available', 0)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching expiring batches:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Mark batch as expired
   */
  static async markBatchExpired(batchId: string, notes?: string): Promise<boolean> {
    const { error } = await supabase
      .from('product_batches')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    if (error) {
      console.error('Error marking batch as expired:', error);
      return false;
    }

    // Record transaction
    await this.recordTransaction({
      batch_id: batchId,
      transaction_type: 'expired',
      quantity: 0,
      notes: notes || 'Batch marked as expired',
    });

    return true;
  }

  /**
   * Adjust batch quantity (for corrections, damages, etc.)
   */
  static async adjustBatchQuantity(
    batchId: string,
    adjustment: number,
    reason: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const { data: batch } = await supabase
        .from('product_batches')
        .select('quantity_available, product_size_id')
        .eq('id', batchId)
        .single();

      if (!batch) {
        throw new Error('Batch not found');
      }

      const newQuantity = Number(batch.quantity_available) + adjustment;

      if (newQuantity < 0) {
        throw new Error('Adjustment would result in negative quantity');
      }

      const { error } = await supabase
        .from('product_batches')
        .update({
          quantity_available: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId);

      if (error) throw error;

      // Update product_sizes stock quantity
      if (batch.product_size_id) {
        try {
          const { data: sizeData, error: sizeError } = await supabase
            .from('product_sizes')
            .select('stock')
            .eq('id', batch.product_size_id)
            .single();

          if (!sizeError && sizeData) {
            const currentStock = Number(sizeData.stock) || 0;
            const newStock = Math.max(0, currentStock + adjustment);

            await supabase
              .from('product_sizes')
              .update({ 
                stock: newStock,
                updated_at: new Date().toISOString()
              })
              .eq('id', batch.product_size_id);
          }
        } catch (stockError) {
          console.error('Error updating product_sizes stock:', stockError);
          // Don't throw - batch was adjusted successfully
        }
      }

      // Record transaction
      await this.recordTransaction({
        batch_id: batchId,
        transaction_type: 'adjustment',
        quantity: Math.abs(adjustment),
        notes: `${reason}: ${notes || ''}`,
      });

      return true;
    } catch (error) {
      console.error('Error adjusting batch quantity:', error);
      throw error;
    }
  }

  /**
   * Get total available quantity across all batches for a size
   */
  static async getTotalAvailableQuantity(productSizeId: string): Promise<number> {
    const batches = await this.getAvailableBatches(productSizeId);
    return batches.reduce((sum, batch) => sum + Number(batch.quantity_available), 0);
  }
}
