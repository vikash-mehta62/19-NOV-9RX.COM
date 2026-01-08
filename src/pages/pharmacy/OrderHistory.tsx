import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  History, Search, Calendar, Package, Eye, 
  RefreshCw, Download
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useNavigate } from "react-router-dom";
import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderHistoryItem {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
  payment_status?: string;
  items: any[];
}

const OrderHistory = () => {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrderHistory = async () => {
      if (!userProfile?.id) return;
      
      try {
        // Use profile_id instead of user_id
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("profile_id", userProfile.id)
          .order("created_at", { ascending: false });
console.log(data)
        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error("Error fetching order history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderHistory();
  }, [userProfile]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-700",
      delivered: "bg-green-100 text-green-700",
      processing: "bg-blue-100 text-blue-700",
      pending: "bg-yellow-100 text-yellow-700",
      new: "bg-blue-50 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
      shipped: "bg-purple-100 text-purple-700",
    };
    return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter !== "all" && order.created_at) {
      const orderDate = new Date(order.created_at);
      const now = new Date();
      
      if (dateFilter === "week") {
        matchesDate = isAfter(orderDate, subDays(now, 7));
      } else if (dateFilter === "month") {
        matchesDate = isAfter(orderDate, subDays(now, 30));
      } else if (dateFilter === "year") {
        matchesDate = isAfter(orderDate, subYears(now, 1));
      }
    }

    return matchesSearch && matchesDate;
  });

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-6 h-6 text-purple-600" />
              Order History
            </h1>
            <p className="text-gray-500 mt-1">View all your past orders and track deliveries</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export History
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-700">{filteredOrders.length}</div>
              <div className="text-sm text-blue-600">Total Orders</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-700">
                {filteredOrders.filter(o => o.status === "completed" || o.status === "delivered").length}
              </div>
              <div className="text-sm text-blue-600">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-700">
                {filteredOrders.filter(o => ["processing", "pending", "new"].includes(o.status?.toLowerCase())).length}
              </div>
              <div className="text-sm text-yellow-600">In Progress</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-700">
                ${filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-purple-600">Total Order Value</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-700">
                ${filteredOrders.reduce((sum, o) => sum + (o.payment_status?.toLowerCase() === 'paid' ? (o.total_amount || 0) : 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-green-600">Total Paid</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-700">
                ${filteredOrders.reduce((sum, o) => sum + (o.payment_status?.toLowerCase() !== 'paid' && o.status?.toLowerCase() !== 'cancelled' && o.status?.toLowerCase() !== 'void' ? (o.total_amount || 0) : 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-red-600">Total Due</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by order number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading order history...</p>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
                <p className="text-gray-500 mt-1">Start shopping to see your order history here</p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/pharmacy/products")}>
                  Browse Products
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            Order #{order.order_number || order.id.slice(0, 8)}
                          </h3>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status || "Pending"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {order.created_at ? format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a") : "N/A"}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {order.items?.length || 0} items • Total: <span className="font-semibold text-blue-600">${order.total_amount?.toFixed(2) || "0.00"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/pharmacy/orders/${order.id}`)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm" className="text-blue-600">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reorder
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderHistory;
