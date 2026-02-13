import { supabase } from '@/supabaseClient';

export interface ProductCost {
  id?: string;
  product_id: string;
  supplier_id?: string;
  purchase_cost: number;
  shipping_cost?: number;
  handling_cost?: number;
  storage_cost?: number;
  other_costs?: number;
  effective_date: string;
  notes?: string;
}

export interface CostAlert {
  id?: string;
  product_id: string;
  alert_type: 'price_increase' | 'price_decrease' | 'margin_low' | 'cost_spike';
  old_value?: number;
  new_value?: number;
  percentage_change?: number;
  threshold_exceeded?: boolean;
  status: 'active' | 'acknowledged' | 'resolved';
}

export class CostTrackingService {
  /**
   * Add product cost
   */
  static async addProductCost(cost: ProductCost): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('product_costs')
        .insert({
          ...cost,
          created_by: session?.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error adding product cost:', error);
      return null;
    }
  }

  /**
   * Get product cost history
   */
  static async getProductCostHistory(productId: string, days?: number) {
    try {
      let query = supabase
        .from('product_costs')
        .select(`
          *,
          supplier:suppliers(id, name),
          created_user:profiles!created_by(first_name, last_name)
        `)
        .eq('product_id', productId);

      if (days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('effective_date', startDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query.order('effective_date', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching product cost history:', error);
      return [];
    }
  }

  /**
   * Get latest product cost
   */
  static async getLatestProductCost(productId: string) {
    try {
      const { data, error } = await supabase
        .from('product_costs')
        .select(`
          *,
          supplier:suppliers(id, name)
        `)
        .eq('product_id', productId)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;
    } catch (error) {
      console.error('Error fetching latest product cost:', error);
      return null;
    }
  }

  /**
   * Get average cost over period
   */
  static async getAverageCost(productId: string, days: number = 30): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_average_cost', {
          p_product_id: productId,
          p_days: days
        });

      if (error) throw error;

      return Number(data) || 0;
    } catch (error) {
      console.error('Error fetching average cost:', error);
      return 0;
    }
  }

  /**
   * Get profit margin
   */
  static async getProfitMargin(productId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_profit_margin', { p_product_id: productId });

      if (error) throw error;

      return Number(data) || 0;
    } catch (error) {
      console.error('Error fetching profit margin:', error);
      return 0;
    }
  }

  /**
   * Get product profitability report
   */
  static async getProductProfitability(category?: string) {
    try {
      let query = supabase
        .from('product_profitability')
        .select('*');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('margin_percentage', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching product profitability:', error);
      return [];
    }
  }

  /**
   * Get cost alerts
   */
  static async getCostAlerts(status?: string, productId?: string) {
    try {
      let query = supabase
        .from('cost_alerts')
        .select(`
          *,
          product:products(id, name, sku)
        `);

      if (status) {
        query = query.eq('status', status);
      }

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching cost alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge cost alert
   */
  static async acknowledgeCostAlert(alertId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase
        .from('cost_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: session?.user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error acknowledging cost alert:', error);
      return false;
    }
  }

  /**
   * Resolve cost alert
   */
  static async resolveCostAlert(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cost_alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error resolving cost alert:', error);
      return false;
    }
  }

  /**
   * Get cost trends
   */
  static async getCostTrends(productId: string, days: number = 90) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('product_costs')
        .select('effective_date, total_cost, purchase_cost')
        .eq('product_id', productId)
        .gte('effective_date', startDate.toISOString().split('T')[0])
        .order('effective_date', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching cost trends:', error);
      return [];
    }
  }

  /**
   * Compare supplier costs for a product
   */
  static async compareSupplierCosts(productId: string) {
    try {
      const { data, error } = await supabase
        .from('supplier_products')
        .select(`
          *,
          supplier:suppliers(id, name, lead_time_days, rating)
        `)
        .eq('product_id', productId)
        .order('cost_price', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error comparing supplier costs:', error);
      return [];
    }
  }

  /**
   * Get high-cost products
   */
  static async getHighCostProducts(limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('product_profitability')
        .select('*')
        .order('cost', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching high-cost products:', error);
      return [];
    }
  }

  /**
   * Get low-margin products
   */
  static async getLowMarginProducts(marginThreshold: number = 20, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('product_profitability')
        .select('*')
        .lt('margin_percentage', marginThreshold)
        .order('margin_percentage', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching low-margin products:', error);
      return [];
    }
  }

  /**
   * Calculate total inventory value
   */
  static async getTotalInventoryValue() {
    try {
      const { data, error } = await supabase
        .from('inventory_valuation')
        .select('total_value');

      if (error) throw error;

      const totalValue = data?.reduce((sum, item) => sum + Number(item.total_value), 0) || 0;

      return totalValue;
    } catch (error) {
      console.error('Error calculating total inventory value:', error);
      return 0;
    }
  }

  /**
   * Get cost breakdown by category
   */
  static async getCostBreakdownByCategory() {
    try {
      const { data, error } = await supabase
        .from('inventory_valuation')
        .select('category, total_value');

      if (error) throw error;

      // Group by category
      const breakdown: Record<string, number> = {};
      data?.forEach(item => {
        const category = item.category || 'Uncategorized';
        breakdown[category] = (breakdown[category] || 0) + Number(item.total_value);
      });

      return Object.entries(breakdown).map(([category, value]) => ({
        category,
        value
      }));
    } catch (error) {
      console.error('Error fetching cost breakdown:', error);
      return [];
    }
  }

  /**
   * Get cost optimization recommendations
   */
  static async getCostOptimizationRecommendations() {
    try {
      const recommendations = [];

      // Get low-margin products
      const lowMargin = await this.getLowMarginProducts(15, 10);
      if (lowMargin.length > 0) {
        recommendations.push({
          type: 'low_margin',
          priority: 'high',
          title: 'Low Margin Products',
          description: `${lowMargin.length} products have margins below 15%`,
          products: lowMargin,
          action: 'Review pricing or find cheaper suppliers'
        });
      }

      // Get high-cost products
      const highCost = await this.getHighCostProducts(10);
      if (highCost.length > 0) {
        recommendations.push({
          type: 'high_cost',
          priority: 'medium',
          title: 'High Cost Products',
          description: `Top ${highCost.length} most expensive products`,
          products: highCost,
          action: 'Negotiate better prices or find alternative suppliers'
        });
      }

      // Get active cost alerts
      const alerts = await this.getCostAlerts('active');
      if (alerts.length > 0) {
        recommendations.push({
          type: 'cost_alerts',
          priority: 'high',
          title: 'Active Cost Alerts',
          description: `${alerts.length} products have significant cost changes`,
          alerts,
          action: 'Review and acknowledge cost changes'
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating cost optimization recommendations:', error);
      return [];
    }
  }

  /**
   * Bulk update costs from purchase order
   */
  static async updateCostsFromPO(poId: string): Promise<boolean> {
    try {
      // Get PO details
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items(*)
        `)
        .eq('id', poId)
        .single();

      if (poError) throw poError;

      // Add cost records for each item
      const costRecords = po.purchase_order_items.map((item: any) => ({
        product_id: item.product_id,
        supplier_id: po.supplier_id,
        purchase_cost: item.unit_cost,
        shipping_cost: 0,
        handling_cost: 0,
        storage_cost: 0,
        other_costs: 0,
        effective_date: po.order_date,
        notes: `From PO ${po.po_number}`
      }));

      const { error: insertError } = await supabase
        .from('product_costs')
        .insert(costRecords);

      if (insertError) throw insertError;

      return true;
    } catch (error) {
      console.error('Error updating costs from PO:', error);
      return false;
    }
  }
}
