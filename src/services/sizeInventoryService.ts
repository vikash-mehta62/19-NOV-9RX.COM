import { supabase } from '@/integrations/supabase/client';

export interface SizeInventoryUpdate {
  size_id: string;
  stock?: number;
  price?: number;
  price_per_case?: number;
  sku?: string;
  ndcCode?: string;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
  quantity_per_case?: number;
}

export interface SizeStockAdjustment {
  size_id: string;
  product_id: string;
  adjustment_type: 'increase' | 'decrease';
  quantity: number;
  reason_code: string;
  reason_description?: string;
}

export class SizeInventoryService {
  /**
   * Update size-specific inventory details
   */
  static async updateSizeInventory(sizeId: string, updates: Partial<SizeInventoryUpdate>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('product_sizes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sizeId);

      if (error) {
        console.error('Error updating size inventory:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateSizeInventory:', error);
      return false;
    }
  }

  /**
   * Adjust stock for a specific size
   */
  static async adjustSizeStock(adjustment: SizeStockAdjustment): Promise<boolean> {
    try {
      // Get current stock
      const { data: size, error: fetchError } = await supabase
        .from('product_sizes')
        .select('stock')
        .eq('id', adjustment.size_id)
        .single();

      if (fetchError || !size) {
        console.error('Error fetching size:', fetchError);
        return false;
      }

      const currentStock = Number(size.stock) || 0;
      const quantityChange = adjustment.adjustment_type === 'increase' 
        ? adjustment.quantity 
        : -adjustment.quantity;
      const newStock = currentStock + quantityChange;

      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current: ${currentStock}, Requested: ${Math.abs(quantityChange)}`);
      }

      // Update stock
      const { error: updateError } = await supabase
        .from('product_sizes')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', adjustment.size_id);

      if (updateError) {
        console.error('Error updating stock:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in adjustSizeStock:', error);
      return false;
    }
  }

  /**
   * Get low stock sizes across all products
   */
  static async getLowStockSizes(threshold: number = 20): Promise<any[]> {
    try {
      // First get all product sizes with their products
      const { data, error } = await supabase
        .from('product_sizes')
        .select(`
          *,
          product:products!inner(id, name, sku, category)
        `)
        .not('product_id', 'is', null);

      if (error) {
        console.error('Error fetching low stock sizes:', error);
        return [];
      }

      // Filter in JavaScript since stock is stored as string
      const lowStockItems = (data || [])
        .filter(item => {
          const stockNum = parseInt(item.stock || '0', 10);
          return stockNum <= threshold && item.product && item.product.name;
        })
        .sort((a, b) => {
          const stockA = parseInt(a.stock || '0', 10);
          const stockB = parseInt(b.stock || '0', 10);
          return stockA - stockB;
        });

      return lowStockItems;
    } catch (error) {
      console.error('Error in getLowStockSizes:', error);
      return [];
    }
  }

  /**
   * Get all sizes for a product with inventory details
   */
  static async getProductSizes(productId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('*')
        .eq('product_id', productId)
        .order('sizeSquanence', { ascending: true });

      if (error) {
        console.error('Error fetching product sizes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProductSizes:', error);
      return [];
    }
  }

  /**
   * Bulk update multiple sizes
   */
  static async bulkUpdateSizes(updates: Array<{ id: string; updates: Partial<SizeInventoryUpdate> }>): Promise<boolean> {
    try {
      for (const { id, updates: sizeUpdates } of updates) {
        await this.updateSizeInventory(id, sizeUpdates);
      }
      return true;
    } catch (error) {
      console.error('Error in bulkUpdateSizes:', error);
      return false;
    }
  }

  /**
   * Get size inventory statistics
   */
  static async getSizeInventoryStats(): Promise<{
    totalSizes: number;
    lowStockSizes: number;
    totalValue: number;
    averageStock: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('stock, price');

      if (error) throw error;

      const totalSizes = data?.length || 0;
      const lowStockSizes = data?.filter(s => Number(s.stock) <= 20).length || 0;
      const totalValue = data?.reduce((sum, s) => sum + (Number(s.stock) * Number(s.price)), 0) || 0;
      const averageStock = totalSizes > 0 
        ? data?.reduce((sum, s) => sum + Number(s.stock), 0) / totalSizes 
        : 0;

      return {
        totalSizes,
        lowStockSizes,
        totalValue,
        averageStock
      };
    } catch (error) {
      console.error('Error in getSizeInventoryStats:', error);
      return {
        totalSizes: 0,
        lowStockSizes: 0,
        totalValue: 0,
        averageStock: 0
      };
    }
  }
}
