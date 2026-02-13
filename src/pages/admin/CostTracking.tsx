import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  Package,
  PieChart
} from "lucide-react";
import { CostTrackingService } from "@/services/costTrackingService";
import { toast } from "sonner";

const CostTracking = () => {
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [costAlerts, setCostAlerts] = useState<any[]>([]);
  const [lowMarginProducts, setLowMarginProducts] = useState<any[]>([]);
  const [highCostProducts, setHighCostProducts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [value, alerts, lowMargin, highCost, recs] = await Promise.all([
        CostTrackingService.getTotalInventoryValue(),
        CostTrackingService.getCostAlerts('active'),
        CostTrackingService.getLowMarginProducts(20, 10),
        CostTrackingService.getHighCostProducts(10),
        CostTrackingService.getCostOptimizationRecommendations()
      ]);

      setTotalValue(value);
      setCostAlerts(alerts);
      setLowMarginProducts(lowMargin);
      setHighCostProducts(highCost);
      setRecommendations(recs);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    const success = await CostTrackingService.acknowledgeCostAlert(alertId);
    if (success) {
      toast.success('Alert acknowledged');
      loadData();
    } else {
      toast.error('Failed to acknowledge alert');
    }
  };

  const getAlertBadge = (type: string) => {
    const variants: Record<string, any> = {
      price_increase: { label: 'Price Increase', color: 'destructive' },
      price_decrease: { label: 'Price Decrease', color: 'default' },
      margin_low: { label: 'Low Margin', color: 'warning' },
      cost_spike: { label: 'Cost Spike', color: 'destructive' }
    };
    const variant = variants[type] || variants.price_increase;
    return <Badge variant={variant.color}>{variant.label}</Badge>;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Cost Tracking & Analysis
            </h1>
            <p className="text-base text-muted-foreground">
              Monitor costs, margins, and profitability across your inventory
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Inventory Value</p>
                <p className="text-2xl font-bold">
                  ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold">{costAlerts.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Margin Products</p>
                <p className="text-2xl font-bold">{lowMarginProducts.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Cost Items</p>
                <p className="text-2xl font-bold">{highCostProducts.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="alerts">Cost Alerts</TabsTrigger>
            <TabsTrigger value="margins">Profit Margins</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : costAlerts.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No active cost alerts</p>
                <p className="text-sm text-gray-400 mt-2">
                  Alerts will appear when significant cost changes are detected
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {costAlerts.map((alert) => (
                  <Card key={alert.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{alert.product?.name}</h4>
                          {getAlertBadge(alert.alert_type)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          SKU: {alert.product?.sku}
                        </p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Old Value</p>
                            <p className="font-semibold">
                              ${alert.old_value?.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">New Value</p>
                            <p className="font-semibold">
                              ${alert.new_value?.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Change</p>
                            <p className={`font-semibold ${
                              alert.percentage_change > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {alert.percentage_change > 0 ? '+' : ''}
                              {alert.percentage_change?.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="margins" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : lowMarginProducts.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No low margin products found</p>
              </Card>
            ) : (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Low Margin Products (Below 20%)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-left">SKU</th>
                        <th className="px-4 py-2 text-right">Cost</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">Profit</th>
                        <th className="px-4 py-2 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowMarginProducts.map((product, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">{product.product_name}</td>
                          <td className="px-4 py-2">{product.sku}</td>
                          <td className="px-4 py-2 text-right">
                            ${Number(product.cost).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            ${Number(product.selling_price).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            ${Number(product.profit).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className={`font-semibold ${
                              product.margin_percentage < 10 ? 'text-red-600' :
                              product.margin_percentage < 20 ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {Number(product.margin_percentage).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : recommendations.length === 0 ? (
              <Card className="p-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No optimization recommendations</p>
                <p className="text-sm text-gray-400 mt-2">
                  Your costs are well optimized!
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {recommendations.map((rec, idx) => (
                  <Card key={idx} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                        rec.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <AlertCircle className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{rec.title}</h4>
                          <Badge variant={
                            rec.priority === 'high' ? 'destructive' :
                            rec.priority === 'medium' ? 'warning' :
                            'default'
                          }>
                            {rec.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{rec.description}</p>
                        <p className="text-sm text-gray-500 mb-4">
                          <span className="font-semibold">Recommended Action:</span> {rec.action}
                        </p>
                        {rec.products && rec.products.length > 0 && (
                          <Button size="sm" variant="outline">
                            View {rec.products.length} Products
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="breakdown">
            <Card className="p-8 text-center">
              <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Cost breakdown by category coming soon</p>
              <p className="text-sm text-gray-400 mt-2">
                Visual breakdown of inventory costs by category
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CostTracking;
