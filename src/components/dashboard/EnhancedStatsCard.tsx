import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDown, ArrowUp, Info } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  iconType?: string;
  change: string;
  trend: "up" | "down" | "neutral";
  description: string;
  tooltip: string;
  additionalMetric?: {
    label: string;
    value: string;
  };
}

export const EnhancedStatsCard = ({
  title,
  value,
  icon,
  change,
  trend,
  description,
  tooltip,
  additionalMetric,
}: StatsCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          {title}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="ml-1">
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center text-xs">
            {trend === "up" ? (
              <ArrowUp className="h-4 w-4 text-success mr-1" />
            ) : trend === "down" ? (
              <ArrowDown className="h-4 w-4 text-destructive mr-1" />
            ) : null}
            <span
              className={
                trend === "up"
                  ? "text-success"
                  : trend === "down"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            >
              {change}
            </span>
            <span className="text-muted-foreground ml-1">{description}</span>
          </div>
          {additionalMetric && (
            <div className="pt-2 border-t mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{additionalMetric.label}</span>
                <span className="font-medium">{additionalMetric.value}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};