import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface TrackingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trackingNumber: string;
  onTrackingNumberChange: (value: string) => void;
  shippingMethod: "FedEx" | "custom";
  onShippingMethodChange: (value: "FedEx" | "custom") => void;
  onSubmit: () => void;
}

export const TrackingDialog = ({
  isOpen,
  onOpenChange,
  trackingNumber,
  onTrackingNumberChange,
  shippingMethod,
  onShippingMethodChange,
  onSubmit
}: TrackingDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tracking Information</DialogTitle>
          <DialogDescription>
            Enter shipping method and tracking details for this order
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Shipping Method</Label>
            <RadioGroup value={shippingMethod} onValueChange={onShippingMethodChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FedEx" id="fedex" />
                <Label htmlFor="fedex">FedEx</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Self Ship</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => onTrackingNumberChange(e.target.value)}
              placeholder="Enter tracking number"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            Submit Tracking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};