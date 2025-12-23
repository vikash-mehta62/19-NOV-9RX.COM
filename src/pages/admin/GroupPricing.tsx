import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import {
  DollarSign,
  Tag,
  Users,
  Package,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Filter,
  TrendingDown,
} from "lucide-react";
import { CreateGroupPricingDialog } from "@/components/group-pricing/CreateGroupPricingDialog";
import { GroupPricingTable } from "@/components/group-pricing/GroupPricingTable";

interface GroupPricingData {
  id?: string;
  name: string;
  discount: number;
  discount_type: "percentage" | "fixed";
  min_quantity: number;
  max_quantity: number;
  product_id: string;
  group_ids: string[];
  status: string;
  updated_at: string;
  created_at?: string;
}

interface SummaryStats {
  totalRules: number;
  activeRules: number;
  totalGroups: number;
  totalProducts: number;
}

const GroupPricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryStats>({
    totalRules: 0,
    activeRules: 0,
    totalGroups: 0,
    totalProducts: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("group_pricing")
        .select("id, status, group_ids, product_arrayjson");

      if (error) throw error;

      const activeRules = data?.filter(r => r.status === "active").length || 0;
      const uniqueGroups = new Set<string>();
      const uniqueProducts = new Set<string>();

      data?.forEach(rule => {
        rule.group_ids?.forEach((gid: string) => uniqueGroups.add(gid));
        rule.product_arrayjson?.forEach((p: any) => uniqueProducts.add(p.product_id));
      });

      setSummary({
        totalRules: data?.length || 0,
        activeRules,
        totalGroups: uniqueGroups.size,
        totalProducts: uniqueProducts.size,
      });
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroupPricing = (newGroupPricing: GroupPricingData) => {
    fetchSummary();
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Special Pricing</h1>
            <p className="text-muted-foreground">
              Manage special pricing rules and discounts for groups
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSummary}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <CreateGroupPricingDialog onSubmit={handleCreateGroupPricing} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-muted-foreground">Total Rules</span>
              </div>
              <div className="text-2xl font-bold mt-1">{summary.totalRules}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Active Rules</span>
              </div>
              <div className="text-2xl font-bold mt-1">{summary.activeRules}</div>
              <div className="text-xs text-muted-foreground">
                {summary.totalRules - summary.activeRules} inactive
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Groups Covered</span>
              </div>
              <div className="text-2xl font-bold mt-1">{summary.totalGroups}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-muted-foreground">Products with Pricing</span>
              </div>
              <div className="text-2xl font-bold mt-1">{summary.totalProducts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Rules Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Pricing Rules
              </CardTitle>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search pricing rules..."
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <GroupPricingTable searchTerm={searchTerm} statusFilter={statusFilter} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GroupPricing;
