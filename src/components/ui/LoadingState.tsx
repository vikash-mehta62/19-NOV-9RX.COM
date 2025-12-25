/**
 * Loading State Components
 * Consistent loading indicators across the app
 */
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = "md", className, label = "Loading" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)} role="status" aria-label={label}>
      <Loader2 className={cn("animate-spin text-emerald-600", sizeClasses[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
      role="alert"
      aria-busy="true"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-xl">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" aria-hidden="true" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn("animate-pulse bg-gray-200 rounded", className)} 
      aria-hidden="true"
    />
  );
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200" aria-hidden="true">
      <Skeleton className="aspect-square" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
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

// Stats Card Skeleton
export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6" aria-hidden="true">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// Form Skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-32 rounded-xl mt-6" />
    </div>
  );
}

// Page Loading State
export function PageLoadingState({ title = "Loading content..." }: { title?: string }) {
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-[400px] gap-4"
      role="status"
      aria-label={title}
    >
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-emerald-100" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
      </div>
      <p className="text-gray-600 font-medium">{title}</p>
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
