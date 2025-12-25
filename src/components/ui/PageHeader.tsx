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
    <div className={cn("mb-6 space-y-4", className)}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <Breadcrumb items={breadcrumbs} className="mb-2" />
      )}

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-gray-600 text-sm sm:text-base">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
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
    <div className={cn("mb-4 flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <a
            href={backHref}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 transition-colors p-2 -ml-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{backLabel}</span>
          </a>
        )}
        <h1 className="text-xl font-semibold text-gray-900 truncate">
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
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500">
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
