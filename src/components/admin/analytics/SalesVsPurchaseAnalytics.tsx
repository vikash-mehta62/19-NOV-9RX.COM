import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Legend,
  ComposedChart,
  Area
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SalesVsPurchaseAnalyticsProps {
  dateRange: { from: Date; to: Date };
  refresh?: boolean;
  selectedProducts?: string[];
}

export function SalesVsPurchaseAnalytics({ dateRange, refresh, selectedProducts = [] }: SalesVsPurchaseAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPurchases: 0,
    grossProfit: 0,
    profitMargin: 0
  });

  useEffect(() => {
    fetchSalesVsPurchaseData();
  }, [dateRange, refresh, selectedProducts]);

  const fetchSalesVsPurchaseData = async () => {
    setLoading(true);
    try {
      // Fetch all orders without nested relationships
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, paid_amount, payment_status, created_at, poApproved, items')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        // Try without poApproved if column doesn't exist
        const { data: ordersWithoutPO } = await supabase
          .from('orders')
          .select('id, total_amount, paid_amount, payment_status, created_at, items')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .or('void.eq.false,void.is.null')
          .is('deleted_at', null);

        // Filter by selected products if any
        let filteredOrders = ordersWithoutPO || [];
        if (selectedProducts.length > 0) {
          filteredOrders = await filterOrdersByProducts(filteredOrders);
        }

        // Treat all orders as sales orders if poApproved doesn't exist
        const salesOrders = filteredOrders;
        const purchaseOrders: any[] = [];

        processOrdersData(salesOrders, purchaseOrders);
        return;
      }

      // Filter by selected products if any
      let filteredOrders = allOrders || [];
      if (selectedProducts.length > 0) {
        filteredOrders = await filterOrdersByProducts(filteredOrders);
      }

      // Separate sales orders (regular orders) from purchase orders (PO)
      const salesOrders = filteredOrders?.filter(order => !order.poApproved) || [];
      const purchaseOrders = filteredOrders?.filter(order => order.poApproved === true) || [];

      console.log('📊 OVERVIEW TAB - Sales orders:', salesOrders.length, 'Purchase orders:', purchaseOrders.length);
      console.log('📊 OVERVIEW TAB - Sample sales order:', salesOrders[0]);

      processOrdersData(salesOrders, purchaseOrders);

    } catch (error) {
      console.error('Error fetching sales vs purchase data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrdersByProducts = async (orders: any[]) => {
    if (selectedProducts.length === 0) return orders;

    console.log('📊 FILTER - Filtering', orders.length, 'orders by', selectedProducts.length, 'products');

    const orderIds = orders.map(o => o.id);
    
    // Split into chunks to avoid URL length limit (max ~100 IDs per query)
    const chunkSize = 50;
    const allOrderItems: any[] = [];
    
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize);
      
      const { data: chunkItems, error } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, unit_price')
        .in('order_id', chunk)
        .in('product_id', selectedProducts);
      
      if (error) {
        console.error('Error fetching order items:', error);
      } else if (chunkItems) {
        allOrderItems.push(...chunkItems);
      }
    }

    // ALSO parse items from orders.items JSON column (legacy orders)
    orders.forEach((order: any) => {
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
    const orderRevenueMap = new Map<string, number>();
    allOrderItems.forEach(item => {
      const revenue = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
      const currentRevenue = orderRevenueMap.get(item.order_id) || 0;
      orderRevenueMap.set(item.order_id, currentRevenue + revenue);
    });

    // Update order total_amount with calculated revenue from filtered products
    const orderIdsWithProducts = new Set(allOrderItems.map(item => item.order_id));
    const filtered = orders
      .filter(order => orderIdsWithProducts.has(order.id))
      .map(order => ({
        ...order,
        total_amount: orderRevenueMap.get(order.id) || 0,
        paid_amount: (() => {
          const filteredRevenue = Number(orderRevenueMap.get(order.id) || 0);
          const originalTotal = Number(order.total_amount || 0);
          const originalPaid = Number(order.paid_amount || 0);

          if (originalTotal <= 0 || originalPaid <= 0) return 0;

          const ratio = Math.max(0, Math.min(1, originalPaid / originalTotal));
          return filteredRevenue * ratio;
        })()
      }));
    
    console.log('📊 FILTER - Found', allOrderItems.length, 'items,', filtered.length, 'orders');
    console.log('📊 FILTER - Sample filtered order:', filtered[0]);
    
    return filtered;
  };

  const processOrdersData = (salesOrders: any[], purchaseOrders: any[]) => {
    const getCollectedSalesAmount = (order: any) => {
      const status = String(order?.payment_status || "").toLowerCase();
      const paidAmount = parseFloat(order?.paid_amount || 0);
      const totalAmount = parseFloat(order?.total_amount || 0);

      if (status === "paid") return Number.isNaN(totalAmount) ? 0 : totalAmount;
      if (status === "partial_paid" || status === "partial" || status === "partially_paid") {
        return Number.isNaN(paidAmount) ? 0 : paidAmount;
      }

      return 0;
    };

    // Aggregate by month
    const monthlyMap = new Map();

    // Process sales
    salesOrders?.forEach(order => {
      const month = new Date(order.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      const existing = monthlyMap.get(month) || { 
        month, 
        sales: 0, 
        purchases: 0,
        profit: 0,
        salesCount: 0,
        purchaseCount: 0
      };
      existing.sales += getCollectedSalesAmount(order);
      existing.salesCount += 1;
      monthlyMap.set(month, existing);
    });

    // Process purchases
    purchaseOrders?.forEach(order => {
      const month = new Date(order.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      const existing = monthlyMap.get(month) || { 
        month, 
        sales: 0, 
        purchases: 0,
        profit: 0,
        salesCount: 0,
        purchaseCount: 0
      };
      existing.purchases += parseFloat(order.total_amount || 0);
      existing.purchaseCount += 1;
      monthlyMap.set(month, existing);
    });

    // Calculate profit for each month
    const monthlyArray = Array.from(monthlyMap.values()).map(item => ({
      ...item,
      profit: item.sales - item.purchases,
      margin: item.sales > 0 ? ((item.sales - item.purchases) / item.sales * 100) : 0
    }));

    setMonthlyData(monthlyArray);

    // Calculate totals
    const totalSales = salesOrders?.reduce((sum, order) => 
      sum + getCollectedSalesAmount(order), 0) || 0;
    const totalPurchases = purchaseOrders?.reduce((sum, order) => 
      sum + parseFloat(order.total_amount || 0), 0) || 0;
    const grossProfit = totalSales - totalPurchases;
    const profitMargin = totalSales > 0 ? (grossProfit / totalSales * 100) : 0;

    setStats({
      totalSales,
      totalPurchases,
      grossProfit,
      profitMargin
    });
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
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Revenue from sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${stats.totalPurchases.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Cost of goods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            {stats.grossProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(stats.grossProfit).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Sales - Purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            {stats.profitMargin >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Gross margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert for negative profit */}
      {stats.grossProfit < 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Warning: Your purchases exceed sales in this period. Review your pricing strategy and inventory management.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Chart - Sales vs Purchase */}
      <Card>
        <CardHeader>
          <CardTitle>Sales vs Purchase Comparison</CardTitle>
          <CardDescription>Monthly comparison of sales revenue and purchase costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Bar dataKey="sales" fill="#10b981" name="Sales Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" fill="#f59e0b" name="Purchase Cost" radius={[4, 4, 0, 0]} />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Gross Profit"
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Profit Margin Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Margin Trend</CardTitle>
          <CardDescription>Monthly profit margin percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="margin" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  name="Profit Margin %"
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>Detailed monthly sales and purchase analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-2">Month</div>
              <div className="col-span-2 text-right">Sales</div>
              <div className="col-span-2 text-right">Purchases</div>
              <div className="col-span-2 text-right">Profit</div>
              <div className="col-span-2 text-right">Margin</div>
              <div className="col-span-2 text-right">Orders</div>
            </div>
            {monthlyData.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 text-sm items-center py-2 hover:bg-muted/50 rounded-lg">
                <div className="col-span-2 font-medium">{item.month}</div>
                <div className="col-span-2 text-right text-green-600 font-semibold">
                  ${item.sales.toFixed(2)}
                </div>
                <div className="col-span-2 text-right text-orange-600 font-semibold">
                  ${item.purchases.toFixed(2)}
                </div>
                <div className={`col-span-2 text-right font-semibold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${item.profit.toFixed(2)}
                </div>
                <div className={`col-span-2 text-right font-semibold ${item.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.margin.toFixed(1)}%
                </div>
                <div className="col-span-2 text-right text-muted-foreground">
                  {item.salesCount}S / {item.purchaseCount}P
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
