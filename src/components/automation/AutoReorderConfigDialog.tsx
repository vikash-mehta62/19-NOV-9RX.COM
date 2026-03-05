import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { upsertAutoReorderConfig } from "@/services/automationService";
import { supabase } from "@/integrations/supabase/client";

interface AutoReorderConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: any | null;
  configId?: string | null;
  onSuccess: () => void;
}

export function AutoReorderConfigDialog({ open, onOpenChange, config, configId, onSuccess }: AutoReorderConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    is_enabled: true,
    reorder_point: 10,
    reorder_quantity: 100,
    lead_time_days: 7,
  });
  const { toast } = useToast();

  const toSafeInt = (value: string, fallback: number) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  useEffect(() => {
    if (open) {
      loadProducts();
      if (config) {
        setFormData({
          product_id: config.product_id,
          is_enabled: config.is_enabled,
          reorder_point: config.reorder_point,
          reorder_quantity: config.reorder_quantity,
          lead_time_days: config.lead_time_days,
        });
      } else {
        setFormData({
          product_id: "",
          is_enabled: true,
          reorder_point: 10,
          reorder_quantity: 100,
          lead_time_days: 7,
        });
      }
    }
  }, [open, config]);

  const loadProducts = async () => {
    try {
      const [{ data: productsData, error: productsError }, { data: configData, error: configError }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, current_stock')
          .order('name'),
        supabase
          .from('auto_reorder_config')
          .select('product_id'),
      ]);

      if (productsError) throw productsError;
      if (configError) throw configError;

      const configuredIds = new Set((configData || []).map((c) => c.product_id));
      const filteredProducts = (productsData || []).filter((product) => {
        if (config?.product_id && product.id === config.product_id) return true;
        return !configuredIds.has(product.id);
      });

      setProducts(filteredProducts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (configId) {
        // Update existing configuration
        const { error } = await supabase
          .from('auto_reorder_config')
          .update({
            is_enabled: formData.is_enabled,
            reorder_point: formData.reorder_point,
            reorder_quantity: formData.reorder_quantity,
            lead_time_days: formData.lead_time_days,
            updated_at: new Date().toISOString(),
          })
          .eq('id', configId);

        if (error) throw error;
      } else {
        // Create new configuration
        await upsertAutoReorderConfig(formData);
      }

      toast({
        title: "Success",
        description: configId ? "Auto-reorder configuration updated" : "Auto-reorder configuration saved",
      });
      onSuccess();
      onOpenChange(false);
      setFormData({
        product_id: "",
        is_enabled: true,
        reorder_point: 10,
        reorder_quantity: 100,
        lead_time_days: 7,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config ? "Edit" : "Configure"} Auto-Reorder</DialogTitle>
          <DialogDescription>
            Set up automatic reordering for a product when stock is low
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product">Product *</Label>
            <select
              id="product"
              className="w-full border rounded-md p-2"
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
              disabled={!!config}
            >
              <option value="">Select a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (Stock: {product.current_stock})
                </option>
              ))}
            </select>
            {config && (
              <p className="text-xs text-gray-500 mt-1">
                Product cannot be changed when editing
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable Auto-Reorder</Label>
            <Switch
              id="enabled"
              checked={formData.is_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
            />
          </div>

          <div>
            <Label htmlFor="reorder_point">Reorder Point *</Label>
            <Input
              id="reorder_point"
              type="number"
              min="1"
              value={formData.reorder_point}
              onChange={(e) => setFormData({
                ...formData,
                reorder_point: toSafeInt(e.target.value, 1),
              })}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Trigger reorder when stock falls to this level
            </p>
          </div>

          <div>
            <Label htmlFor="reorder_quantity">Reorder Quantity *</Label>
            <Input
              id="reorder_quantity"
              type="number"
              min="1"
              value={formData.reorder_quantity}
              onChange={(e) => setFormData({
                ...formData,
                reorder_quantity: toSafeInt(e.target.value, 1),
              })}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              How many units to reorder
            </p>
          </div>

          <div>
            <Label htmlFor="lead_time">Lead Time (days) *</Label>
            <Input
              id="lead_time"
              type="number"
              min="1"
              value={formData.lead_time_days}
              onChange={(e) => setFormData({
                ...formData,
                lead_time_days: toSafeInt(e.target.value, 1),
              })}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Expected delivery time from supplier
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="font-semibold mb-1">💡 How it works:</p>
            <ul className="text-gray-700 space-y-1">
              <li>• System checks stock levels automatically</li>
              <li>• When stock ≤ reorder point, reorder is triggered</li>
              <li>• Alert is created for admin review</li>
              <li>• Purchase order can be generated automatically</li>
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : config ? "Update Configuration" : "Save Configuration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
