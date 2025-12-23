import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, Trash2, Zap, Play, Pause, ShoppingCart, UserPlus,
  Package, Truck, Clock, Gift, Calendar, Target, RefreshCw, Send,
  CheckCircle2, XCircle, AlertCircle, History, TestTube, Copy,
  TrendingUp, Mail, Eye, BarChart3, Sparkles
} from "lucide-react";
import { format } from "date-fns";


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
  subject: string;
}

interface AutomationExecution {
  id: string;
  automation_id: string;
  user_id: string | null;
  status: string;
  skip_reason: string | null;
  executed_at: string | null;
  created_at: string;
  trigger_data: any;
  email_automations?: { name: string };
}

const triggerTypes = [
  { value: "abandoned_cart", label: "Abandoned Cart", icon: ShoppingCart, description: "When user leaves items in cart", color: "bg-orange-500" },
  { value: "welcome", label: "Welcome Email", icon: UserPlus, description: "When new user signs up", color: "bg-green-500" },
  { value: "order_placed", label: "Order Placed", icon: Package, description: "When order is confirmed", color: "bg-blue-500" },
  { value: "order_shipped", label: "Order Shipped", icon: Truck, description: "When order is shipped", color: "bg-purple-500" },
  { value: "order_delivered", label: "Order Delivered", icon: Package, description: "When order is delivered", color: "bg-teal-500" },
  { value: "inactive_user", label: "Inactive User", icon: Clock, description: "When user hasn't logged in", color: "bg-red-500" },
  { value: "restock_reminder", label: "Restock Reminder", icon: Package, description: "Based on purchase frequency", color: "bg-amber-500" },
  { value: "birthday", label: "Birthday", icon: Gift, description: "On user's birthday", color: "bg-pink-500" },
  { value: "signup_anniversary", label: "Signup Anniversary", icon: Calendar, description: "On signup anniversary", color: "bg-indigo-500" },
  { value: "first_purchase", label: "First Purchase", icon: ShoppingCart, description: "After first order", color: "bg-cyan-500" },
  { value: "custom", label: "Custom Trigger", icon: Target, description: "Custom automation rule", color: "bg-gray-500" },
];

// Pre-built automation templates
const automationTemplates = [
  {
    id: "cart_recovery_24h",
    name: "Cart Recovery (24h)",
    icon: ShoppingCart,
    color: "bg-orange-500",
    description: "Remind users about abandoned carts after 24 hours",
    trigger_type: "abandoned_cart",
    delay_hours: 24,
    min_cart_value: 100,
    send_limit: 1,
    cooldown: 7,
  },
  {
    id: "welcome_series",
    name: "Welcome Email",
    icon: UserPlus,
    color: "bg-green-500",
    description: "Send welcome email immediately after signup",
    trigger_type: "welcome",
    delay_hours: 0,
    send_limit: 1,
    cooldown: 365,
  },
  {
    id: "order_confirmation",
    name: "Order Confirmation",
    icon: Package,
    color: "bg-blue-500",
    description: "Confirm order placement instantly",
    trigger_type: "order_placed",
    delay_hours: 0,
    send_limit: 99,
    cooldown: 0,
  },
  {
    id: "shipping_notification",
    name: "Shipping Update",
    icon: Truck,
    color: "bg-purple-500",
    description: "Notify when order ships",
    trigger_type: "order_shipped",
    delay_hours: 0,
    send_limit: 99,
    cooldown: 0,
  },
  {
    id: "win_back",
    name: "Win-Back (30 days)",
    icon: Clock,
    color: "bg-red-500",
    description: "Re-engage users inactive for 30 days",
    trigger_type: "inactive_user",
    inactive_days: 30,
    send_limit: 1,
    cooldown: 30,
  },
  {
    id: "delivery_feedback",
    name: "Delivery + Feedback",
    icon: CheckCircle2,
    color: "bg-teal-500",
    description: "Request feedback after delivery",
    trigger_type: "order_delivered",
    delay_hours: 24,
    send_limit: 1,
    cooldown: 7,
  },
];

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
  processing: { color: "bg-blue-100 text-blue-800", icon: RefreshCw, label: "Processing" },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "Completed" },
  failed: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Failed" },
  skipped: { color: "bg-gray-100 text-gray-800", icon: AlertCircle, label: "Skipped" },
};

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
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<EmailAutomation | null>(null);
  const [selectedAutomation, setSelectedAutomation] = useState<EmailAutomation | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchAutomations();
    fetchTemplates();
    fetchRecentExecutions();
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
        .select("id, name, template_type, subject")
        .eq("is_active", true);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchRecentExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from("automation_executions")
        .select(`
          *,
          email_automations (name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error: any) {
      console.error("Error fetching executions:", error);
    }
  };

  const handleQuickTemplate = (template: typeof automationTemplates[0]) => {
    setFormData({
      ...initialFormState,
      name: template.name,
      description: template.description,
      trigger_type: template.trigger_type,
      delay_hours: template.delay_hours || 0,
      min_cart_value: template.min_cart_value || 0,
      inactive_days: template.inactive_days || 30,
      send_limit_per_user: template.send_limit,
      cooldown_days: template.cooldown,
    });
    setEditingAutomation(null);
    setDialogOpen(true);
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

  const handleDuplicate = async (automation: EmailAutomation) => {
    try {
      const { error } = await supabase.from("email_automations").insert([{
        name: `${automation.name} (Copy)`,
        description: automation.description,
        trigger_type: automation.trigger_type,
        trigger_conditions: automation.trigger_conditions,
        template_id: automation.template_id,
        is_active: false,
        priority: automation.priority,
        send_limit_per_user: automation.send_limit_per_user,
        cooldown_days: automation.cooldown_days,
      }]);
      if (error) throw error;
      toast({ title: "Success", description: "Automation duplicated" });
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


  const handleTestAutomation = async () => {
    if (!selectedAutomation || !testEmail) return;
    
    setTesting(true);
    try {
      // Get template
      if (!selectedAutomation.template_id) {
        throw new Error("No template assigned to this automation");
      }

      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", selectedAutomation.template_id)
        .single();

      if (templateError || !template) {
        throw new Error("Template not found");
      }

      // Queue test email
      const { error } = await supabase.from("email_queue").insert({
        email: testEmail,
        subject: `[TEST] ${template.subject}`,
        html_content: template.html_content,
        automation_id: selectedAutomation.id,
        template_id: selectedAutomation.template_id,
        status: "pending",
        priority: 10,
        scheduled_at: new Date().toISOString(),
        metadata: {
          is_test: true,
          trigger_type: selectedAutomation.trigger_type,
        },
      });

      if (error) throw error;

      toast({
        title: "Test Email Queued! 🧪",
        description: `Test email will be sent to ${testEmail}`,
      });

      setTestDialogOpen(false);
      setTestEmail("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const getTriggerInfo = (type: string) => {
    return triggerTypes.find((t) => t.value === type);
  };

  const getConversionRate = (automation: EmailAutomation) => {
    if (automation.total_sent === 0) return "0";
    return ((automation.total_conversions / automation.total_sent) * 100).toFixed(1);
  };

  const filteredAutomations = automations.filter(a => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return a.is_active;
    if (activeTab === "paused") return !a.is_active;
    return a.trigger_type === activeTab;
  });

  const stats = {
    total: automations.length,
    active: automations.filter(a => a.is_active).length,
    paused: automations.filter(a => !a.is_active).length,
    totalSent: automations.reduce((sum, a) => sum + (a.total_sent || 0), 0),
    totalConversions: automations.reduce((sum, a) => sum + (a.total_conversions || 0), 0),
    avgConversionRate: automations.length > 0 
      ? (automations.reduce((sum, a) => sum + (a.total_sent > 0 ? (a.total_conversions / a.total_sent) * 100 : 0), 0) / automations.length).toFixed(1)
      : "0",
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Email Automations</h1>
            <p className="text-muted-foreground">Set up automated email triggers that run 24/7</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { fetchRecentExecutions(); setHistoryOpen(true); }}>
              <History className="mr-2 h-4 w-4" /> History
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingAutomation(null); setFormData(initialFormState); }}>
                  <Plus className="mr-2 h-4 w-4" /> New Automation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAutomation ? "Edit Automation" : "Create New Automation"}</DialogTitle>
                  <DialogDescription>
                    {editingAutomation ? "Update your automation settings" : "Set up an automated email trigger"}
                  </DialogDescription>
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
                                <div className={`w-6 h-6 rounded ${trigger.color} flex items-center justify-center`}>
                                  <Icon className="h-3 w-3 text-white" />
                                </div>
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
                        value={formData.template_id || "none"}
                        onValueChange={(value) => setFormData({ ...formData, template_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select a template...</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} ({template.template_type})
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
                            onChange={(e) => setFormData({ ...formData, delay_hours: parseInt(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Hours after cart abandonment</p>
                        </div>
                        <div>
                          <Label htmlFor="min_cart_value">Min Cart Value ($)</Label>
                          <Input
                            id="min_cart_value"
                            type="number"
                            value={formData.min_cart_value}
                            onChange={(e) => setFormData({ ...formData, min_cart_value: parseFloat(e.target.value) || 0 })}
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
                          onChange={(e) => setFormData({ ...formData, inactive_days: parseInt(e.target.value) || 30 })}
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
                          onChange={(e) => setFormData({ ...formData, delay_hours: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Hours after trigger event (0 = immediate)</p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="send_limit_per_user">Send Limit Per User</Label>
                      <Input
                        id="send_limit_per_user"
                        type="number"
                        value={formData.send_limit_per_user}
                        onChange={(e) => setFormData({ ...formData, send_limit_per_user: parseInt(e.target.value) || 1 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Max emails per user for this automation</p>
                    </div>
                    <div>
                      <Label htmlFor="cooldown_days">Cooldown (Days)</Label>
                      <Input
                        id="cooldown_days"
                        type="number"
                        value={formData.cooldown_days}
                        onChange={(e) => setFormData({ ...formData, cooldown_days: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Days before sending again to same user</p>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Higher = runs first</p>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label htmlFor="is_active">Active immediately</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingAutomation ? "Update" : "Create"} Automation</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Start Templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Quick Start Templates
            </CardTitle>
            <CardDescription>Set up common automations in seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {automationTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleQuickTemplate(template)}
                    className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-lg ${template.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-medium text-sm group-hover:text-primary">{template.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>


        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Automations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{stats.paused}</div>
              <p className="text-xs text-muted-foreground">Paused</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Emails Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.totalConversions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Conversions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{stats.avgConversionRate}%</div>
              <p className="text-xs text-muted-foreground">Avg Conversion</p>
            </CardContent>
          </Card>
        </div>

        {/* Automations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" /> All Automations
              </CardTitle>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="paused">Paused</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading automations...</p>
              </div>
            ) : filteredAutomations.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No automations found</h3>
                <p className="text-muted-foreground mt-1">
                  {activeTab === "all" 
                    ? "Create your first automation to get started!" 
                    : `No ${activeTab} automations`}
                </p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Automation
                </Button>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAutomations.map((automation) => {
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
                            <p className="text-xs text-muted-foreground mt-1">
                              Created {format(new Date(automation.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded ${triggerInfo?.color || 'bg-gray-500'} flex items-center justify-center`}>
                              <TriggerIcon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm">{triggerInfo?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {automation.trigger_conditions?.delay_hours !== undefined && (
                              <p className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {automation.trigger_conditions.delay_hours}h delay
                              </p>
                            )}
                            {automation.trigger_conditions?.min_cart_value > 0 && (
                              <p>Min: ${automation.trigger_conditions.min_cart_value}</p>
                            )}
                            {automation.trigger_conditions?.inactive_days && (
                              <p>After: {automation.trigger_conditions.inactive_days} days</p>
                            )}
                            <p className="text-muted-foreground">
                              Limit: {automation.send_limit_per_user}/user
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-blue-500" />
                              <span className="font-medium">{automation.total_sent.toLocaleString()}</span>
                              <span className="text-muted-foreground">sent</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span className="font-medium">{getConversionRate(automation)}%</span>
                              <span className="text-muted-foreground">converted</span>
                            </div>
                            {automation.total_sent > 0 && (
                              <Progress 
                                value={parseFloat(getConversionRate(automation))} 
                                className="h-1 mt-1"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(automation.id, automation.is_active)}
                          >
                            {automation.is_active ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                <Play className="h-3 w-3 mr-1" /> Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Pause className="h-3 w-3 mr-1" /> Paused
                              </Badge>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => { setSelectedAutomation(automation); setTestDialogOpen(true); }}
                              title="Test"
                            >
                              <TestTube className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(automation)} title="Duplicate">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(automation)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(automation.id)} title="Delete">
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


        {/* Test Automation Dialog */}
        <AlertDialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-blue-600" />
                Test Automation
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>Send a test email for <strong>"{selectedAutomation?.name}"</strong></p>
                <div className="space-y-2">
                  <Label htmlFor="test_email">Test Email Address</Label>
                  <Input
                    id="test_email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>
                <p className="text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  This will queue a test email immediately, bypassing all conditions.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleTestAutomation} 
                disabled={!testEmail || testing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Execution History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Automation Execution History
              </DialogTitle>
              <DialogDescription>
                Recent automation executions across all automations
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {executions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No execution history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Automation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((exec) => {
                      const statusInfo = statusConfig[exec.status] || statusConfig.pending;
                      const StatusIcon = statusInfo.icon;
                      return (
                        <TableRow key={exec.id}>
                          <TableCell>
                            <p className="font-medium">{exec.email_automations?.name || "Unknown"}</p>
                            {exec.trigger_data?.email && (
                              <p className="text-sm text-muted-foreground">{exec.trigger_data.email}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${statusInfo.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {exec.skip_reason ? (
                              <p className="text-sm text-muted-foreground">{exec.skip_reason}</p>
                            ) : exec.status === "completed" ? (
                              <p className="text-sm text-green-600">Email queued successfully</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {format(new Date(exec.created_at), "MMM d, h:mm a")}
                            </p>
                            {exec.executed_at && (
                              <p className="text-xs text-muted-foreground">
                                Executed: {format(new Date(exec.executed_at), "h:mm a")}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
