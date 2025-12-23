import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface MonthlyData {
  name: string;
  orders: number;
  revenue: number;
}

interface StatsData {
  totalOrders: number;
  totalRevenue: number;
  totalPharmacies: number;
  avgOrderValue: number;
  ordersTrend: number;
  revenueTrend: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function GroupAnalytics() {
  const userProfile = useSelector(selectUserProfile);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalOrders: 0,
    totalRevenue: 0,
    totalPharmacies: 0,
    avgOrderValue: 0,
    ordersTrend: 0,
    revenueTrend: 0,
  });
  const [statusData, setStatusData] = useState<StatusData[]>([]);

  useEffect(() => {
    if (userProfile?.id) {
      fetchAnalytics();
    }
  }, [userProfile?.id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get all pharmacies in this group
      const { data: pharmacies, error: pharmaciesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("group_id", userProfile.id);

      if (pharmaciesError) throw pharmaciesError;

      const pharmacyIds = pharmacies?.map(p => p.id) || [];
      const totalPharmacies = pharmacyIds.length;

      if (pharmacyIds.length === 0) {
        setStats(prev => ({ ...prev, totalPharmacies: 0 }));
        setLoading(false);
        return;
      }

      // Get all orders for these pharmacies
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total_amount, status, created_at")
        .in("profile_id", pharmacyIds)
        .is("deleted_at", null)
        .eq("void", false);

      if (ordersError) throw ordersError;

      // Calculate stats
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate monthly data for last 6 months
      const monthlyStats: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthOrders = orders?.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        }) || [];

        monthlyStats.push({
          name: format(monthDate, 'MMM'),
          orders: monthOrders.length,
          revenue: monthOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0),
        });
      }

      // Calculate trends (compare current month to previous month)
      const currentMonth = monthlyStats[5];
      const previousMonth = monthlyStats[4];
      
      const ordersTrend = previousMonth.orders > 0 
        ? ((currentMonth.orders - previousMonth.orders) / previousMonth.orders) * 100 
        : 0;
      const revenueTrend = previousMonth.revenue > 0 
        ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100 
        : 0;

      // Calculate status distribution
      const statusCounts: Record<string, number> = {};
      orders?.forEach(o => {
        const status = o.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusColors: Record<string, string> = {
        new: '#4f46e5',
        processing: '#f59e0b',
        shipped: '#06b6d4',
        delivered: '#10b981',
        completed: '#22c55e',
        cancelled: '#ef4444',
      };

      const statusDistribution: StatusData[] = Object.entries(statusCounts).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: statusColors[name] || COLORS[index % COLORS.length],
      }));

      setMonthlyData(monthlyStats);
      setStatusData(statusDistribution);
      setStats({
        totalOrders,
        totalRevenue,
        totalPharmacies,
        avgOrderValue,
        ordersTrend,
        revenueTrend,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="group">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="group">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">View your group's performance metrics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className={`text-xs flex items-center gap-1 ${stats.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(stats.revenueTrend).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className={`text-xs flex items-center gap-1 ${stats.ordersTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.ordersTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(stats.ordersTrend).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pharmacies</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPharmacies}</div>
              <p className="text-xs text-muted-foreground">Active in your group</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">Per order average</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Orders Chart */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Orders (Last 6 Months)</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Revenue Chart */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Revenue (Last 6 Months)</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Order Status Distribution */}
        {statusData.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Order Status Distribution</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-2">
                {statusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
