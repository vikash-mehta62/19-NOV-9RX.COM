/**
 * Page Header Component
 * Consistent page header with breadcrumbs, title, and actions
 */
import { ReactNode } from "react";
import { Breadcrumb, BreadcrumbItem } from "./breadcrumb";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  showBreadcrumbs = true,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 sm:mb-8 space-y-3 sm:space-y-4", className)}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <Breadcrumb items={breadcrumbs} className="mb-2" />
      )}

      {/* Title Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap sm:flex-nowrap">
            {actions}
          </div>
        )}
      </div>

      {/* Additional content */}
      {children}
    </div>
  );
}

// Compact version for nested pages
interface CompactPageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}

export function CompactPageHeader({
  title,
  backHref,
  backLabel = "Back",
  actions,
  className,
}: CompactPageHeaderProps) {
  return (
    <div className={cn("mb-4 sm:mb-6 flex items-center justify-between gap-3 sm:gap-4", className)}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {backHref && (
          <a
            href={backHref}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 -ml-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[44px] min-w-[44px] justify-center"
            aria-label={backLabel}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{backLabel}</span>
          </a>
        )}
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
          {title}
        </h1>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// Section header for within-page sections
interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
  size = "default",
}: SectionHeaderProps) {
  const titleSizes = {
    sm: "text-base font-medium",
    default: "text-lg font-semibold",
    lg: "text-xl font-semibold",
  };

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6", className)}>
      <div className="space-y-1 min-w-0">
        <h2 className={cn("text-gray-900 dark:text-gray-100", titleSizes[size])}>
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
