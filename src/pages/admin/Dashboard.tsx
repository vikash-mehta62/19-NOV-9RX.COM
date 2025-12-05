import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModernStatCard } from "@/components/modern/ModernStatCard";
import { ModernCard } from "@/components/modern/ModernCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  PackageSearch,
  Bell,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    revenue: 0,
  });
  const [userCounts, setUserCounts] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [topPharmacies, setTopPharmacies] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingAccessRequests, setPendingAccessRequests] = useState<any[]>([]);
  const [bestPerformingProducts, setBestPerformingProducts] = useState<any[]>([]);
  const [outstandingPharmacies, setOutstandingPharmacies] = useState<any[]>([]);
  const [agingBuckets, setAgingBuckets] = useState<{ b0_30: number; b31_60: number; b61_90: number; b90_plus: number; total: number }>({ b0_30: 0, b31_60: 0, b61_90: 0, b90_plus: 0, total: 0 });

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadDashboardData(),
        loadPendingAccessRequests(),
        loadBestPerformingProducts(),
        loadOutstandingPayments(),
      ]);
      setIsLoading(false);
    };
    loadAllData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('id, total_amount, status, profile_id, created_at, order_number, payment_status')
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply time range filter only if not "all"
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
        const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', dateFrom);
      }

      const { data: orders } = await query;

      if (orders) {
        // Calculate stats
        const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        setStats({
          totalSales: totalRevenue,
          totalOrders: orders.length,
          totalCustomers: new Set(orders.map(o => o.profile_id)).size,
          revenue: totalRevenue / orders.length || 0,
        });

        // Set recent orders
        setRecentOrders(orders.slice(0, 10));

        // Process revenue by month
        const monthlyRevenue = new Map<string, number>();
        orders.forEach(order => {
          const date = new Date(order.created_at);
          const month = date.toLocaleString('default', { month: 'short' });
          monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + (parseFloat(order.total_amount) || 0));
        });
        setRevenueData(Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
          month,
          revenue,
        })));

        // Process orders by status
        const statusCounts = new Map<string, number>();
        orders.forEach(order => {
          const status = order.status || 'unknown';
          statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
        });
        setOrdersData(Array.from(statusCounts.entries()).map(([status, count]) => ({
          status,
          count,
        })));

        // Top pharmacies
        const pharmacyRevenue = new Map<string, { count: number; value: number }>();
        orders.forEach(order => {
          const pid = order.profile_id || 'unknown';
          const prev = pharmacyRevenue.get(pid) || { count: 0, value: 0 };
          prev.count += 1;
          prev.value += parseFloat(order.total_amount) || 0;
          pharmacyRevenue.set(pid, prev);
        });

        const topPharms = Array.from(pharmacyRevenue.entries())
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        // Fetch pharmacy names
        if (topPharms.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, company_name, first_name, last_name, email')
            .in('id', topPharms.map(p => p.id));

          if (profiles) {
            const nameMap = new Map(profiles.map(p => [
              p.id,
              p.company_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id,
            ]));
            setTopPharmacies(topPharms.map(p => ({
              ...p,
              name: nameMap.get(p.id) || p.id,
            })));
          }
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadPendingAccessRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, company_name, type, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingAccessRequests(data || []);
    } catch (error) {
      console.error('Error loading pending access requests:', error);
    }
  };

  const loadBestPerformingProducts = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('items')
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      // Apply time range filter only if not "all"
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
        const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', dateFrom);
      }

      const { data: orders } = await query;

      if (!orders) return;

      const productStats = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();

      for (const order of orders) {
        if (!order.items || !Array.isArray(order.items)) continue;
        for (const item of order.items) {
          const productId = item.product_id || item.id;
          const quantity = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          const revenue = quantity * price;

          const existing = productStats.get(productId) || { id: productId, name: item.name || item.product_name || 'Unknown', quantity: 0, revenue: 0 };
          existing.quantity += quantity;
          existing.revenue += revenue;
          productStats.set(productId, existing);
        }
      }

      const sorted = Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
      setBestPerformingProducts(sorted);
    } catch (error) {
      console.error('Error loading best performing products:', error);
    }
  };

  const loadOutstandingPayments = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('id, total_amount, profile_id, created_at, payment_status')
        .eq('payment_status', 'unpaid')
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      // Apply time range filter only if not "all"
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
        const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', dateFrom);
      }

      const { data: orders } = await query;

      if (!orders) return;

      const pharmacyOutstanding = new Map<string, { id: string; outstanding: number; oldestDate: string }>();
      const buckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90_plus: 0, total: 0 };

      for (const order of orders) {
        const pid = order.profile_id || 'unknown';
        const amount = parseFloat(order.total_amount) || 0;
        const age = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (24 * 60 * 60 * 1000));

        const existing = pharmacyOutstanding.get(pid) || { id: pid, outstanding: 0, oldestDate: order.created_at };
        existing.outstanding += amount;
        if (new Date(order.created_at) < new Date(existing.oldestDate)) {
          existing.oldestDate = order.created_at;
        }
        pharmacyOutstanding.set(pid, existing);

        if (age <= 30) buckets.b0_30 += amount;
        else if (age <= 60) buckets.b31_60 += amount;
        else if (age <= 90) buckets.b61_90 += amount;
        else buckets.b90_plus += amount;
        buckets.total += amount;
      }

      const sorted = Array.from(pharmacyOutstanding.values()).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);

      if (sorted.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, company_name, first_name, last_name, email')
          .in('id', sorted.map(p => p.id));

        if (profiles) {
          const nameMap = new Map(profiles.map(p => [p.id, p.company_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id]));
          setOutstandingPharmacies(sorted.map(p => ({
            ...p,
            name: nameMap.get(p.id) || p.id,
            daysOutstanding: Math.floor((Date.now() - new Date(p.oldestDate).getTime()) / (24 * 60 * 60 * 1000)),
          })));
        }
      }

      setAgingBuckets(buckets);
    } catch (error) {
      console.error('Error loading outstanding payments:', error);
    }
  };

  const handleApproveAccess = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active', account_status: 'approved' })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Access Approved',
        description: 'User has been granted access to the system.',
      });
      loadPendingAccessRequests();
    } catch (error) {
      console.error('Error approving access:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve access request.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectAccess = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected', account_status: 'rejected' })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Access Rejected',
        description: 'User access request has been rejected.',
      });
      loadPendingAccessRequests();
    } catch (error) {
      console.error('Error rejecting access:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject access request.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const fetchUserCounts = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("type")
        .neq("type", "admin");

      if (error) {
        console.error("Error fetching user types:", error);
        return;
      }

      const typeCounts = data.reduce((acc: any, user) => {
        acc[user.type] = (acc[user.type] || 0) + 1;
        return acc;
      }, {});

      const formattedCounts = Object.entries(typeCounts).map(
        ([type, count]) => ({
          type,
          count,
        })
      );

      setUserCounts(formattedCounts);
    };

    const fetchTotalProducts = async () => {
      const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error("Error fetching total products count:", error);
        return;
      }

      setTotalProducts(count || 0);
    };

    fetchTotalProducts();
    fetchUserCounts();
  }, []);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header with Time Range Selector */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your business, view analytics, and handle administrative tasks.
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange} disabled={isLoading}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="all">All Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Modern Stats Cards */}
        {isLoading ? (
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
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <ModernStatCard
              title="Total Sales"
              value={`$${stats.totalSales.toLocaleString()}`}
              change="+13.4%"
              trend="up"
              subtitle="Since last week"
              color="blue"
              chart={
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData.slice(-7)}>
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              }
            />
            <ModernStatCard
              title="Total Orders"
              value={stats.totalOrders.toLocaleString()}
              change="+13.4%"
              trend="up"
              subtitle="Since last week"
              color="red"
              icon={<ShoppingCart className="w-6 h-6" />}
            />
            <ModernStatCard
              title="Total Customers"
              value={stats.totalCustomers.toLocaleString()}
              change="+13.4%"
              trend="up"
              subtitle="Since last week"
              color="green"
              icon={<Users className="w-6 h-6" />}
            />
            <ModernStatCard
              title="Avg per Order"
              value={`$${Math.round(stats.revenue).toLocaleString()}`}
              change="+2%"
              trend="up"
              subtitle="Average revenue"
              color="purple"
              icon={<TrendingUp className="w-6 h-6" />}
            />
          </div>
        )}

        {/* Pending Access Requests */}
        {pendingAccessRequests.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  Pending Access Requests
                  <Badge variant="destructive">{pendingAccessRequests.length}</Badge>
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/admin/access-requests'}
                  className="bg-white"
                >
                  View All Requests
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingAccessRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium">
                        {request.company_name || `${request.first_name} ${request.last_name}`}
                      </div>
                      <div className="text-sm text-muted-foreground">{request.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{request.type}</Badge>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApproveAccess(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectAccess(request.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders & Best Products */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <Skeleton key={j} className="h-16 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            {recentOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">Order #{order.order_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${parseFloat(order.total_amount).toFixed(2)}</div>
                          <Badge
                            variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'processing' ? 'secondary' :
                              order.status === 'new' ? 'outline' : 'destructive'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best Performing Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Best Performing Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bestPerformingProducts.slice(0, 5).map((product, index) => (
                    <div key={product.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                            {index + 1}
                          </Badge>
                          <span className="truncate">{product.name}</span>
                        </div>
                        <div className="text-muted-foreground">
                          ${product.revenue.toFixed(2)} · {product.quantity} units
                        </div>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-green-600"
                          style={{
                            width: `${Math.min(100, (product.revenue / Math.max(1, bestPerformingProducts[0]?.revenue || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {bestPerformingProducts.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No product data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Outstanding Payments & AR Aging */}
        {outstandingPharmacies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Outstanding Payments & AR Aging
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-3">Pharmacies with Outstanding Payments</h4>
                  {outstandingPharmacies.map((p) => (
                    <div key={p.id} className="space-y-1 p-2 hover:bg-muted rounded-lg">
                      <div className="flex justify-between text-sm">
                        <div className="truncate flex-1">{p.name}</div>
                        <div className="text-right ml-2">
                          <div className="font-semibold text-red-600">${p.outstanding.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {p.daysOutstanding} days overdue
                          </div>
                        </div>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-red-600"
                          style={{
                            width: `${Math.min(100, (p.outstanding / Math.max(1, outstandingPharmacies[0]?.outstanding || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold mb-3">AR Aging Analysis</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-green-500"></div>
                          0–30 days
                        </span>
                        <span className="font-semibold">${agingBuckets.b0_30.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-green-500"
                          style={{
                            width: `${agingBuckets.total ? Math.min(100, (agingBuckets.b0_30 / agingBuckets.total) * 100) : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-yellow-500"></div>
                          31–60 days
                        </span>
                        <span className="font-semibold">${agingBuckets.b31_60.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-yellow-500"
                          style={{
                            width: `${agingBuckets.total ? Math.min(100, (agingBuckets.b31_60 / agingBuckets.total) * 100) : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-orange-500"></div>
                          61–90 days
                        </span>
                        <span className="font-semibold">${agingBuckets.b61_90.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-orange-500"
                          style={{
                            width: `${agingBuckets.total ? Math.min(100, (agingBuckets.b61_90 / agingBuckets.total) * 100) : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-red-600"></div>
                          90+ days
                        </span>
                        <span className="font-semibold">${agingBuckets.b90_plus.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div
                          className="h-2 rounded bg-red-600"
                          style={{
                            width: `${agingBuckets.total ? Math.min(100, (agingBuckets.b90_plus / agingBuckets.total) * 100) : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total Outstanding</span>
                        <span className="text-red-600">${agingBuckets.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-6" />
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-6" />
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Report */}
            <ModernCard className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Sales Report</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setTimeRange('all')}>All</Button>
                  <Button variant="ghost" size="sm" onClick={() => setTimeRange('90d')}>90 Days</Button>
                  <Button variant="ghost" size="sm" onClick={() => setTimeRange('30d')}>30 Days</Button>
                  <Button variant="ghost" size="sm" onClick={() => setTimeRange('7d')}>7 Days</Button>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ModernCard>

            {/* Orders by Status */}
            <ModernCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Orders by Status</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersData} layout="vertical">
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis dataKey="status" type="category" stroke="#9ca3af" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ModernCard>
          </div>
        )}

        {/* Bottom Row - Orders List & Monthly Sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers/Pharmacies */}
          <ModernCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-500 pb-2 border-b">
                <div>Num</div>
                <div>Customer</div>
                <div>Orders</div>
                <div>Revenue</div>
                <div>Status</div>
              </div>
              {topPharmacies.slice(0, 5).map((pharmacy, idx) => (
                <div key={pharmacy.id} className="grid grid-cols-6 gap-4 text-sm items-center">
                  <div className="text-gray-600">{idx + 1}</div>
                  <div className="flex items-center gap-2 col-span-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-semibold">
                      {pharmacy.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 truncate">{pharmacy.name}</span>
                  </div>
                  <div className="font-medium text-gray-900">{pharmacy.count}</div>
                  <div className="font-medium text-gray-900">${pharmacy.value.toFixed(0)}</div>
                  <div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>

          {/* Monthly Sales Card */}
          <ModernCard className="bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Monthly Sales</p>
                <h3 className="text-3xl font-bold text-gray-900">${stats.totalSales.toLocaleString()}</h3>
                <Badge className="mt-2 bg-green-100 text-green-700">+13.4%</Badge>
              </div>
              <Select defaultValue="current">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="last">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600 mb-4">Total for selected period</div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData.slice(-30)}>
                  <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ModernCard>
        </div>

        {/* Quick Stats */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between border-r pr-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Active Users</span>
                </div>
                <span className="text-sm font-semibold">{userCounts.reduce((sum, u: any) => sum + u.count, 0)}</span>
              </div>
              <div className="flex items-center justify-between border-r pr-4">
                <div className="flex items-center space-x-2">
                  <PackageSearch className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Products</span>
                </div>
                <span className="text-sm font-semibold">{totalProducts}</span>
              </div>
              <div className="flex items-center justify-between border-r pr-4">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Orders</span>
                </div>
                <span className="text-sm font-semibold">{stats.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Revenue</span>
                </div>
                <span className="text-sm font-semibold">${stats.totalSales.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
