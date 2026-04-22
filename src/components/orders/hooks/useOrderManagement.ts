import { useState, useEffect } from "react";
import { OrderFormValues } from "../schemas/orderSchema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import axios from "../../../../axiosconfig";
import { OrderActivityService } from "@/services/orderActivityService";

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
    statusFilter2?: string | string[];
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
        profiles!orders_profile_id_fkey (
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
      const selectedStatuses =
        statusFilter2 === "all" || !statusFilter2
          ? []
          : Array.isArray(statusFilter2)
            ? statusFilter2
            : [statusFilter2];

      if (poIs === true && selectedStatuses.length === 1) {
        switch (selectedStatuses[0]) {
          case "pending":
            query = query.eq("poApproved", false).eq("poRejected", false);
            break;
          case "approved":
            query = query.eq("poApproved", true).eq("poRejected", false).eq("status", "approved");
            break;
          case "partially_received":
            query = query.eq("status", "partially_received");
            break;
          case "received":
            query = query.eq("status", "received");
            break;
          case "closed":
            query = query.eq("status", "closed");
            break;
          case "rejected":
            query = query.eq("poRejected", true);
            break;
        }
      } else if (!poIs && selectedStatuses.length > 0) {
        const nonVoidedStatuses = selectedStatuses.filter((status) => status !== "voided");
        const includesVoided = selectedStatuses.includes("voided");
        const orFilters: string[] = [];

        if (nonVoidedStatuses.length > 0) {
          orFilters.push(`and(void.is.false,status.in.(${nonVoidedStatuses.join(",")}))`);
        }

        if (includesVoided) {
          orFilters.push("void.is.true");
        }

        if (orFilters.length > 0) {
          query = query.or(orFilters.join(","));
        }
      }

      // Apply search
      if (searchQuery) {
        const search = `%${searchQuery}%`;
        query = query.or(
          `order_number.ilike.${search},customerInfo->>name.ilike.${search},customerInfo->>email.ilike.${search},customerInfo->>phone.ilike.${search},purchase_number_external.ilike.${search},notes.ilike.${search}`
        );
      }
 // ✅ PO orders filter - only filter when viewing PO page
    if (poIs === true) {
      // Show only PO orders (poAccept = false means pending PO approval)
      query = query.eq("poAccept", false);
    }
    // When poIs = false (regular orders page), show all orders (no filter on poAccept)
      // Date range filter
      if (dateRange?.from && dateRange?.to) {
        query = query
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());
      }
      const { data, error, count } = await query;

      // console.log(data);
      if (error) throw error;
      setTotalOrders(count || 0);

      const formattedOrders: OrderFormValues[] = (data as any[]).map(
        (order) => {
          const profileData = order.profiles || {};
          const rawPaymentMethod = String(order.payment_method || "").toLowerCase();
          const allowedPaymentMethods = ["card", "bank_transfer", "manual", "ach", "credit"];
          const normalizedPaymentMethod = allowedPaymentMethods.includes(rawPaymentMethod)
            ? (rawPaymentMethod as OrderFormValues["payment"]["method"])
            : "manual";
          return {
            id: order.id || "",
            customer: order.profile_id || "",
            date: order.created_at || new Date().toISOString(),
            total: (order.total_amount || 0).toString(),
            status: order.status || "pending",
            payment_status: order.payment_status || "unpaid",
            payment_method: order.payment_method || "",
            payment_transication: order.payment_transication || "",
            customization: order.customization || false,
            poAccept: order.poAccept,
            shipping_cost: order.shipping_cost,
            quickBooksID: order.quickBooksID,
            tax_amount: order.tax_amount,
            void: order.void,
            voidReason: order.voidReason,
            cancelReason: order.cancelReason,
            poApproved: order.poApproved,
            poRejected: order.poRejected,
            po_handling_charges: order.po_handling_charges,
            po_fred_charges: order.po_fred_charges,
            // Add discount fields
            processing_fee_amount :order.processing_fee_amount || 0,
            paid_amount :order.paid_amount || 0,
            discount_amount: order.discount_amount || 0,
            discount_details: order.discount_details || [],
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
              ...((order.shipping as Record<string, any> | null) || {}),
              method: order.shipping_method || order.shipping?.method || "custom",
              cost: order.shipping_cost || order.shipping?.cost || 0,
              trackingNumber: order.tracking_number || order.shipping?.trackingNumber || "",
              estimatedDelivery: order.estimated_delivery || order.shipping?.estimatedDelivery || "",
            },
            receiving_notes:
              String(
                order.receiving_notes ||
                order.notes ||
                order.payment_notes ||
                ""
              ).trim(),
            payment: {
              method: normalizedPaymentMethod,
              notes: order.payment_notes || "",
            },
            specialInstructions: order.notes || "",
            purchase_number_external: order.purchase_number_external || "",
            shippingAddress: order.shippingAddress
              ? {
                  ...order.shippingAddress,
                  fullName: order.shippingAddress.fullName || "",
                  email: order.shippingAddress.email || "",
                  phone:
                    order.shippingAddress.phone ||
                    order.shippingAddress.shipping?.phone ||
                    "",
                  address: {
                    street:
                      order.shippingAddress.address?.street ||
                      order.shippingAddress.shipping?.street1 ||
                      "",
                    city:
                      order.shippingAddress.address?.city ||
                      order.shippingAddress.shipping?.city ||
                      "",
                    state:
                      order.shippingAddress.address?.state ||
                      order.shippingAddress.shipping?.state ||
                      "",
                    zip_code:
                      order.shippingAddress.address?.zip_code ||
                      order.shippingAddress.shipping?.zipCode ||
                      "",
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
      if (selectedOrder?.id) {
        const refreshedSelectedOrder =
          formattedOrders.find((item) => item.id === selectedOrder.id) || null;
        setSelectedOrder(refreshedSelectedOrder);
        if (!refreshedSelectedOrder) {
          setIsSheetOpen(false);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Refresh orders when the component mounts
  // useEffect(() => {
  //   loadOrders();
  // }, []);

  const handleOrderClick = (order: OrderFormValues) => {
    console.log("ON CLICK ",order)
    setSelectedOrder(order);
    setIsEditing(false);
    setIsSheetOpen(true);
  };

  const restoreBatchStockForOrder = async (
    orderId: string,
    restoreReferenceType: "order_void_restore" | "order_cancel_restore"
  ): Promise<void> => {
    const { count: alreadyRestoredCount, error: restoredCheckError } = await supabase
      .from("batch_transactions")
      .select("id", { head: true, count: "exact" })
      .eq("reference_id", orderId)
      .in("reference_type", ["order_void_restore", "order_cancel_restore"])
      .eq("transaction_type", "return");

    if (restoredCheckError) {
      throw restoredCheckError;
    }

    if ((alreadyRestoredCount || 0) > 0) {
      console.log(
        `Batch stock already restored for order ${orderId} (${restoreReferenceType}), skipping duplicate restore`
      );
      return;
    }

    const { data: batchSales, error: batchSalesError } = await supabase
      .from("batch_transactions")
      .select("batch_id, quantity")
      .eq("reference_id", orderId)
      .eq("reference_type", "order")
      .eq("transaction_type", "sale");

    if (batchSalesError) {
      throw batchSalesError;
    }

    if (!batchSales || batchSales.length === 0) {
      return;
    }

    for (const sale of batchSales) {
      const restoreQty = Math.max(0, Number(sale.quantity || 0));
      if (!sale.batch_id || restoreQty <= 0) {
        continue;
      }

      const { data: batchRow, error: batchFetchError } = await supabase
        .from("product_batches")
        .select("id, quantity_available")
        .eq("id", sale.batch_id)
        .single();

      if (batchFetchError || !batchRow) {
        console.warn(
          `Batch restore skipped: missing batch ${sale.batch_id} for order ${orderId}`
        );
        continue;
      }

      const newAvailableQty =
        Number(batchRow.quantity_available || 0) + restoreQty;

      const { error: batchUpdateError } = await supabase
        .from("product_batches")
        .update({
          quantity_available: newAvailableQty,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sale.batch_id);

      if (batchUpdateError) {
        throw batchUpdateError;
      }

      const { error: txInsertError } = await supabase.from("batch_transactions").insert({
        batch_id: sale.batch_id,
        transaction_type: "return",
        quantity: restoreQty,
        reference_id: orderId,
        reference_type: restoreReferenceType,
        notes: `Stock restored for ${restoreReferenceType.replace(
          "_restore",
          ""
        )}`,
      });

      if (txInsertError) {
        throw txInsertError;
      }
    }
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

      // Get order data before voiding (for reward points reversal)
      const { data: orderBeforeVoid, error: fetchOrderError } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, profile_id, location_id, payment_method, payment_status, status")
        .eq("id", orderId)
        .single();

      if (fetchOrderError) throw fetchOrderError;

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

      // Step 3: Reverse reward points if order had points awarded.
      // Credit orders can also earn points after approval, so do not exclude by payment_method.
      if (orderBeforeVoid) {
        try {
          console.log('🔄 Reversing reward points for voided order...');
          
          // Check ALL reward transactions for this order (original + edits)
          const { data: rewardTransactions } = await supabase
            .from("reward_transactions")
            .select("id, points")
            .eq("reference_id", orderId)
            .in("reference_type", ["order", "order_edit"]) // ✅ Include both order and order_edit
            .eq("transaction_type", "earn");

          if (rewardTransactions && rewardTransactions.length > 0) {
            // Calculate total points to reverse (sum of all transactions)
            const totalPointsToReverse = rewardTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
            
            if (totalPointsToReverse > 0) {
              const customerId = orderBeforeVoid.location_id || orderBeforeVoid.profile_id;
              
              // Get customer's current points
              const { data: customer } = await supabase
                .from("profiles")
                .select("reward_points")
                .eq("id", customerId)
                .single();

              if (customer) {
                const newPoints = Math.max(0, (customer.reward_points || 0) - totalPointsToReverse);
                
                // Update customer points
                await supabase
                  .from("profiles")
                  .update({ reward_points: newPoints })
                  .eq("id", customerId);

                // Log reversal transaction
                await supabase
                  .from("reward_transactions")
                  .insert({
                    user_id: customerId,
                    points: -totalPointsToReverse,
                    transaction_type: "adjust",
                    description: `Order #${orderBeforeVoid.order_number} voided: -${totalPointsToReverse} points reversed`,
                    reference_type: "order_void",
                    reference_id: orderId
                  });

                console.log(`✅ Reversed ${totalPointsToReverse} reward points for voided order (${rewardTransactions.length} transactions)`);
              }
            }
          }
        } catch (rewardError) {
          console.error('❌ Error reversing reward points:', rewardError);
          // Don't throw - order void should still succeed
        }
      }

      const paymentMethod = String(orderBeforeVoid?.payment_method || "").toLowerCase();
      const paymentStatus = String(orderBeforeVoid?.payment_status || "").toLowerCase();
      const shouldRestoreStock = paymentMethod !== "credit" || paymentStatus === "paid" || paymentStatus === "partial_paid";

      // Step 4-6: Reverse stock only if stock was previously deducted.
      // Credit orders in approval-pending state should not restore stock.
      if (shouldRestoreStock) {
        await restoreBatchStockForOrder(orderId, "order_void_restore");

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
      } else {
        console.log(`ℹ️ Skipping stock restore for credit order ${orderId} (not yet approved/paid).`);
      }

      // Step 7: Log void activity
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await OrderActivityService.logOrderVoid({
          orderId: orderId,
          orderNumber: orderBeforeVoid.order_number,
          reason: reason,
          performedBy: session?.user?.id,
          performedByName: session?.user?.user_metadata?.first_name || "Admin",
          performedByEmail: session?.user?.email,
        });
      } catch (activityError) {
        console.error("Failed to log void activity:", activityError);
      }

      // Step 8: Update UI
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

      // Get order data before cancelling (for reward points reversal)
      const { data: orderBeforeCancel, error: fetchOrderError } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, profile_id, location_id, payment_method, payment_status, status")
        .eq("id", orderId)
        .single();

      if (fetchOrderError) throw fetchOrderError;

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

      // Step 3: Reverse reward points if order had points awarded
      // IMPORTANT: Only reverse EARNED points, NOT redeemed points
      // If user redeemed points in this order, they don't get refunded
      // Credit orders can also earn points after approval, so do not exclude by payment_method.
      if (orderBeforeCancel) {
        try {
          console.log('🔄 Reversing reward points for cancelled order...');
          
          // Check ALL reward transactions for this order (original + edits)
          const { data: rewardTransactions } = await supabase
            .from("reward_transactions")
            .select("id, points")
            .eq("reference_id", orderId)
            .in("reference_type", ["order", "order_edit"]) // ✅ Include both order and order_edit
            .eq("transaction_type", "earn");

          if (rewardTransactions && rewardTransactions.length > 0) {
            // Calculate total points to reverse (sum of all transactions)
            const totalPointsToReverse = rewardTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
            
            if (totalPointsToReverse > 0) {
              const customerId = orderBeforeCancel.location_id || orderBeforeCancel.profile_id;
              
              // Get customer's current points
              const { data: customer } = await supabase
                .from("profiles")
                .select("reward_points")
                .eq("id", customerId)
                .single();

              if (customer) {
                const currentPoints = customer.reward_points || 0;
                
                // Calculate new points - ALLOW NEGATIVE BALANCE
                // This creates a "debt" that user needs to pay back
                const newPoints = currentPoints - totalPointsToReverse;
                
                console.log(`💰 Current points: ${currentPoints}`);
                console.log(`💰 Points to reverse (earned): ${totalPointsToReverse}`);
                console.log(`💰 New points after reversal: ${newPoints}`);
                
                if (newPoints < 0) {
                  console.log(`⚠️ User will have NEGATIVE balance: ${newPoints} points`);
                }
                
                // Update customer points (allow negative)
                await supabase
                  .from("profiles")
                  .update({ reward_points: newPoints })
                  .eq("id", customerId);

                // Log reversal transaction
                await supabase
                  .from("reward_transactions")
                  .insert({
                    user_id: customerId,
                    points: -totalPointsToReverse,
                    transaction_type: "adjust",
                    description: `Order #${orderBeforeCancel.order_number} cancelled: -${totalPointsToReverse} points reversed${newPoints < 0 ? ' (negative balance)' : ''}`,
                    reference_type: "order_cancel",
                    reference_id: orderId
                  });

                if (newPoints < 0) {
                  console.log(`⚠️ User now has NEGATIVE balance: ${newPoints} points. They need to earn ${Math.abs(newPoints)} points to get back to 0.`);
                } else {
                  console.log(`✅ Reversed ${totalPointsToReverse} reward points for cancelled order (${rewardTransactions.length} transactions)`);
                }
              }
            }
          }
          
          // NOTE: We do NOT refund redeemed points
          // If user used points in this order, those points are gone
          // Only the earned points from this order are reversed
          console.log('ℹ️ Redeemed points (if any) are NOT refunded - user already used them');
          
        } catch (rewardError) {
          console.error('❌ Error reversing reward points:', rewardError);
          // Don't throw - order cancellation should still succeed
        }
      }

      const paymentMethod = String(orderBeforeCancel?.payment_method || "").toLowerCase();
      const paymentStatus = String(orderBeforeCancel?.payment_status || "").toLowerCase();
      const shouldRestoreStock = paymentMethod !== "credit" || paymentStatus === "paid" || paymentStatus === "partial_paid";

      if (shouldRestoreStock) {
        await restoreBatchStockForOrder(orderId, "order_cancel_restore");

        // Step 5: Restore product-level stock
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

        // Step 6: Restore size-level stock (if applicable)
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
      } else {
        console.log(`ℹ️ Skipping stock restore for credit order ${orderId} (not yet approved/paid).`);
      }

      // Step 7: Log cancel activity
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await OrderActivityService.logOrderCancel({
          orderId: orderId,
          orderNumber: orderBeforeCancel.order_number,
          reason: reason,
          performedBy: session?.user?.id,
          performedByName: session?.user?.user_metadata?.first_name || "Admin",
          performedByEmail: session?.user?.email,
        });
      } catch (activityError) {
        console.error("Failed to log cancel activity:", activityError);
      }

      // Step 8: Update UI
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
      // Get old status first
      const { data: oldOrder } = await supabase
        .from("orders")
        .select("status, order_number, invoice_number")
        .eq("id", orderId)
        .single();

      const oldStatus = oldOrder?.status || "unknown";
      const orderNumber = oldOrder?.order_number || "N/A";

      // Prepare update data
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Generate invoice number when confirming order (moving from new/pending to processing)
      // Only generate if invoice_number doesn't exist yet
      if (
        (newStatus === "processing" || newStatus === "confirmed") &&
        !oldOrder?.invoice_number &&
        (oldStatus === "new" || oldStatus === "pending")
      ) {
        // Generate invoice number: INV-YYYYMMDD-XXXXX
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        updateData.invoice_number = `INV-${dateStr}-${randomNum}`;
      }

      // Update order and get the updated order in response
      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select("*, profile_id(first_name, email_notifaction)")
        .single(); // Ensures only one order is fetched

      if (error) throw error;

      // Log the updated order
      console.log("Updated Order:", updatedOrder);

      // Log status change activity (only if status actually changed)
      if (oldStatus !== newStatus) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await OrderActivityService.logStatusChange({
            orderId: orderId,
            orderNumber: orderNumber,
            oldStatus: oldStatus,
            newStatus: newStatus,
            performedBy: session?.user?.id,
            performedByName: session?.user?.user_metadata?.first_name || "Admin",
            performedByEmail: session?.user?.email,
          });
        } catch (activityError) {
          console.error("Failed to log status change activity:", activityError);
        }
      }

      // Send the updated order to the backend
      if (updatedOrder.profile_id?.email_notifaction) {
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
    setLoading,
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
