import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  Play,
  Package,
  ShoppingCart,
  RefreshCw
} from "lucide-react";
import {
  getAutomationRules,
  toggleAutomationRule,
  deleteAutomationRule,
  getAutoReorderConfigs,
  executeAutomationRules,
  AutomationRule,
} from "@/services/automationService";
import { useToast } from "@/hooks/use-toast";
import { AutomationRuleDialog, AutoReorderConfigDialog } from "@/components/automation";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function Automation() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [reorderConfigs, setReorderConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [selectedReorder, setSelectedReorder] = useState<any | null>(null);
  const [executing, setExecuting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'rule' | 'reorder' } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesData, reorderData] = await Promise.all([
        getAutomationRules(),
        getAutoReorderConfigs(),
      ]);
      setRules(rulesData);
      setReorderConfigs(reorderData);
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

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await toggleAutomationRule(ruleId, isActive);
      await loadData();
      
      toast({
        title: isActive ? "▶️ Rule Activated" : "⏸️ Rule Paused",
        description: isActive 
          ? "Automation is now active and will execute automatically" 
          : "Rule has been paused and will not execute",
      });
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to toggle automation rule",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setDeleteTarget({ id: ruleId, type: 'rule' });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteReorder = async (configId: string) => {
    setDeleteTarget({ id: configId, type: 'reorder' });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'rule') {
        await deleteAutomationRule(deleteTarget.id);
        toast({
          title: "🗑️ Rule Deleted",
          description: "Automation rule has been deleted successfully",
        });
      } else {
        const { error } = await supabase
          .from('auto_reorder_config')
          .delete()
          .eq('id', deleteTarget.id);

        if (error) throw error;

        toast({
          title: "🗑️ Configuration Deleted",
          description: "Auto-reorder configuration has been deleted successfully",
        });
      }
      
      await loadData();
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleExecuteRules = async () => {
    try {
      setExecuting(true);
      await executeAutomationRules();
      toast({
        title: "Success",
        description: "Automation rules executed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleToggleReorder = async (configId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('auto_reorder_config')
        .update({ is_enabled: isEnabled })
        .eq('id', configId);

      if (error) throw error;

      await loadData();
      toast({
        title: "Success",
        description: `Auto-reorder ${isEnabled ? "enabled" : "disabled"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditReorder = (config: any) => {
    setSelectedReorder(config);
    setReorderDialogOpen(true);
  };

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      low_stock: "Low Stock",
      high_value_order: "High Value Order",
      order_status: "Order Status Change",
      time_based: "Time-Based",
    };
    return labels[type] || type;
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      auto_approve: "Auto-Approve",
      auto_reorder: "Auto-Reorder",
      send_alert: "Send Alert",
      update_status: "Update Status",
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout role="admin">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold">Workflow Automation</h1>
            </div>
            <p className="text-gray-600">
              Automate repetitive tasks and streamline your operations
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExecuteRules} disabled={executing}>
              <Play className="h-4 w-4 mr-2" />
              {executing ? "Executing..." : "Run Now"}
            </Button>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rules">Automation Rules</TabsTrigger>
            <TabsTrigger value="reorder">Auto-Reorder</TabsTrigger>
          </TabsList>

          {/* Automation Rules Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Automation Rules</CardTitle>
                    <CardDescription>
                      Configure automated workflows for common tasks
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setSelectedRule(null);
                    setRuleDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading rules...</div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No automation rules configured</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setRuleDialogOpen(true)}
                    >
                      Create Your First Rule
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{rule.name}</h4>
                              <Badge variant={rule.is_active ? "default" : "secondary"}>
                                {rule.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">
                                Priority: {rule.priority}
                              </Badge>
                            </div>
                            {rule.description && (
                              <p className="text-sm text-gray-600 mb-3">
                                {rule.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-600">
                                  Trigger: {getTriggerTypeLabel(rule.trigger_type)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-600">
                                  Action: {getActionTypeLabel(rule.action_type)}
                                </span>
                              </div>
                              {rule.last_triggered_at && (
                                <span className="text-gray-500">
                                  Last triggered: {new Date(rule.last_triggered_at).toLocaleString()}
                                </span>
                              )}
                              <span className="text-gray-500">
                                Triggered {rule.trigger_count} times
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRule(rule);
                                setRuleDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Reorder Tab */}
          <TabsContent value="reorder">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Auto-Reorder Configuration</CardTitle>
                    <CardDescription>
                      Automatically reorder products when stock is low
                    </CardDescription>
                  </div>
                  <Button onClick={() => setReorderDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Configure Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading configurations...</div>
                ) : reorderConfigs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No auto-reorder configurations</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setReorderDialogOpen(true)}
                    >
                      Configure First Product
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reorderConfigs.map((config) => (
                      <div
                        key={config.id}
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">
                              {config.products?.name}
                            </h4>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Current Stock:</span>
                                <span className="ml-2 font-semibold">
                                  {config.products?.current_stock}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Reorder Point:</span>
                                <span className="ml-2 font-semibold">
                                  {config.reorder_point}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Reorder Qty:</span>
                                <span className="ml-2 font-semibold">
                                  {config.reorder_quantity}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Lead Time:</span>
                                <span className="ml-2 font-semibold">
                                  {config.lead_time_days} days
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={config.is_enabled ? "default" : "secondary"}>
                              {config.is_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <Switch
                              checked={config.is_enabled}
                              onCheckedChange={(checked) => handleToggleReorder(config.id, checked)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditReorder(config)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteReorder(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <AutomationRuleDialog
          open={ruleDialogOpen}
          onOpenChange={setRuleDialogOpen}
          rule={selectedRule}
          onSuccess={loadData}
        />
        <AutoReorderConfigDialog
          open={reorderDialogOpen}
          onOpenChange={(open) => {
            setReorderDialogOpen(open);
            if (!open) setSelectedReorder(null);
          }}
          config={selectedReorder}
          configId={selectedReorder?.id}
          onSuccess={loadData}
        />
        <ConfirmationDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={confirmDelete}
          title="Delete Confirmation"
          description={
            deleteTarget?.type === 'rule'
              ? "Are you sure you want to delete this automation rule? This action cannot be undone."
              : "Are you sure you want to delete this auto-reorder configuration? This action cannot be undone."
          }
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
}
