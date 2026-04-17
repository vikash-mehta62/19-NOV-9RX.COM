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
import { AdvancedProductFilter } from "@/components/admin/analytics/AdvancedProductFilter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type AnalyticsFilterState = {
  products: string[];
  categories: string[];
  subcategories: string[];
  sizes: string[];
};

export default function Analytics() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [selectedFilters, setSelectedFilters] = useState<AnalyticsFilterState>({
    products: [],
    categories: [],
    subcategories: [],
    sizes: [],
  });
  const [matchingProductIds, setMatchingProductIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [quickStats, setQuickStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeStores: 0,
    productsSold: 0,
    unitsSold: 0
  });
  const hasActiveFilters =
    selectedFilters.products.length > 0 ||
    selectedFilters.categories.length > 0 ||
    selectedFilters.subcategories.length > 0 ||
    selectedFilters.sizes.length > 0;

  useEffect(() => {
    fetchQuickStats();
  }, [dateRange, matchingProductIds]);

  useEffect(() => {
    const resolveMatchingProducts = async () => {
      if (!hasActiveFilters) {
        setMatchingProductIds([]);
        return;
      }

      try {
        let productQuery = supabase
          .from("products")
          .select("id")
          .order("name");

        if (selectedFilters.products.length > 0) {
          productQuery = productQuery.in("id", selectedFilters.products);
        }

        if (selectedFilters.categories.length > 0) {
          productQuery = productQuery.in("category", selectedFilters.categories);
        }

        if (selectedFilters.subcategories.length > 0) {
          productQuery = productQuery.in("subcategory", selectedFilters.subcategories);
        }

        const { data: productRows, error: productError } = await productQuery;

        if (productError) throw productError;

        let resolvedIds = (productRows || []).map((row) => row.id).filter(Boolean);

        if (selectedFilters.sizes.length > 0) {
          const { data: sizeRows, error: sizeError } = await supabase
            .from("product_sizes")
            .select("id, product_id")
            .in("id", selectedFilters.sizes);

          if (sizeError) throw sizeError;

          const sizedProductIds = new Set(
            (sizeRows || []).map((row) => row.product_id).filter(Boolean)
          );

          resolvedIds = resolvedIds.filter((id) => sizedProductIds.has(id));
        }

        const uniqueIds = Array.from(new Set(resolvedIds));
        setMatchingProductIds(uniqueIds.length > 0 ? uniqueIds : ["__no_matching_products__"]);
      } catch (error) {
        console.error("Error resolving analytics filters:", error);
        setMatchingProductIds(["__no_matching_products__"]);
      }
    };

    resolveMatchingProducts();
  }, [hasActiveFilters, selectedFilters]);

  const fetchQuickStats = async () => {
    try {
      // Fetch orders for revenue and count (without poApproved filter to get all orders)
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, poApproved, items')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        // Try without poApproved if column doesn't exist
        const { data: ordersWithoutPO } = await supabase
          .from('orders')
          .select('id, total_amount, items')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .or('void.eq.false,void.is.null')
          .is('deleted_at', null);

        // Filter orders by selected products ONLY if products are selected
        let filteredOrders = ordersWithoutPO || [];
        if (matchingProductIds.length > 0) {
          const orderIds = ordersWithoutPO?.map(o => o.id) || [];
          if (orderIds.length > 0) {
            // Fetch from order_items table
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('order_id, product_id, quantity')
              .in('order_id', orderIds)
              .in('product_id', matchingProductIds);

            const allOrderItems: any[] = [...(orderItems || [])];

            // ALSO parse items from orders.items JSON column (legacy orders)
            ordersWithoutPO?.forEach((order: any) => {
              if (!order.items || !Array.isArray(order.items)) return;
              
              try {
                order.items.forEach((itemWrapper: any) => {
                  const productId = itemWrapper.productId || itemWrapper.product_id;
                  
                  if (!matchingProductIds.includes(productId)) return;
                  
                  const soldSizes = Array.isArray(itemWrapper.sizes) ? itemWrapper.sizes : [];
                  
                  soldSizes.forEach((soldSize: any) => {
                    allOrderItems.push({
                      order_id: order.id,
                      product_id: productId,
                      quantity: Number(soldSize.quantity) || 0
                    });
                  });
                });
              } catch (e) {
                console.error('Error parsing order items JSON:', e, order.id);
              }
            });

            const orderIdsWithProducts = new Set(allOrderItems?.map(item => item.order_id));
            filteredOrders = ordersWithoutPO?.filter(order => orderIdsWithProducts.has(order.id)) || [];
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
          // Fetch from order_items table
          let itemsQuery = supabase
            .from('order_items')
            .select('product_id, quantity')
            .in('order_id', orderIds);

          // Apply product filter ONLY if products are selected
          if (matchingProductIds.length > 0) {
            itemsQuery = itemsQuery.in('product_id', matchingProductIds);
          }

          const { data: items } = await itemsQuery;
          const allItems: any[] = [...(items || [])];

          // ALSO parse items from orders.items JSON column (legacy orders)
          filteredOrders?.forEach((order: any) => {
            if (!order.items || !Array.isArray(order.items)) return;
            
            try {
              order.items.forEach((itemWrapper: any) => {
                const productId = itemWrapper.productId || itemWrapper.product_id;
                
                // Skip if product filter is applied and this product is not selected
                if (matchingProductIds.length > 0 && !matchingProductIds.includes(productId)) {
                  return;
                }
                
                const soldSizes = Array.isArray(itemWrapper.sizes) ? itemWrapper.sizes : [];
                
                soldSizes.forEach((soldSize: any) => {
                  allItems.push({
                    product_id: productId,
                    quantity: Number(soldSize.quantity) || 0
                  });
                });
              });
            } catch (e) {
              console.error('Error parsing order items JSON:', e, order.id);
            }
          });

          // Count unique products
          const uniqueProducts = new Set(allItems?.map(item => item.product_id).filter(Boolean));
          const productsSold = uniqueProducts.size;

          // Sum total units
          const unitsSold = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

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

      // Filter orders by selected products ONLY if products are selected
      if (matchingProductIds.length > 0) {
        const orderIds = orders?.map(o => o.id) || [];
        if (orderIds.length > 0) {
          // Split into chunks to avoid URL length limit
          const chunkSize = 50;
          const allOrderItems: any[] = [];
          
          for (let i = 0; i < orderIds.length; i += chunkSize) {
            const chunk = orderIds.slice(i, i + chunkSize);
            const { data: chunkItems, error } = await supabase
              .from('order_items')
              .select('order_id, product_id, quantity')
              .in('order_id', chunk)
              .in('product_id', matchingProductIds);
            
            if (!error && chunkItems) {
              allOrderItems.push(...chunkItems);
            }
          }

          // ALSO parse items from orders.items JSON column (legacy orders)
          orders?.forEach((order: any) => {
            if (!order.items || !Array.isArray(order.items)) return;
            
            try {
              order.items.forEach((itemWrapper: any) => {
                const productId = itemWrapper.productId || itemWrapper.product_id;
                
                if (!matchingProductIds.includes(productId)) return;
                
                const soldSizes = Array.isArray(itemWrapper.sizes) ? itemWrapper.sizes : [];
                
                soldSizes.forEach((soldSize: any) => {
                  allOrderItems.push({
                    order_id: order.id,
                    product_id: productId,
                    quantity: Number(soldSize.quantity) || 0
                  });
                });
              });
            } catch (e) {
              console.error('Error parsing order items JSON:', e, order.id);
            }
          });

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
        // Fetch from order_items table
        let itemsQuery = supabase
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', orderIds);

        // Apply product filter ONLY if products are selected
        if (matchingProductIds.length > 0) {
          itemsQuery = itemsQuery.in('product_id', matchingProductIds);
        }

        const { data: items } = await itemsQuery;
        const allItems: any[] = [...(items || [])];

        // ALSO parse items from orders.items JSON column (legacy orders)
        orders?.forEach((order: any) => {
          if (!order.items || !Array.isArray(order.items)) return;
          
          try {
            order.items.forEach((itemWrapper: any) => {
              const productId = itemWrapper.productId || itemWrapper.product_id;
              
              // Skip if product filter is applied and this product is not selected
              if (matchingProductIds.length > 0 && !matchingProductIds.includes(productId)) {
                return;
              }
              
              const soldSizes = Array.isArray(itemWrapper.sizes) ? itemWrapper.sizes : [];
              
              soldSizes.forEach((soldSize: any) => {
                allItems.push({
                  product_id: productId,
                  quantity: Number(soldSize.quantity) || 0
                });
              });
            });
          } catch (e) {
            console.error('Error parsing order items JSON:', e, order.id);
          }
        });

        // Count unique products
        const uniqueProducts = new Set(allItems?.map(item => item.product_id).filter(Boolean));
        const productsSold = uniqueProducts.size;

        // Sum total units
        const unitsSold = allItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive business intelligence and reporting
            </p>
          </div>

          <div className="w-full lg:w-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <AdvancedProductFilter
                selectedFilters={selectedFilters}
                onFiltersChange={setSelectedFilters}
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
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
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
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview" className="flex min-w-0 flex-col items-center gap-1 px-2 py-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="whitespace-normal break-words text-center leading-tight">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex min-w-0 flex-col items-center gap-1 px-2 py-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="whitespace-normal break-words text-center leading-tight">Products</span>
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex min-w-0 flex-col items-center gap-1 px-2 py-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
              <Store className="h-4 w-4" />
              <span className="whitespace-normal break-words text-center leading-tight">Stores</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex min-w-0 flex-col items-center gap-1 px-2 py-2 text-[11px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="whitespace-normal break-words text-center leading-tight">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <SalesVsPurchaseAnalytics
              dateRange={dateRange}
              refresh={isRefreshing}
              selectedProducts={matchingProductIds}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
              <ProductAnalytics
                dateRange={dateRange}
                refresh={isRefreshing}
                selectedProducts={matchingProductIds}
              />
          </TabsContent>

          <TabsContent value="stores" className="space-y-4">
              <StoreAnalytics
                dateRange={dateRange}
                refresh={isRefreshing}
                selectedProducts={matchingProductIds}
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
