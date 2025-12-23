"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Clock,
  Truck,
  CreditCard,
  Gift,
  ChevronDown,
  ChevronUp,
  Bell,
  Star,
} from "lucide-react";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  creditBalance: number;
  rewardPoints: number;
  lastOrderDate: string | null;
}

export const WelcomeDashboard = () => {
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    creditBalance: 0,
    rewardPoints: 0,
    lastOrderDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userProfile?.id) return;
      try {
        // Use profile_id instead of user_id
        const { data: orders, count } = await supabase
          .from("orders")
          .select("*", { count: "exact" })
          .eq("profile_id", userProfile.id);
        const pendingOrders = orders?.filter(
          (o) => o.status === "pending" || o.status === "processing"
        ).length || 0;
        const lastOrder = orders?.[0];
        setStats({
          totalOrders: count || 0,
          pendingOrders,
          creditBalance: userProfile.credit_balance || 0,
          rewardPoints: userProfile.reward_points || 0,
          lastOrderDate: lastOrder?.created_at || null,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userProfile]);

  const firstName = userProfile?.first_name || userProfile?.company_name?.split(" ")[0] || "there";

  const quickActions = [
    { icon: Package, label: "My Orders", path: "/pharmacy/orders", color: "bg-blue-500" },
    { icon: Clock, label: "Reorder", path: "/pharmacy/reorder", color: "bg-green-500" },
    { icon: CreditCard, label: "Invoices", path: "/pharmacy/invoices", color: "bg-purple-500" },
    { icon: Gift, label: "Rewards", path: "/pharmacy/rewards", color: "bg-pink-500" },
  ];

  return (
    <div>
      <Card 
        className="bg-white border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-emerald-100">
                <AvatarImage src={userProfile?.avatar} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-bold">
                  {firstName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-gray-900">
                  {greeting} 👋 <span className="font-semibold">{firstName}!</span>
                </p>
                <p className="text-xs text-gray-500">
                  {isExpanded ? "Click to collapse" : "Tap to view your dashboard"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isExpanded && (
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full px-2.5 py-1">
                    <Package className="h-3 w-3" />
                    <span className="text-xs font-medium">{stats.totalOrders}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1">
                    <CreditCard className="h-3 w-3" />
                    <span className="text-xs font-medium">${stats.creditBalance.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 rounded-full px-2.5 py-1">
                    <Star className="h-3 w-3" />
                    <span className="text-xs font-medium">{stats.rewardPoints}</span>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative h-8 w-8 p-0"
                onClick={(e) => { e.stopPropagation(); navigate("/pharmacy/notifications"); }}
              >
                <Bell className="h-4 w-4" />
                {stats.pendingOrders > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">
                    {stats.pendingOrders}
                  </span>
                )}
              </Button>
              <div className="bg-gray-100 rounded-full p-1.5 text-gray-500">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/pharmacy/orders")}>
                  <CardContent className="p-4 text-center">
                    <Package className="h-6 w-6 mx-auto mb-2 opacity-90" />
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                    <p className="text-xs text-blue-100">Total Orders</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/pharmacy/orders?status=pending")}>
                  <CardContent className="p-4 text-center">
                    <Truck className="h-6 w-6 mx-auto mb-2 opacity-90" />
                    <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                    <p className="text-xs text-orange-100">In Progress</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/pharmacy/credit")}>
                  <CardContent className="p-4 text-center">
                    <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-90" />
                    <p className="text-2xl font-bold">${stats.creditBalance.toFixed(0)}</p>
                    <p className="text-xs text-emerald-100">Credit</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/pharmacy/rewards")}>
                  <CardContent className="p-4 text-center">
                    <Star className="h-6 w-6 mx-auto mb-2 opacity-90" />
                    <p className="text-2xl font-bold">{stats.rewardPoints}</p>
                    <p className="text-xs text-amber-100">Points</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <Button key={index} variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-gray-50 border-gray-200 bg-white" onClick={() => navigate(action.path)}>
                    <div className={`w-9 h-9 ${action.color} rounded-lg flex items-center justify-center`}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WelcomeDashboard;
