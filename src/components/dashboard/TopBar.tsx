import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { CartDrawer } from "../pharmacy/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
// import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

export const TopBar = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem('userType') !== 'admin') return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setNotifications(data.map((n: any) => ({
          id: n.id,
          message: n.message,
          time: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
          read: n.read
        })));
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = payload.new as any;
          setNotifications(prev => [{
            id: newNotification.id,
            message: newNotification.message,
            time: 'Just now',
            read: newNotification.read
          }, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  return (
    <div className="h-12 sm:h-14 md:h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 bg-white dark:bg-gray-900 z-10 transition-colors">
      <SidebarTrigger />
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme Toggle - temporarily disabled */}
        {/* <ThemeToggle variant="icon" /> */}
        
        {/* Hide CartDrawer for pharmacy users as they have cart in sidebar */}
        {sessionStorage.getItem('userType') !== 'pharmacy' && <CartDrawer />}
     { sessionStorage.getItem('userType') === 'admin' &&  <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-red-600 text-[9px] sm:text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 sm:w-72 md:w-80">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-2.5 sm:p-3 md:p-4 space-y-0.5 sm:space-y-1 cursor-pointer"
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm ${
                        notification.read ? "text-gray-500" : "font-medium"
                      }`}
                    >
                      {notification.message}
                    </span>
                    {!notification.read && (
                      <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    {notification.time}
                  </span>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 text-center">
                No notifications
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
    </div>
  );
};
