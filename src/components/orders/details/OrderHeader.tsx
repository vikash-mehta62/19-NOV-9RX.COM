import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Copy, Edit, Download, Trash2, Package, Mail, Printer, Truck, CreditCard, Ban } from "lucide-react";
import { OrderFormValues } from "../schemas/orderSchema";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "../table/actions/ConfirmationDialog";
import { FedExDialogState, TrackingDialog } from "../components/TrackingDialog";
import { supabase } from "@/integrations/supabase/client";
import { OrderActivityService } from "@/services/orderActivityService";

interface OrderHeaderProps {
  order: OrderFormValues;
  onEdit?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onSendEmail?: () => void;
  onShipOrder?: () => void;
  onPrint?: () => void;
  isGeneratingPDF?: boolean;
  isSendingEmail?: boolean;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  poIs?: boolean;
  hideFinancialData?: boolean;
}

const statusConfig = {
  pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Pending" },
  confirmed: { color: "bg-blue-100 text-blue-800 border-blue-300", label: "Confirmed" },
  processing: { color: "bg-purple-100 text-purple-800 border-purple-300", label: "Processing" },
  shipped: { color: "bg-indigo-100 text-indigo-800 border-indigo-300", label: "Shipped" },
  delivered: { color: "bg-green-100 text-green-800 border-green-300", label: "Delivered" },
  cancelled: { color: "bg-red-100 text-red-800 border-red-300", label: "Cancelled" },
  refunded: { color: "bg-gray-100 text-gray-800 border-gray-300", label: "Refunded" },
};

export const OrderHeader = ({
  order,
  onEdit,
  onDownload,
  onDelete,
  onSendEmail,
  onShipOrder,
  onPrint,
  isGeneratingPDF,
  isSendingEmail,
  userRole,
  poIs,
  hideFinancialData = false,
}: OrderHeaderProps) => {
  const { toast } = useToast();
  const [showShipConfirmDialog, setShowShipConfirmDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"FedEx" | "custom">("FedEx");
  const [fedexData, setFedexData] = useState<FedExDialogState | null>(null);
  const [isShipping, setIsShipping] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Order number copied to clipboard",
      duration: 2000,
    });
  };

  const handleShipConfirm = () => {
    setShowShipConfirmDialog(false);
    setShowTrackingDialog(true);
  };

  const handleTrackingSubmit = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    setIsShipping(true);
    try {
      // Get old status before update
      const { data: oldOrder } = await supabase
        .from("orders")
        .select("status, order_number")
        .eq("id", order.id)
        .single();

      const oldStatus = oldOrder?.status || "unknown";
      const orderNumber = oldOrder?.order_number || "N/A";

      // Update order in database with tracking info
      const { error } = await supabase
        .from("orders")
        .update({
          tracking_number: trackingNumber,
          shipping_method: shippingMethod,
          estimated_delivery: fedexData?.estimatedDeliveryDate || null,
          shipping: {
            ...(((order as any).shipping as Record<string, any> | null) || {}),
            method: shippingMethod,
            trackingNumber,
            labelUrl: fedexData?.labelUrl,
            labelFormat: fedexData?.labelFormat,
            serviceType: fedexData?.serviceType,
            packagingType: fedexData?.packagingType,
            pickupConfirmationNumber: fedexData?.pickupConfirmationNumber,
            estimatedDelivery: fedexData?.estimatedDeliveryDate,
          } as any,
          status: "shipped"
        })
        .eq("id", order.id);

      if (error) throw error;

      // Log status change activity (only if status actually changed)
      if (oldStatus !== "shipped") {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await OrderActivityService.logStatusChange({
            orderId: order.id,
            orderNumber: orderNumber,
            oldStatus: oldStatus,
            newStatus: "shipped",
            performedBy: session?.user?.id,
            performedByName: session?.user?.user_metadata?.first_name || "Admin",
            performedByEmail: session?.user?.email,
          });
        } catch (activityError) {
          console.error("Failed to log status change activity:", activityError);
        }
      }

      // Call the onShipOrder callback to trigger email and refresh
      if (onShipOrder) {
        onShipOrder();
      }

      setShowTrackingDialog(false);
      setTrackingNumber("");
      
      toast({
        title: "Success",
        description: `Order shipped with tracking number: ${trackingNumber}`,
      });
    } catch (error) {
      console.error("Error shipping order:", error);
      toast({
        title: "Error",
        description: "Failed to ship order",
        variant: "destructive",
      });
    } finally {
      setIsShipping(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  const status = statusConfig[order.status] || statusConfig.pending;
  const orderDate = order.date || (order as any).created_at;
  const orderAny = order as any;
  const totalAmount = Number(orderAny.total_amount ?? order.total ?? 0);
  const rawPaidAmount = Number(orderAny.paid_amount ?? 0);
  const paidAmount =
    rawPaidAmount === 0 && String(order.payment_status || "").toLowerCase() === "paid"
      ? totalAmount
      : rawPaidAmount;
  const rawBalanceDue = totalAmount - paidAmount;
  const balanceDue = Math.abs(rawBalanceDue) < 0.01 ? 0 : Math.max(0, rawBalanceDue);
  const storedPaymentStatus = String(order.payment_status || "").toLowerCase();
  const normalizedPaymentStatus =
    balanceDue === 0
      ? "paid"
      : storedPaymentStatus === "partial_paid" || paidAmount > 0
        ? "partial_paid"
        : storedPaymentStatus === "pending"
          ? "pending"
          : "unpaid";

  return (
    <Card className="p-4 md:p-6 mb-4 md:mb-6 border-2">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Left Section */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Package className="w-5 h-5 text-primary" />
            {/* Show Invoice number if exists, otherwise Sales Order or Purchase Order */}
            {(order as any).invoice_number && order.status !== "new" && order.status !== "pending" && !poIs ? (
              <>
                <div className="flex flex-col">
                  <h2 className="text-xl md:text-2xl font-bold">INV #{(order as any).invoice_number}</h2>
                  <span className="text-xs text-muted-foreground">SO Ref: {order.order_number}</span>
                </div>
              </>
            ) : (
              <h2 className="text-xl md:text-2xl font-bold">
                {poIs ? `#${order.order_number}` : `SO #${order.order_number}`}
              </h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard((order as any).invoice_number || order.order_number)}
              className="h-8 w-8 p-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(orderDate)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTime(orderDate)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* VOID Badge - Prominent Display */}
            {order.void && (
              <Badge className="bg-red-600 text-white border-red-700 border-2 px-4 py-1.5 text-sm font-bold animate-pulse">
                <Ban className="w-4 h-4 mr-1" />
                VOID
              </Badge>
            )}

            <Badge className={`${status.color} border px-3 py-1 text-xs md:text-sm font-semibold`}>
              {status.label}
            </Badge>

            {order.payment_status && (
              <Badge
                className={`${
                  normalizedPaymentStatus === "paid"
                    ? "bg-green-100 text-green-800 border-green-300"
                    : normalizedPaymentStatus === "partial_paid"
                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                      : "bg-red-100 text-red-800 border-red-300"
                } border px-3 py-1 text-xs md:text-sm font-semibold`}
              >
                {normalizedPaymentStatus === "paid"
                  ? "Paid"
                  : normalizedPaymentStatus === "partial_paid"
                    ? "Partial Paid"
                    : normalizedPaymentStatus === "pending"
                      ? "Pending"
                      : "Unpaid"}
              </Badge>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col md:items-end gap-3">
          {!hideFinancialData && (
            <div className="text-2xl md:text-3xl font-bold text-primary">
              ${parseFloat(order.total || "0").toFixed(2)}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {/* {userRole === "admin" && order.status !== "cancelled" && !order.void && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )} */}

            {onDownload && !hideFinancialData && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                disabled={isGeneratingPDF}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isGeneratingPDF ? "Generating..." : "PDF"}
                </span>
              </Button>
            )}

            {userRole === "admin" && onDelete && !order.void && !(order as any).deleted_at && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={async () => {
                  // Import Swal dynamically if not already imported
                  const Swal = (await import('sweetalert2')).default;
                  
                  const result = await Swal.fire({
                    title: 'Delete Order?',
                    html: `
                      <div class="text-left space-y-2">
                        <p class="text-gray-700">Are you sure you want to delete this order?</p>
                        <p class="text-sm text-gray-600">Order: <strong>${order.order_number}</strong></p>
                        <p class="text-red-600 font-semibold mt-4">⚠️ This action cannot be undone!</p>
                      </div>
                    `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, Delete',
                    cancelButtonText: 'Cancel',
                    customClass: {
                      popup: 'rounded-xl shadow-lg',
                    },
                    backdrop: true,
                    allowOutsideClick: false,
                  });

                  if (result.isConfirmed) {
                    onDelete();
                  }
                }} 
                className="gap-1"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      {userRole === "admin" && !order.void && order.status !== "cancelled" && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {normalizedPaymentStatus !== "paid" && onSendEmail && !poIs && !hideFinancialData && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSendEmail}
                disabled={isSendingEmail}
                className="gap-2 hover:bg-blue-50 hover:border-blue-300"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="text-xs md:text-sm">{isSendingEmail ? "Sending..." : "Email"}</span>
              </Button>
            )}

            {onPrint && !hideFinancialData && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                className="gap-2 hover:bg-gray-50 hover:border-gray-400"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span className="text-xs md:text-sm">Print</span>
              </Button>
            )}

            {onShipOrder && order.status !== "shipped" && order.status !== "delivered" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShipConfirmDialog(true)}
                className="gap-2 hover:bg-indigo-50 hover:border-indigo-300"
              >
                <Truck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs md:text-sm">Ship</span>
              </Button>
            )}

            {normalizedPaymentStatus !== "paid" && !poIs && !hideFinancialData && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSendEmail}
                disabled={isSendingEmail}
                className="gap-2 hover:bg-green-50 hover:border-green-300"
              >
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="text-xs md:text-sm">Send Payment Link</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Ship Order Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showShipConfirmDialog}
        onOpenChange={setShowShipConfirmDialog}
        title="Ship Order"
        description="Are you sure you want to mark this order as shipped? You'll be able to add tracking information next."
        onConfirm={handleShipConfirm}
      />

      {/* Tracking Information Dialog */}
      <TrackingDialog
        isOpen={showTrackingDialog}
        onOpenChange={setShowTrackingDialog}
        trackingNumber={trackingNumber}
        onTrackingNumberChange={setTrackingNumber}
        shippingMethod={shippingMethod}
        onShippingMethodChange={setShippingMethod}
        order={order}
        onFedExDataChange={setFedexData}
        onSubmit={handleTrackingSubmit}
      />
    </Card>
  );
};
