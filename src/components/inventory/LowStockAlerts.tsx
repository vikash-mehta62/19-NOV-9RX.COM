
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
  // Convert stock values to numbers for proper comparison
  const lowStockItems = inventoryData.filter(item => {
    const currentStock = Number(item.current_stock) || 0;
    const minStock = Number(item.min_stock) || 0;
    return currentStock <= minStock && minStock > 0; // Only show if min_stock is set
  });
  
  const criticalItems = lowStockItems.filter(item => {
    const currentStock = Number(item.current_stock) || 0;
    const minStock = Number(item.min_stock) || 0;
    return currentStock <= minStock / 2;
  });
  
  const warningItems = lowStockItems.filter(item => {
    const currentStock = Number(item.current_stock) || 0;
    const minStock = Number(item.min_stock) || 0;
    return currentStock > minStock / 2 && currentStock <= minStock;
  });

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
              const currentStock = Number(item.current_stock) || 0;
              const minStock = Number(item.min_stock) || 0;
              const stockPercentage = minStock > 0 ? (currentStock / minStock) * 100 : 100;
              const isCritical = currentStock <= minStock / 2;
              
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
                        <span>Min: {minStock}</span>
                        <span>•</span>
                        <span>Reorder at: {item.reorder_point}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{currentStock}</p>
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
