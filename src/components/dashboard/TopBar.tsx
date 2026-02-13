import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, AlertTriangle, Info, Zap, ShoppingCart, Package, Trash2, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { CartDrawer } from "../pharmacy/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ThemeToggle } from "@/features/theme";
import { useNavigate } from "react-router-dom";
import { deleteNotification } from "@/services/notificationService";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  time: string;
  read: boolean;
  link?: string;
}

export const TopBar = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const userType = sessionStorage.getItem('userType');

  useEffect(() => {
    // Only show notifications for admin users
    if (userType !== 'admin') return;

    const fetchNotifications = async () => {
      try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          // Table might not exist or other error, silently ignore
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            console.log('ℹ️ Notifications table not yet created. Run migration: 20260206_create_notifications_table.sql');
          } else {
            console.error('Error fetching notifications:', error);
          }
          return;
        }
        
        if (data) {
          setNotifications(data.map((n: any) => ({
            id: n.id,
            title: n.title || 'Notification',
            message: n.message,
            type: n.type || 'info',
            time: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
            read: n.read,
            link: n.link
          })));
        }
      } catch (err: any) {
        // Silently ignore if table doesn't exist
        console.log('ℹ️ Notifications feature not available yet');
      }
    };

    fetchNotifications();

    // Subscribe to real-time notifications for current user
    const setupRealtimeSubscription = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const channel = supabase
        .channel('notifications_channel')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${userData.user.id}`
          },
          (payload) => {
            const newNotification = payload.new as any;
            setNotifications(prev => [{
              id: newNotification.id,
              title: newNotification.title || 'Notification',
              message: newNotification.message,
              type: newNotification.type || 'info',
              time: 'Just now',
              read: newNotification.read,
              link: newNotification.link
            }, ...prev.slice(0, 9)]); // Keep only 10 notifications
          }
        )
        .subscribe();

      return channel;
    };

    let channel: any = null;
    setupRealtimeSubscription().then(ch => { channel = ch; });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    
    await supabase.from('notifications').update({ read: true }).eq('id', id).catch(() => {});
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
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

  return (
    <div className="h-12 sm:h-14 md:h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 bg-white dark:bg-gray-900 z-10 transition-colors">
      <SidebarTrigger />
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* Hide CartDrawer for pharmacy users as they have cart in sidebar */}
        {sessionStorage.getItem('userType') !== 'pharmacy' && <CartDrawer />}
        
        {/* Notification Bell - Admin Only */}
        {userType === 'admin' && <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-red-600 text-[9px] sm:text-[10px] font-medium text-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
            {/* Header */}
            <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">
                    {unreadCount} New
                  </Badge>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="h-[400px]">
              {notifications.length > 0 ? (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group relative p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                        !notification.read ? "bg-blue-50 dark:bg-blue-950/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              {notification.title}
                              {!notification.read && (
                                <span className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></span>
                              )}
                            </h4>
                            <Badge 
                              className={`${getNotificationBadgeColor(notification.type)} border text-[10px] px-1.5 py-0`}
                            >
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">
                              {notification.time}
                            </span>
                            {notification.link && (
                              <span className="text-[10px] text-blue-600 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                View
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-green-50 dark:hover:bg-green-950"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkNotificationAsRead(notification.id);
                              }}
                              title="Mark as read"
                            >
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={(e) => handleDelete(notification.id, e)}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                    <Bell className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
                    No notifications
                  </h4>
                  <p className="text-xs text-gray-500">
                    You're all caught up!
                  </p>
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator className="my-0" />
                <div className="p-2">
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                    onClick={() => {
                      if (userType === 'admin') {
                        navigate('/admin/alerts');
                      } else if (userType === 'pharmacy') {
                        navigate('/pharmacy/notifications');
                      } else {
                        navigate('/admin/alerts');
                      }
                    }}
                  >
                    View All Notifications
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
    </div>
  );
};
