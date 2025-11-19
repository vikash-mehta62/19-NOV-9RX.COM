import { useState, useEffect } from "react";
import { OrderFormValues } from "../schemas/orderSchema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import axios from "../../../../axiosconfig";

export const useOrderManagement = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderFormValues[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderFormValues | null>(
    null
  );
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(1);
  const [limit, setLimit] = useState(20); 

  const loadOrders = async ({
    statusFilter,
    statusFilter2,
    searchQuery,
    dateRange,
    poIs
  }: {
    statusFilter?: string;
    statusFilter2?: string;
    searchQuery?: string;
    dateRange?: { from?: Date; to?: Date };
    poIs?: boolean;
  } = {}) => {
setOrders([])
    setLoading(true);

    console.log(poIs,"poIs")
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to view orders",
          variant: "destructive",
        });
        return;
      }

      const role = sessionStorage.getItem("userType");
      const adminRoles = ["admin"];
      console.log("Session:", session);
      console.log("User ID:", session.user.id);
      console.log("Role from sessionStorage:", role);

      let query = supabase
        .from("orders")
        .select(
          `
        *,
        profiles (
          first_name, 
          last_name, 
          email, 
          mobile_phone, 
          type, 
          company_name
          )
          `,
          { count: "exact" }
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (role === "pharmacy") {
        query = query.eq("profile_id", session.user.id);
      }

      if (role === "group") {
        const { data: groupProfiles, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("group_id", session.user.id);

        if (error) throw new Error("Failed to fetch customer information");

        if (!groupProfiles || groupProfiles.length === 0)
          throw new Error("No customer profiles found");

        const userIds = groupProfiles.map((user) => user.id);
        console.log(userIds);
        query = query.in("profile_id", userIds);
      }
      // Apply status filters
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("payment_status", statusFilter);
      }
      if (statusFilter2 && statusFilter2 !== "all") {
        query = query.ilike("status", statusFilter2);
      }

      // Apply search
      if (searchQuery) {
        const search = `%${searchQuery}%`;
        query = query.or(
          `order_number.ilike.${search},customerInfo->>name.ilike.${search},customerInfo->>email.ilike.${search},customerInfo->>phone.ilike.${search},purchase_number_external.ilike.${search},notes.ilike.${search}`
        );
      }
 // ✅ PO orders filter
    if (poIs !== undefined) {
      query = query.eq("poAccept", !poIs);
    }
      // Date range filter
      if (dateRange?.from && dateRange?.to) {
        query = query
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());
      }
      const { data, error, count } = await query;

      console.log(data);
      if (error) throw error;
      setTotalOrders(count || 0);

      const formattedOrders: OrderFormValues[] = (data as any[]).map(
        (order) => {
          const profileData = order.profiles || {};

          return {
            id: order.id || "",
            customer: order.profile_id || "",
            date: order.created_at || new Date().toISOString(),
            total: (order.total_amount || 0).toString(),
            status: order.status || "pending",
            payment_status: order.payment_status || "unpaid",
            customization: order.customization || false,
            poAccept: order.poAccept,
            shipping_cost: order.shipping_cost,
            quickBooksID: order.quickBooksID,
            tax_amount: order.tax_amount,
            void: order.void,
            voidReason: order.voidReason,
            cancelReason: order.cancelReason,
            poApproved: order.poApproved,
            po_handling_charges: order.po_handling_charges,
            po_fred_charges: order.po_fred_charges,
            customerInfo: order.customerInfo || {
              name:
                profileData.first_name && profileData.last_name
                  ? `${profileData.first_name} ${profileData.last_name}`
                  : "Unknown",
              email: profileData.email || "",
              phone: profileData.mobile_phone || "",
              type: profileData.type || "Pharmacy",
              address: {
                street: profileData.company_name || "",
                city: "",
                state: "",
                zip_code: "",
              },
            },
            order_number: order.order_number,
            items: order.items || [],
            shipping: {
              method: order.shipping_method || "custom",
              cost: order.shipping_cost || 0,
              trackingNumber: order.tracking_number || "",
              estimatedDelivery: order.estimated_delivery || "",
            },
            payment: {
              method: "manual",
              notes: "",
            },
            specialInstructions: order.notes || "",
            purchase_number_external: order.purchase_number_external || "",
            shippingAddress: order.shippingAddress
              ? {
                  fullName: order.shippingAddress.fullName || "",
                  email: order.shippingAddress.email || "",
                  phone: order.shippingAddress.phone || "",
                  address: {
                    street: order.shippingAddress.address?.street || "",
                    city: order.shippingAddress.address?.city || "",
                    state: order.shippingAddress.address?.state || "",
                    zip_code: order.shippingAddress.address?.zip_code || "",
                  },
                }
              : {
                  fullName:
                    profileData.first_name && profileData.last_name
                      ? `${profileData.first_name} ${profileData.last_name}`
                      : "",
                  email: profileData.email || "",
                  phone: profileData.mobile_phone || "",
                  address: {
                    street: profileData.company_name || "",
                    city: "",
                    state: "",
                    zip_code: "",
                  },
                },
          };
        }
      );

      setOrders(formattedOrders);
      setLoading(false);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    }
  };

  // Refresh orders when the component mounts
  // useEffect(() => {
  //   loadOrders();
  // }, []);

  const handleOrderClick = (order: OrderFormValues) => {
    setSelectedOrder(order);
    setIsEditing(false);
    setIsSheetOpen(true);
  };

  // const handleDeleteOrder = async (orderId: string,reason: string): Promise<void> => {
  //   try {
  //     console.log(reason)

  //     const { error: invoiceDeleteError } = await supabase
  //       .from("invoices")
  //       .delete()
  //       .eq("order_id", orderId);

  //     if (invoiceDeleteError) throw invoiceDeleteError;

  //     const { error } = await supabase
  //       .from("orders")
  //       .delete()
  //       .eq("id", orderId);

  //     if (error) throw error;

  //     // Update the local state by removing the deleted order
  //     setOrders((prevOrders) =>
  //       prevOrders.filter((order) => order.id !== orderId)
  //     );

  //     toast({
  //       title: "Success",
  //       description: "Order deleted successfully",
  //     });

  //     // Close sheet if the deleted order was selected
  //     if (selectedOrder?.id === orderId) {
  //       setIsSheetOpen(false);
  //       setSelectedOrder(null);
  //     }
  //   } catch (error) {
  //     console.error("Error deleting order:", error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to delete order",
  //       variant: "destructive",
  //     });
  //   }
  // };

  const handleDeleteOrder = async (
    orderId: string,
    reason: string
  ): Promise<void> => {
    try {
      console.log("Void Reason:", reason);

      // Step 1: Update the invoices table
      const { error: invoiceUpdateError } = await supabase
        .from("invoices")
        .update({ void: true, voidReason: reason })
        .eq("order_id", orderId);
      if (invoiceUpdateError) throw invoiceUpdateError;

      // Step 2: Update the orders table
      const { data: orderData, error: orderUpdateError } = await supabase
        .from("orders")
        .update({ void: true, voidReason: reason })
        .eq("id", orderId)
        .select()
        .single(); // Get updated order
      if (orderUpdateError) throw orderUpdateError;

      // Step 3: Reverse stock for order items
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);
      if (itemsError) throw itemsError;

      for (const item of orderItems) {
        const { error: stockRestoreError } = await supabase.rpc(
          "increment_stock",
          {
            product_id: item.product_id,
            quantity: item.quantity,
          }
        );
        if (stockRestoreError) {
          console.error(
            `❌ Error restoring stock for product ${item.product_id}:`,
            stockRestoreError
          );
        }
      }

      // Step 4: Reverse stock for size-level if needed
      const sizes = orderData.items?.flatMap((item) => item.sizes || []) || [];
      for (const size of sizes) {
        const { data: currentSize, error: fetchError } = await supabase
          .from("product_sizes")
          .select("stock")
          .eq("id", size.id)
          .single();
        if (fetchError || !currentSize) {
          console.warn(`⚠️ Size not found for ID: ${size.id}`);
          continue;
        }

        const newQuantity = currentSize.stock + size.quantity;
        const { error: updateError } = await supabase
          .from("product_sizes")
          .update({ stock: newQuantity })
          .eq("id", size.id);
        if (updateError) {
          console.error(
            `❌ Failed to restore stock for size ID: ${size.id}`,
            updateError
          );
        }
      }

      // Step 5: Update UI
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, void: true, voidReason: reason }
            : order
        )
      );

      toast({
        title: "Success",
        description: "Order voided and stock restored successfully",
      });

      if (selectedOrder?.id === orderId) {
        setIsSheetOpen(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Error voiding order:", error);
      toast({
        title: "Error",
        description: "Failed to void order",
        variant: "destructive",
      });
    }
  };

  const handleCancelOrder = async (
    orderId: string,
    reason: string
  ): Promise<void> => {
    try {
      console.log("Cancel Reason:", reason);

      // Step 1: Update the invoices table
      const { error: invoiceUpdateError } = await supabase
        .from("invoices")
        .update({ status: "cancelled", cancelReason: reason })
        .eq("order_id", orderId);
      if (invoiceUpdateError) throw invoiceUpdateError;

      // Step 2: Update the orders table
      const { data: orderData, error: orderUpdateError } = await supabase
        .from("orders")
        .update({ status: "cancelled", cancelReason: reason })
        .eq("id", orderId)
        .select()
        .single();
      if (orderUpdateError) throw orderUpdateError;

      // Step 3: Restore product-level stock
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);
      if (itemsError) throw itemsError;

      for (const item of orderItems) {
        const { error: stockRestoreError } = await supabase.rpc(
          "increment_stock",
          {
            product_id: item.product_id,
            quantity: item.quantity,
          }
        );
        if (stockRestoreError) {
          console.error(
            `❌ Error restoring stock for product ${item.product_id}:`,
            stockRestoreError
          );
        }
      }

      // Step 4: Restore size-level stock (if applicable)
      const sizes = orderData.items?.flatMap((item) => item.sizes || []) || [];
      for (const size of sizes) {
        const { data: currentSize, error: fetchError } = await supabase
          .from("product_sizes")
          .select("stock")
          .eq("id", size.id)
          .single();
        if (fetchError || !currentSize) {
          console.warn(`⚠️ Size not found for ID: ${size.id}`);
          continue;
        }

        const newQuantity = currentSize.stock + size.quantity;
        const { error: updateError } = await supabase
          .from("product_sizes")
          .update({ stock: newQuantity })
          .eq("id", size.id);
        if (updateError) {
          console.error(
            `❌ Failed to restore stock for size ID: ${size.id}`,
            updateError
          );
        }
      }

      // Step 5: Update UI
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: "cancelled", cancelReason: reason }
            : order
        )
      );

      toast({
        title: "Order Cancelled",
        description: "Order has been cancelled and stock restored.",
      });

      if (selectedOrder?.id === orderId) {
        setIsSheetOpen(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("❌ Error cancelling order:", error);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    console.log(newStatus);
    try {
      // Update order and get the updated order in response
      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select("*, profile_id(first_name, email_notifaction)")
        .single(); // Ensures only one order is fetched

      if (error) throw error;

      // Log the updated order
      console.log("Updated Order:", updatedOrder);

      // Send the updated order to the backend
      if (
        newStatus !== "processing" &&
        updatedOrder.profile_id.email_notifaction
      ) {
        try {
          await axios.post("/order-status", updatedOrder);
          console.log("Order status sent successfully to backend.");
        } catch (apiError) {
          console.error("Failed to send order status to backend:", apiError);
        }
      }

      // Reload orders to sync state
      await loadOrders();

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      return updatedOrder; // Return the updated order
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleProcessOrder = async (orderId: string) => {
    return updateOrderStatus(orderId, "processing");
  };

  const handleShipOrder = async (orderId: string) => {
    return updateOrderStatus(orderId, "shipped");
  };

  const handleConfirmOrder = async (orderId: string) => {
    return updateOrderStatus(orderId, "processing");
  };

  return {
    orders,
    loading,
    selectedOrder,
    selectedOrders,
    isEditing,
    isSheetOpen,
    setSelectedOrders,
    setIsEditing,
    setIsSheetOpen,
    handleOrderClick,
    handleProcessOrder,
    handleShipOrder,
    handleConfirmOrder,
    handleDeleteOrder,
    loadOrders,
    handleCancelOrder,
    totalOrders,
    page,
    setPage,
    limit,
    setLimit,
    setOrders
  };
};
