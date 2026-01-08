import { LucideIcon, Package, FileText, Users, ShoppingCart, Search, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "search" | "orders" | "products" | "users";
}

const variantConfig = {
  default: {
    icon: Inbox,
    gradient: "from-gray-100 to-gray-200",
    iconColor: "text-gray-400",
  },
  search: {
    icon: Search,
    gradient: "from-blue-50 to-indigo-100",
    iconColor: "text-blue-400",
  },
  orders: {
    icon: ShoppingCart,
    gradient: "from-blue-50 to-teal-100",
    iconColor: "text-teal-500",
  },
  products: {
    icon: Package,
    gradient: "from-purple-50 to-pink-100",
    iconColor: "text-purple-500",
  },
  users: {
    icon: Users,
    gradient: "from-amber-50 to-orange-100",
    iconColor: "text-amber-500",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = "default",
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const IconComponent = icon || config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Animated illustration */}
      <div className={`relative mb-6`}>
        {/* Background circles */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-full blur-2xl opacity-60 scale-150`} />
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-full blur-xl opacity-40 scale-125 animate-pulse`} />
        
        {/* Icon container */}
        <div className={`relative w-24 h-24 bg-gradient-to-br ${config.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
          <IconComponent className={`h-12 w-12 ${config.iconColor}`} strokeWidth={1.5} />
        </div>

        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: "0s" }} />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-purple-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: "0.2s" }} />
        <div className="absolute top-1/2 -right-4 w-2 h-2 bg-teal-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: "0.4s" }} />
      </div>

      {/* Text content */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>
      <p className="text-gray-500 text-center max-w-sm mb-6">
        {description}
      </p>

      {/* Action button */}
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Skeleton loader for lists
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div 
          key={i} 
          className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Table skeleton loader
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex gap-4">
          {[...Array(columns)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="border-b border-gray-100 p-4 animate-pulse"
          style={{ animationDelay: `${rowIndex * 0.1}s` }}
        >
          <div className="flex gap-4 items-center">
            {[...Array(columns)].map((_, colIndex) => (
              <div 
                key={colIndex} 
                className={`h-4 bg-gray-${colIndex === 0 ? '200' : '100'} rounded flex-1`} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
