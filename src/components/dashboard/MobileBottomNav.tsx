import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    { icon: ShoppingCart, label: "Orders", path: "/admin/orders" },
    { icon: Package, label: "Products", path: "/admin/products" },
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all rounded-lg active:scale-95",
                "min-w-[60px] min-h-[44px]", // Touch-friendly size
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive && "scale-110")} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
