import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Store,
  Package,
  DollarSign,
  ShoppingCart,
  FileText,
  RefreshCw
} from "lucide-react";
import { ProductAnalytics } from "@/components/admin/analytics/ProductAnalytics";
import { StoreAnalytics } from "@/components/admin/analytics/StoreAnalytics";
import { SalesVsPurchaseAnalytics } from "@/components/admin/analytics/SalesVsPurchaseAnalytics";
import { ReportGenerator } from "@/components/admin/analytics/ReportGenerator";
import { DateRangePicker } from "@/components/admin/analytics/DateRangePicker";
import { ProductFilter } from "@/components/admin/analytics/ProductFilter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Analytics() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [quickStats, setQuickStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeStores: 0,
    productsSold: 0,
    unitsSold: 0
  });

  useEffect(() => {
    fetchQuickStats();
  }, [dateRange, selectedProducts]);

  const fetchQuickStats = async () => {
    try {
      // Fetch orders for revenue and count (without poApproved filter to get all orders)
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, poApproved')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        // Try without poApproved if column doesn't exist
        const { data: ordersWithoutPO } = await supabase
          .from('orders')
          .select('id, total_amount')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .or('void.eq.false,void.is.null')
          .is('deleted_at', null);

        // Filter orders by selected products if any
        let filteredOrders = ordersWithoutPO || [];
        if (selectedProducts.length > 0) {
          const orderIds = ordersWithoutPO?.map(o => o.id) || [];
          if (orderIds.length > 0) {
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('order_id')
              .in('order_id', orderIds)
              .in('product_id', selectedProducts);

            const orderIdsWithProducts = new Set(orderItems?.map(item => item.order_id));
            filteredOrders = ordersWithoutPO?.filter(order => orderIdsWithProducts.has(order.id)) || [];
            console.log("orderItems:--->>>>", orderItems)
          }
        }

        const totalRevenue = filteredOrders?.reduce((sum, order) => sum + parseFloat(String(order.total_amount || '0')), 0) || 0;
        const totalOrders = filteredOrders?.length || 0;

        // Fetch active stores
        const { data: stores } = await supabase
          .from('profiles')
          .select('id')
          .in('type', ['pharmacy', 'hospital', 'group'])
          .eq('status', 'active');

        const activeStores = stores?.length || 0;

        // Fetch products sold (count unique products) and units sold (sum of quantities)
        const orderIds = filteredOrders?.map(o => o.id) || [];
        if (orderIds.length > 0) {
          let itemsQuery = supabase
            .from('order_items')
            .select('product_id, quantity')
            .in('order_id', orderIds);

          // Apply product filter if selected
          if (selectedProducts.length > 0) {
            itemsQuery = itemsQuery.in('product_id', selectedProducts);
          }

          const { data: items } = await itemsQuery;

          // Count unique products
          const uniqueProducts = new Set(items?.map(item => item.product_id).filter(Boolean));
          const productsSold = uniqueProducts.size;

          // Sum total units
          const unitsSold = items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

          setQuickStats({
            totalRevenue,
            totalOrders,
            activeStores,
            productsSold,
            unitsSold
          });
        } else {
          setQuickStats({
            totalRevenue: 0,
            totalOrders: 0,
            activeStores,
            productsSold: 0,
            unitsSold: 0
          });
        }
        return;
      }

      // Filter sales orders (not purchase orders)
      let orders = allOrders?.filter(o => !o.poApproved) || [];

      // Filter orders by selected products if any
      if (selectedProducts.length > 0) {
        const orderIds = orders?.map(o => o.id) || [];
        if (orderIds.length > 0) {
          // Split into chunks to avoid URL length limit
          const chunkSize = 50;
          const allOrderItems: any[] = [];
          
          for (let i = 0; i < orderIds.length; i += chunkSize) {
            const chunk = orderIds.slice(i, i + chunkSize);
            const { data: chunkItems, error } = await supabase
              .from('order_items')
              .select('order_id')
              .in('order_id', chunk)
              .in('product_id', selectedProducts);
            
            if (!error && chunkItems) {
              allOrderItems.push(...chunkItems);
            }
          }

          const orderIdsWithProducts = new Set(allOrderItems.map(item => item.order_id));
          orders = orders?.filter(order => orderIdsWithProducts.has(order.id)) || [];
        }
      }

      const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(String(order.total_amount || '0')), 0) || 0;
      const totalOrders = orders?.length || 0;

      // Fetch active stores
      const { data: stores } = await supabase
        .from('profiles')
        .select('id')
        .in('type', ['pharmacy', 'hospital', 'group'])
        .eq('status', 'active');

      const activeStores = stores?.length || 0;

      // Fetch products sold (count unique products) and units sold (sum of quantities)
      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length > 0) {
        let itemsQuery = supabase
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', orderIds);

        // Apply product filter if selected
        if (selectedProducts.length > 0) {
          itemsQuery = itemsQuery.in('product_id', selectedProducts);
        }

        const { data: items } = await itemsQuery;

        // Count unique products
        const uniqueProducts = new Set(items?.map(item => item.product_id).filter(Boolean));
        const productsSold = uniqueProducts.size;

        // Sum total units
        const unitsSold = items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

        setQuickStats({
          totalRevenue,
          totalOrders,
          activeStores,
          productsSold,
          unitsSold
        });
      } else {
        setQuickStats({
          totalRevenue: 0,
          totalOrders: 0,
          activeStores,
          productsSold: 0,
          unitsSold: 0
        });
      }
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast({
      title: "Refreshing data...",
      description: "Fetching latest analytics data"
    });

    // Trigger refresh
    await fetchQuickStats();

    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Data refreshed",
        description: "Analytics data has been updated"
      });
    }, 1000);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive business intelligence and reporting
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <ProductFilter
                selectedProducts={selectedProducts}
                onProductsChange={setSelectedProducts}
              />
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${quickStats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quickStats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quickStats.activeStores}</div>
              <p className="text-xs text-muted-foreground">Total pharmacies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quickStats.productsSold}</div>
              <p className="text-xs text-muted-foreground">Unique products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quickStats.unitsSold.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total quantity</p>
            </CardContent>
          </Card>

        </div>

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Stores</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <SalesVsPurchaseAnalytics
              dateRange={dateRange}
              refresh={isRefreshing}
              selectedProducts={selectedProducts}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <ProductAnalytics
              dateRange={dateRange}
              refresh={isRefreshing}
              selectedProducts={selectedProducts}
            />
          </TabsContent>

          <TabsContent value="stores" className="space-y-4">
            <StoreAnalytics
              dateRange={dateRange}
              refresh={isRefreshing}
              selectedProducts={selectedProducts}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportGenerator
              dateRange={dateRange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
