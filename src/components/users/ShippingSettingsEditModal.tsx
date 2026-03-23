import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ShippingSettingsEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  currentSettings: {
    freeShipping?: boolean; // Legacy field
    free_shipping_enabled?: boolean;
    free_shipping_threshold?: number;
    custom_shipping_rate?: number;
    auto_shipping_enabled?: boolean;
    auto_shipping_threshold?: number;
    auto_shipping_amount?: number;
  };
  onSuccess: () => void;
}

export function ShippingSettingsEditModal({
  open,
  onOpenChange,
  profileId,
  currentSettings,
  onSuccess,
}: ShippingSettingsEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    freeShipping: currentSettings.freeShipping || false, // Legacy
    free_shipping_enabled: currentSettings.free_shipping_enabled || false,
    free_shipping_threshold: currentSettings.free_shipping_threshold || 0,
    custom_shipping_rate: currentSettings.custom_shipping_rate || null,
    auto_shipping_enabled: currentSettings.auto_shipping_enabled || false,
    auto_shipping_threshold: currentSettings.auto_shipping_threshold || 0,
    auto_shipping_amount: currentSettings.auto_shipping_amount || 0,
  });

  useEffect(() => {
    setSettings({
      freeShipping: currentSettings.freeShipping || false, // Legacy
      free_shipping_enabled: currentSettings.free_shipping_enabled || false,
      free_shipping_threshold: currentSettings.free_shipping_threshold || 0,
      custom_shipping_rate: currentSettings.custom_shipping_rate || null,
      auto_shipping_enabled: currentSettings.auto_shipping_enabled || false,
      auto_shipping_threshold: currentSettings.auto_shipping_threshold || 0,
      auto_shipping_amount: currentSettings.auto_shipping_amount || 0,
    });
  }, [currentSettings, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          freeShipping: settings.freeShipping, // Legacy field
          free_shipping_enabled: settings.free_shipping_enabled,
          free_shipping_threshold: settings.free_shipping_threshold,
          custom_shipping_rate: settings.custom_shipping_rate,
          auto_shipping_enabled: settings.auto_shipping_enabled,
          auto_shipping_threshold: settings.auto_shipping_threshold,
          auto_shipping_amount: settings.auto_shipping_amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (error) throw error;

      toast.success("Shipping settings updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating shipping settings:", error);
      toast.error(error.message || "Failed to update shipping settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Customer Shipping Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Legacy Free Shipping Section - HIGHEST PRIORITY */}
          <Card className="border-amber-500 bg-amber-50/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold text-amber-900">
                    Legacy Free Shipping (Always Free)
                  </Label>
                  <p className="text-sm text-amber-700">
                    <strong>⚠️ Highest Priority:</strong> When enabled, this overrides ALL other shipping settings below
                  </p>
                </div>
                <Switch
                  checked={settings.freeShipping}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, freeShipping: checked })
                  }
                />
              </div>

              {settings.freeShipping && (
                <div className="bg-amber-100 p-3 rounded-md border border-amber-300">
                  <p className="text-xs text-amber-900 font-medium">
                    ✅ Customer will receive FREE shipping on ALL orders, regardless of amount.
                    All settings below are ignored when this is enabled.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Free Shipping Section */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Free Shipping</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable free shipping for this customer
                  </p>
                </div>
                <Switch
                  checked={settings.free_shipping_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, free_shipping_enabled: checked })
                  }
                />
              </div>

              {settings.free_shipping_enabled && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Label htmlFor="free_shipping_threshold">
                    Free Shipping Threshold ($)
                  </Label>
                  <Input
                    id="free_shipping_threshold"
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.free_shipping_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        free_shipping_threshold: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0 = Always free"
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to 0 for always free shipping, or enter minimum order amount
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Custom Shipping Rate Section */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Custom Shipping Rate</Label>
                <p className="text-sm text-muted-foreground">
                  Set a fixed shipping rate for this customer (overrides global settings)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_shipping_rate">
                  Custom Rate ($)
                </Label>
                <Input
                  id="custom_shipping_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.custom_shipping_rate || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      custom_shipping_rate: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Leave empty to use global settings"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use global shipping settings
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Auto Shipping Section */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Automatic Shipping Charges</Label>
                  <p className="text-sm text-muted-foreground">
                    Charge shipping for orders below a threshold
                  </p>
                </div>
                <Switch
                  checked={settings.auto_shipping_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_shipping_enabled: checked })
                  }
                />
              </div>

              {settings.auto_shipping_enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="auto_shipping_threshold">
                      Threshold Amount ($)
                    </Label>
                    <Input
                      id="auto_shipping_threshold"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.auto_shipping_threshold}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          auto_shipping_threshold: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="150"
                    />
                    <p className="text-xs text-muted-foreground">
                      Orders below this amount will include shipping charges
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auto_shipping_amount">
                      Shipping Charge Amount ($)
                    </Label>
                    <Input
                      id="auto_shipping_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.auto_shipping_amount}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          auto_shipping_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Amount to charge for shipping on qualifying orders
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Priority Order:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Free shipping (if enabled and threshold met)</li>
              <li>Custom shipping rate (if set)</li>
              <li>Auto shipping charges (if enabled and below threshold)</li>
              <li>Global shipping settings (fallback)</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
