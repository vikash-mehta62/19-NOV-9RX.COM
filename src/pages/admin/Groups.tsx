import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import {
  Users,
  Building2,
  DollarSign,
  Percent,
  Search,
  ArrowUpDown,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CreateGroupDialog } from "@/components/admin/groups/CreateGroupDialog";
import { GroupActionsDropdown } from "@/components/admin/groups/GroupActionsDropdown";
import { QuickEditGroupDialog } from "@/components/admin/groups/QuickEditGroupDialog";
import { ManagePharmaciesDialog } from "@/components/admin/groups/ManagePharmaciesDialog";
import { ViewProfileModal } from "@/components/users/ViewProfileModal";
import { useScreenSize } from "@/hooks/use-mobile";

interface GroupData {
  group_id: string;
  group_name: string;
  commission_rate: number;
  bypass_min_price: boolean;
  can_manage_pricing: boolean;
  total_pharmacies: number;
  active_pharmacies: number;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  orders_this_month: number;
  revenue_this_month: number;
  status?: string;
  created_at?: string;
  email?: string;
}

const AdminGroups = () => {
  const { toast } = useToast();
  const screenSize = useScreenSize();
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isCompact = isMobile || isTablet;
  
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pharmaciesDialogOpen, setPharmaciesDialogOpen] = useState(false);
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);

  // Summary stats
  const [summary, setSummary] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalPharmacies: 0,
    totalRevenue: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);

      // Fetch from group_analytics view
      const { data, error } = await supabase
        .from("group_analytics")
        .select("*");

      if (error) {
        console.error("Error fetching groups:", error);
        await fetchGroupsManually();
        return;
      }

      // Get additional profile data
      const groupIds = data?.map(g => g.group_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, status, created_at, email")
        .in("id", groupIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedGroups = (data || []).map(group => ({
        ...group,
        status: profilesMap.get(group.group_id)?.status || "active",
        created_at: profilesMap.get(group.group_id)?.created_at,
        email: profilesMap.get(group.group_id)?.email,
      }));

      setGroups(enrichedGroups);
      calculateSummary(enrichedGroups);
    } catch (err) {
      console.error("Error:", err);
      toast({ title: "Error", description: "Failed to load groups data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupsManually = async () => {
    try {
      const { data: groupProfiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("type", "group");

      const groupsWithStats = await Promise.all(
        (groupProfiles || []).map(async (group) => {
          const { data: pharmacies } = await supabase
            .from("profiles")
            .select("id, status")
            .eq("group_id", group.id)
            .eq("type", "pharmacy");

          const pharmacyIds = pharmacies?.map(p => p.id) || [];
          const activeCount = pharmacies?.filter(p => p.status === "active").length || 0;

          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount, commission_amount, created_at")
            .in("profile_id", pharmacyIds)
            .is("void", false);

          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          return {
            group_id: group.id,
            group_name: group.display_name || `${group.first_name} ${group.last_name}`,
            commission_rate: group.commission_rate || 0,
            bypass_min_price: group.bypass_min_price || false,
            can_manage_pricing: group.can_manage_pricing || false,
            total_pharmacies: pharmacies?.length || 0,
            active_pharmacies: activeCount,
            total_orders: orders?.length || 0,
            total_revenue: orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
            total_commission: orders?.reduce((sum, o) => sum + (o.commission_amount || 0), 0) || 0,
            orders_this_month: orders?.filter(o => new Date(o.created_at) >= startOfMonth).length || 0,
            revenue_this_month: orders?.filter(o => new Date(o.created_at) >= startOfMonth).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
            status: group.status,
            created_at: group.created_at,
            email: group.email,
          };
        })
      );

      setGroups(groupsWithStats);
      calculateSummary(groupsWithStats);
    } catch (err) {
      console.error("Manual fetch error:", err);
    }
  };

  const calculateSummary = (groupsData: GroupData[]) => {
    const activeGroups = groupsData.filter(g => g.status === "active").length;
    const totalPharmacies = groupsData.reduce((sum, g) => sum + Number(g.total_pharmacies), 0);
    const totalRevenue = groupsData.reduce((sum, g) => sum + Number(g.total_revenue), 0);
    const totalCommission = groupsData.reduce((sum, g) => sum + Number(g.total_commission), 0);

    setSummary({
      totalGroups: groupsData.length,
      activeGroups,
      totalPharmacies,
      totalRevenue,
      totalCommission,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredGroups = groups
    .filter(group => {
      const matchesSearch = group.group_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || group.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const modifier = sortOrder === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name": return modifier * a.group_name.localeCompare(b.group_name);
        case "pharmacies": return modifier * (Number(a.total_pharmacies) - Number(b.total_pharmacies));
        case "orders": return modifier * (Number(a.total_orders) - Number(b.total_orders));
        case "revenue": return modifier * (Number(a.total_revenue) - Number(b.total_revenue));
        case "commission": return modifier * (Number(a.total_commission) - Number(b.total_commission));
        default: return 0;
      }
    });

  const toggleSelectAll = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(filteredGroups.map(g => g.group_id));
    }
  };

  const toggleSelectGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const bulkUpdateStatus = async (newStatus: "active" | "inactive") => {
    if (selectedGroups.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in("id", selectedGroups);

      if (error) throw error;

      toast({ title: "Success", description: `${selectedGroups.length} groups updated` });
      setSelectedGroups([]);
      fetchGroups();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const exportToCSV = () => {
    const dataToExport = selectedGroups.length > 0 
      ? filteredGroups.filter(g => selectedGroups.includes(g.group_id))
      : filteredGroups;

    const headers = ["Group Name", "Email", "Pharmacies", "Orders", "Revenue", "Commission", "Commission Rate", "Status"];
    const rows = dataToExport.map(g => [
      g.group_name,
      g.email || "",
      g.total_pharmacies,
      g.total_orders,
      g.total_revenue,
      g.total_commission,
      `${g.commission_rate}%`,
      g.status || "active",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `groups-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: "Success", description: "Report exported successfully" });
  };

  const handleViewDetails = (groupId: string, groupName: string) => {
    setSelectedGroup({ id: groupId, name: groupName });
    setViewProfileOpen(true);
  };

  const handleEditSettings = (groupId: string, groupName: string) => {
    setSelectedGroup({ id: groupId, name: groupName });
    setEditDialogOpen(true);
  };

  const handleManagePharmacies = (groupId: string, groupName: string) => {
    setSelectedGroup({ id: groupId, name: groupName });
    setPharmaciesDialogOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <TooltipProvider>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className={cn(
            "flex justify-between items-start gap-4",
            isTablet 
              ? "flex-col space-y-4" 
              : "flex-col md:flex-row md:items-center"
          )}>
            <div className={cn(isTablet && "text-center")}>
              <h1 className={cn(
                "font-bold tracking-tight text-gray-900",
                isTablet ? "text-2xl" : "text-3xl"
              )}>
                Group Management
              </h1>
              <p className={cn(
                "text-gray-600 mt-1",
                isTablet ? "text-base" : "text-muted-foreground"
              )}>
                Manage groups, their pharmacies, and commission settings
              </p>
            </div>
            <div className={cn(
              "flex gap-2",
              isTablet ? "w-full justify-center" : ""
            )}>
              <Button 
                variant="outline" 
                size={isTablet ? "default" : "sm"} 
                onClick={fetchGroups}
                className={cn(isTablet && "flex-1 max-w-[140px]")}
              >
                <RefreshCw className={cn("mr-2", isTablet ? "h-4 w-4" : "h-4 w-4")} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size={isTablet ? "default" : "sm"} 
                onClick={exportToCSV}
                className={cn(isTablet && "flex-1 max-w-[140px]")}
              >
                <Download className={cn("mr-2", isTablet ? "h-4 w-4" : "h-4 w-4")} />
                Export {selectedGroups.length > 0 && `(${selectedGroups.length})`}
              </Button>
              <CreateGroupDialog onGroupCreated={fetchGroups} />
            </div>
          </div>

          {/* Summary Cards */}
          <div className={cn(
            "grid gap-4",
            isTablet 
              ? "grid-cols-2 gap-6" 
              : "grid-cols-2 md:grid-cols-5"
          )}>
            <Card className={cn(isTablet && "shadow-md hover:shadow-lg transition-shadow")}>
              <CardContent className={cn("pt-4", isTablet && "pt-6 pb-6")}>
                <div className={cn("flex items-center gap-2", isTablet && "gap-3")}>
                  <Users className={cn("text-purple-600", isTablet ? "h-5 w-5" : "h-4 w-4")} />
                  <span className={cn("text-muted-foreground", isTablet ? "text-base font-medium" : "text-sm")}>
                    Total Groups
                  </span>
                </div>
                <div className={cn("font-bold mt-1", isTablet ? "text-3xl mt-2" : "text-2xl")}>
                  {summary.totalGroups}
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(isTablet && "shadow-md hover:shadow-lg transition-shadow")}>
              <CardContent className={cn("pt-4", isTablet && "pt-6 pb-6")}>
                <div className={cn("flex items-center gap-2", isTablet && "gap-3")}>
                  <CheckCircle2 className={cn("text-green-600", isTablet ? "h-5 w-5" : "h-4 w-4")} />
                  <span className={cn("text-muted-foreground", isTablet ? "text-base font-medium" : "text-sm")}>
                    Active Groups
                  </span>
                </div>
                <div className={cn("font-bold mt-1", isTablet ? "text-3xl mt-2" : "text-2xl")}>
                  {summary.activeGroups}
                </div>
                <div className={cn("text-muted-foreground", isTablet ? "text-sm mt-1" : "text-xs")}>
                  {summary.totalGroups - summary.activeGroups} inactive
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(isTablet && "shadow-md hover:shadow-lg transition-shadow")}>
              <CardContent className={cn("pt-4", isTablet && "pt-6 pb-6")}>
                <div className={cn("flex items-center gap-2", isTablet && "gap-3")}>
                  <Building2 className={cn("text-blue-600", isTablet ? "h-5 w-5" : "h-4 w-4")} />
                  <span className={cn("text-muted-foreground", isTablet ? "text-base font-medium" : "text-sm")}>
                    Total Pharmacies
                  </span>
                </div>
                <div className={cn("font-bold mt-1", isTablet ? "text-3xl mt-2" : "text-2xl")}>
                  {summary.totalPharmacies}
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(isTablet && "shadow-md hover:shadow-lg transition-shadow")}>
              <CardContent className={cn("pt-4", isTablet && "pt-6 pb-6")}>
                <div className={cn("flex items-center gap-2", isTablet && "gap-3")}>
                  <DollarSign className={cn("text-green-600", isTablet ? "h-5 w-5" : "h-4 w-4")} />
                  <span className={cn("text-muted-foreground", isTablet ? "text-base font-medium" : "text-sm")}>
                    Total Revenue
                  </span>
                </div>
                <div className={cn("font-bold mt-1 text-green-600", isTablet ? "text-2xl mt-2" : "text-2xl")}>
                  {formatCurrency(summary.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(isTablet && "shadow-md hover:shadow-lg transition-shadow")}>
              <CardContent className={cn("pt-4", isTablet && "pt-6 pb-6")}>
                <div className={cn("flex items-center gap-2", isTablet && "gap-3")}>
                  <Percent className={cn("text-amber-600", isTablet ? "h-5 w-5" : "h-4 w-4")} />
                  <span className={cn("text-muted-foreground", isTablet ? "text-base font-medium" : "text-sm")}>
                    Total Commission
                  </span>
                </div>
                <div className={cn("font-bold mt-1 text-amber-600", isTablet ? "text-2xl mt-2" : "text-2xl")}>
                  {formatCurrency(summary.totalCommission)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Groups Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>All Groups</CardTitle>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[120px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="pharmacies">Pharmacies</SelectItem>
                      <SelectItem value="orders">Orders</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedGroups.length > 0 && (
                <div className="flex items-center gap-2 mt-4 p-2 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{selectedGroups.length} selected</span>
                  <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("active")}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Activate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("inactive")}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Deactivate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedGroups([])}>
                    Clear
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No groups found</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedGroups.length === filteredGroups.length && filteredGroups.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Group Name</TableHead>
                        <TableHead className="text-center">Pharmacies</TableHead>
                        <TableHead className="text-center">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-center">Rate</TableHead>
                        <TableHead className="text-center">Permissions</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center w-12">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => (
                        <TableRow key={group.group_id} className="hover:bg-muted/50">
                          <TableCell>
                            <Checkbox
                              checked={selectedGroups.includes(group.group_id)}
                              onCheckedChange={() => toggleSelectGroup(group.group_id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{group.group_name}</div>
                            {group.created_at && (
                              <div className="text-xs text-muted-foreground">
                                Since {format(new Date(group.created_at), "MMM yyyy")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-medium">{group.total_pharmacies}</div>
                            <div className="text-xs text-muted-foreground">
                              {group.active_pharmacies} active
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-medium">{group.total_orders}</div>
                            <div className="text-xs text-muted-foreground">
                              {group.orders_this_month} this month
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium text-green-600">
                              {formatCurrency(Number(group.total_revenue))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(Number(group.revenue_this_month))} this month
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium text-amber-600">
                              {formatCurrency(Number(group.total_commission))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{group.commission_rate}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      group.can_manage_pricing
                                        ? "text-green-600 border-green-200"
                                        : "text-gray-400 border-gray-200"
                                    )}
                                  >
                                    P
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {group.can_manage_pricing ? "Can manage pricing" : "Cannot manage pricing"}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      group.bypass_min_price
                                        ? "text-amber-600 border-amber-200"
                                        : "text-gray-400 border-gray-200"
                                    )}
                                  >
                                    B
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {group.bypass_min_price ? "Can bypass min price" : "Min price enforced"}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={cn(
                                group.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              )}
                            >
                              {group.status || "active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <GroupActionsDropdown
                              groupId={group.group_id}
                              groupName={group.group_name}
                              status={group.status || "active"}
                              onViewDetails={() => handleViewDetails(group.group_id, group.group_name)}
                              onEditSettings={() => handleEditSettings(group.group_id, group.group_name)}
                              onManagePharmacies={() => handleManagePharmacies(group.group_id, group.group_name)}
                              onRefresh={fetchGroups}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Dialogs */}
      {selectedGroup && (
        <>
          <QuickEditGroupDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
            onSaved={fetchGroups}
          />
          <ManagePharmaciesDialog
            open={pharmaciesDialogOpen}
            onOpenChange={setPharmaciesDialogOpen}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
            onUpdated={fetchGroups}
          />
          <ViewProfileModal
            open={viewProfileOpen}
            onOpenChange={setViewProfileOpen}
            userId={selectedGroup.id}
            onUserUpdated={fetchGroups}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default AdminGroups;
