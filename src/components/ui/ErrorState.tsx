/**
 * Error State Components
 * Consistent error handling UI across the app
 */
import { AlertCircle, RefreshCw, Home, WifiOff, ShieldX, FileQuestion } from "lucide-react";
import { AccessibleButton } from "./AccessibleButton";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
  variant?: "default" | "network" | "notFound" | "unauthorized";
  className?: string;
}

const errorConfig = {
  default: {
    icon: AlertCircle,
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
  },
  network: {
    icon: WifiOff,
    title: "Connection Error",
    description: "Please check your internet connection and try again.",
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  notFound: {
    icon: FileQuestion,
    title: "Not Found",
    description: "The page or resource you're looking for doesn't exist.",
    iconColor: "text-gray-500",
    bgColor: "bg-gray-50",
  },
  unauthorized: {
    icon: ShieldX,
    title: "Access Denied",
    description: "You don't have permission to view this content.",
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
  },
};

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Try Again",
  onSecondaryAction,
  secondaryLabel = "Go Home",
  variant = "default",
  className,
}: ErrorStateProps) {
  const config = errorConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[300px] p-8 text-center",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", config.bgColor)}>
        <Icon className={cn("w-8 h-8", config.iconColor)} aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title || config.title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 max-w-md mb-6">
        {description || config.description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <AccessibleButton
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            aria-label={retryLabel}
          >
            {retryLabel}
          </AccessibleButton>
        )}
        {onSecondaryAction && (
          <AccessibleButton
            variant="outline"
            onClick={onSecondaryAction}
            leftIcon={<Home className="w-4 h-4" />}
            aria-label={secondaryLabel}
          >
            {secondaryLabel}
          </AccessibleButton>
        )}
      </div>
    </div>
  );
}

// Inline Error (for form fields, small areas)
interface InlineErrorProps {
  message: string;
  id?: string;
}

export function InlineError({ message, id }: InlineErrorProps) {
  return (
    <p
      id={id}
      className="flex items-center gap-1.5 text-sm text-red-600 mt-1"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

// Error Banner (for page-level errors)
interface ErrorBannerProps {
  title: string;
  description?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ title, description, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h4 className="font-medium text-red-800">{title}</h4>
          {description && <p className="text-sm text-red-700 mt-1">{description}</p>}
        </div>
        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-medium text-red-700 hover:text-red-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm font-medium text-red-700 hover:text-red-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Dismiss error"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
