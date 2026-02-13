import { supabase } from '@/integrations/supabase/client';

export interface StockReservation {
  id?: string;
  product_id: string;
  order_id: string;
  quantity: number;
  reserved_at?: string;
  expires_at?: string;
  status?: 'active' | 'fulfilled' | 'cancelled' | 'expired';
  created_at?: string;
  updated_at?: string;
}

export interface AvailableStockInfo {
  product_id: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
}

export class StockReservationService {
  /**
   * Check if enough stock is available for order
   */
  static async checkAvailability(
    items: Array<{ product_id: string; quantity: number }>
  ): Promise<{ available: boolean; insufficientProducts: string[] }> {
    const insufficientProducts: string[] = [];

    for (const item of items) {
      const available = await this.getAvailableStock(item.product_id);
      if (available < item.quantity) {
        insufficientProducts.push(item.product_id);
      }
    }

    return {
      available: insufficientProducts.length === 0,
      insufficientProducts
    };
  }

  /**
   * Reserve stock for an order
   */
  static async reserveStock(
    orderId: string,
    items: Array<{ product_id: string; quantity: number }>
  ): Promise<boolean> {
    try {
      // Check availability first
      const { available, insufficientProducts } = await this.checkAvailability(items);
      
      if (!available) {
        throw new Error(
          `Insufficient stock for products: ${insufficientProducts.join(', ')}`
        );
      }

      // Create reservations
      const reservations = items.map(item => ({
        product_id: item.product_id,
        order_id: orderId,
        quantity: item.quantity,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        status: 'active' as const
      }));

      const { error } = await supabase
        .from('stock_reservations')
        .insert(reservations);

      if (error) throw error;

      console.log(`✅ Stock reserved for order ${orderId}`);
      return true;
    } catch (error) {
      console.error('❌ Error reserving stock:', error);
      throw error;
    }
  }

  /**
   * Release stock reservation (order cancelled)
   */
  static async releaseReservation(orderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_reservations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('status', 'active');

      if (error) throw error;
      console.log(`✅ Stock reservation released for order ${orderId}`);
    } catch (error) {
      console.error('❌ Error releasing reservation:', error);
      throw error;
    }
  }

  /**
   * Fulfill reservation (order shipped/completed)
   */
  static async fulfillReservation(orderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_reservations')
        .update({ 
          status: 'fulfilled',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('status', 'active');

      if (error) throw error;
      console.log(`✅ Stock reservation fulfilled for order ${orderId}`);
    } catch (error) {
      console.error('❌ Error fulfilling reservation:', error);
      throw error;
    }
  }

  /**
   * Get available stock (current - reserved)
   */
  static async getAvailableStock(productId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_available_stock', { product_uuid: productId });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('❌ Error getting available stock:', error);
      // Fallback to current stock if function doesn't exist yet
      const { data: product } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', productId)
        .single();
      
      return Number(product?.current_stock) || 0;
    }
  }

  /**
   * Get detailed stock info for a product
   */
  static async getStockInfo(productId: string): Promise<AvailableStockInfo> {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('current_stock, reserved_stock')
      .eq('id', productId)
      .single();

    if (productError) throw productError;

    const currentStock = Number(product.current_stock) || 0;
    const reservedStock = Number(product.reserved_stock) || 0;
    const availableStock = currentStock - reservedStock;

    return {
      product_id: productId,
      current_stock: currentStock,
      reserved_stock: reservedStock,
      available_stock: Math.max(0, availableStock)
    };
  }

  /**
   * Get reservations for an order
   */
  static async getOrderReservations(orderId: string): Promise<StockReservation[]> {
    const { data, error } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('order_id', orderId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all active reservations for a product
   */
  static async getProductReservations(productId: string): Promise<StockReservation[]> {
    const { data, error } = await supabase
      .from('stock_reservations')
      .select('*, orders(order_number, status)')
      .eq('product_id', productId)
      .eq('status', 'active')
      .order('reserved_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Expire old reservations (run periodically via cron/scheduled function)
   */
  static async expireOldReservations(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('expire_old_reservations');
      
      if (error) throw error;
      
      const expiredCount = data || 0;
      if (expiredCount > 0) {
        console.log(`✅ Expired ${expiredCount} old reservations`);
      }
      
      return expiredCount;
    } catch (error) {
      console.error('❌ Error expiring reservations:', error);
      // Fallback manual expiration
      const { data, error: updateError } = await supabase
        .from('stock_reservations')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())
        .select();

      if (updateError) throw updateError;
      return data?.length || 0;
    }
  }

  /**
   * Extend reservation expiry (if order processing takes longer)
   */
  static async extendReservation(
    orderId: string,
    additionalHours: number = 24
  ): Promise<void> {
    const { error } = await supabase
      .from('stock_reservations')
      .update({
        expires_at: new Date(Date.now() + additionalHours * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .eq('status', 'active');

    if (error) throw error;
    console.log(`✅ Reservation extended for order ${orderId}`);
  }

  /**
   * Get reservation statistics
   */
  static async getReservationStats(): Promise<{
    total_active: number;
    total_reserved_quantity: number;
    expiring_soon: number;
  }> {
    const { data: activeReservations, error } = await supabase
      .from('stock_reservations')
      .select('quantity, expires_at')
      .eq('status', 'active');

    if (error) throw error;

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const stats = {
      total_active: activeReservations?.length || 0,
      total_reserved_quantity: activeReservations?.reduce((sum, r) => sum + Number(r.quantity), 0) || 0,
      expiring_soon: activeReservations?.filter(r => 
        new Date(r.expires_at!) <= oneHourFromNow
      ).length || 0
    };

    return stats;
  }
}
