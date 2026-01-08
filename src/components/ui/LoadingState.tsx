/**
 * Loading State Components
 * Consistent loading indicators across the app
 */
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
  color?: "primary" | "white" | "gray";
}

export function LoadingSpinner({ 
  size = "md", 
  className, 
  label = "Loading",
  color = "primary" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  const colorClasses = {
    primary: "text-blue-600 dark:text-blue-400",
    white: "text-white",
    gray: "text-gray-400 dark:text-gray-500",
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)} role="status" aria-label={label}>
      <Loader2 className={cn("animate-spin", sizeClasses[size], colorClasses[color])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({ message = "Loading...", fullScreen = true }: LoadingOverlayProps) {
  return (
    <div 
      className={cn(
        "flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50",
        fullScreen ? "fixed inset-0" : "absolute inset-0 rounded-xl"
      )}
      role="alert"
      aria-busy="true"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-4 p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 animate-scale-in">
        <div className="relative">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-4 border-blue-100 dark:border-blue-900/50" />
          <div className="absolute inset-0 h-12 w-12 sm:h-14 sm:w-14 rounded-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-medium text-sm sm:text-base">{message}</p>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "bg-gray-200 dark:bg-gray-700 rounded",
        animate && "animate-pulse",
        className
      )} 
      aria-hidden="true"
    />
  );
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" aria-hidden="true">
      <Skeleton className="aspect-square" />
      <div className="p-3 sm:p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <Skeleton className="h-10 sm:h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Product Grid Skeleton
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700" aria-hidden="true">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6" aria-hidden="true">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <Skeleton className="h-4 w-20 sm:w-24" />
        <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg" />
      </div>
      <Skeleton className="h-7 sm:h-8 w-16 sm:w-20 mb-2" />
      <Skeleton className="h-3 w-24 sm:w-32" />
    </div>
  );
}

// Stats Grid Skeleton
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Form Skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4 sm:space-y-5" aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20 sm:w-24" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-28 sm:w-32 rounded-xl mt-6" />
    </div>
  );
}

// Page Loading State
export function PageLoadingState({ title = "Loading content..." }: { title?: string }) {
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] gap-4 animate-fade-in"
      role="status"
      aria-label={title}
    >
      <div className="relative">
        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-4 border-blue-100 dark:border-blue-900/50" />
        <div className="absolute inset-0 h-14 w-14 sm:h-16 sm:w-16 rounded-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin" />
      </div>
      <p className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">{title}</p>
    </div>
  );
}

// Inline Loading (for buttons, small areas)
export function InlineLoading({ text = "Loading" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

// Card Skeleton
export function CardSkeleton({ hasImage = false }: { hasImage?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" aria-hidden="true">
      {hasImage && <Skeleton className="h-40 sm:h-48 w-full" />}
      <div className="p-4 sm:p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

// List Item Skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4" aria-hidden="true">
      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-8 w-16 sm:w-20 rounded-lg flex-shrink-0" />
    </div>
  );
}
