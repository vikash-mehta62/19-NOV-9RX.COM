"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { format } from "date-fns";
import {
  Bell,
  Package,
  CreditCard,
  Gift,
  Megaphone,
  CheckCircle,
  Trash2,
  RefreshCw,
  Loader2,
  Info,
  AlertTriangle,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "order" | "payment" | "reward" | "announcement" | "system";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

const PharmacyNotifications = () => {
  const { toast } = useToast();
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, [userProfile?.id]);

  const fetchNotifications = async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    try {
      // Fetch announcements as notifications
      const { data: announcements, error: annError } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .or(`target_audience.eq.all,target_audience.eq.pharmacy`)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch recent orders for order notifications
      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, status, created_at, total_amount")
        .eq("profile_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch reward transactions
      const { data: rewards, error: rewardError } = await supabase
        .from("reward_transactions")
        .select("*")
        .eq("user_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const notificationsList: Notification[] = [];

      // Add announcements
      if (announcements) {
        announcements.forEach((ann) => {
          notificationsList.push({
            id: `ann-${ann.id}`,
            type: "announcement",
            title: ann.title,
            message: ann.content?.substring(0, 150) + (ann.content?.length > 150 ? "..." : "") || "",
            read: false,
            created_at: ann.created_at,
            metadata: { priority: ann.priority },
          });
        });
      }

      // Add order updates
      if (orders) {
        orders.forEach((order) => {
          notificationsList.push({
            id: `order-${order.id}`,
            type: "order",
            title: `Order ${order.order_number}`,
            message: `Status: ${order.status?.replace(/_/g, " ").toUpperCase()} - $${order.total_amount?.toFixed(2)}`,
            read: true,
            created_at: order.created_at,
            metadata: { orderId: order.id, status: order.status },
          });
        });
      }

      // Add reward notifications
      if (rewards) {
        rewards.forEach((reward) => {
          notificationsList.push({
            id: `reward-${reward.id}`,
            type: "reward",
            title: reward.points > 0 ? "Points Earned!" : "Points Redeemed",
            message: reward.description || `${Math.abs(reward.points)} points ${reward.points > 0 ? "earned" : "used"}`,
            read: true,
            created_at: reward.created_at,
            metadata: { points: reward.points },
          });
        });
      }

      // Sort by date
      notificationsList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <Package className="h-5 w-5 text-blue-600" />;
      case "payment":
        return <CreditCard className="h-5 w-5 text-green-600" />;
      case "reward":
        return <Gift className="h-5 w-5 text-purple-600" />;
      case "announcement":
        return <Megaphone className="h-5 w-5 text-orange-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-6 w-6 text-emerald-600" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-gray-500 mt-1">Stay updated with your orders, rewards, and announcements</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100">
            <TabsTrigger value="all" className="gap-2">
              <Bell className="h-4 w-4" /> All
            </TabsTrigger>
            <TabsTrigger value="order" className="gap-2">
              <Package className="h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="reward" className="gap-2">
              <Gift className="h-4 w-4" /> Rewards
            </TabsTrigger>
            <TabsTrigger value="announcement" className="gap-2">
              <Megaphone className="h-4 w-4" /> Announcements
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
                  <p className="text-gray-500 mt-1">You're all caught up!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`transition-all hover:shadow-md ${
                      !notification.read ? "border-l-4 border-l-emerald-500 bg-emerald-50/50" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                            {!notification.read && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">New</Badge>
                            )}
                            {notification.metadata?.priority === "high" && (
                              <Badge className="bg-red-100 text-red-700 text-xs">Important</Badge>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        {notification.type === "reward" && notification.metadata?.points && (
                          <div className={`text-right ${notification.metadata.points > 0 ? "text-green-600" : "text-red-600"}`}>
                            <span className="font-bold">
                              {notification.metadata.points > 0 ? "+" : ""}{notification.metadata.points}
                            </span>
                            <p className="text-xs text-gray-500">points</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyNotifications;
