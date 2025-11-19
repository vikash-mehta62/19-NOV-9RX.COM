
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryItem } from "@/hooks/use-inventory-tracking";

interface LowStockAlertsProps {
  inventoryData: InventoryItem[];
}

export const LowStockAlerts = ({ inventoryData }: LowStockAlertsProps) => {
  const lowStockItems = inventoryData.filter(item => item.current_stock <= item.min_stock);
  const criticalItems = lowStockItems.filter(item => item.current_stock <= item.min_stock / 2);
  const warningItems = lowStockItems.filter(item => 
    item.current_stock > item.min_stock / 2 && item.current_stock <= item.min_stock
  );

  return (
    <Card className="col-span-2 transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          Low Stock Alerts
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="destructive" className="rounded-full">
            {criticalItems.length} Critical
          </Badge>
          <Badge variant="warning" className="rounded-full bg-amber-500">
            {warningItems.length} Warning
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {lowStockItems.map((item) => {
              const stockPercentage = (item.current_stock / item.min_stock) * 100;
              const isCritical = item.current_stock <= item.min_stock / 2;
              
              return (
                <div
                  key={item.id}
                  className="flex flex-col space-y-3 rounded-lg border p-4 transition-all duration-200 hover:bg-muted/50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        {isCritical && (
                          <Badge variant="destructive" className="rounded-full">
                            Critical
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Min: {item.min_stock}</span>
                        <span>•</span>
                        <span>Reorder at: {item.reorder_point}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{item.current_stock}</p>
                      <p className="text-xs text-muted-foreground">Current Stock</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Last updated: {new Date(item.last_updated).toLocaleDateString()}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8">
                      Reorder <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        stockPercentage <= 50
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
