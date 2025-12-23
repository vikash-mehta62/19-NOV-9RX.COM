import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, ArrowRight } from "lucide-react";
import { LowStockProduct } from "@/pages/admin/dashboardService";
import { useNavigate } from "react-router-dom";

interface LowStockAlertProps {
  products: LowStockProduct[];
  isLoading?: boolean;
}

export function LowStockAlert({ products, isLoading }: LowStockAlertProps) {
  const navigate = useNavigate();
  
  if (isLoading || products.length === 0) return null;

  const criticalCount = products.filter(p => p.urgency === 'critical').length;
  const warningCount = products.filter(p => p.urgency === 'warning').length;

  const urgencyColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-orange-100 text-orange-700 border-orange-200',
    low: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  };

  const urgencyBg = {
    critical: 'bg-red-50',
    warning: 'bg-orange-50',
    low: 'bg-yellow-50'
  };

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Low Stock Alert
            <Badge variant="destructive" className="ml-2">
              {products.length} items
            </Badge>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/inventory')}
            className="bg-white hover:bg-red-50"
          >
            View Inventory
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {criticalCount > 0 && (
          <p className="text-sm text-red-600 mt-1">
            ⚠️ {criticalCount} product{criticalCount > 1 ? 's' : ''} critically low or out of stock!
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {products.slice(0, 8).map((product) => (
            <div 
              key={product.id} 
              className={`flex items-center justify-between p-3 rounded-lg border ${urgencyBg[product.urgency]} ${urgencyColors[product.urgency].split(' ')[2]}`}
            >
              <div className="flex items-center gap-3">
                <Package className={`h-4 w-4 ${product.urgency === 'critical' ? 'text-red-600' : product.urgency === 'warning' ? 'text-orange-600' : 'text-yellow-600'}`} />
                <div>
                  <p className="font-medium text-sm truncate max-w-[200px]">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Min: {product.min_stock} units
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={urgencyColors[product.urgency]}>
                  {product.current_stock <= 0 ? 'Out of Stock' : `${product.current_stock} left`}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        {products.length > 8 && (
          <p className="text-sm text-muted-foreground text-center mt-3">
            +{products.length - 8} more items need attention
          </p>
        )}
      </CardContent>
    </Card>
  );
}
