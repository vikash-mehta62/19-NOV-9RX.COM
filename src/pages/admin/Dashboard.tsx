import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import {
  DollarSign,
  ShoppingCart,
  FileText,
  AlertTriangle,
  TrendingUp,
  Users,
  PackageSearch,
  Bell,
} from "lucide-react";
import { fetchDashboardData } from "./dashboardService";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: "0.00",
    activeOrdersCount: 0,
    pendingInvoicesCount: 0,
    stockAlertCount: 0,
    productCount: 0,
  });

  const [dashboardData2, setDashboardData2] = useState({
    change: "0%",
    subtitle: "No data available",
    trend: "neutral",
  });
  const [userCounts, setUserCounts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("total_amount, shipping_cost, tax_amount, created_at")
  .eq("void", false); 

      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }

      // Process revenue by month
      const revenueData = {};
      let currentMonthRevenue = 0;
      let lastMonthRevenue = 0;
      const currentMonth = new Date().getMonth();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

      orders.forEach(
        ({ total_amount, shipping_cost, tax_amount, created_at }) => {
          const date = new Date(created_at);
          const month = date.getMonth();
          const monthShort = date.toLocaleString("default", { month: "short" });
          const revenue =
            (total_amount || 0) + (shipping_cost || 0) + (tax_amount || 0);

          revenueData[monthShort] = (revenueData[monthShort] || 0) + revenue;

          if (month === currentMonth) {
            currentMonthRevenue += revenue;
          } else if (month === lastMonth) {
            lastMonthRevenue += revenue;
          }
        }
      );

      // Convert to array format for recharts
      const formattedData = Object.keys(revenueData).map((month) => ({
        month,
        revenue: revenueData[month],
      }));

      // Calculate percentage change
      let changePercentage = "0%";
      let subtitle = "No data available";
      let trend = "neutral";

      if (lastMonthRevenue > 0) {
        const percentageChange =
          ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
        changePercentage = `${percentageChange.toFixed(1)}%`;

        if (percentageChange > 0) {
          subtitle = "Compared to last month";
          trend = "up";
        } else if (percentageChange < 0) {
          subtitle = "Decrease from last month";
          trend = "down";
        }
      }

      setDashboardData2({
        change: changePercentage,
        subtitle,
        trend,
      });
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchDashboardData();
      setDashboardData(data);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchUserCounts = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("type")
        .neq("type", "admin"); // Admin ko exclude karna

      if (error) {
        console.error("Error fetching user types:", error);
        return;
      }

      const typeCounts = data.reduce((acc, user) => {
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

      setTotalProducts(count);
    };

    fetchTotalProducts();
    fetchUserCounts();
  }, []);

  const stats = [
    {
      title: "Total Revenue",
      value: `$${dashboardData.totalRevenue}`,
      change: dashboardData2.change,
      icon: <DollarSign className="h-5 w-5 text-primary" />,
      subtitle: dashboardData2.subtitle,
      trend: dashboardData2.trend,
    },
    {
      title: "Active Orders",
      value: `${dashboardData.activeOrdersCount}`,
      change: "Processing",
      icon: <ShoppingCart className="h-5 w-5 text-primary" />,
      subtitle: "orders",
      trend: "neutral" as const,
    },
    {
      title: "Pending Invoices",
      value: `${dashboardData.pendingInvoicesCount}`,
      change: "Pending",
      icon: <FileText className="h-5 w-5 text-primary" />,
      subtitle: "invoices",
      trend: "neutral" as const,
    },
    {
      title: "Stock Alerts",
      value: `${dashboardData.stockAlertCount}`,
      change: "Items Low Stock",
      icon: <AlertTriangle className="h-5 w-5 text-primary" />,
      subtitle: "alerts",
      trend: "down" as const,
    },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your business, view analytics, and handle administrative
              tasks.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className="rounded-full bg-primary/10 p-2">
                    {stat.icon}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center text-sm">
                    {stat.trend === "up" ? (
                      <TrendingUp className="mr-1 h-4 w-4 text-success" />
                    ) : stat.trend === "down" ? (
                      <TrendingUp className="mr-1 h-4 w-4 text-destructive rotate-180" />
                    ) : null}
                    <span className="text-muted-foreground">
                      {stat.change} {stat.subtitle}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-6">
          <Card className="col-span-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Revenue Overview</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">Last 6 months</p>
                </div>
              </div>
              <RevenueChart />
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>

              <div className="space-y-4">
                {/* Active Users Section */}
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Active Users</span>
                  </div>
                  <div className="text-sm font-medium space-y-1 text-right">
                    {userCounts.map((user) => (
                      <div key={user.type} className="capitalize">
                        {user.type}:{" "}
                        <span className="font-semibold">{user.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Products Section */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PackageSearch className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Total Products</span>
                  </div>
                  <span className="text-sm font-semibold">{totalProducts}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
