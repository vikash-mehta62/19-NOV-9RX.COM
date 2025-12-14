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
    // Get all orders for this user
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        created_at,
        order_items(
          product_id,
          quantity,
          unit_price,
          products(name)
        )
      `)
      .eq("profile_id", userId);

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      setLoading(false);
      return;
    }

    // Process product purchases
    const productMap = new Map<string, ProductPurchase>();

    orders.forEach((order) => {
      if (order.order_items) {
        order.order_items.forEach((item: any) => {
          const productName = item.products?.name || "Unknown Product";
          const existing = productMap.get(productName);

          if (existing) {
            existing.quantity += item.quantity;
            existing.total_spent += item.unit_price * item.quantity;
            existing.order_count += 1;
          } else {
            productMap.set(productName, {
              product_name: productName,
              quantity: item.quantity,
              total_spent: item.unit_price * item.quantity,
              order_count: 1,
            });
          }
        });
      }
    });

    const products = Array.from(productMap.values())
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10);

    setTopProducts(products);

    // Process order patterns (last 12 months)
    const monthlyData = new Map<string, { orders: number; revenue: number }>();
    const now = new Date();

    // Initialize last 12 months
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
        data.revenue += parseFloat(order.total_amount || "0");
      }
    });

    const patterns = Array.from(monthlyData.entries()).map(
      ([month, data]) => ({
        month,
        orders: data.orders,
        revenue: data.revenue,
      })
    );

    setOrderPatterns(patterns);

    // Calculate stats
    const totalRevenue = orders.reduce(
      (sum, o) => sum + parseFloat(o.total_amount || "0"),
      0
    );
    const avgOrderValue =
      orders.length > 0 ? totalRevenue / orders.length : 0;
    const mostFrequent = products[0]?.product_name || "N/A";

    // -----------------------------------------------------
    // ✅ Correct Order Frequency Calculation
    // -----------------------------------------------------
    let frequency = "N/A";

    if (orders.length > 1) {
      // Step 1: Sort orders oldest → newest
      const sortedOrders = [...orders].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );

      // Step 2: Calculate total gap
      let totalGap = 0;
      for (let i = 1; i < sortedOrders.length; i++) {
        const prev = new Date(sortedOrders[i - 1].created_at).getTime();
        const curr = new Date(sortedOrders[i].created_at).getTime();
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
        totalGap += diffDays;
      }

      const avgGap = totalGap / (sortedOrders.length - 1);

      // Step 3: Map to readable frequency
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

    // -----------------------------------------------------

    setStats({
      totalProducts: productMap.size,
      avgOrderValue,
      mostFrequentProduct: mostFrequent,
      orderFrequency: frequency,
    });
  } catch (error) {
    console.error("Error loading analytics:", error);
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
