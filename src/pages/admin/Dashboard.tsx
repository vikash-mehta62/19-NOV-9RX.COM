import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModernCard } from "@/components/modern/ModernCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
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
  Eye,
  DollarSign,
} from "lucide-react";
import { AccessRequestDetailDialog } from "@/components/admin/AccessRequestDetailDialog";
import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { StatsGrid } from "@/components/admin/dashboard/StatsGrid";
import { LowStockAlert } from "@/components/admin/dashboard/LowStockAlert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DashboardStats,
  LowStockProduct,
  fetchDashboardStats,
  fetchDashboardAlerts,
  fetchRevenueChartData,
  fetchTopProducts,
  getDateRange,
} from "./dashboardService";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueChartData, setRevenueChartData] = useState<{ date: string; revenue: number }[]>([]);
  const [ordersData, setOrdersData] = useState<{ status: string; count: number }[]>([]);
  
  // Alerts
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [pendingAccessRequests, setPendingAccessRequests] = useState<any[]>([]);
  const [recentAccessRequests, setRecentAccessRequests] = useState<any[]>([]);
  
  // Lists
  const [topPharmacies, setTopPharmacies] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [bestPerformingProducts, setBestPerformingProducts] = useState<any[]>([]);
  const [outstandingPharmacies, setOutstandingPharmacies] = useState<any[]>([]);
  const [agingBuckets, setAgingBuckets] = useState({ b0_30: 0, b31_60: 0, b61_90: 0, b90_plus: 0, total: 0 });
  
  // Counts
  const [userCounts, setUserCounts] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Dialog
  const [selectedAccessRequest, setSelectedAccessRequest] = useState<any | null>(null);
  const [accessRequestDialogOpen, setAccessRequestDialogOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [
        dashboardStats,
        alerts,
        chartData,
        topProducts,
      ] = await Promise.all([
        fetchDashboardStats(timeRange),
        fetchDashboardAlerts(),
        fetchRevenueChartData(timeRange),
        fetchTopProducts(timeRange),
      ]);

      setStats(dashboardStats);
      setLowStockProducts(alerts.lowStockProducts);
      setRevenueChartData(chartData);
      setBestPerformingProducts(topProducts);

      // Load additional data
      await Promise.all([
        loadPendingAccessRequests(),
        loadRecentAccessRequests(),
        loadRecentOrders(),
        loadTopPharmacies(),
        loadOutstandingPayments(),
        loadUserCounts(),
        loadTotalProducts(),
      ]);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load some dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, toast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time subscription for pending access requests
  useEffect(() => {
    const channel = supabase
      .channel('pending-access-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'status=eq.pending'
        },
        () => {
          loadPendingAccessRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPendingAccessRequests = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, company_name, type, created_at, status, mobile_phone, work_phone, billing_address, shipping_address, license_number, dea_number, npi_number, tax_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching pending requests:', error);
      return;
    }
    setPendingAccessRequests(data || []);
  };

  // Load recent access requests (only PENDING status)
  const loadRecentAccessRequests = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, company_name, type, created_at, status, mobile_phone, work_phone')
      .eq('status', 'pending')
      .neq('type', 'admin')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching recent access requests:', error);
      return;
    }
    setRecentAccessRequests(data || []);
  };

  const loadRecentOrders = async () => {
    const { from } = getDateRange(timeRange);
    let query = supabase
      .from('orders')
      .select('id, total_amount, status, profile_id, created_at, order_number, payment_status')
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (from) {
      query = query.gte('created_at', from.toISOString());
    }

    const { data } = await query;
    setRecentOrders(data || []);

    // Process orders by status
    if (data) {
      const statusCounts = new Map<string, number>();
      data.forEach(order => {
        const status = order.status || 'unknown';
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });
      setOrdersData(Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })));
    }
  };

  const loadTopPharmacies = async () => {
    const { from } = getDateRange(timeRange);
    let query = supabase
      .from('orders')
      .select('profile_id, total_amount')
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null);

    if (from) {
      query = query.gte('created_at', from.toISOString());
    }

    const { data: orders } = await query;
    if (!orders) return;

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
        setTopPharmacies(topPharms.map(p => ({ ...p, name: nameMap.get(p.id) || p.id })));
      }
    }
  };

  const loadOutstandingPayments = async () => {
    const { from } = getDateRange(timeRange);
    let query = supabase
      .from('orders')
      .select('id, total_amount, profile_id, created_at, payment_status')
      .eq('payment_status', 'unpaid')
      .or('void.eq.false,void.is.null')
      .is('deleted_at', null);

    if (from) {
      query = query.gte('created_at', from.toISOString());
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
  };

  const loadUserCounts = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("type")
      .neq("type", "admin");

    if (data) {
      const typeCounts = data.reduce((acc: any, user) => {
        acc[user.type] = (acc[user.type] || 0) + 1;
        return acc;
      }, {});
      setUserCounts(Object.entries(typeCounts).map(([type, count]) => ({ type, count })));
    }
  };

  const loadTotalProducts = async () => {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    setTotalProducts(count || 0);
  };

  const handleViewAccessRequest = (request: any) => {
    setSelectedAccessRequest(request);
    setAccessRequestDialogOpen(true);
  };

  const handleApproveAccess = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active', account_status: 'approved' })
        .eq('id', profileId);

      if (error) throw error;

      toast({ title: 'Access Approved', description: 'User has been granted access.' });
      loadPendingAccessRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve access.', variant: 'destructive' });
    }
  };

  const handleRejectAccess = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected', account_status: 'rejected' })
        .eq('id', profileId);

      if (error) throw error;

      toast({ title: 'Access Rejected', description: 'User request has been rejected.' });
      loadPendingAccessRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject access.', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <DashboardHeader
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onRefresh={loadAllData}
          isLoading={isLoading}
          lastUpdated={lastUpdated || undefined}
        />

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={loadAllData} className="mt-2">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <StatsGrid stats={stats} revenueChartData={revenueChartData} isLoading={isLoading} />

        {/* Low Stock Alert - NEW! */}
        <LowStockAlert products={lowStockProducts} isLoading={isLoading} />

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
                {pendingAccessRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium">
                        {request.company_name || `${request.first_name} ${request.last_name}`}
                      </div>
                      <div className="text-sm text-muted-foreground">{request.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{request.type}</Badge>
                      <Button size="sm" variant="outline" onClick={() => handleViewAccessRequest(request)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveAccess(request.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectAccess(request.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
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
                <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => <Skeleton key={j} className="h-16 w-full" />)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                          <Badge variant={
                            order.status === 'delivered' ? 'default' :
                            order.status === 'processing' ? 'secondary' :
                            order.status === 'new' ? 'outline' : 'destructive'
                          }>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Access Requests Section - Only Pending */}
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-xs lg:font-bold">
                    <Bell className="h-5 w-5 text-orange-600 lg:text-xs lg:font-bold" />
                    Access Requests
                    {recentAccessRequests.length > 0 && (
                      <Badge variant="destructive" className="ml-1">{recentAccessRequests.length} pending</Badge>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/admin/access-requests'}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 lg:text-xs lg:font-bold lg:text-wrap"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentAccessRequests.length > 0 ? (
                  <div className="space-y-2">
                    {recentAccessRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="flex items-center justify-between p-2 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleViewAccessRequest(request)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {request.company_name || `${request.first_name} ${request.last_name}`}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{request.email}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge variant="outline" className="capitalize text-xs">{request.type}</Badge>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">Pending</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No pending requests
                  </div>
                )}
              </CardContent>
            </Card>

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
                      <div className="flex flex-col gap-2 justify-between text-sm">
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
                          style={{ width: `${Math.min(100, (product.revenue / Math.max(1, bestPerformingProducts[0]?.revenue || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {bestPerformingProducts.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No product data available</div>
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
                        <div className="h-2 rounded bg-red-600" style={{ width: `${Math.min(100, (p.outstanding / Math.max(1, outstandingPharmacies[0]?.outstanding || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold mb-3">AR Aging Analysis</h4>
                  <div className="space-y-4">
                    {[
                      { label: '0–30 days', value: agingBuckets.b0_30, color: 'bg-green-500' },
                      { label: '31–60 days', value: agingBuckets.b31_60, color: 'bg-yellow-500' },
                      { label: '61–90 days', value: agingBuckets.b61_90, color: 'bg-orange-500' },
                      { label: '90+ days', value: agingBuckets.b90_plus, color: 'bg-red-600' },
                    ].map((bucket) => (
                      <div key={bucket.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${bucket.color}`}></div>
                            {bucket.label}
                          </span>
                          <span className="font-semibold">${bucket.value.toFixed(2)}</span>
                        </div>
                        <div className="h-2 rounded bg-muted">
                          <div className={`h-2 rounded ${bucket.color}`} style={{ width: `${agingBuckets.total ? Math.min(100, (bucket.value / agingBuckets.total) * 100) : 0}%` }} />
                        </div>
                      </div>
                    ))}
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
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <ModernCard className="lg:col-span-2 xl:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Sales Report</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ModernCard>

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

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/admin/users'}>View All</Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-500 pb-2 border-b">
                <div>#</div>
                <div className="col-span-2">Customer</div>
                <div>Orders</div>
                <div>Revenue</div>
              </div>
              {topPharmacies.slice(0, 5).map((pharmacy, idx) => (
                <div key={pharmacy.id} className="grid grid-cols-5 gap-4 text-sm items-center">
                  <div className="text-gray-600">{idx + 1}</div>
                  <div className="flex items-center gap-2 col-span-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-semibold">
                      {pharmacy.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 truncate">{pharmacy.name}</span>
                  </div>
                  <div className="font-medium text-gray-900">{pharmacy.count}</div>
                  <div className="font-medium text-gray-900">${pharmacy.value.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </ModernCard>

          <ModernCard className="bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Period Sales</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  ${stats?.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </h3>
                {stats && (
                  <Badge className={`mt-2 ${stats.salesTrend.direction === 'up' ? 'bg-green-100 text-green-700' : stats.salesTrend.direction === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                    {stats.salesTrend.direction === 'up' ? '+' : stats.salesTrend.direction === 'down' ? '-' : ''}{stats.salesTrend.change}%
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">Total for selected period</div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData.slice(-30)}>
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
                <span className="text-sm font-semibold">{stats?.totalOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Revenue</span>
                </div>
                <span className="text-sm font-semibold">${stats?.totalSales.toLocaleString() || '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AccessRequestDetailDialog
        request={selectedAccessRequest}
        open={accessRequestDialogOpen}
        onOpenChange={setAccessRequestDialogOpen}
        onStatusUpdate={() => {
          loadPendingAccessRequests();
          setSelectedAccessRequest(null);
        }}
      />
    </DashboardLayout>
  );
};

export default AdminDashboard;
