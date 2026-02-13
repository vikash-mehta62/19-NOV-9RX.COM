import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-8 sm:py-12 px-4", className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 mb-4">
        <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-gray-500 mb-4 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="lg" className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
