import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Percent,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface GroupAnalytics {
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
}

interface GroupAnalyticsStatsProps {
  groupId: string;
  onDataLoaded?: (data: GroupAnalytics | null) => void;
}

export function GroupAnalyticsStats({ groupId, onDataLoaded }: GroupAnalyticsStatsProps) {
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);

  useEffect(() => {
    if (groupId) {
      fetchAnalytics();
    }
  }, [groupId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch from group_analytics view
      const { data, error } = await supabase
        .from("group_analytics")
        .select("*")
        .eq("group_id", groupId)
        .single();

      if (error) {
        console.error("Error fetching group analytics:", error);
        // Fallback: calculate manually if view fails
        await fetchManualAnalytics();
        return;
      }

      setAnalytics(data);
      onDataLoaded?.(data);

      // Fetch last month revenue for comparison
      await fetchLastMonthRevenue();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManualAnalytics = async () => {
    try {
      // Get pharmacies under this group
      const { data: pharmacies } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("group_id", groupId)
        .eq("type", "pharmacy");

      const pharmacyIds = pharmacies?.map(p => p.id) || [];
      const activeCount = pharmacies?.filter(p => p.status === "active").length || 0;

      // Get orders for these pharmacies
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount, commission_amount, created_at")
        .in("profile_id", pharmacyIds)
        .is("void", false);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalCommission = orders?.reduce((sum, o) => sum + (o.commission_amount || 0), 0) || 0;
      const ordersThisMonth = orders?.filter(o => new Date(o.created_at) >= startOfMonth).length || 0;
      const revenueThisMonth = orders
        ?.filter(o => new Date(o.created_at) >= startOfMonth)
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Get group settings
      const { data: groupData } = await supabase
        .from("profiles")
        .select("display_name, commission_rate, bypass_min_price, can_manage_pricing")
        .eq("id", groupId)
        .single();

      const manualAnalytics: GroupAnalytics = {
        group_id: groupId,
        group_name: groupData?.display_name || "",
        commission_rate: groupData?.commission_rate || 0,
        bypass_min_price: groupData?.bypass_min_price || false,
        can_manage_pricing: groupData?.can_manage_pricing || false,
        total_pharmacies: pharmacies?.length || 0,
        active_pharmacies: activeCount,
        total_orders: orders?.length || 0,
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        orders_this_month: ordersThisMonth,
        revenue_this_month: revenueThisMonth,
      };

      setAnalytics(manualAnalytics);
      onDataLoaded?.(manualAnalytics);
    } catch (err) {
      console.error("Manual analytics error:", err);
    }
  };

  const fetchLastMonthRevenue = async () => {
    try {
      const now = new Date();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: pharmacies } = await supabase
        .from("profiles")
        .select("id")
        .eq("group_id", groupId)
        .eq("type", "pharmacy");

      const pharmacyIds = pharmacies?.map(p => p.id) || [];

      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount")
        .in("profile_id", pharmacyIds)
        .gte("created_at", startOfLastMonth.toISOString())
        .lt("created_at", startOfCurrentMonth.toISOString())
        .is("void", false);
      const revenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      setLastMonthRevenue(revenue);
    } catch (err) {
      console.error("Error fetching last month revenue:", err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRevenueChange = () => {
    if (!analytics || lastMonthRevenue === 0) return null;
    const change = ((analytics.revenue_this_month - lastMonthRevenue) / lastMonthRevenue) * 100;
    return change;
  };

  const revenueChange = getRevenueChange();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const stats = [
    {
      title: "Total Pharmacies",
      value: analytics.total_pharmacies.toString(),
      subValue: `${analytics.active_pharmacies} active`,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Orders",
      value: analytics.total_orders.toString(),
      subValue: `${analytics.orders_this_month} this month`,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(analytics.total_revenue),
      subValue: `${formatCurrency(analytics.revenue_this_month)} this month`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: revenueChange,
    },
    {
      title: "Commission Earned",
      value: formatCurrency(analytics.total_commission),
      subValue: `${analytics.commission_rate}% rate`,
      icon: Percent,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="relative overflow-hidden">
          <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10", stat.bgColor)} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={cn("p-2 rounded-lg", stat.bgColor)}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change !== undefined && stat.change !== null && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    stat.change >= 0 ? "text-green-600 border-green-200" : "text-red-600 border-red-200"
                  )}
                >
                  {stat.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                  )}
                  {Math.abs(stat.change).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
