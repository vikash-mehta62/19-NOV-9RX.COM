import { ModernStatCard } from "@/components/modern/ModernStatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { DashboardStats } from "@/pages/admin/dashboardService";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface StatsGridProps {
  stats: DashboardStats | null;
  revenueChartData: { date: string; revenue: number }[];
  isLoading: boolean;
}

export function StatsGrid({ stats, revenueChartData, isLoading }: StatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const formatTrend = (trend: { change: number; direction: 'up' | 'down' | 'neutral' }) => {
    if (trend.direction === 'neutral') return '0%';
    return `${trend.direction === 'up' ? '+' : '-'}${trend.change}%`;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <ModernStatCard
        title="Total Sales"
        value={`$${stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        change={formatTrend(stats.salesTrend)}
        trend={stats.salesTrend.direction}
        subtitle="vs previous period"
        color="blue"
        chart={
          revenueChartData.length > 0 ? (
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData.slice(-7)}>
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : undefined
        }
      />
      <ModernStatCard
        title="Total Orders"
        value={stats.totalOrders.toLocaleString()}
        change={formatTrend(stats.ordersTrend)}
        trend={stats.ordersTrend.direction}
        subtitle="vs previous period"
        color="red"
        icon={<ShoppingCart className="w-6 h-6" />}
      />
      <ModernStatCard
        title="Total Customers"
        value={stats.totalCustomers.toLocaleString()}
        change={formatTrend(stats.customersTrend)}
        trend={stats.customersTrend.direction}
        subtitle="vs previous period"
        color="green"
        icon={<Users className="w-6 h-6" />}
      />
      <ModernStatCard
        title="Avg Order Value"
        value={`$${stats.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        change={formatTrend(stats.avgOrderTrend)}
        trend={stats.avgOrderTrend.direction}
        subtitle="vs previous period"
        color="purple"
        icon={<TrendingUp className="w-6 h-6" />}
      />
    </div>
  );
}
