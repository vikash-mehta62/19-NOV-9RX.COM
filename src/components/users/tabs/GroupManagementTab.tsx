import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { supabase } from "@/supabaseClient";
import {
  Building2,
  Users,
  DollarSign,
  Percent,
  Settings2,
  Save,
  ShoppingCart,
  TrendingUp,
  Eye,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GroupManagementTabProps {
  groupId: string;
  groupName: string;
}

interface GroupSettings {
  commission_rate: number;
  bypass_min_price: boolean;
  can_manage_pricing: boolean;
  auto_commission: boolean;
  total_commission: number;
}

interface GroupPharmacy {
  id: string;
  display_name: string;
  company_name: string;
  email: string;
  status: string;
  created_at: string;
  total_orders: number;
  total_revenue: number;
}

interface PendingInvitation {
  id: string;
  email: string;
  pharmacy_name: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function GroupManagementTab({ groupId, groupName }: GroupManagementTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GroupSettings>({
    commission_rate: 0,
    bypass_min_price: false,
    can_manage_pricing: false,
    auto_commission: false,
    total_commission: 0,
  });
  const [pharmacies, setPharmacies] = useState<GroupPharmacy[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [pendingSettings, setPendingSettings] = useState<GroupSettings | null>(null);

  useEffect(() => {
    if (groupId) {
      fetchAllData();
    }
  }, [groupId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch group settings
      const { data: groupData } = await supabase
        .from("profiles")
        .select("commission_rate, bypass_min_price, can_manage_pricing, auto_commission, total_commission")
        .eq("id", groupId)
        .single();

      if (groupData) {
        setSettings({
          commission_rate: groupData.commission_rate || 0,
          bypass_min_price: groupData.bypass_min_price || false,
          can_manage_pricing: groupData.can_manage_pricing || false,
          auto_commission: groupData.auto_commission || false,
          total_commission: groupData.total_commission || 0,
        });
      }

      // Fetch pharmacies under this group
      const { data: pharmaciesData } = await supabase
        .from("profiles")
        .select("id, display_name, company_name, email, status, created_at")
        .eq("group_id", groupId)
        .eq("type", "pharmacy")
        .order("created_at", { ascending: false });

      // Get order stats for each pharmacy
      const pharmaciesWithStats = await Promise.all(
        (pharmaciesData || []).map(async (pharmacy) => {
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("profile_id", pharmacy.id)
            .is("void", false);

          return {
            ...pharmacy,
            total_orders: orders?.length || 0,
            total_revenue: orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
          };
        })
      );

      setPharmacies(pharmaciesWithStats);

      // Fetch pending invitations
      const { data: invitationsData } = await supabase
        .from("pharmacy_invitations")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      setInvitations(invitationsData || []);

      // Fetch analytics from view
      const { data: analyticsData } = await supabase
        .from("group_analytics")
        .select("*")
        .eq("group_id", groupId)
        .single();

      setAnalytics(analyticsData);
    } catch (err) {
      console.error("Error fetching group data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof GroupSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setPendingSettings(settings);
    setConfirmDialog(true);
  };

  const confirmSaveSettings = async () => {
    if (!pendingSettings) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          commission_rate: pendingSettings.commission_rate,
          bypass_min_price: pendingSettings.bypass_min_price,
          can_manage_pricing: pendingSettings.can_manage_pricing,
          auto_commission: pendingSettings.auto_commission,
        })
        .eq("id", groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group settings updated successfully",
      });

      setConfirmDialog(false);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("pharmacy_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      if (error) throw error;

      toast({ title: "Success", description: "Invitation cancelled" });
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      inactive: "bg-gray-100 text-gray-800",
      expired: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      accepted: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Pharmacies</span>
                </div>
                <div className="text-2xl font-bold mt-1">{analytics.total_pharmacies}</div>
                <div className="text-xs text-muted-foreground">{analytics.active_pharmacies} active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-muted-foreground">Orders</span>
                </div>
                <div className="text-2xl font-bold mt-1">{analytics.total_orders}</div>
                <div className="text-xs text-muted-foreground">{analytics.orders_this_month} this month</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Revenue</span>
                </div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(analytics.total_revenue)}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(analytics.revenue_this_month)} this month</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-muted-foreground">Commission</span>
                </div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(settings.total_commission)}</div>
                <div className="text-xs text-muted-foreground">{settings.commission_rate}% rate</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Group Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Group Settings
            </CardTitle>
            <CardDescription>
              Configure commission, pricing permissions, and other group settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Commission Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="commission_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.commission_rate}
                    onChange={(e) => handleSettingChange("commission_rate", parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Commission earned on each pharmacy order
                </p>
              </div>

              <div className="space-y-4">
                {/* Auto Commission */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Calculate Commission</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically calculate commission on new orders
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_commission}
                    onCheckedChange={(checked) => handleSettingChange("auto_commission", checked)}
                  />
                </div>
              </div>
            </div>

            {/* Pricing Permissions */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Pricing Permissions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Can Manage Pricing</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow group to edit their own prices
                    </p>
                  </div>
                  <Switch
                    checked={settings.can_manage_pricing}
                    onCheckedChange={(checked) => handleSettingChange("can_manage_pricing", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Bypass Minimum Price</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow prices below minimum cap
                    </p>
                  </div>
                  <Switch
                    checked={settings.bypass_min_price}
                    onCheckedChange={(checked) => handleSettingChange("bypass_min_price", checked)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pharmacies List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pharmacies in Group
                </CardTitle>
                <CardDescription>
                  {pharmacies.length} pharmacies linked to this group
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pharmacies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pharmacies in this group yet</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pharmacy</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pharmacies.map((pharmacy) => (
                      <TableRow key={pharmacy.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {pharmacy.display_name || pharmacy.company_name || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">{pharmacy.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(pharmacy.status)}>
                            {pharmacy.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {pharmacy.total_orders}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(pharmacy.total_revenue)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(pharmacy.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitations
                <Badge variant="secondary">{invitations.filter(i => i.status === "pending").length} pending</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Pharmacy Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>{invitation.pharmacy_name || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invitation.status)}>
                            {invitation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(invitation.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {invitation.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvitation(invitation.id)}
                              className="text-red-600"
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirm Dialog */}
        <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Settings Change</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to update the group settings for "{groupName}"?
                {pendingSettings?.auto_commission && pendingSettings.commission_rate > 0 && (
                  <span className="block mt-2 text-amber-600">
                    Auto commission is enabled at {pendingSettings.commission_rate}% rate.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSaveSettings} disabled={saving}>
                {saving ? "Saving..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
