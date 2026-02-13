import { supabase } from '@/supabaseClient';

export interface StockAdjustment {
  id?: string;
  adjustment_number?: string;
  product_id: string;
  location_id?: string;
  adjustment_type: 'increase' | 'decrease';
  quantity: number;
  reason_code: string;
  reason_description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  requested_by?: string;
  approved_by?: string;
  requested_at?: string;
  approved_at?: string;
  applied_at?: string;
}

export const REASON_CODES = {
  DAMAGED: 'Damaged Goods',
  EXPIRED: 'Expired Products',
  THEFT: 'Theft/Loss',
  FOUND: 'Found Inventory',
  CORRECTION: 'System Correction',
  RETURN: 'Customer Return',
  SAMPLE: 'Sample/Demo',
  WRITE_OFF: 'Write Off',
  OTHER: 'Other'
};

export class StockAdjustmentService {
  /**
   * Request a stock adjustment
   */
  static async requestAdjustment(adjustment: StockAdjustment): Promise<string | null> {
    try {
      // Generate adjustment number
      const adjustmentNumber = `ADJ-${Date.now()}`;

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('stock_adjustments')
        .insert({
          ...adjustment,
          adjustment_number: adjustmentNumber,
          requested_by: session?.user?.id,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error requesting adjustment:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in requestAdjustment:', error);
      return null;
    }
  }

  /**
   * Approve a stock adjustment
   */
  static async approveAdjustment(
    adjustmentId: string,
    approvedBy?: string
  ): Promise<boolean> {
    try {
      // Get current user if not provided
      if (!approvedBy) {
        const { data: { session } } = await supabase.auth.getSession();
        approvedBy = session?.user?.id;
      }

      const { error } = await supabase
        .from('stock_adjustments')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString()
        })
        .eq('id', adjustmentId);

      if (error) {
        console.error('Error approving adjustment:', error);
        return false;
      }

      // Auto-apply the adjustment
      await this.applyAdjustment(adjustmentId);

      return true;
    } catch (error) {
      console.error('Error in approveAdjustment:', error);
      return false;
    }
  }

  /**
   * Reject a stock adjustment
   */
  static async rejectAdjustment(
    adjustmentId: string,
    approvedBy?: string
  ): Promise<boolean> {
    try {
      // Get current user if not provided
      if (!approvedBy) {
        const { data: { session } } = await supabase.auth.getSession();
        approvedBy = session?.user?.id;
      }

      const { error } = await supabase
        .from('stock_adjustments')
        .update({
          status: 'rejected',
          approved_by: approvedBy,
          approved_at: new Date().toISOString()
        })
        .eq('id', adjustmentId);

      if (error) {
        console.error('Error rejecting adjustment:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in rejectAdjustment:', error);
      return false;
    }
  }

  /**
   * Apply an approved adjustment to inventory
   */
  static async applyAdjustment(adjustmentId: string): Promise<boolean> {
    try {
      // Get adjustment details
      const { data: adjustment, error: fetchError } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('id', adjustmentId)
        .single();

      if (fetchError || !adjustment) {
        console.error('Error fetching adjustment:', fetchError);
        return false;
      }

      // Only apply approved adjustments
      if (adjustment.status !== 'approved') {
        console.error('Can only apply approved adjustments');
        return false;
      }

      // Calculate quantity change
      const quantityChange = adjustment.adjustment_type === 'increase'
        ? adjustment.quantity
        : -adjustment.quantity;

      // Update stock
      if (adjustment.location_id) {
        // Update location stock
        const { data: locationStock } = await supabase
          .from('location_stock')
          .select('quantity')
          .eq('product_id', adjustment.product_id)
          .eq('location_id', adjustment.location_id)
          .single();

        if (locationStock) {
          await supabase
            .from('location_stock')
            .update({
              quantity: locationStock.quantity + quantityChange,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', adjustment.product_id)
            .eq('location_id', adjustment.location_id);
        }
      } else {
        // Update product stock
        const { data: product } = await supabase
          .from('products')
          .select('current_stock')
          .eq('id', adjustment.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({
              current_stock: Number(product.current_stock) + quantityChange,
              updated_at: new Date().toISOString()
            })
            .eq('id', adjustment.product_id);
        }
      }

      // Record inventory transaction
      await supabase
        .from('inventory_transactions')
        .insert({
          product_id: adjustment.product_id,
          type: 'adjustment',
          quantity: quantityChange,
          reference_id: adjustmentId,
          notes: `${adjustment.reason_code}: ${adjustment.reason_description || ''}`
        });

      // Update adjustment status
      await supabase
        .from('stock_adjustments')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', adjustmentId);

      return true;
    } catch (error) {
      console.error('Error in applyAdjustment:', error);
      return false;
    }
  }

  /**
   * Get adjustment details
   */
  static async getAdjustment(adjustmentId: string) {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select(`
        *,
        product:products(id, name, sku, base_price),
        location:locations(id, name, type),
        requested_user:profiles!requested_by(first_name, last_name, email),
        approved_user:profiles!approved_by(first_name, last_name, email)
      `)
      .eq('id', adjustmentId)
      .single();

    if (error) {
      console.error('Error fetching adjustment:', error);
      return null;
    }

    return data;
  }

  /**
   * Get pending adjustments
   */
  static async getPendingAdjustments(locationId?: string) {
    let query = supabase
      .from('stock_adjustments')
      .select(`
        *,
        product:products(id, name, sku),
        location:locations(id, name),
        requested_user:profiles!requested_by(first_name, last_name)
      `)
      .eq('status', 'pending');

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query.order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending adjustments:', error);
      return [];
    }

    return data;
  }

  /**
   * Get adjustment history
   */
  static async getAdjustmentHistory(
    productId?: string,
    locationId?: string,
    status?: string
  ) {
    let query = supabase
      .from('stock_adjustments')
      .select(`
        *,
        product:products(id, name, sku),
        location:locations(id, name),
        requested_user:profiles!requested_by(first_name, last_name),
        approved_user:profiles!approved_by(first_name, last_name)
      `);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching adjustment history:', error);
      return [];
    }

    return data;
  }

  /**
   * Get adjustment statistics
   */
  static async getAdjustmentStats(startDate?: string, endDate?: string) {
    let query = supabase
      .from('stock_adjustments')
      .select('*');

    if (startDate) {
      query = query.gte('requested_at', startDate);
    }

    if (endDate) {
      query = query.lte('requested_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching adjustment stats:', error);
      return null;
    }

    // Calculate statistics
    const stats = {
      total: data.length,
      pending: data.filter(a => a.status === 'pending').length,
      approved: data.filter(a => a.status === 'approved').length,
      rejected: data.filter(a => a.status === 'rejected').length,
      applied: data.filter(a => a.status === 'applied').length,
      totalIncrease: data
        .filter(a => a.adjustment_type === 'increase' && a.status === 'applied')
        .reduce((sum, a) => sum + Number(a.quantity), 0),
      totalDecrease: data
        .filter(a => a.adjustment_type === 'decrease' && a.status === 'applied')
        .reduce((sum, a) => sum + Number(a.quantity), 0),
      byReasonCode: {} as Record<string, number>
    };

    // Count by reason code
    data.forEach(adjustment => {
      if (!stats.byReasonCode[adjustment.reason_code]) {
        stats.byReasonCode[adjustment.reason_code] = 0;
      }
      stats.byReasonCode[adjustment.reason_code]++;
    });

    return stats;
  }

  /**
   * Bulk approve adjustments
   */
  static async bulkApproveAdjustments(
    adjustmentIds: string[],
    approvedBy?: string
  ): Promise<boolean> {
    try {
      for (const id of adjustmentIds) {
        await this.approveAdjustment(id, approvedBy);
      }
      return true;
    } catch (error) {
      console.error('Error in bulkApproveAdjustments:', error);
      return false;
    }
  }

  /**
   * Bulk reject adjustments
   */
  static async bulkRejectAdjustments(
    adjustmentIds: string[],
    approvedBy?: string
  ): Promise<boolean> {
    try {
      for (const id of adjustmentIds) {
        await this.rejectAdjustment(id, approvedBy);
      }
      return true;
    } catch (error) {
      console.error('Error in bulkRejectAdjustments:', error);
      return false;
    }
  }
}
