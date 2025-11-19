import { Button } from "@/components/ui/button";
import { PackageCheck, Loader2 } from "lucide-react";
import { OrderFormValues } from "../../schemas/orderSchema";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface OrderProcessActionProps {
  order: OrderFormValues;
  onProcessOrder?: (orderId: string) => void;
}

export const OrderProcessAction = ({ order, onProcessOrder }: OrderProcessActionProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcess = async () => {
    if (!order.id) {
      console.error("Cannot process order - missing order ID");
      toast({
        title: "Error",
        description: "Cannot process order - invalid order ID",
        variant: "destructive",
      });
      return;
    }

    if (!onProcessOrder) {
      console.error("Order processing callback not provided");
      toast({
        title: "System Error",
        description: "Order processing is not available at this time",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    // console.log("Starting order processing:", order.id);

    try {
      await onProcessOrder(order.id);
      
      setShowConfirmDialog(false);
      toast({
        title: "Success",
        description: `Order ${order.id} has been moved to processing`,
      });
      
      // console.log("Order processing completed successfully:", order.id);
    } catch (error) {
      console.error("Failed to process order:", order.id, error);
      toast({
        title: "Processing Failed",
        description: "There was an error processing this order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        disabled={isProcessing || order.status === 'processing'}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <PackageCheck className="h-4 w-4" />
            {order.status === 'processing' ? 'Processing' : 'Start Processing'}
          </>
        )}
      </Button>

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Start Processing Order"
        description="Are you sure you want to start processing this order? This will update the order status to 'processing'."
        onConfirm={handleProcess}
        isLoading={isProcessing}
      />
    </>
  );
};