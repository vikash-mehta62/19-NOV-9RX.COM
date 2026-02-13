import { supabase } from '@/integrations/supabase/client';

export interface ProductBatch {
  id?: string;
  product_id: string;
  batch_number: string;
  lot_number?: string;
  manufacturing_date?: string;
  expiry_date: string;
  quantity: number;
  cost_per_unit?: number;
  supplier_id?: string;
  status?: 'active' | 'quarantine' | 'recalled' | 'expired' | 'depleted';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BatchMovement {
  id?: string;
  batch_id: string;
  movement_type: 'receipt' | 'sale' | 'adjustment' | 'transfer' | 'disposal' | 'return';
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface ExpiringBatch {
  batch_id: string;
  product_id: string;
  product_name: string;
  batch_number: string;
  lot_number?: string;
  expiry_date: string;
  days_until_expiry: number;
  quantity: number;
  status: string;
}

export class BatchTrackingService {
  /**
   * Create a new batch
   */
  static async createBatch(batch: ProductBatch): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('product_batches')
        .insert({
          product_id: batch.product_id,
          batch_number: batch.batch_number,
          lot_number: batch.lot_number,
          manufacturing_date: batch.manufacturing_date,
          expiry_date: batch.expiry_date,
          quantity: batch.quantity,
          cost_per_unit: batch.cost_per_unit,
          supplier_id: batch.supplier_id,
          status: batch.status || 'active',
          notes: batch.notes
        })
        .select('id')
        .single();

      if (error) throw error;

      // Record receipt movement
      await this.recordBatchMovement({
        batch_id: data.id,
        movement_type: 'receipt',
        quantity: batch.quantity,
        notes: `Initial batch receipt: ${batch.batch_number}`
      });

      console.log(`✅ Batch created: ${batch.batch_number}`);
      return data.id;
    } catch (error) {
      console.error('❌ Error creating batch:', error);
      throw error;
    }
  }

  /**
   * Record batch movement
   */
  static async recordBatchMovement(movement: BatchMovement): Promise<void> {
    try {
      const { error } = await supabase
        .from('batch_movements')
        .insert({
          batch_id: movement.batch_id,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          reference_id: movement.reference_id,
          reference_type: movement.reference_type,
          notes: movement.notes,
          created_by: movement.created_by
        });

      if (error) throw error;

      // Update batch quantity
      const quantityChange = movement.movement_type === 'receipt' || movement.movement_type === 'return'
        ? movement.quantity
        : -movement.quantity;

      const { error: updateError } = await supabase.rpc('update_batch_quantity', {
        p_batch_id: movement.batch_id,
        p_quantity_change: quantityChange
      });

      // Fallback if function doesn't exist
      if (updateError) {
        const { data: batch } = await supabase
          .from('product_batches')
          .select('quantity')
          .eq('id', movement.batch_id)
          .single();

        const newQuantity = Number(batch?.quantity || 0) + quantityChange;

        await supabase
          .from('product_batches')
          .update({ 
            quantity: Math.max(0, newQuantity),
            status: newQuantity <= 0 ? 'depleted' : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', movement.batch_id);
      }

      console.log(`✅ Batch movement recorded: ${movement.movement_type}`);
    } catch (error) {
      console.error('❌ Error recording batch movement:', error);
      throw error;
    }
  }

  /**
   * Get available batches for a product (FEFO - First Expired, First Out)
   */
  static async getAvailableBatchesFEFO(productId: string): Promise<ProductBatch[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_available_batches_fefo', { p_product_id: productId });

      if (error) throw error;
      return data || [];
    } catch (error) {
      // Fallback query if function doesn't exist
      const { data, error: queryError } = await supabase
        .from('product_batches')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'active')
        .gt('quantity', 0)
        .gt('expiry_date', new Date().toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (queryError) throw queryError;
      return data || [];
    }
  }

  /**
   * Get batches expiring soon
   */
  static async getExpiringBatches(daysThreshold: number = 30): Promise<ExpiringBatch[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_expiring_batches', { days_threshold: daysThreshold });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting expiring batches:', error);
      throw error;
    }
  }

  /**
   * Get batch history
   */
  static async getBatchHistory(batchId: string): Promise<BatchMovement[]> {
    const { data, error } = await supabase
      .from('batch_movements')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all batches for a product
   */
  static async getProductBatches(productId: string): Promise<ProductBatch[]> {
    const { data, error } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_id', productId)
      .order('expiry_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update batch status
   */
  static async updateBatchStatus(
    batchId: string,
    status: ProductBatch['status'],
    notes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('product_batches')
      .update({ 
        status,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    if (error) throw error;
    console.log(`✅ Batch status updated to: ${status}`);
  }

  /**
   * Allocate stock from batches using FEFO
   */
  static async allocateFromBatches(
    productId: string,
    quantityNeeded: number,
    orderId?: string
  ): Promise<Array<{ batch_id: string; quantity: number }>> {
    const batches = await this.getAvailableBatchesFEFO(productId);
    const allocations: Array<{ batch_id: string; quantity: number }> = [];
    let remainingQuantity = quantityNeeded;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const allocateQuantity = Math.min(remainingQuantity, batch.quantity);
      
      allocations.push({
        batch_id: batch.id!,
        quantity: allocateQuantity
      });

      // Record the movement
      await this.recordBatchMovement({
        batch_id: batch.id!,
        movement_type: 'sale',
        quantity: allocateQuantity,
        reference_id: orderId,
        reference_type: 'order',
        notes: orderId ? `Allocated to order ${orderId}` : 'Stock allocation'
      });

      remainingQuantity -= allocateQuantity;
    }

    if (remainingQuantity > 0) {
      throw new Error(`Insufficient batch stock. Still need ${remainingQuantity} units`);
    }

    return allocations;
  }

  /**
   * Get batch by batch number
   */
  static async getBatchByNumber(
    productId: string,
    batchNumber: string
  ): Promise<ProductBatch | null> {
    const { data, error } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_id', productId)
      .eq('batch_number', batchNumber)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Generate batch number
   */
  static generateBatchNumber(prefix: string = 'BATCH'): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}${month}-${random}`;
  }
}
