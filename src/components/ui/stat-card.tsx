import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
    success: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
    warning: "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200",
    danger: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
  };

  const iconStyles = {
    default: "text-blue-600 bg-blue-100",
    success: "text-green-600 bg-green-100",
    warning: "text-amber-600 bg-amber-100",
    danger: "text-red-600 bg-red-100",
  };

  const trendStyles = {
    up: "bg-green-100 text-green-700",
    down: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-700",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Card className={cn(variantStyles[variant], "border-2 transition-all hover:shadow-lg", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex justify-end sm:hidden">
            <div className={cn("rounded-lg p-2", iconStyles[variant])}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="mb-1 whitespace-normal break-words text-xs font-medium leading-snug text-gray-600 sm:text-sm">
              {title}
            </p>
            <h3 className="mb-2 whitespace-normal break-words text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-3xl">
              {value}
            </h3>
            {change && (
              <Badge className={cn("max-w-full whitespace-normal break-words text-xs leading-snug", trendStyles[trend])}>
                <TrendIcon className="h-3 w-3 mr-1" />
                {change}
              </Badge>
            )}
          </div>
          <div className={cn("ml-2 hidden flex-shrink-0 rounded-lg p-2 sm:block sm:p-3", iconStyles[variant])}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
