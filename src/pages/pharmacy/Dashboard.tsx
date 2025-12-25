import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EnhancedStatsCard } from "@/components/dashboard/EnhancedStatsCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Package, Clock, CreditCard, TrendingUp, ShoppingCart, Wallet, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProductShowcase from "@/components/pharmacy/ProductShowcase";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [creditMemoBalance, setCreditMemoBalance] = useState(0);
  const [rewardPoints, setRewardPoints] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Fetch user's credit memo balance and reward points
          const { data: profile } = await supabase
            .from("profiles")
            .select("credit_memo_balance, reward_points")
            .eq("id", session.user.id)
            .single();
          
          if (profile) {
            setCreditMemoBalance(profile.credit_memo_balance || 0);
            setRewardPoints(profile.reward_points || 0);
          }
        }

        // Fetch order statistics
        const { data: orderCounts, error: statsError } = await supabase.rpc("get_order_status_counts");

        if (statsError) {
          console.error("Error fetching order stats:", statsError);
        } else {
          const statsData = [
            {
              title: "New Orders",
              value: orderCounts.find((o) => o.status === "new")?.count || 0,
              description: "New orders received",
              icon: <Package className="h-4 w-4 text-muted-foreground" />,
              tooltip: "Orders received but not yet processed",
              change: "+5%",
              trend: "up" as const,
            },
            {
              title: "Pending Orders",
              value: orderCounts.find((o) => o.status === "pending")?.count || 0,
              description: "Orders awaiting approval",
              icon: <Clock className="h-4 w-4 text-muted-foreground" />,
              tooltip: "Orders that are awaiting approval or additional steps",
              change: "-3%",
              trend: "down" as const,
            },
            {
              title: "Processing Orders",
              value: orderCounts.find((o) => o.status === "processing")?.count || 0,
              description: "Orders currently being processed",
              icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
              tooltip: "Orders that are being processed for shipment",
              change: "+10%",
              trend: "up" as const,
            },
            {
              title: "Completed Orders",
              value: orderCounts.find((o) => o.status === "delivered")?.count || 0,
              description: "Orders successfully delivered",
              icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
              tooltip: "Orders that have been delivered successfully",
              change: "+15%",
              trend: "up" as const,
            },
          ];
          setStats(statsData);
        }

        // Fetch featured products
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("name, sku, price:base_price, current_stock")
          .order("created_at", { ascending: false })
          .limit(5);

        if (productsError) {
          console.error("Error fetching featured products:", productsError);
        } else {
          const formattedProducts = products.map((product) => ({
            name: product.name,
            sku: product.sku,
            price: `${product.price.toFixed(2)}`,
            status: product.current_stock > 10 ? "In Stock" : "Low Stock",
          }));
          setFeaturedProducts(formattedProducts);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex-1 space-y-6 p-8 pt-6">
        <PageHeader
          title="Pharmacy Dashboard"
          description="Welcome back! Here's an overview of your pharmacy's performance."
          showBreadcrumbs={true}
        />

        {/* Credit & Rewards Section */}
        {(creditMemoBalance > 0 || rewardPoints > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {creditMemoBalance > 0 && (
              <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-full">
                        <Wallet className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600 font-medium">Store Credit Available</p>
                        <p className="text-2xl font-bold text-green-700">${creditMemoBalance.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-green-300 text-green-700 hover:bg-green-100"
                      onClick={() => navigate("/pharmacy/credit")}
                    >
                      View Details
                    </Button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Use this credit on your next order at checkout
                  </p>
                </CardContent>
              </Card>
            )}
            
            {rewardPoints > 0 && (
              <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 rounded-full">
                        <Gift className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Reward Points</p>
                        <p className="text-2xl font-bold text-purple-700">{rewardPoints.toLocaleString()}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-purple-300 text-purple-700 hover:bg-purple-100"
                      onClick={() => navigate("/pharmacy/rewards")}
                    >
                      Redeem
                    </Button>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    Redeem points for discounts and rewards
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <EnhancedStatsCard
              key={index}
              title={stat.title}
              value={stat.value.toString()}
              description={stat.description}
              icon={stat.icon}
              tooltip={stat.tooltip}
              change={stat.change}
              trend={stat.trend}
            />
          ))}
        </div>

        <Card className="border-2 border-emerald-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              Quick Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-lg font-semibold text-emerald-700">Need to restock?</h3>
                <p className="text-gray-600">Place your order quickly with our streamlined ordering process</p>
                {creditMemoBalance > 0 && (
                  <p className="text-sm text-green-600">
                    💰 You have ${creditMemoBalance.toFixed(2)} store credit to use!
                  </p>
                )}
              </div>
              <Button
                onClick={() => (window.location.href = "/pharmacy/products")}
                size="lg"
                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Order Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-semibold">Featured Products</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto group">
                  View All Products
                  <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>All Products</DialogTitle>
                </DialogHeader>
                <ProductShowcase />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product, index) => (
              <Card key={index} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-semibold">{product.price}</p>
                    <Badge variant={product.status === "Low Stock" ? "destructive" : "secondary"}>
                      {product.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
