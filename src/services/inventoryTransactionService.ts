import { supabase } from '@/integrations/supabase/client';

export type TransactionType = 
  | 'sale'           // Order placed
  | 'receipt'        // Stock received
  | 'adjustment'     // Manual adjustment
  | 'return'         // Customer return
  | 'transfer'       // Location transfer
  | 'restoration'    // Order cancelled
  | 'damage'         // Damaged goods
  | 'expired'        // Expired products
  | 'theft';         // Theft/loss

export interface InventoryTransaction {
  id?: string;
  product_id: string;
  type: TransactionType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export class InventoryTransactionService {
  /**
   * Record an inventory transaction
   */
  static async recordTransaction(
    productId: string,
    type: TransactionType,
    quantity: number,
    referenceId?: string,
    notes?: string,
    userId?: string
  ): Promise<void> {
    try {
      // Get current stock
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const previousStock = Number(product.current_stock) || 0;
      const newStock = previousStock + quantity;

      // Prevent negative stock
      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current: ${previousStock}, Requested: ${Math.abs(quantity)}`);
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          product_id: productId,
          type,
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_id: referenceId,
          notes,
          created_by: userId
        });

      if (transactionError) throw transactionError;

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      console.log(`✅ Inventory transaction recorded: ${type} ${quantity} units for product ${productId}`);
    } catch (error) {
      console.error('❌ Error recording inventory transaction:', error);
      throw error;
    }
  }

  /**
   * Record multiple transactions (for orders with multiple items)
   */
  static async recordBulkTransactions(
    transactions: Array<{
      productId: string;
      type: TransactionType;
      quantity: number;
      referenceId?: string;
      notes?: string;
    }>,
    userId?: string
  ): Promise<void> {
    try {
      for (const transaction of transactions) {
        await this.recordTransaction(
          transaction.productId,
          transaction.type,
          transaction.quantity,
          transaction.referenceId,
          transaction.notes,
          userId
        );
      }
    } catch (error) {
      console.error('❌ Error recording bulk transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a product
   */
  static async getProductHistory(
    productId: string,
    limit: number = 50
  ): Promise<InventoryTransaction[]> {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all transactions within date range
   */
  static async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<InventoryTransaction[]> {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*, products(name, sku)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get transaction summary by type
   */
  static async getTransactionSummary(
    startDate: Date,
    endDate: Date
  ): Promise<Record<TransactionType, number>> {
    const transactions = await this.getTransactionsByDateRange(startDate, endDate);
    
    const summary: Record<string, number> = {};
    transactions.forEach(t => {
      summary[t.type] = (summary[t.type] || 0) + Math.abs(t.quantity);
    });

    return summary as Record<TransactionType, number>;
  }

  /**
   * Get stock movement report
   */
  static async getStockMovementReport(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    product_id: string;
    product_name: string;
    sold: number;
    received: number;
    adjusted: number;
    returned: number;
    net_change: number;
  }>> {
    const transactions = await this.getTransactionsByDateRange(startDate, endDate);
    
    const productMap = new Map<string, any>();

    transactions.forEach(t => {
      const product = (t as any).products;
      if (!product) return;

      if (!productMap.has(t.product_id)) {
        productMap.set(t.product_id, {
          product_id: t.product_id,
          product_name: product.name,
          sold: 0,
          received: 0,
          adjusted: 0,
          returned: 0,
          net_change: 0
        });
      }

      const data = productMap.get(t.product_id);
      
      switch (t.type) {
        case 'sale':
          data.sold += Math.abs(t.quantity);
          break;
        case 'receipt':
          data.received += Math.abs(t.quantity);
          break;
        case 'adjustment':
          data.adjusted += t.quantity;
          break;
        case 'return':
          data.returned += Math.abs(t.quantity);
          break;
      }
      
      data.net_change += t.quantity;
    });

    return Array.from(productMap.values());
  }
}
