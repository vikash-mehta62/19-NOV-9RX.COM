import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Package, TrendingUp, Calendar, DollarSign } from "lucide-react";

interface AnalyticsTabProps {
  userId: string;
}

interface ProductPurchase {
  product_name: string;
  quantity: number;
  total_spent: number;
  order_count: number;
}

interface OrderPattern {
  month: string;
  orders: number;
  revenue: number;
}

interface AnalyticsOrderRow {
  id: string;
  total_amount: string | number | null;
  created_at: string;
  items?: any[] | null;
}

interface AnalyticsOrderItemRow {
  order_id: string;
  product_id: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export function AnalyticsTab({ userId }: AnalyticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<ProductPurchase[]>([]);
  const [orderPatterns, setOrderPatterns] = useState<OrderPattern[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    avgOrderValue: 0,
    mostFrequentProduct: "",
    orderFrequency: "",
  });

  useEffect(() => {
    if (userId) {
      loadAnalytics();
    }
  }, [userId]);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, total_amount, created_at, items")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });

      const orders = (ordersData || []) as AnalyticsOrderRow[];

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setTopProducts([]);
        setOrderPatterns([]);
        setStats({
          totalProducts: 0,
          avgOrderValue: 0,
          mostFrequentProduct: "N/A",
          orderFrequency: "N/A",
        });
        return;
      }

      const orderIds = orders.map((order) => order.id).filter(Boolean);

      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from("order_items")
        .select("order_id, product_id, quantity, unit_price")
        .in("order_id", orderIds);

      const orderItems = (orderItemsData || []) as AnalyticsOrderItemRow[];

      if (orderItemsError) throw orderItemsError;

      const fallbackItems: AnalyticsOrderItemRow[] = [];

      if (!orderItems || orderItems.length === 0) {
        orders.forEach((order: any) => {
          const legacyItems = Array.isArray(order.items) ? order.items : [];

          legacyItems.forEach((itemWrapper: any) => {
            const productId = itemWrapper.productId || itemWrapper.product_id || null;
            const soldSizes = Array.isArray(itemWrapper.sizes) ? itemWrapper.sizes : [];

            soldSizes.forEach((soldSize: any) => {
              fallbackItems.push({
                order_id: order.id,
                product_id: productId,
                quantity: Number(soldSize.quantity) || 0,
                unit_price: Number(soldSize.price) || 0,
              });
            });
          });
        });
      }

      const allOrderItems = [...(orderItems || []), ...fallbackItems];
      const productIds = [...new Set(allOrderItems.map((item) => item.product_id).filter(Boolean))] as string[];

      let products: Array<{ id: string; name: string }> = [];
      if (productIds.length > 0) {
        const { data: productRows, error: productsError } = await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds);

        if (productsError) throw productsError;
        products = (productRows || []) as Array<{ id: string; name: string }>;
      }

      const productNameMap = new Map(
        (products || []).map((product) => [product.id, product.name])
      );

      const productMap = new Map<string, ProductPurchase>();

      allOrderItems.forEach((item) => {
        const productName =
          (item.product_id && productNameMap.get(item.product_id)) ||
          "Unknown Product";
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const existing = productMap.get(productName);

        if (existing) {
          existing.quantity += quantity;
          existing.total_spent += unitPrice * quantity;
          existing.order_count += 1;
        } else {
          productMap.set(productName, {
            product_name: productName,
            quantity,
            total_spent: unitPrice * quantity,
            order_count: 1,
          });
        }
      });

      const productsSummary = Array.from(productMap.values())
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 10);

      setTopProducts(productsSummary);

      const monthlyData = new Map<string, { orders: number; revenue: number }>();
      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        monthlyData.set(key, { orders: 0, revenue: 0 });
      }

      orders.forEach((order) => {
        const orderDate = new Date(order.created_at);
        const key = orderDate.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });

        if (monthlyData.has(key)) {
          const data = monthlyData.get(key)!;
          data.orders += 1;
          data.revenue += Number(order.total_amount) || 0;
        }
      });

      setOrderPatterns(
        Array.from(monthlyData.entries()).map(([month, data]) => ({
          month,
          orders: data.orders,
          revenue: data.revenue,
        }))
      );

      const totalRevenue = orders.reduce(
        (sum, order) => sum + (Number(order.total_amount) || 0),
        0
      );
      const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
      const mostFrequent = productsSummary[0]?.product_name || "N/A";

      let frequency = "N/A";

      if (orders.length > 1) {
        const sortedOrders = [...orders].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        let totalGap = 0;
        for (let i = 1; i < sortedOrders.length; i++) {
          const prev = new Date(sortedOrders[i - 1].created_at).getTime();
          const curr = new Date(sortedOrders[i].created_at).getTime();
          totalGap += (curr - prev) / (1000 * 60 * 60 * 24);
        }

        const avgGap = totalGap / (sortedOrders.length - 1);
        frequency =
          avgGap < 7
            ? "Weekly"
            : avgGap < 14
            ? "Bi-weekly"
            : avgGap < 30
            ? "Monthly"
            : avgGap < 60
            ? "Bi-monthly"
            : "Quarterly";
      }

      setStats({
        totalProducts: productMap.size,
        avgOrderValue,
        mostFrequentProduct: mostFrequent,
        orderFrequency: frequency,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      setTopProducts([]);
      setOrderPatterns([]);
    } finally {
      setLoading(false);
    }
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (topProducts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No Purchase Data Available</p>
        <p className="text-sm mt-1">This user hasn't made any purchases yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Different items purchased</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Frequency</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orderFrequency}</div>
            <p className="text-xs text-muted-foreground">Average pattern</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Product</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold truncate">{stats.mostFrequentProduct}</div>
            <p className="text-xs text-muted-foreground">Most purchased</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Patterns Chart */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Order Patterns (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={orderPatterns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="orders"
                stroke="#8884d8"
                name="Orders"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#82ca9d"
                name="Revenue ($)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card> */}

      {/* Top Products by Revenue */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Top Products by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="total_spent" fill="#8884d8" name="Total Spent ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card> */}

      {/* Product Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Distribution by Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProducts.slice(0, 6)}
                  dataKey="quantity"
                  nameKey="product_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {topProducts.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Purchase Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.quantity} units • {product.order_count} orders
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(product.total_spent)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(product.total_spent / product.quantity)}/unit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
