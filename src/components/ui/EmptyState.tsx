/**
 * Empty State Components
 * Consistent empty state UI across the app
 */
import { 
  Package, ShoppingCart, FileText, Search, Heart, 
  Bell, Users, Inbox, FolderOpen, Image 
} from "lucide-react";
import { AccessibleButton } from "./AccessibleButton";
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
}

const emptyStateConfig: Record<EmptyStateVariant, {
  icon: typeof Package;
  title: string;
  description: string;
  actionLabel: string;
  iconBg: string;
  iconColor: string;
}> = {
  products: {
    icon: Package,
    title: "No products found",
    description: "Try adjusting your search or filters to find what you're looking for.",
    actionLabel: "Clear Filters",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  cart: {
    icon: ShoppingCart,
    title: "Your cart is empty",
    description: "Browse our products and add items to get started with your order.",
    actionLabel: "Browse Products",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  orders: {
    icon: FileText,
    title: "No orders yet",
    description: "Your order history will appear here once you place your first order.",
    actionLabel: "Start Shopping",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "We couldn't find anything matching your search. Try different keywords.",
    actionLabel: "Clear Search",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  wishlist: {
    icon: Heart,
    title: "Your wishlist is empty",
    description: "Save products you love by clicking the heart icon on any product.",
    actionLabel: "Explore Products",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  notifications: {
    icon: Bell,
    title: "No notifications",
    description: "You're all caught up! New notifications will appear here.",
    actionLabel: "Refresh",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  users: {
    icon: Users,
    title: "No users found",
    description: "There are no users matching your criteria.",
    actionLabel: "Clear Filters",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  inbox: {
    icon: Inbox,
    title: "Inbox is empty",
    description: "You have no messages at the moment.",
    actionLabel: "Compose",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  files: {
    icon: FolderOpen,
    title: "No files found",
    description: "Upload files or create new documents to get started.",
    actionLabel: "Upload File",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  images: {
    icon: Image,
    title: "No images",
    description: "Upload images to display them here.",
    actionLabel: "Upload Image",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  default: {
    icon: Inbox,
    title: "Nothing here yet",
    description: "This section is empty. Check back later or take an action to get started.",
    actionLabel: "Get Started",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
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
}: EmptyStateProps) {
  const config = emptyStateConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[300px] p-8 text-center",
        className
      )}
      role="status"
      aria-label={title || config.title}
    >
      {/* Animated Icon Container */}
      <div className="relative mb-6">
        <div className={cn("w-20 h-20 rounded-full flex items-center justify-center", config.iconBg)}>
          <Icon className={cn("w-10 h-10", config.iconColor)} aria-hidden="true" />
        </div>
        {/* Decorative ring */}
        <div className={cn("absolute inset-0 w-20 h-20 rounded-full border-2 border-dashed opacity-30", config.iconColor.replace("text-", "border-"))} />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title || config.title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 max-w-sm mb-6">
        {description || config.description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onAction && (
          <AccessibleButton onClick={onAction} aria-label={actionLabel || config.actionLabel}>
            {actionLabel || config.actionLabel}
          </AccessibleButton>
        )}
        {onSecondaryAction && secondaryLabel && (
          <AccessibleButton variant="outline" onClick={onSecondaryAction} aria-label={secondaryLabel}>
            {secondaryLabel}
          </AccessibleButton>
        )}
      </div>
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
    <div className={cn("flex flex-col items-center justify-center py-8 px-4 text-center", className)}>
      <Icon className="w-8 h-8 text-gray-400 mb-2" aria-hidden="true" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
