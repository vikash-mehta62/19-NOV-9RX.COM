import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Clock, CirclePlus } from "lucide-react";
import { OrderFormValues } from "../../schemas/orderSchema";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { TrackingDialog } from "../../components/TrackingDialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";

interface OrderConfirmActionProps {
  order: OrderFormValues;
  onConfirmOrder?: (orderId: string) => void;
}

export const OrderConfirmAction = ({ order, onConfirmOrder }: OrderConfirmActionProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"FedEx" | "custom">("FedEx");
  const [currentStatus, setCurrentStatus] = useState(order.status || 'new');
  const { toast } = useToast();

  useEffect(() => {
    setCurrentStatus(order.status || 'new');
  }, [order.status]);

  const handleConfirm = async () => {
    if (!order.id) {
      toast({
        title: "Error",
        description: "Order ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      setCurrentStatus('processing');
      
      toast({
        title: "Success",
        description: "Order has been confirmed and moved to pending status",
      });

      if (onConfirmOrder) {
        await onConfirmOrder(order.id);
      }

      setShowConfirmDialog(false);
      // setShowTrackingDialog(true);
    } catch (error) {
      console.error('Error confirming order:', error);
      toast({
        title: "Error",
        description: "Failed to confirm order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackingSubmit = async () => {
    if (!order.id || !trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          shipping_method: shippingMethod,
          tracking_number: trackingNumber,
          status: 'shipped',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      setCurrentStatus('shipped');
      setShowTrackingDialog(false);
      
      toast({
        title: "Success",
        description: "Shipping details added successfully",
      });

      if (onConfirmOrder) {
        await onConfirmOrder(order.id);
      }
    } catch (error) {
      console.error('Error updating shipping details:', error);
      toast({
        title: "Error",
        description: "Failed to update shipping details",
        variant: "destructive",
      });
    }
  };

  const getButtonConfig = () => {
    const status = currentStatus.toLowerCase();
 
    const configs = {
      new: {
        icon: CirclePlus,
        text: "Confirm Order",
        className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800",
        onClick: () => setShowConfirmDialog(true),
        disabled: false
      },
      pending: {
        icon: Clock,
        text: "Add Shipping Details",
        className: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:text-yellow-800",
        onClick: () => setShowTrackingDialog(true),
        disabled: false
      },
      processing: {
        icon: Package,
        text: "Process Shipping",
        className: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800",
        onClick: () => setShowTrackingDialog(true),
        disabled: false
      },
      shipped: {
        icon: CheckCircle,
        text: "Order Shipped",
        className: "bg-green-50 text-green-700 border-green-200",
        onClick: () => {},
        disabled: true
      }
    };

    return configs[status as keyof typeof configs] || configs.new;
  };

  const buttonConfig = getButtonConfig();
  const IconComponent = buttonConfig.icon;

  return (
    <>
      <Button
        onClick={buttonConfig.onClick}
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 ${buttonConfig.className}`}
        disabled={buttonConfig.disabled}
      >
        <IconComponent className="w-4 h-4" />
        {buttonConfig.text}
      </Button>

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirm Order"
        description="Are you sure you want to confirm this order? This will update the order status to 'pending'."
        onConfirm={handleConfirm}
        isLoading={isLoading}
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