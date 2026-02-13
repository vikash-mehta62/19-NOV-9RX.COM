import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createAutomationRule, updateAutomationRule, AutomationRule } from "@/services/automationService";

interface AutomationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AutomationRule | null;
  onSuccess: () => void;
}

export function AutomationRuleDialog({ open, onOpenChange, rule, onSuccess }: AutomationRuleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "low_stock",
    trigger_conditions: {},
    action_type: "send_alert",
    action_config: {},
    priority: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || "",
        trigger_type: rule.trigger_type,
        trigger_conditions: rule.trigger_conditions,
        action_type: rule.action_type,
        action_config: rule.action_config,
        priority: rule.priority,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        trigger_type: "low_stock",
        trigger_conditions: { threshold: 10 },
        action_type: "send_alert",
        action_config: {},
        priority: 0,
      });
    }
  }, [rule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (rule) {
        await updateAutomationRule(rule.id, formData);
        toast({
          title: "✅ Rule Updated",
          description: `"${formData.name}" has been updated successfully`,
        });
      } else {
        await createAutomationRule(formData);
        toast({
          title: "🤖 Automation Rule Created",
          description: `"${formData.name}" is now active. System will monitor and execute automatically.`,
          duration: 5000,
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to save automation rule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit" : "Create"} Automation Rule</DialogTitle>
          <DialogDescription>
            Configure automated workflows to streamline your operations
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Auto-approve small orders"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this rule does..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trigger_type">Trigger Type *</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  {/* <SelectItem value="high_value_order">High Value Order</SelectItem> */}
                  <SelectItem value="order_status">Order Status Change</SelectItem>
                  {/* <SelectItem value="time_based">Time-Based</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="action_type">Action Type *</Label>
              <Input
                id="action_type"
                value="Send Alert"
                disabled
                className="bg-gray-50"
              />
            </div>

            {/* <div>
              <Label htmlFor="action_type">Action Type *</Label>
              <Select
                value={formData.action_type}
                onValueChange={(value) => setFormData({ ...formData, action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_alert">Send Alert</SelectItem>
                  <SelectItem value="auto_approve">Auto-Approve</SelectItem>
                  <SelectItem value="auto_reorder">Auto-Reorder</SelectItem>
                  <SelectItem value="update_status">Update Status</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
          </div>

          {/* Trigger Conditions */}
          <div className="border rounded-lg p-4 space-y-3">
            <Label className="text-base font-semibold">Trigger Conditions</Label>
            
            {formData.trigger_type === "low_stock" && (
              <div>
                <Label htmlFor="threshold">Stock Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={formData.trigger_conditions.threshold || 10}
                  onChange={(e) => setFormData({
                    ...formData,
                    trigger_conditions: { threshold: parseInt(e.target.value) }
                  })}
                  placeholder="10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Trigger when stock falls below this number
                </p>
              </div>
            )}

            {formData.trigger_type === "high_value_order" && (
              <div>
                <Label htmlFor="amount">Order Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.trigger_conditions.amount || 1000}
                  onChange={(e) => setFormData({
                    ...formData,
                    trigger_conditions: { amount: parseFloat(e.target.value) }
                  })}
                  placeholder="1000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Trigger when order value exceeds this amount
                </p>
              </div>
            )}

            {formData.trigger_type === "order_status" && (
              <div>
                <Label htmlFor="status">Order Status</Label>
                <Select
                  value={formData.trigger_conditions.status || "pending"}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    trigger_conditions: { status: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>



          <div>
            <Label htmlFor="priority">Priority (0-10)</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher priority rules execute first
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
