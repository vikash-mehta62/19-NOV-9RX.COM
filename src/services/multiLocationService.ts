import { supabase } from '@/supabaseClient';

export interface LocationStock {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  reserved_quantity: number;
  min_stock: number;
  max_stock?: number;
  reorder_point?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockTransfer {
  id?: string;
  transfer_number?: string;
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  initiated_by?: string;
  received_by?: string;
  notes?: string;
  initiated_at?: string;
  completed_at?: string;
}

export class MultiLocationService {
  /**
   * Get stock for a product at a specific location
   */
  static async getLocationStock(
    productId: string,
    locationId: string
  ): Promise<LocationStock | null> {
    const { data, error } = await supabase
      .from('location_stock')
      .select('*')
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .single();

    if (error) {
      console.error('Error fetching location stock:', error);
      return null;
    }

    return data;
  }

  /**
   * Get stock for a product across all locations
   */
  static async getProductStockByLocation(productId: string) {
    const { data, error } = await supabase
      .from('location_stock')
      .select(`
        *,
        location:locations(id, name, type, status)
      `)
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching product stock by location:', error);
      return [];
    }

    return data;
  }

  /**
   * Get all stock at a location
   */
  static async getLocationInventory(locationId: string) {
    const { data, error } = await supabase
      .from('location_stock')
      .select(`
        *,
        product:products(id, name, sku, base_price)
      `)
      .eq('location_id', locationId)
      .order('quantity', { ascending: true });

    if (error) {
      console.error('Error fetching location inventory:', error);
      return [];
    }

    return data;
  }

  /**
   * Update stock at a location
   */
  static async updateLocationStock(
    productId: string,
    locationId: string,
    quantity: number
  ): Promise<boolean> {
    const { error } = await supabase
      .from('location_stock')
      .upsert({
        product_id: productId,
        location_id: locationId,
        quantity,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating location stock:', error);
      return false;
    }

    return true;
  }

  /**
   * Initiate a stock transfer between locations
   */
  static async initiateTransfer(transfer: StockTransfer): Promise<string | null> {
    try {
      // Generate transfer number
      const transferNumber = `TRF-${Date.now()}`;

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('stock_transfers')
        .insert({
          ...transfer,
          transfer_number: transferNumber,
          status: 'pending',
          initiated_by: session?.user?.id,
          initiated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error initiating transfer:', error);
        return null;
      }

      // Deduct from source location
      const { data: fromStock } = await supabase
        .from('location_stock')
        .select('quantity')
        .eq('product_id', transfer.product_id)
        .eq('location_id', transfer.from_location_id)
        .single();

      if (fromStock) {
        await supabase
          .from('location_stock')
          .update({
            quantity: fromStock.quantity - transfer.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', transfer.product_id)
          .eq('location_id', transfer.from_location_id);
      }

      return data.id;
    } catch (error) {
      console.error('Error in initiateTransfer:', error);
      return null;
    }
  }

  /**
   * Mark transfer as in transit
   */
  static async markInTransit(transferId: string): Promise<boolean> {
    const { error } = await supabase
      .from('stock_transfers')
      .update({
        status: 'in_transit',
        updated_at: new Date().toISOString()
      })
      .eq('id', transferId);

    if (error) {
      console.error('Error marking transfer in transit:', error);
      return false;
    }

    return true;
  }

  /**
   * Complete a stock transfer
   */
  static async completeTransfer(
    transferId: string,
    receivedBy?: string
  ): Promise<boolean> {
    try {
      // Get transfer details
      const { data: transfer, error: fetchError } = await supabase
        .from('stock_transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (fetchError || !transfer) {
        console.error('Error fetching transfer:', fetchError);
        return false;
      }

      // Get current user if not provided
      if (!receivedBy) {
        const { data: { session } } = await supabase.auth.getSession();
        receivedBy = session?.user?.id;
      }

      // Update transfer status
      const { error: updateError } = await supabase
        .from('stock_transfers')
        .update({
          status: 'completed',
          received_by: receivedBy,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (updateError) {
        console.error('Error completing transfer:', updateError);
        return false;
      }

      // Add to destination location
      const { data: toStock } = await supabase
        .from('location_stock')
        .select('quantity')
        .eq('product_id', transfer.product_id)
        .eq('location_id', transfer.to_location_id)
        .single();

      if (toStock) {
        await supabase
          .from('location_stock')
          .update({
            quantity: toStock.quantity + transfer.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', transfer.product_id)
          .eq('location_id', transfer.to_location_id);
      } else {
        // Create new location stock entry
        await supabase
          .from('location_stock')
          .insert({
            product_id: transfer.product_id,
            location_id: transfer.to_location_id,
            quantity: transfer.quantity
          });
      }

      return true;
    } catch (error) {
      console.error('Error in completeTransfer:', error);
      return false;
    }
  }

  /**
   * Get pending transfers
   */
  static async getPendingTransfers(locationId?: string) {
    let query = supabase
      .from('stock_transfers')
      .select(`
        *,
        product:products(id, name, sku),
        from_location:locations!from_location_id(id, name, type),
        to_location:locations!to_location_id(id, name, type),
        initiated_user:profiles!initiated_by(first_name, last_name)
      `)
      .in('status', ['pending', 'in_transit']);

    if (locationId) {
      query = query.or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`);
    }

    const { data, error } = await query.order('initiated_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending transfers:', error);
      return [];
    }

    return data;
  }

  /**
   * Get transfer history
   */
  static async getTransferHistory(productId?: string, locationId?: string) {
    let query = supabase
      .from('stock_transfers')
      .select(`
        *,
        product:products(id, name, sku),
        from_location:locations!from_location_id(id, name),
        to_location:locations!to_location_id(id, name)
      `);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (locationId) {
      query = query.or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`);
    }

    const { data, error } = await query.order('initiated_at', { ascending: false });

    if (error) {
      console.error('Error fetching transfer history:', error);
      return [];
    }

    return data;
  }

  /**
   * Cancel a transfer
   */
  static async cancelTransfer(transferId: string): Promise<boolean> {
    try {
      // Get transfer details
      const { data: transfer, error: fetchError } = await supabase
        .from('stock_transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (fetchError || !transfer) {
        console.error('Error fetching transfer:', fetchError);
        return false;
      }

      // Only allow cancelling pending or in_transit transfers
      if (!['pending', 'in_transit'].includes(transfer.status)) {
        console.error('Cannot cancel transfer with status:', transfer.status);
        return false;
      }

      // Update transfer status
      const { error: updateError } = await supabase
        .from('stock_transfers')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (updateError) {
        console.error('Error cancelling transfer:', updateError);
        return false;
      }

      // Restore stock to source location
      const { data: fromStock } = await supabase
        .from('location_stock')
        .select('quantity')
        .eq('product_id', transfer.product_id)
        .eq('location_id', transfer.from_location_id)
        .single();

      if (fromStock) {
        await supabase
          .from('location_stock')
          .update({
            quantity: fromStock.quantity + transfer.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', transfer.product_id)
          .eq('location_id', transfer.from_location_id);
      }

      return true;
    } catch (error) {
      console.error('Error in cancelTransfer:', error);
      return false;
    }
  }

  /**
   * Get low stock items at a location
   */
  static async getLowStockItems(locationId: string) {
    const { data, error } = await supabase
      .from('location_stock')
      .select(`
        *,
        product:products(id, name, sku, base_price)
      `)
      .eq('location_id', locationId)
      .filter('quantity', 'lte', 'min_stock')
      .order('quantity', { ascending: true });

    if (error) {
      console.error('Error fetching low stock items:', error);
      return [];
    }

    return data;
  }

  /**
   * Get total stock across all locations for a product
   */
  static async getTotalStock(productId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_total_stock', { p_product_id: productId });

    if (error) {
      console.error('Error getting total stock:', error);
      return 0;
    }

    return Number(data) || 0;
  }

  /**
   * Get available stock at a location
   */
  static async getAvailableStock(productId: string, locationId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_location_available_stock', {
        p_product_id: productId,
        p_location_id: locationId
      });

    if (error) {
      console.error('Error getting available stock:', error);
      return 0;
    }

    return Number(data) || 0;
  }
}
