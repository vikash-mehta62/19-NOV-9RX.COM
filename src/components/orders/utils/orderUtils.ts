import { toast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";

export const generateOrderId = async () => {
  const year = new Date().getFullYear(); // Get current year (e.g., 2025)

  // Fetch latest order from the database
  const { data, error } = await supabase
    .from("centerize_data")
    .select("id, order_no, order_start") 
    .order("id", { ascending: false }) // Get latest order
    .limit(1);

  if (error) {
    console.error("🚨 Supabase Fetch Error:", error);
    return null;
  }

  let newOrderNo = 1; // Default to 1 if no previous order exists
  let orderStart = "9RX"; // Default order prefix

  if (data && data.length > 0) {
    newOrderNo = (data[0].order_no || 0) + 1; // Increment last order number
    orderStart = data[0].order_start || "9RX"; // Use existing order_start
  }

  // Format order ID like '9RX202500001'
  const orderId = `${orderStart}${newOrderNo.toString().padStart(6, "0")}`;

  // ✅ Update the latest order_no in the database
  const { error: updateError } = await supabase
    .from("centerize_data")
    .update({ order_no: newOrderNo }) // Correct update syntax
    .eq("id", data[0]?.id); // Update only the latest record

  if (updateError) {
    console.error("🚨 Supabase Update Error:", updateError);
  } else {
    console.log("✅ Order No Updated to:", newOrderNo);
  }

  console.log("✅ Generated Order ID:", orderId);
  return orderId;
};



export const generatePurchaseOrderId = async () => {
  const year = new Date().getFullYear();

  // Fetch latest row from centerize_data
  const { data, error } = await supabase
    .from("centerize_data")
    .select("id, purchase_no, purchase_start")
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    console.error("🚨 Supabase Fetch Error:", error);
    return null;
  }

  let newPurchaseNo = 1;
  let purchaseStart = "PO-9RX"; // Default purchase prefix

  if (data && data.length > 0) {
    newPurchaseNo = (data[0].purchase_no || 0) + 1;
    purchaseStart = data[0].purchase_start || "PO-9RX";
  }

  // Format like 'PO202500001'
  const purchaseOrderId = `${purchaseStart}${newPurchaseNo
    .toString()
    .padStart(6, "0")}`;

  // Update the purchase_no in DB
  const { error: updateError } = await supabase
    .from("centerize_data")
    .update({ purchase_no: newPurchaseNo })
    .eq("id", data[0]?.id);

  if (updateError) {
    console.error("🚨 Supabase Update Error:", updateError);
  } else {
    console.log("✅ Purchase No Updated to:", newPurchaseNo);
  }

  console.log("✅ Generated Purchase Order ID:", purchaseOrderId);
  return purchaseOrderId;
};

export const calculateOrderTotal = (items: any[], shippingCost: number = 0) => {
  const itemsTotal = items.reduce((total, item) => {
    const itemPrice = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    
    return total + (itemPrice);
  }, 0);
  return itemsTotal + shippingCost;
};





export const formatOrderNumber = (id: string) => {
  return `ORD-${id.slice(0, 8)}`;
};

export const validateOrder = (order: any) => {
  if (!order.items || order.items.length === 0) {
    toast({
      title: "Invalid Order",
      description: "Order must contain at least one item",
      variant: "destructive",
    });
    return false;
  }

  if (!order.customerInfo || !order.customerInfo.name) {
    toast({
      title: "Invalid Order",
      description: "Customer information is required",
      variant: "destructive",
    });
    return false;
  }

  return true;
};

export const getOrderStatus = (order: any) => {
  if (!order.status) return 'pending';
  return order.status.toLowerCase();
};

export const canEditOrder = (order: any) => {
  const status = getOrderStatus(order);
  return ['pending', 'new'].includes(status);
};

export const canCancelOrder = (order: any) => {
  const status = getOrderStatus(order);
  return ['pending', 'new', 'processing'].includes(status);
};

export const canDeleteOrder = (order: any) => {
  const status = getOrderStatus(order);
  return ['cancelled', 'delivered', 'new', 'pending'].includes(status);
};

export const getOrderStatusText = (status: string) => {
  const statusMap: { [key: string]: string } = {
    new: 'New Order',
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };
  return statusMap[status.toLowerCase()] || status;
};

export const updateOrderStatus = async (orderId: string, newStatus: string) => {
  if (!orderId) {
    console.error('No order ID provided to updateOrderStatus');
    throw new Error('Order ID is required');
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }

    if (!data) {
      console.error(`No order found with ID: ${orderId}`);
      throw new Error('Order not found');
    }

    console.log(`Order ${orderId} status updated to: ${newStatus}`);
    return data;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update order status');
  }
};
