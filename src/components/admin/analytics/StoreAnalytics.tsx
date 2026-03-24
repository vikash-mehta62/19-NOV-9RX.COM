import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Store, TrendingUp, DollarSign, ShoppingCart } from "lucide-react";

interface StoreAnalyticsProps {
  dateRange: { from: Date; to: Date };
  refresh?: boolean;
  selectedProducts?: string[];
}

export function StoreAnalytics({ dateRange, refresh, selectedProducts = [] }: StoreAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [topStores, setTopStores] = useState<any[]>([]);
  const [storeGrowth, setStoreGrowth] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStores: 0,
    activeStores: 0,
    totalRevenue: 0,
    avgRevenuePerStore: 0
  });

  useEffect(() => {
    fetchStoreAnalytics();
  }, [dateRange, refresh, selectedProducts]);

  const fetchStoreAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all stores
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, company_name, first_name, last_name, email, type, status')
        .in('type', ['pharmacy', 'hospital', 'group'])
        .eq('status', 'active');

      if (profilesError) throw profilesError;

      // Fetch orders in date range
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, profile_id, total_amount, created_at, poApproved, items')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      if (ordersError) throw ordersError;

      // Filter sales orders (not purchase orders)
      const orders = allOrders?.filter(o => !o.poApproved) || [];

      console.log('🟡 STORES TAB - Total sales orders (before product filter):', orders?.length);

      // Filter by selected products if any
      let filteredOrders = orders || [];
      let orderRevenueMap = new Map<string, number>();
      
      if (selectedProducts.length > 0) {
        const orderIds = orders?.map(o => o.id) || [];
        
        // Fetch order items with product filter from order_items table
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('order_id, product_id, quantity, unit_price')
          .in('order_id', orderIds)
          .in('product_id', selectedProducts);

        const allOrderItems: any[] = [...(orderItems || [])];

        // ALSO parse items from orders.items JSON column (legacy orders)
        orders?.forEach((order: any) => {
          if (!order.items || !Array.isArray(order.items)) return;
          
          try {
            order.items.forEach((itemWrapper: any) => {
              const productId = itemWrapper.productId || itemWrapper.product_id;
              
              // Only include if product is in selected products
              if (!selectedProducts.includes(productId)) return;
              
              const soldSizes = Array.isArray(itemWrapper.sizes) ? itemWrapper.sizes : [];
              
              soldSizes.forEach((soldSize: any) => {
                allOrderItems.push({
                  order_id: order.id,
                  product_id: productId,
                  quantity: Number(soldSize.quantity) || 0,
                  unit_price: Number(soldSize.price) || 0
                });
              });
            });
          } catch (e) {
            console.error('Error parsing order items JSON:', e, order.id);
          }
        });

        // Calculate actual revenue from filtered items
        allOrderItems?.forEach(item => {
          const revenue = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
          const currentRevenue = orderRevenueMap.get(item.order_id) || 0;
          orderRevenueMap.set(item.order_id, currentRevenue + revenue);
        });

        const orderIdsWithProducts = new Set(allOrderItems?.map(item => item.order_id));
        filteredOrders = orders?.filter(order => orderIdsWithProducts.has(order.id)) || [];
        console.log('🟡 STORES TAB - Orders after product filter:', filteredOrders.length);
      }

      // Aggregate by store
      const storeMap = new Map();
      let totalRevenue = 0;
      const activeStoreIds = new Set();
      const allActiveStoreIds = new Set();

      // Calculate active stores from ALL orders (not filtered)
      orders?.forEach(order => {
        if (order.profile_id) {
          allActiveStoreIds.add(order.profile_id);
        }
      });

      filteredOrders?.forEach(order => {
        const storeId = order.profile_id;
        if (!storeId) return;

        activeStoreIds.add(storeId);
        
        // Use calculated revenue from order items if product filter is applied
        const amount = selectedProducts.length > 0 
          ? (orderRevenueMap.get(order.id) || 0)
          : parseFloat(order.total_amount || 0);
        
        totalRevenue += amount;

        const existing = storeMap.get(storeId) || {
          id: storeId,
          orderCount: 0,
          revenue: 0
        };
        existing.orderCount += 1;
        existing.revenue += amount;
        storeMap.set(storeId, existing);
      });

      // Merge with profile data
      const storesWithData = profiles?.map(profile => {
        const storeData = storeMap.get(profile.id) || { orderCount: 0, revenue: 0 };
        const fullName = profile.company_name || `${profile.first_name} ${profile.last_name}` || profile.email;
        return {
          id: profile.id,
          name: fullName,
          type: profile.type,
          orderCount: storeData.orderCount,
          revenue: storeData.revenue,
          avgOrderValue: storeData.orderCount > 0 ? storeData.revenue / storeData.orderCount : 0
        };
      }) || [];

      // Sort by revenue
      const sortedStores = storesWithData
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20);

      setTopStores(sortedStores);

      // Calculate monthly growth
      const monthlyData = new Map();
      filteredOrders?.forEach(order => {
        const month = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        const existing = monthlyData.get(month) || { month, revenue: 0, orders: 0 };
        
        // Use calculated revenue from order items if product filter is applied
        const amount = selectedProducts.length > 0 
          ? (orderRevenueMap.get(order.id) || 0)
          : parseFloat(order.total_amount || 0);
        
        existing.revenue += amount;
        existing.orders += 1;
        monthlyData.set(month, existing);
      });

      setStoreGrowth(Array.from(monthlyData.values()));

      console.log('🟡 STORES TAB - Final Revenue:', totalRevenue, 'Orders:', filteredOrders.length);
      console.log('🟡 STORES TAB - Active Stores (all):', allActiveStoreIds.size, 'Active Stores (filtered):', activeStoreIds.size);

      // Use filtered active stores for average when products are selected
      const storesForAverage = selectedProducts.length > 0 ? activeStoreIds.size : allActiveStoreIds.size;
      console.log('🟡 STORES TAB - Using stores for average:', storesForAverage);

      setStats({
        totalStores: profiles?.length || 0,
        activeStores: allActiveStoreIds.size,
        totalRevenue,
        avgRevenuePerStore: storesForAverage > 0 ? totalRevenue / storesForAverage : 0
      });

    } catch (error) {
      console.error('Error fetching store analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStores}</div>
            <p className="text-xs text-muted-foreground">Registered stores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
            <Store className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStores}</div>
            <p className="text-xs text-muted-foreground">With orders in period</p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From all stores</p>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Store</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgRevenuePerStore.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stores */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 20 Stores by Revenue</CardTitle>
            <CardDescription>Best performing stores in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStores} margin={{ top: 10, right: 30, left: 20, bottom: 110 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={100} tick={{ fontSize: 12 }} />
                  <YAxis
                    domain={[0, 'dataMax']}
                    tickFormatter={(value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}
                    tickCount={6}
                  />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue across all stores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={storeGrowth} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    domain={[0, 'dataMax']}
                    tickFormatter={(value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}
                    tickCount={6}
                  />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Store Performance Details</CardTitle>
          <CardDescription>Detailed breakdown of store performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Store Name</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2 text-right">Orders</div>
              <div className="col-span-2 text-right">Revenue</div>
              <div className="col-span-1 text-right">Avg</div>
            </div>
            {topStores.map((store, index) => (
              <div key={store.id} className="grid grid-cols-12 gap-4 text-sm items-center py-2 hover:bg-muted/50 rounded-lg">
                <div className="col-span-1">
                  <Badge variant="outline">{index + 1}</Badge>
                </div>
                <div className="col-span-4 font-medium truncate">{store.name}</div>
                <div className="col-span-2">
                  <Badge variant="secondary" className="capitalize">{store.type}</Badge>
                </div>
                <div className="col-span-2 text-right">{store.orderCount}</div>
                <div className="col-span-2 text-right font-semibold text-green-600">
                  ${store.revenue.toFixed(2)}
                </div>
                <div className="col-span-1 text-right text-xs text-muted-foreground">
                  ${store.avgOrderValue.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
