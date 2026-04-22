import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { OrderFormValues } from "../../schemas/orderSchema";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { FedExDialogState, TrackingDialog, TrackingDialogSubmitPayload } from "../../components/TrackingDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OrderActivityService } from "@/services/orderActivityService";
import { uploadShippingLabelToStorage } from "../../utils/shippingLabelDocuments";

interface OrderShipActionProps {
  order: OrderFormValues;
  onShipOrder?: (orderId: string) => void;
  onOrderUpdate?: (updates: Record<string, any>) => void;
}

export const OrderShipAction = ({
  order,
  onShipOrder,
  onOrderUpdate,
}: OrderShipActionProps) => {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"FedEx" | "custom">(
    "FedEx"
  );
  const [fedexData, setFedexData] = useState<FedExDialogState | null>(null);
  const compactObject = <T extends Record<string, any>>(value: T): T =>
    Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;

  const handleShipConfirm = () => {
    setShowConfirmDialog(false);
    setShowTrackingDialog(true);
  };

  const handleTrackingSubmit = async ({ recipient }: TrackingDialogSubmitPayload) => {
    console.log("tracing")
    
    if (!trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    try {
      const shippingCost =
        shippingMethod === "FedEx"
          ? Number(fedexData?.quotedAmount ?? (order as any)?.shipping_cost ?? (order as any)?.shipping?.cost ?? 0)
          : 0;
      const storedLabel =
        shippingMethod === "FedEx" && fedexData?.labelBase64 && order.id
          ? await uploadShippingLabelToStorage({
              orderId: order.id,
              orderNumber: order.order_number,
              labelBase64: fedexData.labelBase64,
              labelFormat: fedexData.labelFormat,
              previousStoragePath: order.shipping?.labelStoragePath,
            })
          : null;
      const existingShippingAddress =
        (((order as any)?.shippingAddress || {}) as Record<string, any>) || {};
      const existingShippingFields =
        ((existingShippingAddress.shipping || {}) as Record<string, any>) || {};
      const updatedShippingAddress = recipient
        ? compactObject({
            ...existingShippingAddress,
            fullName: recipient.name,
            email: recipient.email || "",
            phone: recipient.phone,
            address: {
              street: recipient.street,
              city: recipient.city,
              state: recipient.state,
              zip_code: recipient.zip_code,
            },
            shipping: compactObject({
              ...existingShippingFields,
              street1: recipient.street,
              city: recipient.city,
              state: recipient.state,
              zipCode: recipient.zip_code,
              phone: recipient.phone,
            }),
          })
        : order.shippingAddress;
      const updatedShipping = compactObject({
        ...((order.shipping || {}) as Record<string, any>),
        method: shippingMethod,
        trackingNumber,
        cost: shippingCost,
        weight: fedexData?.weight || order.shipping?.weight,
        weightUnits: fedexData?.weightUnits || order.shipping?.weightUnits || "LB",
        labelUrl: storedLabel ? undefined : fedexData?.labelUrl || order.shipping?.labelUrl,
        labelStoragePath: storedLabel?.storagePath || fedexData?.labelStoragePath || order.shipping?.labelStoragePath,
        labelFileName: storedLabel?.fileName || fedexData?.labelFileName || order.shipping?.labelFileName,
        labelFormat: fedexData?.labelFormat || order.shipping?.labelFormat,
        labelStockType: fedexData?.labelStockType || order.shipping?.labelStockType,
        serviceType: fedexData?.serviceType || order.shipping?.serviceType,
        packagingType: fedexData?.packagingType || order.shipping?.packagingType,
        pickupConfirmationNumber:
          fedexData?.pickupConfirmationNumber || order.shipping?.pickupConfirmationNumber,
        pickupScheduledDate:
          fedexData?.pickupScheduledDate || order.shipping?.pickupScheduledDate,
        trackingStatus: fedexData?.trackingStatus || order.shipping?.trackingStatus,
        estimatedDelivery: fedexData?.estimatedDeliveryDate || order.shipping?.estimatedDelivery,
        quotedAmount:
          typeof fedexData?.quotedAmount === "number"
            ? fedexData.quotedAmount
            : order.shipping?.quotedAmount,
        quotedCurrency: fedexData?.quotedCurrency || order.shipping?.quotedCurrency,
      });

      console.log("Submitting tracking information:", {
        orderId: order.id,
        trackingNumber,
        shippingMethod,
        shippingCost,
      });

      // Get fresh orders from localStorage
      const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
      const updatedOrders = savedOrders.map((o: OrderFormValues) => {
        if (o.id === order.id) {
          return {
            ...o,
            shippingAddress: recipient
              ? updatedShippingAddress
              : o.shippingAddress,
            shipping: updatedShipping,
            status: "shipped",
          };
        }
        return o;
      });

      console.log("Saving updated orders:", updatedOrders);
      localStorage.setItem("orders", JSON.stringify(updatedOrders));

      // Then call the onShipOrder callback
      if (onShipOrder && order.id) {

        console.log("Calling onShipOrder callback");
        
        // Get old status before update
        const { data: oldOrder } = await supabase
          .from("orders")
          .select("status, order_number")
          .eq("id", order.id)
          .single();

        const oldStatus = oldOrder?.status || "unknown";
        const orderNumber = oldOrder?.order_number || "N/A";
        
        const orderShippingUpdate = {
          shipping: updatedShipping,
          shippingAddress: updatedShippingAddress,
          tracking_number: trackingNumber,
          shipping_method: shippingMethod,
          // shipping_cost: shippingCost,  // Don't update - FedEx charge only in shipping JSON
          estimated_delivery: updatedShipping.estimatedDelivery || null,
          status: "shipped",
        };

        const { data: updatedOrder, error } = await supabase
          .from("orders")
          .update(orderShippingUpdate)
          .eq("id", order.id)
          .select("*")
          .single();
        
        if (error) throw error;

        onOrderUpdate?.({
          ...orderShippingUpdate,
          shipping: updatedShipping,
          shippingAddress: updatedShippingAddress,
        });
    
        // Log the updated order
        console.log("Updated Order:", updatedOrder);

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

        // Note: Reward points are now awarded when order is created, not when shipped
        // This prevents double-awarding of points

        onShipOrder(order.id);
      }

      setShowTrackingDialog(false);

      toast({
        title: "Success",
        description: `Order shipped with tracking number: ${trackingNumber}`,
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order shipping information",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Send className="w-4 h-4" />
        Ship Order
      </Button>

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Ship Order"
        description="Are you sure you want to mark this order as shipped? You'll be able to add tracking information next."
        onConfirm={handleShipConfirm}
      />

      <TrackingDialog
        isOpen={showTrackingDialog}
        onOpenChange={setShowTrackingDialog}
        trackingNumber={trackingNumber}
        onTrackingNumberChange={setTrackingNumber}
        shippingMethod={shippingMethod}
        onShippingMethodChange={setShippingMethod}
        order={order}
        onFedExDataChange={setFedexData}
        onOrderUpdate={onOrderUpdate}
        onSubmit={handleTrackingSubmit}
      />
    </>
  );
};
