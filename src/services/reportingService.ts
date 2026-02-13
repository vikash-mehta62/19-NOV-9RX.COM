import { supabase } from '@/supabaseClient';

export interface ReportParameters {
  startDate?: string;
  endDate?: string;
  category?: string;
  locationId?: string;
  productId?: string;
  supplierId?: string;
  [key: string]: any;
}

export interface InventoryReport {
  id?: string;
  report_type: string;
  report_name: string;
  parameters?: ReportParameters;
  generated_by?: string;
  generated_at?: string;
  file_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ReportSchedule {
  id?: string;
  report_type: string;
  schedule_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  parameters?: ReportParameters;
  recipients?: string[];
  enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

export class ReportingService {
  /**
   * Generate Inventory Valuation Report
   */
  static async generateInventoryValuationReport(params?: ReportParameters) {
    try {
      let query = supabase
        .from('inventory_valuation')
        .select('*');

      if (params?.category) {
        query = query.eq('category', params.category);
      }

      const { data, error } = await query.order('total_value', { ascending: false });

      if (error) throw error;

      // Calculate totals
      const totalValue = data?.reduce((sum, item) => sum + Number(item.total_value), 0) || 0;
      const totalUnits = data?.reduce((sum, item) => sum + Number(item.current_stock), 0) || 0;

      return {
        data,
        summary: {
          totalValue,
          totalUnits,
          averageValue: totalUnits > 0 ? totalValue / totalUnits : 0,
          productCount: data?.length || 0
        }
      };
    } catch (error) {
      console.error('Error generating inventory valuation report:', error);
      return null;
    }
  }

  /**
   * Generate Stock Movement Report
   */
  static async generateStockMovementReport(params: ReportParameters) {
    try {
      let query = supabase
        .from('inventory_transactions')
        .select(`
          *,
          product:products(id, name, sku, category)
        `);

      if (params.startDate) {
        query = query.gte('created_at', params.startDate);
      }

      if (params.endDate) {
        query = query.lte('created_at', params.endDate);
      }

      if (params.productId) {
        query = query.eq('product_id', params.productId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate summary
      const inbound = data?.filter(t => ['purchase', 'adjustment', 'return'].includes(t.type)) || [];
      const outbound = data?.filter(t => ['sale', 'adjustment', 'transfer'].includes(t.type)) || [];

      const inboundQty = inbound.reduce((sum, t) => sum + Math.abs(Number(t.quantity)), 0);
      const outboundQty = outbound.reduce((sum, t) => sum + Math.abs(Number(t.quantity)), 0);

      return {
        data,
        summary: {
          totalTransactions: data?.length || 0,
          inboundQuantity: inboundQty,
          outboundQuantity: outboundQty,
          netMovement: inboundQty - outboundQty
        }
      };
    } catch (error) {
      console.error('Error generating stock movement report:', error);
      return null;
    }
  }

  /**
   * Generate ABC Analysis Report
   */
  static async generateABCAnalysisReport() {
    try {
      // Get products with revenue data
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          category,
          base_price,
          current_stock
        `);

      if (error) throw error;

      // Calculate revenue for each product (simplified - would need order data)
      const productsWithRevenue = products?.map(p => ({
        ...p,
        estimatedRevenue: Number(p.base_price) * Number(p.current_stock)
      })) || [];

      // Sort by revenue
      productsWithRevenue.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

      // Calculate cumulative percentage
      const totalRevenue = productsWithRevenue.reduce((sum, p) => sum + p.estimatedRevenue, 0);
      let cumulative = 0;

      const classified = productsWithRevenue.map(p => {
        cumulative += p.estimatedRevenue;
        const cumulativePercentage = (cumulative / totalRevenue) * 100;

        let classification = 'C';
        if (cumulativePercentage <= 80) classification = 'A';
        else if (cumulativePercentage <= 95) classification = 'B';

        return {
          ...p,
          classification,
          revenuePercentage: (p.estimatedRevenue / totalRevenue) * 100,
          cumulativePercentage
        };
      });

      // Group by classification
      const aProducts = classified.filter(p => p.classification === 'A');
      const bProducts = classified.filter(p => p.classification === 'B');
      const cProducts = classified.filter(p => p.classification === 'C');

      return {
        data: classified,
        summary: {
          totalProducts: classified.length,
          aCount: aProducts.length,
          bCount: bProducts.length,
          cCount: cProducts.length,
          aRevenue: aProducts.reduce((sum, p) => sum + p.estimatedRevenue, 0),
          bRevenue: bProducts.reduce((sum, p) => sum + p.estimatedRevenue, 0),
          cRevenue: cProducts.reduce((sum, p) => sum + p.estimatedRevenue, 0)
        }
      };
    } catch (error) {
      console.error('Error generating ABC analysis report:', error);
      return null;
    }
  }

  /**
   * Generate Slow-Moving Stock Report
   */
  static async generateSlowMovingStockReport(daysThreshold: number = 90) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      // Get products with last transaction date
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          category,
          current_stock,
          base_price
        `);

      if (error) throw error;

      // Get last transaction for each product
      const productsWithActivity = await Promise.all(
        (products || []).map(async (product) => {
          const { data: lastTransaction } = await supabase
            .from('inventory_transactions')
            .select('created_at')
            .eq('product_id', product.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const lastActivityDate = lastTransaction?.created_at 
            ? new Date(lastTransaction.created_at)
            : new Date(0);

          const daysSinceActivity = Math.floor(
            (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            ...product,
            lastActivityDate: lastTransaction?.created_at || null,
            daysSinceActivity,
            estimatedValue: Number(product.current_stock) * Number(product.base_price)
          };
        })
      );

      // Filter slow-moving items
      const slowMoving = productsWithActivity
        .filter(p => p.daysSinceActivity >= daysThreshold && Number(p.current_stock) > 0)
        .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

      const totalValue = slowMoving.reduce((sum, p) => sum + p.estimatedValue, 0);

      return {
        data: slowMoving,
        summary: {
          totalProducts: slowMoving.length,
          totalValue,
          averageDaysSinceActivity: slowMoving.length > 0
            ? slowMoving.reduce((sum, p) => sum + p.daysSinceActivity, 0) / slowMoving.length
            : 0
        }
      };
    } catch (error) {
      console.error('Error generating slow-moving stock report:', error);
      return null;
    }
  }

  /**
   * Generate Stock Accuracy Report
   */
  static async generateStockAccuracyReport(params?: ReportParameters) {
    try {
      let query = supabase
        .from('cycle_counts')
        .select(`
          *,
          cycle_count_items(
            expected_quantity,
            counted_quantity,
            variance,
            variance_percentage
          )
        `)
        .eq('status', 'completed');

      if (params?.startDate) {
        query = query.gte('completed_at', params.startDate);
      }

      if (params?.endDate) {
        query = query.lte('completed_at', params.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate accuracy metrics
      let totalItems = 0;
      let accurateItems = 0;
      let totalVariance = 0;

      data?.forEach((count: any) => {
        count.cycle_count_items?.forEach((item: any) => {
          totalItems++;
          if (item.variance === 0) accurateItems++;
          totalVariance += Math.abs(item.variance || 0);
        });
      });

      const accuracyRate = totalItems > 0 ? (accurateItems / totalItems) * 100 : 100;

      return {
        data,
        summary: {
          totalCounts: data?.length || 0,
          totalItems,
          accurateItems,
          accuracyRate,
          averageVariance: totalItems > 0 ? totalVariance / totalItems : 0
        }
      };
    } catch (error) {
      console.error('Error generating stock accuracy report:', error);
      return null;
    }
  }

  /**
   * Generate Reorder Report
   */
  static async generateReorderReport() {
    try {
      // Get products below reorder point
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          category,
          current_stock,
          reorder_point,
          reorder_quantity,
          base_price
        `)
        .filter('current_stock', 'lte', 'reorder_point');

      if (error) throw error;

      // Get supplier information for each product
      const productsWithSuppliers = await Promise.all(
        (products || []).map(async (product) => {
          const { data: supplierProduct } = await supabase
            .from('supplier_products')
            .select(`
              *,
              supplier:suppliers(id, name, lead_time_days)
            `)
            .eq('product_id', product.id)
            .eq('is_preferred', true)
            .single();

          return {
            ...product,
            supplier: supplierProduct?.supplier || null,
            supplierCost: supplierProduct?.cost_price || 0,
            leadTime: supplierProduct?.supplier?.lead_time_days || 0,
            suggestedOrderQty: product.reorder_quantity || 0,
            estimatedCost: (product.reorder_quantity || 0) * (supplierProduct?.cost_price || 0)
          };
        })
      );

      const totalEstimatedCost = productsWithSuppliers.reduce(
        (sum, p) => sum + p.estimatedCost,
        0
      );

      return {
        data: productsWithSuppliers,
        summary: {
          totalProducts: productsWithSuppliers.length,
          totalEstimatedCost,
          averageLeadTime: productsWithSuppliers.length > 0
            ? productsWithSuppliers.reduce((sum, p) => sum + p.leadTime, 0) / productsWithSuppliers.length
            : 0
        }
      };
    } catch (error) {
      console.error('Error generating reorder report:', error);
      return null;
    }
  }

  /**
   * Save report to database
   */
  static async saveReport(report: InventoryReport): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('inventory_reports')
        .insert({
          ...report,
          generated_by: session?.user?.id,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error saving report:', error);
      return null;
    }
  }

  /**
   * Get saved reports
   */
  static async getSavedReports(reportType?: string) {
    try {
      let query = supabase
        .from('inventory_reports')
        .select(`
          *,
          generated_user:profiles!generated_by(first_name, last_name)
        `);

      if (reportType) {
        query = query.eq('report_type', reportType);
      }

      const { data, error } = await query.order('generated_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      return [];
    }
  }

  /**
   * Create report schedule
   */
  static async createSchedule(schedule: ReportSchedule): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('report_schedules')
        .insert({
          ...schedule,
          created_by: session?.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error creating schedule:', error);
      return null;
    }
  }

  /**
   * Get report schedules
   */
  static async getSchedules() {
    try {
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .order('schedule_name');

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
  }

  /**
   * Update schedule
   */
  static async updateSchedule(scheduleId: string, updates: Partial<ReportSchedule>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('report_schedules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating schedule:', error);
      return false;
    }
  }

  /**
   * Delete schedule
   */
  static async deleteSchedule(scheduleId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('report_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return false;
    }
  }
}
