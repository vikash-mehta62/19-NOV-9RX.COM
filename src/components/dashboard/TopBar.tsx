import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { CartDrawer } from "../pharmacy/components/CartDrawer";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

export const TopBar = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    // {
    //   id: "1",
    //   message: "New order received",
    //   time: "5 minutes ago",
    //   read: false,
    // },
    // {
    //   id: "2",
    //   message: "Stock alert: Product XYZ running low",
    //   time: "10 minutes ago",
    //   read: false,
    // },
    // {
    //   id: "3",
    //   message: "Payment received from Customer ABC",
    //   time: "1 hour ago",
    //   read: false,
    // },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  return (
    <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 bg-white z-10">
      <SidebarTrigger />
      <div className="flex items-center gap-4">
        <CartDrawer />
     { sessionStorage.getItem('userType') === 'admin' &&  <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-4 space-y-1 cursor-pointer"
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-sm ${
                        notification.read ? "text-gray-500" : "font-medium"
                      }`}
                    >
                      {notification.message}
                    </span>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {notification.time}
                  </span>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-4 text-sm text-gray-500 text-center">
                No notifications
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
    </div>
  );
};
