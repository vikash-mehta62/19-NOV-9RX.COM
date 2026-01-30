import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react";

interface ProductAnalyticsProps {
  dateRange: { from: Date; to: Date };
  refresh?: boolean;
  selectedProducts?: string[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export function ProductAnalytics({ dateRange, refresh, selectedProducts = [] }: ProductAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
  const [productTrends, setProductTrends] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    totalUnitsSold: 0,
    avgOrderValue: 0
  });

  useEffect(() => {
    fetchProductAnalytics();
  }, [dateRange, refresh, selectedProducts]);

  const fetchProductAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch orders without nested relationships
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, poApproved')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .or('void.eq.false,void.is.null')
        .is('deleted_at', null);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        // Try without poApproved if column doesn't exist
        const { data: ordersWithoutPO } = await supabase
          .from('orders')
          .select('id, total_amount, created_at')
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
          .or('void.eq.false,void.is.null')
          .is('deleted_at', null);

        if (!ordersWithoutPO || ordersWithoutPO.length === 0) {
          setStats({
            totalProducts: 0,
            totalRevenue: 0,
            totalUnitsSold: 0,
            avgOrderValue: 0
          });
          setTopProducts([]);
          setCategoryPerformance([]);
          setLoading(false);
          return;
        }

        // Continue with orders without PO filter
        await processOrders(ordersWithoutPO);
        setLoading(false);
        return;
      }

      // Filter sales orders (not purchase orders)
      const orders = allOrders?.filter(o => !o.poApproved) || [];

      console.log('🟢 PRODUCTS TAB - Total sales orders (before product filter):', orders.length);

      if (!orders || orders.length === 0) {
        setStats({
          totalProducts: 0,
          totalRevenue: 0,
          totalUnitsSold: 0,
          avgOrderValue: 0
        });
        setTopProducts([]);
        setCategoryPerformance([]);
        setLoading(false);
        return;
      }

      await processOrders(orders);

    } catch (error) {
      console.error('Error fetching product analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processOrders = async (orders: any[]) => {
    try {
      // Fetch order items separately - try with just product_id and quantity first
      const orderIds = orders.map(o => o.id);
      let itemsQuery = supabase
        .from('order_items')
        .select('product_id, quantity, order_id')
        .in('order_id', orderIds);

      // Apply product filter if selected
      if (selectedProducts.length > 0) {
        itemsQuery = itemsQuery.in('product_id', selectedProducts);
      }

      const { data: orderItems, error: itemsError } = await itemsQuery;

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        throw itemsError;
      }

      // Get unique product IDs
      const productIds = [...new Set(orderItems?.map(i => i.product_id).filter(Boolean))];

      if (productIds.length === 0) {
        setStats({
          totalProducts: 0,
          totalRevenue: 0,
          totalUnitsSold: 0,
          avgOrderValue: 0
        });
        setTopProducts([]);
        setCategoryPerformance([]);
        return;
      }

      // Fetch products separately
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, subcategory')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }

      // Create product lookup map
      const productMap = new Map(products?.map(p => [p.id, p]) || []);

      // Filter orders to only those containing selected products (if filter is applied)
      let filteredOrders = orders;
      if (selectedProducts.length > 0) {
        const orderIdsWithSelectedProducts = new Set(orderItems?.map(item => item.order_id));
        filteredOrders = orders.filter(order => orderIdsWithSelectedProducts.has(order.id));
        console.log('🟢 PRODUCTS TAB - Orders after product filter:', filteredOrders.length);
      }

      // Process data - calculate revenue proportionally from filtered order totals
      const productAggMap = new Map();
      const categoryMap = new Map();
      let totalRevenue = 0;
      let totalUnits = 0; 

      // Calculate total revenue from FILTERED orders only
      filteredOrders?.forEach(order => {
        totalRevenue += parseFloat(order.total_amount || '0');
      });

      console.log('🟢 PRODUCTS TAB - Final Revenue:', totalRevenue, 'Orders:', filteredOrders.length);

      // Calculate total units
      orderItems?.forEach((item: any) => {
        totalUnits += item.quantity;
      });

      // Aggregate product data - distribute revenue proportionally by quantity
      orderItems?.forEach((item: any) => {
        const product = productMap.get(item.product_id);
        if (!product) return;

        // Estimate revenue based on proportion of total quantity
        const estimatedRevenue = totalUnits > 0 ? (totalRevenue * item.quantity) / totalUnits : 0;

        // Product aggregation
        const existing = productAggMap.get(product.id) || {
          id: product.id,
          name: product.name,
          category: product.category,
          quantity: 0,
          revenue: 0
        };
        existing.quantity += item.quantity;
        existing.revenue += estimatedRevenue;
        productAggMap.set(product.id, existing);

        // Category aggregation
        const category = product.category || 'Uncategorized';
        const catExisting = categoryMap.get(category) || {
          name: category,
          value: 0,
          count: 0
        };
        catExisting.value += estimatedRevenue;
        catExisting.count += item.quantity;
        categoryMap.set(category, catExisting);
      });

      // Sort and set top products
      const sortedProducts = Array.from(productAggMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopProducts(sortedProducts);

      // Set category performance
      const categories = Array.from(categoryMap.values())
        .sort((a, b) => b.value - a.value);
      setCategoryPerformance(categories);

      // Set stats
      setStats({
        totalProducts: productAggMap.size,
        totalRevenue,
        totalUnitsSold: totalUnits,
        avgOrderValue: filteredOrders?.length ? totalRevenue / filteredOrders.length : 0
      });
    } catch (error) {
      console.error('Error in processOrders:', error);
    }
  };
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, name } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill={COLORS[index % COLORS.length]} fontSize={12} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
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
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
            <CardDescription>Best performing products in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Revenue distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product List */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance Details</CardTitle>
          <CardDescription>Detailed breakdown of product sales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Product Name</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2 text-right">Units Sold</div>
              <div className="col-span-2 text-right">Revenue</div>
            </div>
            {topProducts.map((product, index) => (
              <div key={product.id} className="grid grid-cols-12 gap-4 text-sm items-center py-2 hover:bg-muted/50 rounded-lg">
                <div className="col-span-1">
                  <Badge variant="outline">{index + 1}</Badge>
                </div>
                <div className="col-span-5 font-medium">{product.name}</div>
                <div className="col-span-2">
                  <Badge variant="secondary">{product.category}</Badge>
                </div>
                <div className="col-span-2 text-right font-semibold">{product.quantity}</div>
                <div className="col-span-2 text-right font-semibold text-green-600">
                  ${product.revenue.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
