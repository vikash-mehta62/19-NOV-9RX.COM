import { supabase } from '@/supabaseClient';

export interface CycleCount {
  id?: string;
  count_number?: string;
  location_id?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  count_type: 'full' | 'partial' | 'spot';
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  counted_by?: string;
  approved_by?: string;
  notes?: string;
}

export interface CycleCountItem {
  id?: string;
  cycle_count_id: string;
  product_id: string;
  expected_quantity: number;
  counted_quantity?: number;
  variance?: number;
  variance_percentage?: number;
  notes?: string;
  counted_at?: string;
}

export class CycleCountService {
  /**
   * Create a new cycle count
   */
  static async createCycleCount(
    cycleCount: CycleCount,
    productIds?: string[]
  ): Promise<string | null> {
    try {
      // Generate count number
      const countNumber = `CC-${Date.now()}`;

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('cycle_counts')
        .insert({
          ...cycleCount,
          count_number: countNumber,
          counted_by: session?.user?.id,
          status: 'planned'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating cycle count:', error);
        return null;
      }

      // Add products to count
      if (productIds && productIds.length > 0) {
        await this.addProductsToCount(data.id, productIds, cycleCount.location_id);
      }

      return data.id;
    } catch (error) {
      console.error('Error in createCycleCount:', error);
      return null;
    }
  }

  /**
   * Add products to a cycle count
   */
  static async addProductsToCount(
    cycleCountId: string,
    productIds: string[],
    locationId?: string
  ): Promise<boolean> {
    try {
      const items: any[] = [];

      for (const productId of productIds) {
        let expectedQuantity = 0;

        if (locationId) {
          // Get stock from location_stock
          const { data: locationStock } = await supabase
            .from('location_stock')
            .select('quantity')
            .eq('product_id', productId)
            .eq('location_id', locationId)
            .single();

          expectedQuantity = Number(locationStock?.quantity) || 0;
        } else {
          // Get stock from products table
          const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', productId)
            .single();

          expectedQuantity = Number(product?.current_stock) || 0;
        }

        items.push({
          cycle_count_id: cycleCountId,
          product_id: productId,
          expected_quantity: expectedQuantity
        });
      }

      const { error } = await supabase
        .from('cycle_count_items')
        .insert(items);

      if (error) {
        console.error('Error adding products to count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addProductsToCount:', error);
      return false;
    }
  }

  /**
   * Start a cycle count
   */
  static async startCycleCount(cycleCountId: string): Promise<boolean> {
    const { error } = await supabase
      .from('cycle_counts')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', cycleCountId);

    if (error) {
      console.error('Error starting cycle count:', error);
      return false;
    }

    return true;
  }

  /**
   * Record counted quantity for an item
   */
  static async recordCount(
    itemId: string,
    countedQuantity: number,
    notes?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('cycle_count_items')
      .update({
        counted_quantity: countedQuantity,
        notes,
        counted_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error recording count:', error);
      return false;
    }

    return true;
  }

  /**
   * Complete a cycle count
   */
  static async completeCycleCount(
    cycleCountId: string,
    approvedBy?: string
  ): Promise<boolean> {
    try {
      // Get current user if not provided
      if (!approvedBy) {
        const { data: { session } } = await supabase.auth.getSession();
        approvedBy = session?.user?.id;
      }

      const { error } = await supabase
        .from('cycle_counts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          approved_by: approvedBy
        })
        .eq('id', cycleCountId);

      if (error) {
        console.error('Error completing cycle count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in completeCycleCount:', error);
      return false;
    }
  }

  /**
   * Cancel a cycle count
   */
  static async cancelCycleCount(cycleCountId: string): Promise<boolean> {
    const { error } = await supabase
      .from('cycle_counts')
      .update({
        status: 'cancelled'
      })
      .eq('id', cycleCountId);

    if (error) {
      console.error('Error cancelling cycle count:', error);
      return false;
    }

    return true;
  }

  /**
   * Get cycle count details
   */
  static async getCycleCount(cycleCountId: string) {
    const { data, error } = await supabase
      .from('cycle_counts')
      .select(`
        *,
        location:locations(id, name, type),
        counted_user:profiles!counted_by(first_name, last_name),
        approved_user:profiles!approved_by(first_name, last_name)
      `)
      .eq('id', cycleCountId)
      .single();

    if (error) {
      console.error('Error fetching cycle count:', error);
      return null;
    }

    return data;
  }

  /**
   * Get cycle count items
   */
  static async getCycleCountItems(cycleCountId: string) {
    const { data, error } = await supabase
      .from('cycle_count_items')
      .select(`
        *,
        product:products(id, name, sku, base_price)
      `)
      .eq('cycle_count_id', cycleCountId)
      .order('product(name)', { ascending: true });

    if (error) {
      console.error('Error fetching cycle count items:', error);
      return [];
    }

    return data;
  }

  /**
   * Get all cycle counts
   */
  static async getAllCycleCounts(status?: string, locationId?: string) {
    let query = supabase
      .from('cycle_counts')
      .select(`
        *,
        location:locations(id, name, type)
      `);

    if (status) {
      query = query.eq('status', status);
    }

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query.order('scheduled_date', { ascending: false });

    if (error) {
      console.error('Error fetching cycle counts:', error);
      return [];
    }

    return data;
  }

  /**
   * Get variance report
   */
  static async getVarianceReport(cycleCountId: string) {
    const { data, error } = await supabase
      .from('cycle_count_items')
      .select(`
        *,
        product:products(id, name, sku),
        cycle_count:cycle_counts(count_number, location_id)
      `)
      .eq('cycle_count_id', cycleCountId)
      .neq('variance', 0)
      .order('variance_percentage', { ascending: false });

    if (error) {
      console.error('Error fetching variance report:', error);
      return [];
    }

    return data;
  }

  /**
   * Apply count adjustments to inventory
   */
  static async applyCountAdjustments(cycleCountId: string): Promise<boolean> {
    try {
      // Get cycle count details
      const { data: cycleCount } = await supabase
        .from('cycle_counts')
        .select('location_id')
        .eq('id', cycleCountId)
        .single();

      if (!cycleCount) {
        console.error('Cycle count not found');
        return false;
      }

      // Get all items with variances
      const { data: items } = await supabase
        .from('cycle_count_items')
        .select('*')
        .eq('cycle_count_id', cycleCountId)
        .neq('variance', 0);

      if (!items || items.length === 0) {
        return true; // No adjustments needed
      }

      // Apply adjustments
      for (const item of items) {
        if (cycleCount.location_id) {
          // Update location stock
          await supabase
            .from('location_stock')
            .update({
              quantity: item.counted_quantity,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', item.product_id)
            .eq('location_id', cycleCount.location_id);
        } else {
          // Update product stock
          await supabase
            .from('products')
            .update({
              current_stock: item.counted_quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.product_id);
        }

        // Record inventory transaction
        await supabase
          .from('inventory_transactions')
          .insert({
            product_id: item.product_id,
            type: 'adjustment',
            quantity: item.variance,
            reference_id: cycleCountId,
            notes: `Cycle count adjustment - ${item.notes || 'Physical count variance'}`
          });
      }

      return true;
    } catch (error) {
      console.error('Error applying count adjustments:', error);
      return false;
    }
  }

  /**
   * Get count accuracy statistics
   */
  static async getCountAccuracy(locationId?: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('cycle_counts')
      .select(`
        id,
        count_number,
        completed_at,
        cycle_count_items(variance, variance_percentage)
      `)
      .eq('status', 'completed');

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (startDate) {
      query = query.gte('completed_at', startDate);
    }

    if (endDate) {
      query = query.lte('completed_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching count accuracy:', error);
      return null;
    }

    // Calculate statistics
    let totalItems = 0;
    let itemsWithVariance = 0;
    let totalVariancePercentage = 0;

    data.forEach((count: any) => {
      count.cycle_count_items.forEach((item: any) => {
        totalItems++;
        if (item.variance !== 0) {
          itemsWithVariance++;
          totalVariancePercentage += Math.abs(item.variance_percentage || 0);
        }
      });
    });

    return {
      totalCounts: data.length,
      totalItems,
      itemsWithVariance,
      accuracyRate: totalItems > 0 ? ((totalItems - itemsWithVariance) / totalItems) * 100 : 100,
      averageVariancePercentage: itemsWithVariance > 0 ? totalVariancePercentage / itemsWithVariance : 0
    };
  }
}
