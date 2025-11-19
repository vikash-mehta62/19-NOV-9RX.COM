import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { OrderFormValues } from "../../schemas/orderSchema";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { TrackingDialog } from "../../components/TrackingDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";

interface OrderShipActionProps {
  order: OrderFormValues;
  onShipOrder?: (orderId: string) => void;
}

export const OrderShipAction = ({
  order,
  onShipOrder,
}: OrderShipActionProps) => {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"FedEx" | "custom">(
    "FedEx"
  );
  const { cartItems, clearCart } = useCart();

  const totalShippingCost = cartItems.reduce(
    (total, item) => total + (item.shipping_cost || 0),
    0
  );
  const handleShipConfirm = () => {
    setShowConfirmDialog(false);
    setShowTrackingDialog(true);
  };

  const handleTrackingSubmit = async () => {
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
      console.log("Submitting tracking information:", {
        orderId: order.id,
        trackingNumber,
        shippingMethod,
      });

      // Get fresh orders from localStorage
      const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
      const updatedOrders = savedOrders.map((o: OrderFormValues) => {
        if (o.id === order.id) {
          return {
            ...o,
            shipping: {
              ...(o.shipping || {}),
              method: shippingMethod,
              trackingNumber,
              cost: shippingMethod === "FedEx" ? totalShippingCost : 0,
            },
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
        
        const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({
          tracking_number: trackingNumber,
          shipping_method: shippingMethod,
          
        })
        .eq("id", order.id)
        .select("*") // Returns the updated order
        .single(); // Ensures only one order is fetched
        
              if (error) throw error;
          
              // Log the updated order
              console.log("Updated Order:", updatedOrder);
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
        onSubmit={handleTrackingSubmit}
      />
    </>
  );
};
