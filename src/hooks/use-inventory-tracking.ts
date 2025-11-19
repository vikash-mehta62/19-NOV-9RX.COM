
import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  min_stock: number;
  reorder_point: number;
  base_price: number;
  last_updated: string;
  supplier_id?: string;
}

export const useInventoryTracking = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Initial fetch
    fetchInventory();

    // Set up real-time subscriptions for products, orders, and low stock notifications
    const productSubscription = supabase
      .channel('product_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Product change detected:', payload);
          handleInventoryChange(payload);
        }
      )
      .subscribe();

    const orderSubscription = supabase
      .channel('order_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change detected:', payload);
          handleOrderStatusChange(payload);
        }
      )
      .subscribe();

    // New subscription for low stock notifications
    const lowStockSubscription = supabase
      .channel('low_stock_alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: 'current_stock<=min_stock'
        },
        (payload: any) => {
          console.log('Low stock alert detected:', payload);
          const { new: newRecord } = payload;
          notifyLowStock({
            id: newRecord.id,
            name: newRecord.name,
            current_stock: newRecord.current_stock,
            min_stock: newRecord.min_stock,
            reorder_point: newRecord.reorder_point,
            base_price: newRecord.base_price,
            last_updated: newRecord.updated_at
          });
        }
      )
      .subscribe();

    return () => {
      productSubscription.unsubscribe();
      orderSubscription.unsubscribe();
      lowStockSubscription.unsubscribe();
    };
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      console.log('Fetched inventory:', data);
      setInventory(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive",
      });
    }
  };

  const handleInventoryChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        setInventory(prev => [...prev, newRecord]);
        notifyStockChange('New product added', newRecord.name);
        break;
      case 'UPDATE':
        setInventory(prev =>
          prev.map(item => item.id === newRecord.id ? newRecord : item)
        );
        checkStockLevels(newRecord, oldRecord);
        break;
      case 'DELETE':
        setInventory(prev => prev.filter(item => item.id !== oldRecord.id));
        notifyStockChange('Product removed', oldRecord.name);
        break;
    }
  };

  const handleOrderStatusChange = async (payload: any) => {
    const { eventType, new: newOrder, old: oldOrder } = payload;
    
    if (newOrder.status !== oldOrder?.status) {
      console.log('Order status changed:', newOrder.status);
      
      if (newOrder.status === 'cancelled' && oldOrder.status !== 'cancelled') {
        try {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', newOrder.id);

          if (orderItems) {
            for (const item of orderItems) {
              // Record the inventory transaction
              const { error: transactionError } = await supabase
                .from('inventory_transactions')
                .insert({
                  product_id: item.product_id,
                  quantity: item.quantity,
                  type: 'restoration',
                  notes: `Stock restored from cancelled order ${newOrder.id}`,
                  previous_stock: 0, // Will be set by trigger
                  new_stock: 0 // Will be set by trigger
                });

              if (transactionError) throw transactionError;
            }
          }

          toast({
            title: "Stock Updated",
            description: "Inventory has been restored for cancelled order",
          });
        } catch (error) {
          console.error('Error restoring stock:', error);
          toast({
            title: "Error",
            description: "Failed to restore stock for cancelled order",
            variant: "destructive",
          });
        }
      }
    }
  };

  const checkStockLevels = (newRecord: InventoryItem, oldRecord: InventoryItem) => {
    if (newRecord.current_stock <= newRecord.min_stock) {
      notifyLowStock(newRecord);
    }
    
    if (oldRecord.current_stock !== newRecord.current_stock) {
      notifyStockChange(
        'Stock Updated',
        `${newRecord.name}: ${oldRecord.current_stock} → ${newRecord.current_stock}`
      );
    }
  };

  const notifyLowStock = (item: InventoryItem) => {
    toast({
      title: "Low Stock Alert",
      description: `${item.name} is below minimum stock level (${item.current_stock} units remaining)`,
      variant: "destructive",
    });
  };

  const notifyStockChange = (title: string, message: string) => {
    toast({
      title,
      description: message,
    });
  };

  return { inventory, loading };
};
