import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, FileText, Package, TrendingUp, DollarSign, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, description, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface GroupStatsProps {
  groupId?: string;
  totalLocations?: number;
}

export function GroupStats({ groupId, totalLocations = 0 }: GroupStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPharmacies: 0,
    activePharmacies: 0,
    totalOrders: 0,
    ordersThisMonth: 0,
    totalRevenue: 0,
    revenueThisMonth: 0,
    totalCommission: 0,
    commissionRate: 0,
  });

  useEffect(() => {
    if (groupId) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [groupId]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Try to fetch from group_analytics view first
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("group_analytics")
        .select("*")
        .eq("group_id", groupId)
        .single();

      if (!analyticsError && analyticsData) {
        setStats({
          totalPharmacies: Number(analyticsData.total_pharmacies) || 0,
          activePharmacies: Number(analyticsData.active_pharmacies) || 0,
          totalOrders: Number(analyticsData.total_orders) || 0,
          ordersThisMonth: Number(analyticsData.orders_this_month) || 0,
          totalRevenue: Number(analyticsData.total_revenue) || 0,
          revenueThisMonth: Number(analyticsData.revenue_this_month) || 0,
          totalCommission: Number(analyticsData.total_commission) || 0,
          commissionRate: Number(analyticsData.commission_rate) || 0,
        });
      } else {
        // Fallback: calculate manually
        await fetchManualStats();
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManualStats = async () => {
    try {
      // Get pharmacies
      const { data: pharmacies } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("group_id", groupId)
        .eq("type", "pharmacy");

      const pharmacyIds = pharmacies?.map((p) => p.id) || [];
      const activeCount = pharmacies?.filter((p) => p.status === "active").length || 0;

      // Get orders
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount, commission_amount, created_at")
        .in("profile_id", pharmacyIds)
        .is("void", false);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalCommission = orders?.reduce((sum, o) => sum + (o.commission_amount || 0), 0) || 0;
      const ordersThisMonth = orders?.filter((o) => new Date(o.created_at) >= startOfMonth).length || 0;
      const revenueThisMonth = orders
        ?.filter((o) => new Date(o.created_at) >= startOfMonth)
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Get commission rate
      const { data: groupData } = await supabase
        .from("profiles")
        .select("commission_rate")
        .eq("id", groupId)
        .single();

      setStats({
        totalPharmacies: pharmacies?.length || 0,
        activePharmacies: activeCount,
        totalOrders: orders?.length || 0,
        ordersThisMonth,
        totalRevenue,
        revenueThisMonth,
        totalCommission,
        commissionRate: groupData?.commission_rate || 0,
      });
    } catch (err) {
      console.error("Error in manual stats:", err);
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

  const displayStats = [
    {
      title: "Pharmacies",
      value: stats.totalPharmacies.toString(),
      icon: Building2,
      description: `${stats.activePharmacies} active`,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      icon: FileText,
      description: `${stats.ordersThisMonth} this month`,
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: `${formatCurrency(stats.revenueThisMonth)} this month`,
    },
    {
      title: "Commission",
      value: formatCurrency(stats.totalCommission),
      icon: Percent,
      description: `${stats.commissionRate}% rate`,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {displayStats.map((stat) => (
        <StatCard key={stat.title} {...stat} loading={loading} />
      ))}
    </div>
  );
}
