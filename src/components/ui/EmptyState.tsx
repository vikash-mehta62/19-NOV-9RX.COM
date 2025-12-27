/**
 * Empty State Components
 * Consistent empty state UI across the app
 */
import { 
  Package, ShoppingCart, FileText, Search, Heart, 
  Bell, Users, Inbox, FolderOpen, Image 
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

type EmptyStateVariant = 
  | "products" 
  | "cart" 
  | "orders" 
  | "search" 
  | "wishlist" 
  | "notifications"
  | "users"
  | "inbox"
  | "files"
  | "images"
  | "default";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  size?: "sm" | "default" | "lg";
}

const emptyStateConfig: Record<EmptyStateVariant, {
  icon: typeof Package;
  title: string;
  description: string;
  actionLabel: string;
  iconBg: string;
  iconBgDark: string;
  iconColor: string;
}> = {
  products: {
    icon: Package,
    title: "No products found",
    description: "Try adjusting your search or filters to find what you're looking for.",
    actionLabel: "Clear Filters",
    iconBg: "bg-emerald-100",
    iconBgDark: "dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  cart: {
    icon: ShoppingCart,
    title: "Your cart is empty",
    description: "Browse our products and add items to get started with your order.",
    actionLabel: "Browse Products",
    iconBg: "bg-emerald-100",
    iconBgDark: "dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  orders: {
    icon: FileText,
    title: "No orders yet",
    description: "Your order history will appear here once you place your first order.",
    actionLabel: "Start Shopping",
    iconBg: "bg-blue-100",
    iconBgDark: "dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "We couldn't find anything matching your search. Try different keywords.",
    actionLabel: "Clear Search",
    iconBg: "bg-gray-100",
    iconBgDark: "dark:bg-gray-800",
    iconColor: "text-gray-600 dark:text-gray-400",
  },
  wishlist: {
    icon: Heart,
    title: "Your wishlist is empty",
    description: "Save products you love by clicking the heart icon on any product.",
    actionLabel: "Explore Products",
    iconBg: "bg-pink-100",
    iconBgDark: "dark:bg-pink-900/30",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
  notifications: {
    icon: Bell,
    title: "No notifications",
    description: "You're all caught up! New notifications will appear here.",
    actionLabel: "Refresh",
    iconBg: "bg-amber-100",
    iconBgDark: "dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  users: {
    icon: Users,
    title: "No users found",
    description: "There are no users matching your criteria.",
    actionLabel: "Clear Filters",
    iconBg: "bg-purple-100",
    iconBgDark: "dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  inbox: {
    icon: Inbox,
    title: "Inbox is empty",
    description: "You have no messages at the moment.",
    actionLabel: "Compose",
    iconBg: "bg-blue-100",
    iconBgDark: "dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  files: {
    icon: FolderOpen,
    title: "No files found",
    description: "Upload files or create new documents to get started.",
    actionLabel: "Upload File",
    iconBg: "bg-gray-100",
    iconBgDark: "dark:bg-gray-800",
    iconColor: "text-gray-600 dark:text-gray-400",
  },
  images: {
    icon: Image,
    title: "No images",
    description: "Upload images to display them here.",
    actionLabel: "Upload Image",
    iconBg: "bg-indigo-100",
    iconBgDark: "dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  default: {
    icon: Inbox,
    title: "Nothing here yet",
    description: "This section is empty. Check back later or take an action to get started.",
    actionLabel: "Get Started",
    iconBg: "bg-gray-100",
    iconBgDark: "dark:bg-gray-800",
    iconColor: "text-gray-600 dark:text-gray-400",
  },
};

const sizeConfig = {
  sm: {
    container: "min-h-[200px] p-4 sm:p-6",
    icon: "w-12 h-12",
    iconInner: "w-6 h-6",
    title: "text-base",
    description: "text-sm max-w-xs",
    gap: "mb-3",
  },
  default: {
    container: "min-h-[280px] sm:min-h-[320px] p-6 sm:p-8",
    icon: "w-16 h-16 sm:w-20 sm:h-20",
    iconInner: "w-8 h-8 sm:w-10 sm:h-10",
    title: "text-lg sm:text-xl",
    description: "text-sm sm:text-base max-w-sm",
    gap: "mb-4 sm:mb-6",
  },
  lg: {
    container: "min-h-[400px] p-8 sm:p-12",
    icon: "w-20 h-20 sm:w-24 sm:h-24",
    iconInner: "w-10 h-10 sm:w-12 sm:h-12",
    title: "text-xl sm:text-2xl",
    description: "text-base max-w-md",
    gap: "mb-6 sm:mb-8",
  },
};

export function EmptyState({
  variant = "default",
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className,
  size = "default",
}: EmptyStateProps) {
  const config = emptyStateConfig[variant];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        sizes.container,
        className
      )}
      role="status"
      aria-label={title || config.title}
    >
      {/* Animated Icon Container */}
      <div className={cn("relative", sizes.gap)}>
        <div className={cn(
          "rounded-full flex items-center justify-center transition-transform hover:scale-105",
          sizes.icon,
          config.iconBg,
          config.iconBgDark
        )}>
          <Icon className={cn(sizes.iconInner, config.iconColor)} aria-hidden="true" />
        </div>
        {/* Decorative ring */}
        <div className={cn(
          "absolute inset-0 rounded-full border-2 border-dashed opacity-30 animate-spin-slow",
          sizes.icon,
          config.iconColor.split(" ")[0].replace("text-", "border-")
        )} style={{ animationDuration: "20s" }} />
      </div>

      {/* Title */}
      <h3 className={cn("font-semibold text-gray-900 dark:text-gray-100 mb-2", sizes.title)}>
        {title || config.title}
      </h3>

      {/* Description */}
      <p className={cn("text-gray-600 dark:text-gray-400", sizes.description, sizes.gap)}>
        {description || config.description}
      </p>

      {/* Actions */}
      {(onAction || onSecondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {onAction && (
            <Button onClick={onAction} aria-label={actionLabel || config.actionLabel}>
              {actionLabel || config.actionLabel}
            </Button>
          )}
          {onSecondaryAction && secondaryLabel && (
            <Button variant="outline" onClick={onSecondaryAction} aria-label={secondaryLabel}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact Empty State (for smaller areas like sidebars, dropdowns)
interface CompactEmptyStateProps {
  icon?: typeof Package;
  message: string;
  className?: string;
}

export function CompactEmptyState({ icon: Icon = Inbox, message, className }: CompactEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-6 sm:py-8 px-4 text-center animate-fade-in",
      className
    )}>
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500 mb-2" aria-hidden="true" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
