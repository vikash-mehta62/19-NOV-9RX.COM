import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, AlertCircle } from "lucide-react";

interface ShippingOverrideSectionProps {
  subtotal: number;
  currentShipping: number;
  autoChargeEnabled: boolean;
  autoChargeThreshold: number;
  autoChargeAmount: number;
  onShippingChange: (shipping: number, reason: string) => void;
}

export const ShippingOverrideSection = ({
  subtotal,
  currentShipping,
  autoChargeEnabled,
  autoChargeThreshold,
  autoChargeAmount,
  onShippingChange,
}: ShippingOverrideSectionProps) => {
  const [isOverridden, setIsOverridden] = useState(false);
  const [customShipping, setCustomShipping] = useState(currentShipping);
  const [overrideReason, setOverrideReason] = useState("");

  // Check if auto charge should apply
  const shouldAutoCharge = autoChargeEnabled && subtotal < autoChargeThreshold && subtotal > 0;
  const recommendedShipping = shouldAutoCharge ? autoChargeAmount : currentShipping;
  const userType = sessionStorage.getItem('userType')?.toLowerCase() || localStorage.getItem("userType")?.toLowerCase();

  useEffect(() => {
    // Reset override when subtotal changes
    if (!isOverridden) {
      setCustomShipping(recommendedShipping);
    }
  }, [recommendedShipping, isOverridden]);

  const handleOverrideToggle = (checked: boolean) => {
    setIsOverridden(checked);
    if (!checked) {
      // Reset to recommended shipping
      setCustomShipping(recommendedShipping);
      setOverrideReason("");
      onShippingChange(recommendedShipping, "");
    }
  };

  const handleShippingChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomShipping(numValue);
    if (isOverridden) {
      onShippingChange(numValue, overrideReason);
    }
  };

  const handleReasonChange = (value: string) => {
    setOverrideReason(value);
    if (isOverridden) {
      onShippingChange(customShipping, value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto Charge Info */}
      {userType === "admin" && shouldAutoCharge && (
        <>
          <Alert className="border-blue-200 bg-blue-50">
            <Truck className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              Automatic shipping charge of ${autoChargeAmount.toFixed(2)} applies to orders below ${autoChargeThreshold.toFixed(2)}
            </AlertDescription>
          </Alert>


          {/* Override Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Override Shipping Charge</Label>
              <p className="text-sm text-muted-foreground">
                Manually set a different shipping amount
              </p>
            </div>
            <Switch
              checked={isOverridden}
              onCheckedChange={handleOverrideToggle}
            />
          </div>
        </>
      )}

      {/* Override Fields */}
      {userType === "admin" && isOverridden && (
        <div className="space-y-4 animate-slide-up">
          <div className="space-y-2">
            <Label htmlFor="custom-shipping">Custom Shipping Amount ($)</Label>
            <Input
              id="custom-shipping"
              type="number"
              step="0.01"
              min="0"
              value={customShipping}
              onChange={(e) => handleShippingChange(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: ${recommendedShipping.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-reason">
              Reason for Override <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="override-reason"
              value={overrideReason}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder="Enter reason for overriding shipping charges..."
              rows={3}
              className="resize-none"
            />
            {userType === "admin" && isOverridden && !overrideReason && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Please provide a reason for overriding the shipping charge
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Current Shipping Display */}
      {userType === "admin" && (
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Current Shipping:</span>
            <span className="text-lg font-bold text-gray-900">
              ${(isOverridden ? customShipping : recommendedShipping).toFixed(2)}
            </span>
          </div>
          {isOverridden && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Shipping charge has been manually overridden
            </p>
          )}
        </div>
      )}
    </div>
  );
};
