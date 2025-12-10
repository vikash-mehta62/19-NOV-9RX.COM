import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { Loader2 } from "lucide-react";

interface QuickEditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onSaved: () => void;
}

export function QuickEditGroupDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  onSaved,
}: QuickEditGroupDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState({
    commissionRate: 0,
    canManagePricing: false,
    bypassMinPrice: false,
    autoCommission: false,
  });

  useEffect(() => {
    if (open && groupId) {
      fetchSettings();
    }
  }, [open, groupId]);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("commission_rate, can_manage_pricing, bypass_min_price, auto_commission")
        .eq("id", groupId)
        .single();

      if (error) throw error;

      setSettings({
        commissionRate: data.commission_rate || 0,
        canManagePricing: data.can_manage_pricing || false,
        bypassMinPrice: data.bypass_min_price || false,
        autoCommission: data.auto_commission || false,
      });
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          commission_rate: settings.commissionRate,
          can_manage_pricing: settings.canManagePricing,
          bypass_min_price: settings.bypassMinPrice,
          auto_commission: settings.autoCommission,
          updated_at: new Date().toISOString(),
        })
        .eq("id", groupId);

      if (error) throw error;

      toast({ title: "Success", description: "Group settings updated" });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Group Settings</DialogTitle>
          <DialogDescription>{groupName}</DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.commissionRate}
                  onChange={(e) => setSettings({ ...settings, commissionRate: parseFloat(e.target.value) || 0 })}
                  className="w-32"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Auto Calculate Commission</Label>
                  <p className="text-xs text-muted-foreground">Auto calculate on new orders</p>
                </div>
                <Switch
                  checked={settings.autoCommission}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoCommission: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Can Manage Pricing</Label>
                  <p className="text-xs text-muted-foreground">Allow group to edit prices</p>
                </div>
                <Switch
                  checked={settings.canManagePricing}
                  onCheckedChange={(checked) => setSettings({ ...settings, canManagePricing: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Bypass Minimum Price</Label>
                  <p className="text-xs text-muted-foreground">Allow prices below minimum</p>
                </div>
                <Switch
                  checked={settings.bypassMinPrice}
                  onCheckedChange={(checked) => setSettings({ ...settings, bypassMinPrice: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
