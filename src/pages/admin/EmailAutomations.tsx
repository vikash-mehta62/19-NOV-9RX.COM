import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, Trash2, Zap, Play, Pause, ShoppingCart, UserPlus,
  Package, Truck, Clock, Gift, Calendar, MessageSquare, Target
} from "lucide-react";

interface EmailAutomation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: any;
  template_id: string | null;
  is_active: boolean;
  priority: number;
  send_limit_per_user: number;
  cooldown_days: number;
  total_sent: number;
  total_conversions: number;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  template_type: string;
}

const triggerTypes = [
  { value: "abandoned_cart", label: "Abandoned Cart", icon: ShoppingCart, description: "When user leaves items in cart" },
  { value: "welcome", label: "Welcome Email", icon: UserPlus, description: "When new user signs up" },
  { value: "order_placed", label: "Order Placed", icon: Package, description: "When order is confirmed" },
  { value: "order_shipped", label: "Order Shipped", icon: Truck, description: "When order is shipped" },
  { value: "order_delivered", label: "Order Delivered", icon: Package, description: "When order is delivered" },
  { value: "inactive_user", label: "Inactive User", icon: Clock, description: "When user hasn't logged in" },
  { value: "restock_reminder", label: "Restock Reminder", icon: Package, description: "Based on purchase frequency" },
  { value: "birthday", label: "Birthday", icon: Gift, description: "On user's birthday" },
  { value: "signup_anniversary", label: "Signup Anniversary", icon: Calendar, description: "On signup anniversary" },
  { value: "first_purchase", label: "First Purchase", icon: ShoppingCart, description: "After first order" },
  { value: "custom", label: "Custom Trigger", icon: Target, description: "Custom automation rule" },
];

const initialFormState = {
  name: "",
  description: "",
  trigger_type: "abandoned_cart",
  template_id: "",
  is_active: true,
  priority: 0,
  send_limit_per_user: 1,
  cooldown_days: 7,
  delay_hours: 24,
  min_cart_value: 0,
  inactive_days: 30,
};

export default function EmailAutomations() {
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<EmailAutomation | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const { toast } = useToast();

  useEffect(() => {
    fetchAutomations();
    fetchTemplates();
  }, []);

  const fetchAutomations = async () => {
    try {
      const { data, error } = await supabase
        .from("email_automations")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      setAutomations(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, template_type")
        .eq("is_active", true);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const triggerConditions: any = {};
      
      if (formData.trigger_type === "abandoned_cart") {
        triggerConditions.delay_hours = formData.delay_hours;
        triggerConditions.min_cart_value = formData.min_cart_value;
      } else if (formData.trigger_type === "inactive_user") {
        triggerConditions.inactive_days = formData.inactive_days;
      } else {
        triggerConditions.delay_hours = formData.delay_hours;
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        trigger_type: formData.trigger_type,
        trigger_conditions: triggerConditions,
        template_id: formData.template_id || null,
        is_active: formData.is_active,
        priority: formData.priority,
        send_limit_per_user: formData.send_limit_per_user,
        cooldown_days: formData.cooldown_days,
      };

      if (editingAutomation) {
        const { error } = await supabase
          .from("email_automations")
          .update(payload)
          .eq("id", editingAutomation.id);
        if (error) throw error;
        toast({ title: "Success", description: "Automation updated successfully" });
      } else {
        const { error } = await supabase.from("email_automations").insert([payload]);
        if (error) throw error;
        toast({ title: "Success", description: "Automation created successfully" });
      }

      setDialogOpen(false);
      setEditingAutomation(null);
      setFormData(initialFormState);
      fetchAutomations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (automation: EmailAutomation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || "",
      trigger_type: automation.trigger_type,
      template_id: automation.template_id || "",
      is_active: automation.is_active,
      priority: automation.priority,
      send_limit_per_user: automation.send_limit_per_user,
      cooldown_days: automation.cooldown_days,
      delay_hours: automation.trigger_conditions?.delay_hours || 24,
      min_cart_value: automation.trigger_conditions?.min_cart_value || 0,
      inactive_days: automation.trigger_conditions?.inactive_days || 30,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    try {
      const { error } = await supabase.from("email_automations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Automation deleted successfully" });
      fetchAutomations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("email_automations")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      fetchAutomations();
      toast({
        title: currentStatus ? "Automation Paused" : "Automation Activated",
        description: currentStatus ? "Emails will not be sent" : "Automation is now running",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getTriggerInfo = (type: string) => {
    return triggerTypes.find((t) => t.value === type);
  };

  const getConversionRate = (automation: EmailAutomation) => {
    if (automation.total_sent === 0) return 0;
    return ((automation.total_conversions / automation.total_sent) * 100).toFixed(1);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Email Automations</h1>
            <p className="text-muted-foreground">Set up automated email triggers</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingAutomation(null); setFormData(initialFormState); }}>
                <Plus className="mr-2 h-4 w-4" /> New Automation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAutomation ? "Edit Automation" : "Create New Automation"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Automation Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Cart Recovery - 24 Hours"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Send reminder email when cart is abandoned for 24 hours"
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Trigger Type *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {triggerTypes.slice(0, 6).map((trigger) => {
                        const Icon = trigger.icon;
                        return (
                          <div
                            key={trigger.value}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              formData.trigger_type === trigger.value
                                ? "border-primary bg-primary/5"
                                : "hover:border-gray-400"
                            }`}
                            onClick={() => setFormData({ ...formData, trigger_type: trigger.value })}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium text-sm">{trigger.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{trigger.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="template_id">Email Template *</Label>
                    <Select
                      value={formData.template_id}
                      onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional fields based on trigger type */}
                  {formData.trigger_type === "abandoned_cart" && (
                    <>
                      <div>
                        <Label htmlFor="delay_hours">Delay (Hours)</Label>
                        <Input
                          id="delay_hours"
                          type="number"
                          value={formData.delay_hours}
                          onChange={(e) => setFormData({ ...formData, delay_hours: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Hours after cart abandonment</p>
                      </div>
                      <div>
                        <Label htmlFor="min_cart_value">Min Cart Value ($)</Label>
                        <Input
                          id="min_cart_value"
                          type="number"
                          value={formData.min_cart_value}
                          onChange={(e) => setFormData({ ...formData, min_cart_value: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Only trigger if cart value is above</p>
                      </div>
                    </>
                  )}

                  {formData.trigger_type === "inactive_user" && (
                    <div className="col-span-2">
                      <Label htmlFor="inactive_days">Inactive Days</Label>
                      <Input
                        id="inactive_days"
                        type="number"
                        value={formData.inactive_days}
                        onChange={(e) => setFormData({ ...formData, inactive_days: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Days of inactivity before sending</p>
                    </div>
                  )}

                  {!["abandoned_cart", "inactive_user"].includes(formData.trigger_type) && (
                    <div className="col-span-2">
                      <Label htmlFor="delay_hours">Delay (Hours)</Label>
                      <Input
                        id="delay_hours"
                        type="number"
                        value={formData.delay_hours}
                        onChange={(e) => setFormData({ ...formData, delay_hours: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Hours after trigger event</p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="send_limit_per_user">Send Limit Per User</Label>
                    <Input
                      id="send_limit_per_user"
                      type="number"
                      value={formData.send_limit_per_user}
                      onChange={(e) => setFormData({ ...formData, send_limit_per_user: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cooldown_days">Cooldown (Days)</Label>
                    <Input
                      id="cooldown_days"
                      type="number"
                      value={formData.cooldown_days}
                      onChange={(e) => setFormData({ ...formData, cooldown_days: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingAutomation ? "Update" : "Create"} Automation</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{automations.length}</div>
              <p className="text-muted-foreground">Total Automations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {automations.filter((a) => a.is_active).length}
              </div>
              <p className="text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {automations.reduce((sum, a) => sum + a.total_sent, 0).toLocaleString()}
              </div>
              <p className="text-muted-foreground">Emails Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {automations.reduce((sum, a) => sum + a.total_conversions, 0).toLocaleString()}
              </div>
              <p className="text-muted-foreground">Conversions</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" /> All Automations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : automations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No automations found. Create your first automation!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Automation</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automations.map((automation) => {
                    const triggerInfo = getTriggerInfo(automation.trigger_type);
                    const TriggerIcon = triggerInfo?.icon || Zap;
                    return (
                      <TableRow key={automation.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{automation.name}</p>
                            {automation.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {automation.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TriggerIcon className="h-4 w-4" />
                            <span>{triggerInfo?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {automation.trigger_conditions?.delay_hours && (
                              <p>Delay: {automation.trigger_conditions.delay_hours}h</p>
                            )}
                            {automation.trigger_conditions?.min_cart_value > 0 && (
                              <p>Min: ${automation.trigger_conditions.min_cart_value}</p>
                            )}
                            {automation.trigger_conditions?.inactive_days && (
                              <p>After: {automation.trigger_conditions.inactive_days} days</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{automation.total_sent.toLocaleString()} sent</p>
                            <p className="text-green-600">{getConversionRate(automation)}% converted</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(automation.id, automation.is_active)}
                          >
                            {automation.is_active ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Play className="h-3 w-3 mr-1" /> Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Pause className="h-3 w-3 mr-1" /> Paused
                              </Badge>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(automation)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(automation.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
