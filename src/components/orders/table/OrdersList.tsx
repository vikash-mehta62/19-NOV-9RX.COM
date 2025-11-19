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
import { ExternalLink, LoaderCircle, MoreHorizontal } from "lucide-react"; // Import MoreHorizontal for the three dots
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
  onCancelOrder?: (orderId: string, reason: string) => Promise<void>; // New prop for cancel function

  isLoading?: boolean;
  poIs?: boolean;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  selectedOrders?: string[];
  onOrderSelect?: (orderId: string) => void;
  setOrderStatus?: (status: string) => void;
}

export function OrdersList({
  orders,
  onOrderClick,
  selectedOrder,
  isEditing,
  setIsEditing,
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
        profile_id: newOrder.profile_id,
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
        .eq("id", newOrder.profile_id)
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

      window.location.reload();
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
      window.location.reload();
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
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No orders found</div>
    );
  }

  console.log(orders);
  return (
    <Table className=" border-gray-300">
      <TableHeader className="bg-gray-100">
        <TableRow>
          {userRole === "admin" && onOrderSelect && (
            <TableHead className="w-[50px] text-center  border-gray-300">
              <span className="sr-only">Select</span>
            </TableHead>
          )}
          {poIs && <TableHead className="font-semibold text-center border-gray-300">
            Order Number
          </TableHead>}
           <TableHead className="font-semibold text-center border-gray-300">
            Notes
          </TableHead>
          <TableHead className="font-semibold text-center border-gray-300">
            {poIs ? "Vendor" : "Customer"} Name
          </TableHead>

         
          <TableHead className="font-semibold text-center border-gray-300">
            Order Date
          </TableHead>
          <TableHead className="font-semibold text-center border-gray-300">
            Total
          </TableHead>
          {!poIs && (
            <>
              <TableHead className="font-semibold text-center border-gray-300">
                Status
              </TableHead>
              <TableHead className="font-semibold text-center border-gray-300">
                Tracking
              </TableHead>
              {userRole === "admin" && (
                <TableHead className="font-semibold text-center border-gray-300">
                  Actions
                </TableHead>
              )}
            </>
          )}
          {false && poIs && (
            <TableHead className="font-semibold text-center border-gray-300">
              Actions
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const orderId = order.id || "";
          return (
            <TableRow key={orderId} className="cursor-pointer hover:bg-gray-50">
              {userRole === "admin" && onOrderSelect && (
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="text-center border-gray-300"
                >
                  <Checkbox
                    checked={selectedOrders.includes(orderId)}
                    onCheckedChange={() => {
                      onOrderSelect(orderId);
                    }}
                  />
                </TableCell>
              )}

              {
                poIs && <TableCell className="text-center border-gray-300" onClick={async () => {
                  onOrderClick(order);
                  await clearCart();
                }}>
                  {order.order_number}
                </TableCell>
              }


              {
                poIs && <TableCell className="text-center border-gray-300" onClick={async () => {
                  onOrderClick(order);
                  await clearCart();
                }}>
                  {order.specialInstructions}
                </TableCell>
              }

              <TableCell
                onClick={async () => {
                  onOrderClick(order);
                  await clearCart();
                }}
                className="font-medium text-center border-gray-300 cursor-pointer hover:bg-gray-50 transition"
              >
                <div className="flex flex-col items-center justify-center">
                  <span className="text-base font-semibold text-gray-800">
                    {order.customerInfo?.name || "N/A"}
                  </span>

                  {order.void && (
                    <div className="mt-1 flex items-center gap-1 text-red-600 text-xs font-medium bg-red-100 px-2 py-1 rounded-full">
                      <Ban size={14} className="stroke-[2.5]" />
                      Voided
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell className="text-center border-gray-300">
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
                    <>
                      {formattedDate} <br />
                      {formattedTime}
                    </>
                  );
                })()}
              </TableCell>
              <TableCell className="text-center border-gray-300">
                {formatTotal(parseFloat(order.total ?? "0") - (order.tax_amount ?? 0))}
                {order.tax_amount > 0 && (
                  <> + {formatTotal(order.tax_amount)}</>
                )}
              </TableCell>

              {!poIs && (
                <>
                  <TableCell className="text-center border-gray-300">
                    <Badge
                      variant="secondary"
                      className={getStatusColor(order.status || "")}
                    >
                      {order.status.toUpperCase() || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center border-gray-300">
                    {order.shipping?.trackingNumber &&
                      order?.shipping.method !== "custom" ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto font-normal"
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
                      <Button variant="secondary" className="p-0 h-auto font-normal">
                        Manually
                      </Button>
                    )}
                  </TableCell>
                  {userRole === "admin" && (
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="text-center border-gray-300"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.status !== "cancelled" && <DropdownMenuItem
                            onClick={() => handleCancelOrderClick(order.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            Cancel Order
                          </DropdownMenuItem>}
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
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
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
  );
}