import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Package,
  ShoppingCart,
  Users,
  Settings as SettingsIcon,
  RefreshCw,
  CheckSquare,
  Zap,
  ExternalLink,
  Trash2,
  Clock
} from "lucide-react";
import {
  getAlerts,
  getAlertStats,
  markAlertAsRead,
  markAllAlertsAsRead,
  resolveAlert,
  Alert,
  AlertStats,
} from "@/services/automationService";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  Notification,
} from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"alerts" | "notifications">("notifications");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (viewMode === "alerts") {
      loadAlerts();
      loadStats();
    } else {
      loadNotifications();
      loadUnreadCount();
    }
  }, [activeTab, viewMode]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const filters: any = { isResolved: false };
      
      if (activeTab !== "all") {
        if (activeTab === "unread") {
          filters.isRead = false;
        } else {
          filters.category = activeTab;
        }
      }

      const data = await getAlerts(filters);
      setAlerts(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getAlertStats();
      setStats(data);
    } catch (error: any) {
      console.error("Error loading stats:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (activeTab === "unread") {
        filters.read = false;
      } else if (activeTab !== "all") {
        filters.type = activeTab;
      }

      console.log('Loading notifications with filters:', filters);
      const data = await getNotifications(filters);
      console.log('Loaded notifications:', data);
      setNotifications(data);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error: any) {
      console.error("Error loading unread count:", error);
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      await loadAlerts();
      await loadStats();
      toast({
        title: "✅ Marked as Read",
        description: "Alert marked as read",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (viewMode === "alerts") {
        await markAllAlertsAsRead();
        await loadAlerts();
        await loadStats();
      } else {
        await markAllNotificationsAsRead();
        await loadNotifications();
        await loadUnreadCount();
      }
      toast({
        title: "✅ All Marked as Read",
        description: `All ${viewMode} marked as read`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");
      
      await resolveAlert(alertId, user.user.id);
      await loadAlerts();
      await loadStats();
      toast({
        title: "✅ Resolved",
        description: "Alert resolved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      await loadNotifications();
      await loadUnreadCount();
      toast({
        title: "🗑️ Deleted",
        description: "Notification deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkNotificationAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: any = {
      critical: "destructive",
      warning: "warning",
      info: "default",
    };
    return <Badge variant={variants[severity]}>{severity.toUpperCase()}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "inventory":
        return <Package className="h-4 w-4" />;
      case "orders":
        return <ShoppingCart className="h-4 w-4" />;
      case "customers":
        return <Users className="h-4 w-4" />;
      default:
        return <SettingsIcon className="h-4 w-4" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "automation":
        return <Zap className="h-5 w-5 text-purple-600" />;
      case "order":
        return <ShoppingCart className="h-5 w-5 text-blue-600" />;
      case "payment":
        return <Package className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      success: "bg-green-100 text-green-800 border-green-200",
      error: "bg-red-100 text-red-800 border-red-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      automation: "bg-purple-100 text-purple-800 border-purple-200",
      order: "bg-blue-100 text-blue-800 border-blue-200",
      payment: "bg-green-100 text-green-800 border-green-200",
      info: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[type] || colors.info;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const refreshData = () => {
    if (viewMode === "alerts") {
      loadAlerts();
      loadStats();
    } else {
      loadNotifications();
      loadUnreadCount();
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Bell className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">Alerts & Notifications</h1>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount} New</Badge>
              )}
            </div>
            <p className="text-gray-600">
              Monitor system alerts and stay updated on important events
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {/* Debug: Test Notification Button */}
            {/* <Button 
              onClick={async () => {
                try {
                  const { data: user } = await supabase.auth.getUser();
                  if (!user.user) {
                    toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
                    return;
                  }
                  
                  const { data, error } = await supabase
                    .from('notifications')
                    .insert({
                      user_id: user.user.id,
                      title: '🧪 Test Task Notification',
                      message: 'This is a test task notification to verify the system is working',
                      type: 'info',
                      read: false,
                      metadata: { test: true }
                    })
                    .select()
                    .single();
                  
                  if (error) {
                    console.error('Test notification error:', error);
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  } else {
                    console.log('Test notification created:', data);
                    toast({ title: "✅ Test Notification Created", description: "Check the Tasks tab" });
                    refreshData();
                  }
                } catch (err: any) {
                  console.error('Test error:', err);
                  toast({ title: "Error", description: err.message, variant: "destructive" });
                }
              }}
              variant="outline"
              className="bg-purple-50 hover:bg-purple-100"
            >
              🧪 Test Notification
            </Button> */}
            {((viewMode === "alerts" && stats && stats.unread > 0) || 
              (viewMode === "notifications" && unreadCount > 0)) && (
              <Button onClick={handleMarkAllAsRead}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={viewMode === "notifications" ? "default" : "outline"}
            onClick={() => setViewMode("notifications")}
            className="flex-1"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </Button>
          <Button
            variant={viewMode === "alerts" ? "default" : "outline"}
            onClick={() => setViewMode("alerts")}
            className="flex-1"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            System Alerts
            {stats && stats.unread > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{stats.unread}</Badge>
            )}
          </Button>
        </div>

        {/* Stats Cards - Only for Alerts */}
        {viewMode === "alerts" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Active</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
                <div className="text-sm text-gray-600">Warning</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
                <div className="text-sm text-gray-600">Info</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.unread}</div>
                <div className="text-sm text-gray-600">Unread</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              {viewMode === "notifications" ? (
                <>
                  <Bell className="h-5 w-5" />
                  Your Notifications
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  Active System Alerts
                </>
              )}
            </CardTitle>
            <CardDescription>
              {viewMode === "notifications" 
                ? "Stay updated on tasks, automation, and system activities"
                : "Review and manage critical system alerts"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b px-6 pt-4">
                {viewMode === "notifications" ? (
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">Unread</TabsTrigger>
                    <TabsTrigger value="info">Tasks</TabsTrigger>
                    <TabsTrigger value="automation">Automation</TabsTrigger>
                    <TabsTrigger value="order">Orders</TabsTrigger>
                  </TabsList>
                ) : (
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">Unread</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                    <TabsTrigger value="system">System</TabsTrigger>
                  </TabsList>
                )}
              </div>

              <TabsContent value={activeTab} className="p-6 mt-0">
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-400" />
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : viewMode === "notifications" ? (
                  // Notifications View
                  notifications.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="h-16 w-16 mx-auto mb-3 text-green-500" />
                      <p className="text-lg font-medium">
                        {activeTab === "info" ? "No task notifications yet" : "All caught up!"}
                      </p>
                      <p className="text-sm">
                        {activeTab === "info" 
                          ? "Task notifications will appear here when you create, update, or manage tasks" 
                          : "No notifications to display"}
                      </p>
                      {activeTab === "info" && (
                        <p className="text-xs text-gray-400 mt-2">
                          Tip: Create a task from a customer profile to see notifications here
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`group relative p-4 border rounded-lg transition-all hover:shadow-md cursor-pointer ${
                            !notification.read 
                              ? "bg-blue-50 border-blue-200 hover:bg-blue-100" 
                              : "bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-base">
                                  {notification.title}
                                  {!notification.read && (
                                    <span className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></span>
                                  )}
                                </h4>
                                <Badge 
                                  className={`${getNotificationBadgeColor(notification.type)} border text-xs flex-shrink-0`}
                                >
                                  {notification.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                {notification.message}
                              </p>
                              
                              {/* Metadata Display for Task Notifications */}
                              {notification.metadata && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {notification.metadata.priority && (
                                    <Badge variant="outline" className="text-xs">
                                      Priority: {notification.metadata.priority}
                                    </Badge>
                                  )}
                                  {notification.metadata.status && (
                                    <Badge variant="outline" className="text-xs">
                                      Status: {notification.metadata.status}
                                    </Badge>
                                  )}
                                  {notification.metadata.action && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {notification.metadata.action}
                                    </Badge>
                                  )}
                                  {notification.metadata.task_title && (
                                    <Badge variant="outline" className="text-xs">
                                      Task: {notification.metadata.task_title}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {getRelativeTime(notification.created_at)}
                                </span>
                                {notification.link && (
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <ExternalLink className="h-3 w-3" />
                                    View Details
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.read && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkNotificationAsRead(notification.id);
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-green-50 dark:hover:bg-green-950"
                                  title="Mark as read"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-950"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Alerts View
                  alerts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="h-16 w-16 mx-auto mb-3 text-green-500" />
                      <p className="text-lg font-medium">No active alerts</p>
                      <p className="text-sm">System is running smoothly</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                            !alert.is_read ? "bg-blue-50 border-blue-200" : "bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {getSeverityIcon(alert.severity)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{alert.title}</h4>
                                  {getSeverityBadge(alert.severity)}
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    {getCategoryIcon(alert.category)}
                                    {alert.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                                <div className="text-xs text-gray-500">
                                  {new Date(alert.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!alert.is_read && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkAsRead(alert.id)}
                                >
                                  Mark Read
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleResolve(alert.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
