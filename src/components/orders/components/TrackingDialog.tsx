import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { OrderFormValues } from "../schemas/orderSchema";
import { fedexService, FedExShipmentResult } from "@/services/fedexService";
import { useToast } from "@/hooks/use-toast";

export interface FedExDialogState {
  labelUrl?: string;
  labelBase64?: string;
  labelFormat?: string;
  serviceType?: string;
  packagingType?: string;
  estimatedDeliveryDate?: string;
  pickupConfirmationNumber?: string;
  pickupScheduledDate?: string;
  trackingStatus?: string;
}

interface TrackingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trackingNumber: string;
  onTrackingNumberChange: (value: string) => void;
  shippingMethod: "FedEx" | "custom";
  onShippingMethodChange: (value: "FedEx" | "custom") => void;
  onSubmit: () => void;
  order?: OrderFormValues;
  onFedExDataChange?: (value: FedExDialogState | null) => void;
}

export const TrackingDialog = ({
  isOpen,
  onOpenChange,
  trackingNumber,
  onTrackingNumberChange,
  shippingMethod,
  onShippingMethodChange,
  onSubmit,
  order,
  onFedExDataChange,
}: TrackingDialogProps) => {
  const { toast } = useToast();
  const [weightValue, setWeightValue] = useState("1");
  const [length, setLength] = useState("12");
  const [width, setWidth] = useState("10");
  const [height, setHeight] = useState("8");
  const [serviceType, setServiceType] = useState("FEDEX_GROUND");
  const [pickupDate, setPickupDate] = useState("");
  const [fedexData, setFedexData] = useState<FedExDialogState | null>(null);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isCheckingTracking, setIsCheckingTracking] = useState(false);
  const [isCheckingPickup, setIsCheckingPickup] = useState(false);
  const [isCreatingPickup, setIsCreatingPickup] = useState(false);
  const [isCancellingPickup, setIsCancellingPickup] = useState(false);

  const recipientSummary = useMemo(() => {
    if (!order) return "Order details unavailable";
    const address = order.shippingAddress?.address || order.customerInfo?.address;
    return [
      order.shippingAddress?.fullName || order.customerInfo?.name,
      address?.street,
      [address?.city, address?.state, address?.zip_code].filter(Boolean).join(", "),
    ]
      .filter(Boolean)
      .join(" • ");
  }, [order]);

  const updateFedExData = (value: FedExDialogState | null) => {
    setFedexData(value);
    onFedExDataChange?.(value);
  };

  const handleGenerateLabel = async () => {
    if (!order) {
      toast({
        title: "Order unavailable",
        description: "FedEx shipment creation needs the full order details.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingLabel(true);
    try {
      const shipment = await fedexService.createShipment(order, {
        weightValue: Number(weightValue) || 1,
        weightUnits: "LB",
        length: Number(length) || 12,
        width: Number(width) || 10,
        height: Number(height) || 8,
        dimensionUnits: "IN",
        serviceType,
      });

      if (!shipment.trackingNumber) {
        throw new Error("FedEx did not return a tracking number");
      }

      onTrackingNumberChange(shipment.trackingNumber);
      updateFedExData({
        labelUrl: shipment.labelUrl,
        labelBase64: shipment.labelBase64,
        labelFormat: shipment.labelFormat,
        serviceType: shipment.serviceType,
        packagingType: shipment.packagingType,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      });

      toast({
        title: "FedEx label created",
        description: `Tracking number ${shipment.trackingNumber} is ready.`,
      });
    } catch (error) {
      toast({
        title: "FedEx label failed",
        description: error instanceof Error ? error.message : "Unable to create shipment label",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handleTrack = async () => {
    if (!trackingNumber.trim()) return;
    setIsCheckingTracking(true);
    try {
      const result = await fedexService.track(trackingNumber);
      updateFedExData({
        ...(fedexData || {}),
        trackingStatus: result.statusDescription || result.status,
        estimatedDeliveryDate: result.estimatedDeliveryDate || fedexData?.estimatedDeliveryDate,
      });
      toast({
        title: "Tracking refreshed",
        description: result.statusDescription || result.status || "Latest FedEx tracking loaded.",
      });
    } catch (error) {
      toast({
        title: "Tracking failed",
        description: error instanceof Error ? error.message : "Unable to refresh tracking",
        variant: "destructive",
      });
    } finally {
      setIsCheckingTracking(false);
    }
  };

  const handlePickupAvailability = async () => {
    if (!trackingNumber.trim()) return;
    setIsCheckingPickup(true);
    try {
      await fedexService.getPickupAvailability(trackingNumber);
      toast({
        title: "Pickup availability loaded",
        description: "FedEx pickup options are available for this shipment.",
      });
    } catch (error) {
      toast({
        title: "Pickup availability failed",
        description: error instanceof Error ? error.message : "Unable to check pickup availability",
        variant: "destructive",
      });
    } finally {
      setIsCheckingPickup(false);
    }
  };

  const handleCreatePickup = async () => {
    if (!trackingNumber.trim()) return;
    setIsCreatingPickup(true);
    try {
      const result = await fedexService.createPickup(trackingNumber, pickupDate || undefined);
      updateFedExData({
        ...(fedexData || {}),
        pickupConfirmationNumber: result.confirmationNumber,
        pickupScheduledDate: result.readyDate || pickupDate || "",
      });
      toast({
        title: "Pickup scheduled",
        description: result.confirmationNumber
          ? `FedEx pickup confirmation: ${result.confirmationNumber}`
          : "FedEx pickup request created.",
      });
    } catch (error) {
      toast({
        title: "Pickup failed",
        description: error instanceof Error ? error.message : "Unable to create pickup request",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPickup(false);
    }
  };

  const handleCancelPickup = async () => {
    if (!fedexData?.pickupConfirmationNumber || !fedexData?.pickupScheduledDate) return;
    setIsCancellingPickup(true);
    try {
      await fedexService.cancelPickup(
        fedexData.pickupConfirmationNumber,
        fedexData.pickupScheduledDate,
      );
      updateFedExData({
        ...(fedexData || {}),
        pickupConfirmationNumber: undefined,
      });
      toast({
        title: "Pickup cancelled",
        description: "FedEx pickup request has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Cancel pickup failed",
        description: error instanceof Error ? error.message : "Unable to cancel pickup",
        variant: "destructive",
      });
    } finally {
      setIsCancellingPickup(false);
    }
  };

  const downloadLabel = () => {
    if (fedexData?.labelUrl) {
      window.open(fedexData.labelUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (fedexData?.labelBase64) {
      const binary = window.atob(fedexData.labelBase64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Shipping & Tracking</DialogTitle>
          <DialogDescription>
            Use manual tracking or generate a FedEx shipment label directly from this order.
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

          {shippingMethod === "FedEx" && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label>Recipient</Label>
                <p className="text-sm text-muted-foreground">{recipientSummary}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>Service Type</Label>
                  <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="FEDEX_GROUND" />
                </div>
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <Input value={weightValue} onChange={(e) => setWeightValue(e.target.value)} type="number" min="0.1" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label>Length</Label>
                  <Input value={length} onChange={(e) => setLength(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Width</Label>
                  <Input value={width} onChange={(e) => setWidth(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Height</Label>
                  <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" min="1" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleGenerateLabel} disabled={isGeneratingLabel}>
                  {isGeneratingLabel ? "Generating..." : "Generate FedEx Label"}
                </Button>
                <Button type="button" variant="outline" onClick={handleTrack} disabled={!trackingNumber || isCheckingTracking}>
                  {isCheckingTracking ? "Refreshing..." : "Refresh Tracking"}
                </Button>
                <Button type="button" variant="outline" onClick={handlePickupAvailability} disabled={!trackingNumber || isCheckingPickup}>
                  {isCheckingPickup ? "Checking..." : "Check Pickup"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <div className="space-y-2">
                  <Label>Pickup Date</Label>
                  <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                </div>
                <Button type="button" variant="outline" onClick={handleCreatePickup} disabled={!trackingNumber || isCreatingPickup}>
                  {isCreatingPickup ? "Scheduling..." : "Schedule Pickup"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelPickup}
                  disabled={!fedexData?.pickupConfirmationNumber || isCancellingPickup}
                >
                  {isCancellingPickup ? "Cancelling..." : "Cancel Pickup"}
                </Button>
              </div>

              {(fedexData?.labelUrl || fedexData?.labelBase64 || fedexData?.trackingStatus || fedexData?.pickupConfirmationNumber) && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-2">
                  {fedexData?.trackingStatus && <p><span className="font-medium">Tracking Status:</span> {fedexData.trackingStatus}</p>}
                  {fedexData?.estimatedDeliveryDate && <p><span className="font-medium">Estimated Delivery:</span> {fedexData.estimatedDeliveryDate}</p>}
                  {fedexData?.pickupConfirmationNumber && (
                    <p><span className="font-medium">Pickup Confirmation:</span> {fedexData.pickupConfirmationNumber}</p>
                  )}
                  {(fedexData?.labelUrl || fedexData?.labelBase64) && (
                    <Button type="button" variant="secondary" onClick={downloadLabel}>
                      Open Label
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => onTrackingNumberChange(e.target.value)}
              placeholder={shippingMethod === "FedEx" ? "Generate a label or enter tracking number" : "Enter tracking number"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            Save Shipping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
