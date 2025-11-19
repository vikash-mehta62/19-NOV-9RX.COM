import { DollarSign, Package, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { InventoryItem } from '@/hooks/use-inventory-tracking';
import { useEffect, useState } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
}

interface InventoryStatsCardsProps {
  inventoryData: InventoryItem[];
}

const StatsCard = ({ title, value, description, icon, trend }: StatsCardProps) => (
  <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            {title}
          </p>
          <div className="flex items-baseline space-x-3">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <span 
                className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${
                  trend.positive 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className={`p-3 rounded-lg ${
          title === 'Low Stock Items' 
            ? 'bg-red-100 text-red-600' 
            : 'bg-primary/10 text-primary'
        }`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const InventoryStatsCards = ({ inventoryData }: InventoryStatsCardsProps) => {
  const [previousStats, setPreviousStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    stockMovements: 0
  });

  const calculateStats = () => {
    const totalProducts = inventoryData.length;
    const totalValue = inventoryData.reduce((sum, item) => sum + (item.base_price * item.current_stock), 0);
    const lowStockItems = inventoryData.filter(item => item.current_stock <= item.min_stock).length;
    const stockMovements = inventoryData.reduce((sum, item) => sum + item.current_stock, 0);

    return { totalProducts, totalValue, lowStockItems, stockMovements };
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: "+0%", positive: true };
    
    const percentageChange = ((current - previous) / previous) * 100;
    const isPositive = percentageChange >= 0;
    return {
      value: `${isPositive ? '+' : ''}${percentageChange.toFixed(1)}%`,
      positive: isPositive
    };
  };

  useEffect(() => {
    const currentStats = calculateStats();
    setPreviousStats(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(currentStats)) {
        return currentStats;
      }
      return prev;
    });
  }, [inventoryData]);

  const currentStats = calculateStats();

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Products"
        value={currentStats.totalProducts.toString()}
        description="Active products in inventory"
        icon={<Package className="h-6 w-6" />}
        trend={calculateTrend(currentStats.totalProducts, previousStats.totalProducts)}
      />
      <StatsCard
        title="Total Value"
        value={`$${currentStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        description="Current inventory value"
        icon={<DollarSign className="h-6 w-6" />}
        trend={calculateTrend(currentStats.totalValue, previousStats.totalValue)}
      />
      <StatsCard
        title="Low Stock Items"
        value={currentStats.lowStockItems.toString()}
        description="Products below threshold"
        icon={<AlertTriangle className="h-6 w-6" />}
        trend={{
          value: currentStats.lowStockItems > previousStats.lowStockItems 
            ? `+${currentStats.lowStockItems - previousStats.lowStockItems}` 
            : `-${previousStats.lowStockItems - currentStats.lowStockItems}`,
          positive: currentStats.lowStockItems <= previousStats.lowStockItems
        }}
      />
      <StatsCard
        title="Stock Movement"
        value={currentStats.stockMovements.toLocaleString()}
        description="Total units in stock"
        icon={<ArrowUpDown className="h-6 w-6" />}
        trend={calculateTrend(currentStats.stockMovements, previousStats.stockMovements)}
      />
    </div>
  );
};