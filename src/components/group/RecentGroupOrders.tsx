import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, isAfter, subDays } from "date-fns";
import { ExternalLink, Package, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecentOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  pharmacy_name: string;
  pharmacy_id: string;
  items_count: number;
}

interface RecentGroupOrdersProps {
  groupId: string;
  limit?: number;
}

export function RecentGroupOrders({ groupId, limit = 5 }: RecentGroupOrdersProps) {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (groupId) {
      fetchRecentOrders();
    }
  }, [groupId]);

  const fetchRecentOrders = async () => {
    try {
      setLoading(true);

      // Get pharmacies under this group
      const { data: pharmacies } = await supabase
        .from("profiles")
        .select("id, display_name, company_name")
        .eq("group_id", groupId)
        .eq("type", "pharmacy");

      if (!pharmacies || pharmacies.length === 0) {
        setOrders([]);
        return;
      }

      const pharmacyIds = pharmacies.map(p => p.id);
      const pharmacyMap = new Map(pharmacies.map(p => [p.id, p.display_name || p.company_name || "Unknown"]));

      // Get recent orders
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, status, payment_status, created_at, profile_id, items")
        .in("profile_id", pharmacyIds)
        .is("void", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }

      const formattedOrders: RecentOrder[] = (ordersData || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount || 0,
        status: order.status || "pending",
        payment_status: order.payment_status || "unpaid",
        created_at: order.created_at,
        pharmacy_name: pharmacyMap.get(order.profile_id) || "Unknown",
        pharmacy_id: order.profile_id,
        items_count: Array.isArray(order.items) ? order.items.length : 0,
      }));

      setOrders(formattedOrders);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      unpaid: "bg-red-100 text-red-800",
      partial: "bg-orange-100 text-orange-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getRelativeTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    if (isAfter(d, subDays(now, 7))) {
      return formatDistanceToNow(d, { addSuffix: true });
    }
    return format(d, "MMM d, yyyy");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Recent Orders
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/group/orders")}
        >
          View All
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No orders yet</p>
            <p className="text-sm">Orders from your pharmacies will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      #{order.order_number}
                      <div className="text-xs text-muted-foreground">
                        {order.items_count} items
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {order.pharmacy_name}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)} variant="secondary">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(order.payment_status)} variant="secondary">
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {getRelativeTime(order.created_at)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
