import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderFormValues } from "../schemas/orderSchema";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, LoaderCircle, MoreHorizontal, Package, ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrackingUrl } from "../utils/shippingUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { OrderActions } from "./OrderActions";
import { generateOrderId } from "../utils/orderUtils";
import { getOrderDate } from "../utils/dateUtils";
import { getCustomerName, formatTotal } from "../utils/customerUtils";
import { getStatusColor } from "../utils/statusUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { Clipboard, ClipboardCheck, Ban } from "lucide-react";
import { useState } from "react";
import PaymentForm from "@/components/PaymentModal";
import axios from "../../../../axiosconfig";
import {
  InvoiceStatus,
  PaymentMethod,
} from "@/components/invoices/types/invoice.types";
import { useCart } from "@/hooks/use-cart";
import { OrderActivityService } from "@/services/orderActivityService";
import { EmptyState, TableSkeleton } from "@/components/common/EmptyState";
import { InventoryTransactionService } from "@/services/inventoryTransactionService";
import { StockReservationService } from "@/services/stockReservationService";
import { awardOrderPoints } from "@/services/rewardsService";

// Import UI components for the cancel dialog
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Swal from "sweetalert2";

type SortField = "customer" | "date" | "total" | "status" | "payment_status";
type SortDirection = "asc" | "desc";

interface OrdersListProps {
  orders: OrderFormValues[];
  onOrderClick: (order: OrderFormValues) => void;
  selectedOrder: OrderFormValues | null;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  onProcessOrder?: (orderId: string) => void;
  onShipOrder?: (orderId: string) => void;
  onConfirmOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string, reason?: string) => Promise<void>;
  onCancelOrder?: (orderId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
  poIs?: boolean;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  selectedOrders?: string[];
  onOrderSelect?: (orderId: string) => void;
  setOrderStatus?: (status: string) => void;
  // Sorting props
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}

export function OrdersList({
  orders,
  onOrderClick,
  selectedOrder,
  isEditing,
  setIsEditing,
  sortField,
  sortDirection,
  onSort,
  onProcessOrder,
  onShipOrder,
  onConfirmOrder,
  onDeleteOrder,
  onCancelOrder, // Destructure new prop
  isLoading = false,
  userRole = "pharmacy",
  selectedOrders = [],
  onOrderSelect,
  setOrderStatus,
  poIs = false,
}: OrdersListProps) {
  const { toast } = useToast();
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [loadingPO, setLoadingPO] = useState(false);
  const [selectCustomerInfo, setSelectCustomerInfo] = useState<any>({});
  const { cartItems, clearCart, addToCart } = useCart();

  // State for cancel dialog
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const getPaymentMethodLabel = (method?: string | null) => {
    const normalized = String(method || "").toLowerCase();
    const labels: Record<string, string> = {
      card: "Credit Card",
      ach: "ACH Transfer",
      manual: "Manual Payment",
      bank_transfer: "Bank Transfer",
      credit: "Credit Line",
      credit_memo: "Credit Memo",
    };

    return labels[normalized] || (method ? String(method) : "N/A");
  };

  const getOrderPaymentMethod = (order: OrderFormValues) => {
    const typedOrder = order as OrderFormValues & {
      payment_method?: string | null;
      payment?: { method?: string | null };
    };
    return typedOrder.payment_method || typedOrder.payment?.method || "";
  };

  const createInvoiceForOrder = async (
    orderId: string,
    orderData: OrderFormValues
  ) => {
    try {
      // Your existing createInvoiceForOrder logic
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice for the order",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: string,
    trackingNumber?: string,
    shippingMethod?: string
  ) => {
    try {
      // Your existing handleStatusChange logic
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      console.log("shippingMethod", shippingMethod);
      console.log("trackingNumber", trackingNumber);

      if (trackingNumber && shippingMethod) {
        updateData.tracking_number = trackingNumber;
        updateData.shipping_method = shippingMethod;
      }

      const { data: orderExists, error: checkError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking order:", checkError);
        throw checkError;
      }

      if (!orderExists) {
        toast({
          title: "Error",
          description: "Order not found",
          variant: "destructive",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) throw updateError;

      // ✅ Record inventory transaction when order is confirmed
      if (newStatus === 'processing' || newStatus === 'new') {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);

        if (orderItems && orderItems.length > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          for (const item of orderItems) {
            await InventoryTransactionService.recordTransaction(
              item.product_id,
              'sale',
              -item.quantity,
              orderId,
              `Order confirmed - Status: ${newStatus}`,
              session?.user?.id
            );
          }
          console.log('✅ Inventory transactions recorded for order confirmation');
        }
      }

      // ✅ Restore stock when order is cancelled
      if (newStatus === 'cancelled') {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);

        if (orderItems && orderItems.length > 0) {
          // Release reservation
          await StockReservationService.releaseReservation(orderId);
          
          // Record restoration
          const { data: { session } } = await supabase.auth.getSession();
          for (const item of orderItems) {
            await InventoryTransactionService.recordTransaction(
              item.product_id,
              'restoration',
              item.quantity,
              orderId,
              `Order cancelled - Stock restored`,
              session?.user?.id
            );
          }
          console.log('✅ Stock restored and transactions recorded for cancelled order');
        }
      }

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      if (newStatus === "pending") {
        const orderData = orders.find((order) => order.id === orderId);
        if (orderData) {
          await createInvoiceForOrder(orderId, orderData);
        }
      }

      switch (newStatus) {
        case "processing":
          if (onProcessOrder) onProcessOrder(orderId);
          break;
        case "shipped":
          if (onShipOrder) onShipOrder(orderId);
          break;
        case "pending":
          if (onConfirmOrder) onConfirmOrder(orderId);
          break;
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleCancelOrderClick = (orderId: string) => {
    setOrderToCancel(orderId);
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (orderToCancel && cancelReason) {
      if (onCancelOrder) {
        await onCancelOrder(orderToCancel, cancelReason);
        setOrderStatus && setOrderStatus("cancelled"); // Assuming you want to update the status to "cancelled" in the parent
      }
      setIsCancelDialogOpen(false);
      setOrderToCancel(null);
      setCancelReason("");
    } else {
      toast({
        title: "Error",
        description: "Please provide a reason to cancel the order.",
        variant: "destructive",
      });
    }
  };

  const acceptPO = async (orderId: string) => {
    setLoadingPO(true);
    try {
      // Get current order to extract PO number
      const { data: currentOrder, error: fetchError } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", orderId)
        .single();

      if (fetchError || !currentOrder) {
        throw new Error("Failed to fetch order");
      }

      // Remove "PO-" prefix from order number
      // Example: "PO-9RX000221" becomes "9RX000221"
      const newOrderNumber = currentOrder.order_number.replace(/^PO-/i, "");

      const { data: updatedOrder, error: updateErrorOrder } = await supabase
        .from("orders")
        .update({
          poAccept: true,
          order_number: newOrderNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select("*")
        .single();

      if (updateErrorOrder) {
        throw new Error(updateErrorOrder);
      }

      const newOrder = updatedOrder;

      // Use atomic RPC function to generate invoice number (prevents race conditions)
      const { data: invoiceNumber, error: invoiceGenError } = await supabase.rpc('generate_invoice_number');

      if (invoiceGenError || !invoiceNumber) {
        console.error("🚨 Failed to generate invoice number:", invoiceGenError);
        throw new Error(invoiceGenError?.message || 'Failed to generate invoice number');
      }

      console.log("✅ Generated invoice number:", invoiceNumber);

      const estimatedDeliveryDate = new Date(newOrder.estimated_delivery);

      const dueDate = new Date(estimatedDeliveryDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const formattedDueDate = dueDate.toISOString();

      // Calculate discount amount
      const discountAmount = Number(newOrder.discount_amount || 0);

      const invoiceData = {
        invoice_number: invoiceNumber,
        order_id: newOrder.id,
        due_date: formattedDueDate,
        profile_id: newOrder.customer,
        status: "pending" as InvoiceStatus,
        amount: newOrder.total_amount,
        tax_amount: newOrder.tax_amount || 0,
        total_amount: newOrder.total_amount,
        payment_status: newOrder.payment_status,
        payment_method: newOrder.paymentMethod as PaymentMethod,
        payment_notes: newOrder.notes || null,
        purchase_number_external: newOrder.purchase_number_external,
        items: newOrder.items || [],
        customer_info: newOrder.customerInfo || {
          name: newOrder.customerInfo?.name,
          email: newOrder.customerInfo?.email || "",
          phone: newOrder.customerInfo?.phone || "",
        },
        shipping_info: newOrder.shippingAddress || {},
        shippin_cost: newOrder.shipping_cost,
        subtotal: newOrder.total_amount + discountAmount,
        // Add discount information
        discount_amount: discountAmount,
        discount_details: newOrder.discount_details || [],
      };

      console.log("Creating invoice with data:", invoiceData);

      const { invoicedata2, error } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (error) {
        console.error("Error creating invoice:", error);
        throw error;
      }

      console.log("Invoice created successfully:", invoicedata2);

      const { data: profileData, error: profileEror } = await supabase
        .from("profiles")
        .select()
        .eq("id", newOrder.customer)
        .maybeSingle();

      if (profileEror) {
        console.error("🚨 Supabase Fetch Error:", profileEror);
        return;
      }
      if (profileData.email_notifaction) {
        try {
          await axios.post("/order-place", newOrder);
          console.log("Order status sent successfully to backend.");
        } catch (apiError) {
          console.error("Failed to send order status to backend:", apiError);
        }
      }

      if (error) throw error;

      console.log("Updated Order:", updatedOrder);

       // window.location.reload();
    } catch (error) {
      console.log(error);
    }
    setLoadingPO(false);
  };

  const rejectPO = async (orderId: string) => {
    setLoadingPO(true);

    try {
      // Your existing rejectPO logic
      const { error: invoiceDeleteError } = await supabase
        .from("invoices")
        .delete()
        .eq("order_id", orderId);

      if (invoiceDeleteError) throw invoiceDeleteError;

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      // window.location.reload();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
    setLoadingPO(false);
  };

  if (isLoading) {
    return <TableSkeleton rows={5} columns={7} />;
  }

  const handleApproveCredit = async (order) => {
    const orderId = order?.id;
    if (!orderId) {
      toast({
        title: "Error",
        description: "Order ID is missing.",
        variant: "destructive",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Confirm Credit Order?",
      text: "Do you want to confirm this credit order?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Confirm",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Processing...",
        text: "Approving credit order and creating invoice...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "approve_credit_order_atomic",
        { p_order_id: orderId }
      );

      if (rpcError) {
        const detailedMessage = [rpcError.message, rpcError.details, rpcError.hint]
          .filter(Boolean)
          .join(" | ");
        throw new Error(detailedMessage || "Credit approval failed");
      }
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.message || "Credit approval failed");
      }

      const profileId = (order as any)?.customer || order?.profile_id;
      const totalAmount = Number((order as any)?.total_amount ?? (order as any)?.total ?? 0);

      if (rpcResult.status === "approved" && profileId && totalAmount > 0) {
        try {
          const rewardResult = await awardOrderPoints(
            profileId,
            orderId,
            totalAmount,
            order.order_number
          );
          if (rewardResult.success && rewardResult.pointsEarned > 0) {
            console.log(
              `Reward points awarded: ${rewardResult.pointsEarned} points to customer ${profileId}`
            );
          }
        } catch (rewardError) {
          console.error("Failed to award reward points for credit order:", rewardError);
        }
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const adminUserId = session?.user?.id || profileId || "system";
        await OrderActivityService.logActivity({
          orderId,
          activityType: "updated",
          description:
            rpcResult.status === "already_processed"
              ? `Credit order already processed - Invoice: ${rpcResult.invoice_number || "N/A"}`
              : `Credit order approved - Amount: $${totalAmount.toFixed(2)} - Credit Invoice: ${rpcResult.credit_invoice_number || "N/A"}`,
          performedBy: adminUserId,
          performedByName: session?.user?.user_metadata?.first_name || "Admin",
          performedByEmail: session?.user?.email,
          metadata: {
            order_number: order.order_number,
            credit_amount: totalAmount,
            previous_status: order.status || "credit_approval_processing",
            new_status: rpcResult.order_status || "new",
            invoice_number: rpcResult.invoice_number,
            credit_invoice_number: rpcResult.credit_invoice_number,
          },
        });
      } catch (activityError) {
        console.error("Failed to log credit approval activity:", activityError);
      }

      Swal.close();
      await Swal.fire({
        title: rpcResult.status === "already_processed" ? "Already Processed" : "Success",
        text:
          rpcResult.message ||
          (rpcResult.status === "already_processed"
            ? "This credit order is already approved."
            : "Credit order approved and invoice created successfully."),
        icon: "success",
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.close();
      Swal.fire({
        title: "Error",
        text: `Failed to approve credit order: ${err?.message || "Unknown error"}`,
        icon: "error",
      });
    }
  };

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        variant="orders"
        title="No orders found"
        description="Orders will appear here once customers start placing them. You can also create orders manually."
        actionLabel="Create Order"
        onAction={() => window.location.href = "/pharmacy/order/create"}
      />
    );
  }

  // Helper to get sort icon
  const getSortIcon = (field: SortField) => {
    if (!onSort || sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1 text-blue-600" />
      : <ArrowDown className="h-3 w-3 ml-1 text-blue-600" />;
  };

  // Sortable header component
  const SortableHeader = ({ field, children, className = "" }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={`font-semibold text-gray-700 text-center ${className}`}>
      <button
        onClick={() => onSort?.(field)}
        className="flex items-center justify-center w-full hover:text-blue-600 transition-colors"
        disabled={!onSort}
      >
        {children}
        {getSortIcon(field)}
      </button>
    </TableHead>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            {userRole === "admin" && onOrderSelect && (
              <TableHead className="w-[50px] text-center">
                <span className="sr-only">Select</span>
              </TableHead>
            )}
            {poIs && (
              <TableHead className="font-semibold text-gray-700 text-center">
                Order #
              </TableHead>
            )}
            {poIs && (
              <TableHead className="font-semibold text-gray-700 text-center">
                Notes
              </TableHead>
            )}
            <SortableHeader field="customer">
              {poIs ? "Vendor" : "Customer"}
            </SortableHeader>
            <SortableHeader field="date">
              Date
            </SortableHeader>
            <SortableHeader field="total">
              Amount
            </SortableHeader>
            {poIs && (
              <TableHead className="font-semibold text-gray-700 text-center">
                Status
              </TableHead>
            )}
            {!poIs && (
              <>
                <SortableHeader field="status">
                  Status
                </SortableHeader>
                <SortableHeader field="payment_status">
                  Payment
                </SortableHeader>
                <TableHead className="font-semibold text-gray-700 text-center">
                  Tracking
                </TableHead>
                {userRole === "admin" && (
                  <TableHead className="font-semibold text-gray-700 text-center w-[80px]">
                    Actions
                  </TableHead>
                )}
              </>
            )}
            {false && poIs && (
              <TableHead className="font-semibold text-gray-700 text-center">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
      <TableBody>
        {orders.map((order, index) => {
          const orderId = order.id || "";
          const isEven = index % 2 === 0;
          return (
            <TableRow 
              key={orderId} 
              className={`
                group cursor-pointer transition-all duration-200
                ${isEven ? "bg-white" : "bg-gray-50/50"}
                hover:bg-blue-50/50 hover:shadow-sm
                ${order.void ? "opacity-60" : ""}
              `}
            >
              {userRole === "admin" && onOrderSelect && (
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="text-center"
                >
                  <Checkbox
                    checked={selectedOrders.includes(orderId)}
                    onCheckedChange={() => {
                      onOrderSelect(orderId);
                    }}
                    className="border-gray-300"
                  />
                </TableCell>
              )}

              {poIs && (
                <TableCell
                  className="text-center font-mono text-sm text-blue-600 font-medium"
                  onClick={async () => {
                    onOrderClick(order);
                    await clearCart();
                  }}
                >
                  {order.order_number}
                </TableCell>
              )}

              {poIs && (
                <TableCell
                  className="text-center text-sm text-gray-600 max-w-[150px] truncate"
                  onClick={async () => {
                    onOrderClick(order);
                    await clearCart();
                  }}
                >
                  {order.specialInstructions}
                </TableCell>
              )}

              <TableCell
                onClick={async () => {
                  onOrderClick(order);
                  await clearCart();
                }}
                className="text-center"
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="font-semibold text-gray-900">
                    {order.customerInfo?.name || "N/A"}
                  </span>
                  {order.void && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      <Ban size={12} />
                      VOID
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="text-center">
                {(() => {
                  const dateObj = new Date(order.date);
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });
                  return (
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{formattedDate}</span>
                      <span className="text-xs text-gray-500">{formattedTime}</span>
                    </div>
                  );
                })()}
              </TableCell>
              
              <TableCell className="text-center">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-gray-900">
                    {(() => {
                      // Calculate correct total: Subtotal + Shipping + Tax + PO Charges - Discount
                      const itemsSubtotal = order.items?.reduce((total, item) => {
                        return total + (item.sizes?.reduce((sum, size) => sum + size.quantity * size.price, 0) || 0)
                      }, 0) || 0
                      const shippingCost = parseFloat(order.shipping_cost || "0")
                      const taxAmount = parseFloat(order.tax_amount?.toString() || "0")
                      const discountAmt = parseFloat((order as any).discount_amount?.toString() || "0")
                      // Add PO charges ONLY for Purchase Orders (check poAccept flag)
                      const isPurchaseOrder = (order as any).poAccept === false
                      const handlingCharges = isPurchaseOrder ? parseFloat((order as any).po_handling_charges || "0") : 0
                      const fredCharges = isPurchaseOrder ? parseFloat((order as any).po_fred_charges || "0") : 0
                      const correctTotal = itemsSubtotal + shippingCost + taxAmount + handlingCharges + fredCharges - discountAmt
                      return formatTotal(correctTotal)
                    })()}
                  </span>
                  {order.tax_amount > 0 && (
                    <span className="text-xs text-gray-500">
                      incl. {formatTotal(order.tax_amount)} tax
                    </span>
                  )}
                </div>
              </TableCell>

              {poIs && (
                <TableCell className="text-center">
                  {(order as any).poApproved ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 font-medium text-xs px-2.5 py-1 rounded-full">
                      APPROVED
                    </Badge>
                  ) : (order as any).poRejected ? (
                    <Badge variant="secondary" className="bg-red-100 text-red-800 font-medium text-xs px-2.5 py-1 rounded-full">
                      REJECTED
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 font-medium text-xs px-2.5 py-1 rounded-full">
                      PENDING
                    </Badge>
                  )}
                </TableCell>
              )}

              {!poIs && (
                <>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`${getStatusColor(order.status || "")} font-medium text-xs px-2.5 py-1 rounded-full`}
                      >
                        {order.status?.toUpperCase() || "PENDING"}
                      </Badge>

                      {order.status === "credit_approval_processing" && userRole === "admin" && (
                        <button
                          onClick={() => handleApproveCredit(order)}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-medium
                            hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                        >
                          Approve Credit
                        </button>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`${getStatusColor(order?.payment_status || "")} font-medium text-xs px-2.5 py-1 rounded-full`}
                      >
                        {order?.payment_status?.toUpperCase() || "UNPAID"}
                      </Badge>
                      
                      {/* Balance Due Indicator for Partial Paid Orders */}
                      {order?.payment_status?.toLowerCase() === "partial_paid" && (
                        <div className="text-xs text-amber-600 font-medium">
                          Balance Due: ${((order?.total_amount || 0) - (order?.paid_amount || 0)).toFixed(2)}
                        </div>
                      )}
                      
                      {/* Paid method indicator for $0 paid_amount cases */}
                      {order?.payment_status?.toLowerCase() === "paid" && (order?.paid_amount || 0) === 0 && (
                        <div className="text-xs text-blue-600">
                          <span>
                            {getPaymentMethodLabel(getOrderPaymentMethod(order))}
                          </span>
                        </div>
                      )}
                      
                      {/* Regular Paid Indicator */}
                      {order?.payment_status?.toLowerCase() === "paid" && (order?.paid_amount || 0) > 0 && (
                        <div className="text-xs text-gray-600">
                          <span className="text-green-600">✓ Paid</span>
                        </div>
                      )}
                      
                      {(order?.payment_status?.toLowerCase() === "unpaid" ||
                        order?.payment_status?.toLowerCase() === "pending") &&
                        order.status !== "credit_approval_processing" &&
                        !order.void && (
                          <button
                            onClick={() => {
                              setSelectCustomerInfo(order);
                              setModalIsOpen(true);
                            }}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-medium
                              hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                          >
                            Pay Now
                          </button>
                        )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {order.shipping?.trackingNumber &&
                    order?.shipping.method !== "custom" ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-blue-600 hover:text-blue-800 font-mono text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            getTrackingUrl(
                              order.shipping.method,
                              order.shipping.trackingNumber!
                            ),
                            "_blank"
                          );
                        }}
                      >
                        {order.shipping.trackingNumber}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Manual</span>
                    )}
                  </TableCell>
                  
                  {userRole === "admin" && (
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center gap-1">
                        {/* Quick View Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0  transition-opacity hover:bg-blue-100 hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOrderClick(order);
                            clearCart();
                          }}
                          title="Quick View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => handleCancelOrderClick(order.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                          {/* Your existing OrderActions items can go here if needed, or OrderActions can be modified to include this */}
                          <OrderActions
                            order={order}
                            onProcessOrder={async (id) => {
                              await handleStatusChange(id, "processing");
                              setOrderStatus && setOrderStatus("processing");
                            }}
                            onShipOrder={async (id) => {
                              await handleStatusChange(
                                id,
                                "shipped",
                                order.shipping?.trackingNumber,
                                order.shipping?.method
                              );
                              setOrderStatus && setOrderStatus("shipped");
                            }}
                            onConfirmOrder={async (id) => {
                              await handleStatusChange(id, "processing");
                              setOrderStatus && setOrderStatus("processing");
                            }}
                            onDeleteOrder={onDeleteOrder}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </TableCell>
                  )}
                </>
              )}
              {false && poIs && (
                <TableCell className="text-center border border-gray-300">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    {/* Accept Button */}
                    <button
                      className="flex items-center justify-center gap-2 px-3 py-1 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition duration-200"
                      onClick={() => acceptPO(order.id)}
                      disabled={loadingPO}
                    >
                      {loadingPO ? (
                        <>
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept Purchase Order"
                      )}
                    </button>

                    {/* Reject Button */}
                    <button
                      className="flex items-center justify-center gap-2 px-3 py-1 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition duration-200"
                      onClick={() => rejectPO(order.id)}
                      disabled={loadingPO}
                    >
                      {loadingPO ? (
                        <>
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        "Reject Purchase Order"
                      )}
                    </button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}

        {modalIsOpen && selectCustomerInfo && (
          <PaymentForm
            modalIsOpen={modalIsOpen}
            setModalIsOpen={setModalIsOpen}
            customer={selectCustomerInfo.customerInfo}
            amountP={selectCustomerInfo.total}
            orderId={selectCustomerInfo.id}
            orders={selectCustomerInfo}
          />
        )}
      </TableBody>

      {/* Cancel Order AlertDialog */}
      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for canceling this order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Customer requested cancellation"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsCancelDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Table>
    </div>
  );
}
