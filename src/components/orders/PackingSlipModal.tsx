import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateWorkOrderPDF } from "@/utils/packing-slip";
import { useToast } from "@/hooks/use-toast";

interface PackingSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: any;
}

export const PackingSlipModal = ({
  open,
  onOpenChange,
  orderData,
}: PackingSlipModalProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [packingData, setPackingData] = useState({
    shipVia: "",
    cartons: "1",
    masterCases: "",
    weight: "",
    shippingClass: "",
    notes: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setPackingData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      
      // Merge packing data with order data
      const completePackingData = {
        ...orderData,
        packingDetails: packingData,
      };
      
      await generateWorkOrderPDF(orderData, completePackingData);
      
      toast({
        title: "Success",
        description: "Packing slip downloaded successfully",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating packing slip:", error);
      toast({
        title: "Error",
        description: "Failed to generate packing slip",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Packing Slip for {orderData?.order_number || "Order"}
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-1 text-sm mt-2">
              <p><span className="font-medium">Order Number:</span> {orderData?.order_number}</p>
              <p><span className="font-medium">Customer:</span> {orderData?.customerInfo?.name}</p>
              <p><span className="font-medium">Company:</span> {orderData?.customerInfo?.company_name || "N/A"}</p>
              <p><span className="font-medium">Total Amount:</span> ${orderData?.total_amount?.toFixed(2)}</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Packing Details Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Packing Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ship Via */}
              <div className="space-y-2">
                <Label htmlFor="shipVia">Ship Via</Label>
                <Input
                  id="shipVia"
                  placeholder="Enter shipping method"
                  value={packingData.shipVia}
                  onChange={(e) => handleInputChange("shipVia", e.target.value)}
                />
              </div>

              {/* Cartons */}
              <div className="space-y-2">
                <Label htmlFor="cartons">Cartons</Label>
                <Input
                  id="cartons"
                  type="number"
                  placeholder="1"
                  value={packingData.cartons}
                  onChange={(e) => handleInputChange("cartons", e.target.value)}
                />
              </div>

              {/* Master Cases */}
              <div className="space-y-2">
                <Label htmlFor="masterCases">Master Cases</Label>
                <Input
                  id="masterCases"
                  placeholder="Number of master cases"
                  value={packingData.masterCases}
                  onChange={(e) => handleInputChange("masterCases", e.target.value)}
                />
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  placeholder="Total weight"
                  value={packingData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                />
              </div>

              {/* Shipping Class */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="shippingClass">Shipping Class</Label>
                <Input
                  id="shippingClass"
                  placeholder="Shipping class"
                  value={packingData.shippingClass}
                  onChange={(e) => handleInputChange("shippingClass", e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any special notes or instructions"
                  value={packingData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Ship To Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Ship To</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">9RX</p>
                <p>{orderData?.shippingAddress?.fullName}</p>
                <p>{orderData?.shippingAddress?.phone}</p>
                <p>{orderData?.shippingAddress?.email}</p>
                <p className="mt-2">
                  {orderData?.shippingAddress?.address?.street}<br />
                  {orderData?.shippingAddress?.address?.city}, {orderData?.shippingAddress?.address?.state} {orderData?.shippingAddress?.address?.zip_code}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Packing Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Packing Slip #:</span> PS-{orderData?.order_number}</p>
                <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-medium">Items:</span> {orderData?.items?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? "Generating..." : "Download Packing Slip"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
