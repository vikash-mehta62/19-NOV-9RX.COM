import { supabase } from '@/supabaseClient';

export interface Supplier {
  id?: string;
  supplier_code: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  payment_terms?: string;
  lead_time_days?: number;
  minimum_order_value?: number;
  rating?: number;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

export interface SupplierProduct {
  id?: string;
  supplier_id: string;
  product_id: string;
  supplier_sku?: string;
  cost_price: number;
  minimum_order_quantity?: number;
  lead_time_days?: number;
  is_preferred?: boolean;
  last_order_date?: string;
}

export interface PurchaseOrder {
  id?: string;
  po_number?: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';
  subtotal?: number;
  tax?: number;
  shipping_cost?: number;
  total_amount?: number;
  notes?: string;
}

export interface PurchaseOrderItem {
  id?: string;
  po_id: string;
  product_id: string;
  quantity: number;
  received_quantity?: number;
  unit_cost: number;
  notes?: string;
}

export interface SupplierPerformance {
  id?: string;
  supplier_id: string;
  po_id: string;
  on_time_delivery: boolean;
  quality_rating: number;
  communication_rating: number;
  notes?: string;
}

export class SupplierService {
  /**
   * Create a new supplier
   */
  static async createSupplier(supplier: Supplier): Promise<string | null> {
    try {
      // Generate supplier code if not provided
      if (!supplier.supplier_code) {
        const timestamp = Date.now().toString().slice(-6);
        supplier.supplier_code = `SUP${timestamp}`;
      }

      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error creating supplier:', error);
      return null;
    }
  }

  /**
   * Get all suppliers
   */
  static async getSuppliers(status?: string) {
    try {
      let query = supabase
        .from('suppliers')
        .select('*');

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  }

  /**
   * Get supplier by ID
   */
  static async getSupplier(supplierId: string) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      return null;
    }
  }

  /**
   * Update supplier
   */
  static async updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating supplier:', error);
      return false;
    }
  }

  /**
   * Delete supplier
   */
  static async deleteSupplier(supplierId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return false;
    }
  }

  /**
   * Add product to supplier
   */
  static async addSupplierProduct(supplierProduct: SupplierProduct): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('supplier_products')
        .insert(supplierProduct)
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error adding supplier product:', error);
      return null;
    }
  }

  /**
   * Get supplier products
   */
  static async getSupplierProducts(supplierId: string) {
    try {
      const { data, error } = await supabase
        .from('supplier_products')
        .select(`
          *,
          product:products(id, name, sku, base_price)
        `)
        .eq('supplier_id', supplierId);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      return [];
    }
  }

  /**
   * Get suppliers for a product
   */
  static async getProductSuppliers(productId: string) {
    try {
      const { data, error } = await supabase
        .from('supplier_products')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('product_id', productId);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching product suppliers:', error);
      return [];
    }
  }

  /**
   * Update supplier product
   */
  static async updateSupplierProduct(
    supplierProductId: string,
    updates: Partial<SupplierProduct>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('supplier_products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierProductId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating supplier product:', error);
      return false;
    }
  }

  /**
   * Create purchase order
   */
  static async createPurchaseOrder(
    po: PurchaseOrder,
    items: PurchaseOrderItem[]
  ): Promise<string | null> {
    try {
      // Generate PO number
      const poNumber = `PO-${Date.now()}`;

      const { data: { session } } = await supabase.auth.getSession();

      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          ...po,
          po_number: poNumber,
          created_by: session?.user?.id
        })
        .select()
        .single();

      if (poError) throw poError;

      // Add items
      const itemsWithPoId = items.map(item => ({
        ...item,
        po_id: poData.id
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsWithPoId);

      if (itemsError) throw itemsError;

      return poData.id;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      return null;
    }
  }

  /**
   * Get purchase orders
   */
  static async getPurchaseOrders(supplierId?: string, status?: string) {
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(id, name, supplier_code),
          created_user:profiles!created_by(first_name, last_name)
        `);

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('order_date', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return [];
    }
  }

  /**
   * Get purchase order details
   */
  static async getPurchaseOrder(poId: string) {
    try {
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          created_user:profiles!created_by(first_name, last_name)
        `)
        .eq('id', poId)
        .single();

      if (poError) throw poError;

      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          product:products(id, name, sku)
        `)
        .eq('po_id', poId);

      if (itemsError) throw itemsError;

      return {
        ...po,
        items
      };
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      return null;
    }
  }

  /**
   * Update purchase order status
   */
  static async updatePurchaseOrderStatus(
    poId: string,
    status: PurchaseOrder['status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', poId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      return false;
    }
  }

  /**
   * Receive purchase order items
   */
  static async receiveItems(
    poId: string,
    itemId: string,
    receivedQuantity: number
  ): Promise<boolean> {
    try {
      // Update received quantity
      const { error: updateError } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: receivedQuantity })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Check if all items are received
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('quantity, received_quantity')
        .eq('po_id', poId);

      const allReceived = items?.every(
        item => Number(item.received_quantity) >= Number(item.quantity)
      );

      const partiallyReceived = items?.some(
        item => Number(item.received_quantity) > 0
      );

      // Update PO status
      let newStatus: PurchaseOrder['status'] = 'confirmed';
      if (allReceived) {
        newStatus = 'received';
      } else if (partiallyReceived) {
        newStatus = 'partially_received';
      }

      await this.updatePurchaseOrderStatus(poId, newStatus);

      return true;
    } catch (error) {
      console.error('Error receiving items:', error);
      return false;
    }
  }

  /**
   * Record supplier performance
   */
  static async recordPerformance(performance: SupplierPerformance): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('supplier_performance')
        .insert({
          ...performance,
          recorded_by: session?.user?.id,
          recorded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update supplier rating
      await this.updateSupplierRating(performance.supplier_id);

      return data.id;
    } catch (error) {
      console.error('Error recording performance:', error);
      return null;
    }
  }

  /**
   * Update supplier rating based on performance records
   */
  static async updateSupplierRating(supplierId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .rpc('get_supplier_average_rating', { p_supplier_id: supplierId });

      if (data !== null) {
        await this.updateSupplier(supplierId, { rating: Number(data) });
      }

      return true;
    } catch (error) {
      console.error('Error updating supplier rating:', error);
      return false;
    }
  }

  /**
   * Get supplier performance summary
   */
  static async getSupplierPerformance(supplierId: string) {
    try {
      const { data, error } = await supabase
        .from('supplier_performance_summary')
        .select('*')
        .eq('supplier_id', supplierId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching supplier performance:', error);
      return null;
    }
  }

  /**
   * Get all supplier performance summaries
   */
  static async getAllSupplierPerformance() {
    try {
      const { data, error } = await supabase
        .from('supplier_performance_summary')
        .select('*')
        .order('total_spend', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching supplier performance:', error);
      return [];
    }
  }
}
