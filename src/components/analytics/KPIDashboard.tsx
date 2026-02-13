import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateKPIs, KPIData } from "@/services/analyticsService";
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Target 
} from "lucide-react";

export function KPIDashboard() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      const data = await calculateKPIs();
      setKpis(data);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Failed to load KPIs</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate CLV/CAC ratio with safety check
  const calculateClvCacRatio = () => {
    if (kpis.customerAcquisitionCost === 0 || !isFinite(kpis.customerAcquisitionCost)) {
      return null; // Return null for invalid CAC
    }
    const ratio = kpis.customerLifetimeValue / kpis.customerAcquisitionCost;
    return isFinite(ratio) ? ratio : null;
  };

  const clvCacRatio = calculateClvCacRatio();
  const clvCacValue = clvCacRatio !== null ? clvCacRatio.toFixed(2) : 'N/A';
  const clvCacChange = clvCacRatio !== null && clvCacRatio > 3 ? "Healthy" : clvCacRatio !== null ? "Needs Improvement" : "Add Expense Data";
  const clvCacTrend = clvCacRatio !== null && clvCacRatio > 3 ? "up" : "down";
  const clvCacVariant = clvCacRatio !== null && clvCacRatio > 3 ? "success" : clvCacRatio !== null ? "warning" : "default";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Key Performance Indicators</h2>
        <p className="text-gray-600">Track your business health with these critical metrics</p>
      </div>

      {/* Customer Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Customer Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Customer Lifetime Value"
            value={`$${kpis.customerLifetimeValue.toFixed(2)}`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Customer Acquisition Cost"
            value={`$${kpis.customerAcquisitionCost.toFixed(2)}`}
            icon={Target}
            variant="default"
          />
          <StatCard
            title="CLV / CAC Ratio"
            value={clvCacValue}
            change={clvCacChange}
            trend={clvCacTrend}
            icon={TrendingUp}
            variant={clvCacVariant}
          />
        </div>
      </div>

      {/* Sales Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Sales Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Average Order Value"
            value={`$${kpis.averageOrderValue.toFixed(2)}`}
            icon={ShoppingCart}
            variant="default"
          />
          <StatCard
            title="Gross Margin"
            value={`${kpis.grossMargin.toFixed(1)}%`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Cart Conversion Rate"
            value={`${kpis.cartConversionRate.toFixed(1)}%`}
            change={kpis.cartConversionRate > 2 ? "Good" : "Needs Work"}
            trend={kpis.cartConversionRate > 2 ? "up" : "down"}
            icon={Target}
            variant={kpis.cartConversionRate > 2 ? "success" : "warning"}
          />
        </div>
      </div>

      {/* Operational Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Operational Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Inventory Turnover"
            value={`${kpis.inventoryTurnover.toFixed(1)}x`}
            icon={RotateCcw}
            variant="default"
          />
          <StatCard
            title="Order Fulfillment Rate"
            value={`${kpis.orderFulfillmentRate.toFixed(1)}%`}
            change={kpis.orderFulfillmentRate > 95 ? "Excellent" : "Needs Improvement"}
            trend={kpis.orderFulfillmentRate > 95 ? "up" : "down"}
            icon={CheckCircle}
            variant={kpis.orderFulfillmentRate > 95 ? "success" : "warning"}
          />
          <StatCard
            title="Return Rate"
            value={`${kpis.returnRate.toFixed(1)}%`}
            change={kpis.returnRate < 10 ? "Good" : "High"}
            trend={kpis.returnRate < 10 ? "down" : "up"}
            icon={XCircle}
            variant={kpis.returnRate < 10 ? "success" : "warning"}
          />
        </div>
      </div>
    </div>
  );
}
