/**
 * Breadcrumb Navigation Component
 * Accessible breadcrumb with proper ARIA attributes
 */
import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  className?: string;
  separator?: React.ReactNode;
  maxItems?: number;
}

// Route label mappings for auto-generation
const routeLabels: Record<string, string> = {
  // Admin routes
  admin: "Admin",
  dashboard: "Dashboard",
  orders: "Orders",
  products: "Products",
  users: "Users",
  invoices: "Invoices",
  settings: "Settings",
  inventory: "Inventory",
  groups: "Groups",
  rewards: "Rewards",
  offers: "Offers",
  banners: "Banners",
  announcements: "Announcements",
  blogs: "Blogs",
  expenses: "Expenses",
  logs: "Activity Logs",
  "group-pricing": "Special Pricing",
  "credit-management": "Credit Management",
  "abandoned-carts": "Abandoned Carts",
  "festival-themes": "Festival Themes",
  "email-templates": "Email Templates",
  "email-campaigns": "Email Campaigns",
  "email-automations": "Email Automations",
  "email-settings": "Email Settings",
  "payment-transactions": "Payments",
  
  // Pharmacy routes
  pharmacy: "Pharmacy",
  "order-history": "Order History",
  statements: "Statements",
  credit: "Credit Balance",
  "payment-methods": "Payment Methods",
  wishlist: "Wishlist",
  help: "Help & Support",
  
  // Common routes
  create: "Create",
  edit: "Edit",
  view: "View",
  product: "Product",
  order: "Order",
};

export function Breadcrumb({
  items,
  showHome = true,
  homeHref = "/",
  className,
  separator,
  maxItems = 4,
}: BreadcrumbProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from current path if items not provided
  const breadcrumbItems = useMemo(() => {
    if (items) return items;

    const pathSegments = location.pathname.split("/").filter(Boolean);
    const generatedItems: BreadcrumbItem[] = [];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip UUID-like segments (product IDs, etc.)
      if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return;
      }

      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      
      generatedItems.push({
        label,
        href: index < pathSegments.length - 1 ? currentPath : undefined,
      });
    });

    return generatedItems;
  }, [items, location.pathname]);

  // Truncate if too many items
  const displayItems = useMemo(() => {
    if (breadcrumbItems.length <= maxItems) return breadcrumbItems;

    const first = breadcrumbItems[0];
    const last = breadcrumbItems.slice(-2);
    
    return [
      first,
      { label: "...", href: undefined },
      ...last,
    ];
  }, [breadcrumbItems, maxItems]);

  const defaultSeparator = (
    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
  );

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center", className)}
    >
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        {/* Home link */}
        {showHome && (
          <>
            <li>
              <Link
                to={homeHref}
                className="flex items-center gap-1 text-gray-500 hover:text-emerald-600 transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Home"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
              </Link>
            </li>
            {displayItems.length > 0 && (
              <li aria-hidden="true" className="flex items-center">
                {separator || defaultSeparator}
              </li>
            )}
          </>
        )}

        {/* Breadcrumb items */}
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === "...";

          return (
            <li key={index} className="flex items-center gap-1.5">
              {isEllipsis ? (
                <span className="text-gray-400 px-1">...</span>
              ) : isLast || !item.href ? (
                <span 
                  className="text-gray-900 font-medium truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-gray-500 hover:text-emerald-600 transition-colors truncate max-w-[150px] p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  {item.label}
                </Link>
              )}
              
              {!isLast && (
                <span aria-hidden="true" className="flex items-center">
                  {separator || defaultSeparator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Compact breadcrumb for mobile
interface CompactBreadcrumbProps {
  backLabel?: string;
  backHref: string;
  currentLabel: string;
  className?: string;
}

export function CompactBreadcrumb({
  backLabel = "Back",
  backHref,
  currentLabel,
  className,
}: CompactBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2", className)}>
      <Link
        to={backHref}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <ChevronRight className="w-4 h-4 rotate-180" aria-hidden="true" />
        <span>{backLabel}</span>
      </Link>
      <ChevronRight className="w-4 h-4 text-gray-300" aria-hidden="true" />
      <span className="text-sm font-medium text-gray-900 truncate" aria-current="page">
        {currentLabel}
      </span>
    </nav>
  );
}
