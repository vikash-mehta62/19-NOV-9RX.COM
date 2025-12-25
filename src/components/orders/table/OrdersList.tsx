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
      // Your existing acceptPO logic
      const orderNumber = await generateOrderId();
      const { data: updatedOrder, error: updateErrorOrder } = await supabase
        .from("orders")
        .update({
          poAccept: true,
          order_number: orderNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select("*")
        .single();

      if (updateErrorOrder) {
        throw new Error(updateErrorOrder);
      }

      const newOrder = updatedOrder;

      const year = new Date().getFullYear();

      const { data: inData, error: erroIn } = await supabase
        .from("centerize_data")
        .select("id, invoice_no, invoice_start")
        .order("id", { ascending: false })
        .limit(1);

      if (erroIn) {
        console.error("🚨 Supabase Fetch Error:", erroIn);
        return null;
      }

      let newInvNo = 1;
      let invoiceStart = "INV";

      if (inData && inData.length > 0) {
        newInvNo = (inData[0].invoice_no || 0) + 1;
        invoiceStart = inData[0].invoice_start || "INV";
      }

      const invoiceNumber = `${invoiceStart}-${year}${newInvNo
        .toString()
        .padStart(6, "0")}`;

      const { error: updateError } = await supabase
        .from("centerize_data")
        .update({ invoice_no: newInvNo })
        .eq("id", inData[0]?.id);

      if (updateError) {
        console.error("🚨 Supabase Update Error:", updateError);
      } else {
        console.log("✅ Order No Updated to:", newInvNo);
      }

      const estimatedDeliveryDate = new Date(newOrder.estimated_delivery);

      const dueDate = new Date(estimatedDeliveryDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const formattedDueDate = dueDate.toISOString();

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
        items: newOrder.items || [],
        customer_info: newOrder.customerInfo || {
          name: newOrder.customerInfo?.name,
          email: newOrder.customerInfo?.email || "",
          phone: newOrder.customerInfo?.phone || "",
        },
        shipping_info: newOrder.shippingAddress || {},
        shippin_cost: newOrder.shipping_cost,
        subtotal: newOrder.total_amount,
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
    // Confirm first
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
      // Show loading inside Swal
      Swal.fire({
        title: "Processing...",
        text: "Approving credit order and creating invoice...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Credit verification + approval
      await verifyCreditLimit(order);

      // Close loading Swal
      Swal.close();

      // Show success alert, then reload after 2s
      await Swal.fire({
        title: "Success",
        text: "Credit order approved and invoice created successfully!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      // Reload page after 2 seconds
      // window.location.reload();
    } catch (err: any) {
      Swal.close();
      Swal.fire({
        title: "Error",
        text: `Failed to approve credit order: ${err.message}`,
        icon: "error",
      });
    }
  };

  const verifyCreditLimit = async (order) => {
    const profileId = order.customer;

    // Fetch customer credit info
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("credit_used, credit_limit")
      .eq("id", profileId)
      .single();

    if (profileErr) {
      toast({
        title: "Error",
        description: "Failed to load customer credit info.",
        variant: "destructive",
      });
      return;
    }

    const creditUsed = Number(profile.credit_used || 0);
    const creditLimit = Number(profile.credit_limit || 0);
    const availableCredit = creditLimit - creditUsed;
    const total = Number(order.total);

    if (availableCredit < total) {
      toast({
        title: "Credit Limit Exceeded",
        description: `Available credit $${availableCredit} is less than order amount $${total}.`,
        variant: "destructive",
      });
      return;
    }

    // If eligible -> update order
    await approveCreditOrder(
      order,
      Number(order.total),
      Number(order.tax_amount || 0),
      order.customer
    );
  };

  const createInvoice = async (
    order: any,
    totalAmount: number,
    newTax: number
  ) => {
    try {
      console.log(`🧾 Creating invoice for order: ${order.id}`);

      // --------------------------------------------
      //  STEP 1: Fetch centerize invoice number
      // --------------------------------------------
      const year = new Date().getFullYear();

      const { data: inData, error: fetchError } = await supabase
        .from("centerize_data")
        .select("id, invoice_no, invoice_start")
        .order("id", { ascending: false })
        .limit(1);

      if (fetchError) throw new Error(fetchError.message);

      const newInvNo = (inData?.[0]?.invoice_no || 0) + 1;
      const invoiceStart = inData?.[0]?.invoice_start || "INV";

      // Update invoice_no to next
      if (inData?.[0]?.id) {
        const { error: updateError } = await supabase
          .from("centerize_data")
          .update({ invoice_no: newInvNo })
          .eq("id", inData[0].id);

        if (updateError) throw new Error(updateError.message);
      }

      // Create full invoice number
      const invoiceNumber = `${invoiceStart}-${year}${newInvNo
        .toString()
        .padStart(6, "0")}`;

      // --------------------------------------------
      //  STEP 2: Create invoice object
      // --------------------------------------------
      const estimatedDeliveryStr =
        order.shipping?.estimatedDelivery ||
        order.estimated_delivery ||
        new Date().toISOString();
      let estimatedDeliveryDate = new Date(estimatedDeliveryStr);

      if (isNaN(estimatedDeliveryDate.getTime())) {
        console.warn("Invalid estimated delivery date, using today instead");
        estimatedDeliveryDate = new Date();
      }

      const dueDate = new Date(
        estimatedDeliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const invoiceData = {
        invoice_number: invoiceNumber,
        order_id: order.id,
        profile_id: order.customer,
        due_date: dueDate,
        status: "pending",
        amount: totalAmount,
        tax_amount: newTax,
        total_amount: totalAmount,
        payment_status: "paid",
        payment_method: order.payment_method,
        notes: order.notes || null,
        purchase_number_external: order.purchase_number_external,
        items: order.items,
        customer_info: order.customerInfo,
        shipping_info: order.shippingAddress,
        shippin_cost: order.shipping_cost,
        subtotal: totalAmount,
      };

      // Insert invoice
      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoiceData);

      if (invoiceError) throw new Error(invoiceError.message);

      console.log(`✅ Invoice Created Successfully: ${invoiceNumber}`);

      // --------------------------------------------
      // STEP 3: Update order to set invoice_created = true
      // --------------------------------------------
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          invoice_created: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderUpdateError) throw new Error(orderUpdateError.message);

      console.log("🟢 Order updated with invoice_created = true");
    } catch (err: any) {
      console.error("❌ Invoice create error:", err.message);
      throw new Error(err.message);
    }
  };

  const approveCreditOrder = async (
    order: any,
    totalAmount: number,
    newTax: number,
    userId: string
  ) => {
    try {
      // 1️⃣ Confirm via SweetAlert

      // 2️⃣ Update order status to "new" + mark credit_approval_processing -> new
      const { data: updatedOrder, error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          status: "new",
          updated_at: new Date().toISOString(),
          payment_status: "paid",
        })
        .eq("id", order.id)
        .select()
        .single();

      if (orderUpdateError) throw new Error(orderUpdateError.message);

      console.log("✅ Order status updated to NEW:", updatedOrder.id);

      // 3️⃣ Create Invoice using existing order data
      await createInvoice(order, totalAmount, newTax);

      // 4️⃣ Optional: Add entry in account_transactions history
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("credit_used, credit_limit")
        .eq("id", order.customer)
        .single();

      if (profileError) throw new Error(profileError.message);

      const newBalance = (profileData.credit_used || 0) + totalAmount;

      await supabase.from("account_transactions").insert({
        customer_id: order.customer,
        transaction_date: new Date().toISOString(),
        transaction_type: "debit",
        reference_type: "order",
        reference_id: order.id,
        description: "Credit order approved",
        debit_amount: totalAmount,
        credit_amount: 0,
        balance: profileData.credit_limit - newBalance,
        created_by: userId,
      });

      // Update profiles.credit_used
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ credit_used: newBalance })
        .eq("id", order.customer);

      if (profileUpdateError) {
        throw new Error(
          `Failed to update credit used: ${profileUpdateError.message}`
        );
      }

      console.log("🟢 Account transaction added for credit order");

      // Log credit approval activity
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await OrderActivityService.logActivity({
          orderId: order.id,
          activityType: "updated",
          description: `Credit order approved - Amount: $${totalAmount.toFixed(2)}`,
          performedBy: userId,
          performedByName: session?.user?.user_metadata?.first_name || "Admin",
          performedByEmail: session?.user?.email,
          metadata: {
            order_number: order.order_number,
            credit_amount: totalAmount,
            previous_status: "credit_approval_processing",
            new_status: "new",
          },
        });
      } catch (activityError) {
        console.error("Failed to log credit approval activity:", activityError);
      }

      Swal.fire({
        title: "Success",
        text: `Credit order approved and invoice created successfully!`,
        icon: "success",
      });
    } catch (error: any) {
      console.error("❌ Error approving credit order:", error.message);
      Swal.fire({
        title: "Error",
        text: `Failed to approve credit order: ${error.message}`,
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
        onAction={() => window.location.href = "/admin/orders/create"}
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
                      // Calculate correct total: Subtotal + Shipping + Tax - Discount
                      const itemsSubtotal = order.items?.reduce((total, item) => {
                        return total + (item.sizes?.reduce((sum, size) => sum + size.quantity * size.price, 0) || 0)
                      }, 0) || 0
                      const shippingCost = parseFloat(order.shipping_cost || "0")
                      const taxAmount = parseFloat(order.tax_amount?.toString() || "0")
                      const discountAmt = parseFloat((order as any).discount_amount?.toString() || "0")
                      const correctTotal = itemsSubtotal + shippingCost + taxAmount - discountAmt
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

                      {order.status === "credit_approval_processing" && (
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
                      {(order?.payment_status?.toLowerCase() === "unpaid" ||
                        order?.payment_status?.toLowerCase() === "pending") &&
                        order.status !== "credit_approval_processing" &&
                        !order.void && (
                          <button
                            onClick={() => {
                              setSelectCustomerInfo(order);
                              setModalIsOpen(true);
                            }}
                            className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-full font-medium
                              hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
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
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 hover:text-blue-600"
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
