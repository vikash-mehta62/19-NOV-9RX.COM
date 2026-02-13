import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { predictInventoryDemand } from "@/services/analyticsService";
import { AlertTriangle, TrendingUp, Package, AlertCircle, Filter, Download } from "lucide-react";

interface InventoryPrediction {
  productId: string;
  productName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  avgDailySales: number;
  daysUntilStockout: number | null;
  recommendedReorder: number;
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'no_data';
  leadTimeDays: number;
  hasSalesData: boolean;
  isOversold?: boolean;
  stockHealthPercent?: number;
}

export function InventoryDemandPredictor() {
  const [predictions, setPredictions] = useState<InventoryPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'urgency' | 'stock' | 'sales'>('urgency');

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const data = await predictInventoryDemand();
      // Sort by urgency (critical first) and then by days until stockout
      const sorted = data.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, no_data: 4 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        if (a.daysUntilStockout === null) return 1;
        if (b.daysUntilStockout === null) return -1;
        return a.daysUntilStockout - b.daysUntilStockout;
      });
      setPredictions(sorted);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive" className="bg-red-600">Critical - Order Now!</Badge>;
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Medium Priority</Badge>;
      case 'no_data':
        return <Badge variant="outline">No Sales Data</Badge>;
      default:
        return <Badge variant="default">Low Priority</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Product Name', 'Current Stock', 'Reserved', 'Available', 'Avg Daily Sales', 'Days Until Stockout', 'Recommended Reorder', 'Lead Time', 'Urgency'];
    const rows = filteredPredictions.map(p => [
      p.productName,
      p.currentStock,
      p.reservedStock,
      p.availableStock,
      p.avgDailySales,
      p.daysUntilStockout ?? 'N/A',
      p.recommendedReorder,
      p.leadTimeDays,
      p.urgency
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-predictions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const criticalPriority = predictions.filter(p => p.urgency === 'critical');
  const highPriority = predictions.filter(p => p.urgency === 'high');
  const mediumPriority = predictions.filter(p => p.urgency === 'medium');
  const lowPriority = predictions.filter(p => p.urgency === 'low');

  // Apply search filter
  const searchFiltered = predictions.filter(p =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply urgency filter
  const filteredPredictions = filterUrgency === 'all' 
    ? searchFiltered 
    : searchFiltered.filter(p => p.urgency === filterUrgency);

  // Apply sorting
  const sortedPredictions = [...filteredPredictions].sort((a, b) => {
    if (sortBy === 'urgency') {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, no_data: 4 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      if (a.daysUntilStockout === null) return 1;
      if (b.daysUntilStockout === null) return -1;
      return a.daysUntilStockout - b.daysUntilStockout;
    } else if (sortBy === 'stock') {
      return a.availableStock - b.availableStock;
    } else { // sales
      return b.avgDailySales - a.avgDailySales;
    }
  });

  const displayedPredictions = showAll ? sortedPredictions : sortedPredictions.slice(0, 10);

  // Calculate summary stats
  const avgDaysToStockout = predictions
    .filter(p => p.daysUntilStockout !== null)
    .reduce((sum, p) => sum + (p.daysUntilStockout || 0), 0) / 
    predictions.filter(p => p.daysUntilStockout !== null).length || 0;

  const getStockHealthColor = (percent: number) => {
    if (percent < 0) return 'bg-red-600';
    if (percent < 20) return 'bg-red-500';
    if (percent < 50) return 'bg-orange-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Demand Prediction
            </CardTitle>
            <CardDescription>
              AI-powered stock level recommendations based on sales trends (excludes cancelled/void orders)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={predictions.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Critical Items</div>
            <div className="text-2xl font-bold text-red-600">{criticalPriority.length}</div>
            <div className="text-xs text-gray-500">Immediate action needed</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">High Priority</div>
            <div className="text-2xl font-bold text-orange-600">{highPriority.length}</div>
            <div className="text-xs text-gray-500">Reorder soon</div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Products</div>
            <div className="text-2xl font-bold text-blue-600">{predictions.length}</div>
            <div className="text-xs text-gray-500">Being monitored</div>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Avg Days to Stockout</div>
            <div className="text-2xl font-bold text-green-600">{Math.round(avgDaysToStockout)}</div>
            <div className="text-xs text-gray-500">Across all products</div>
          </div>
        </div>

        {criticalPriority.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-900">CRITICAL: Immediate Action Required!</h4>
            </div>
            <p className="text-sm text-red-700">
              {criticalPriority.length} product{criticalPriority.length > 1 ? 's' : ''} will stockout before you can reorder (less than lead time)
            </p>
          </div>
        )}

        {highPriority.length > 0 && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold text-orange-900">Urgent Restock Needed</h4>
            </div>
            <p className="text-sm text-orange-700">
              {highPriority.length} product{highPriority.length > 1 ? 's' : ''} need reordering soon
            </p>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="mb-4 space-y-3">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'urgency' | 'stock' | 'sales')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="urgency">Sort by Urgency</option>
              <option value="stock">Sort by Stock Level</option>
              <option value="sales">Sort by Sales Velocity</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter by urgency:</span>
            <div className="flex gap-2">
              {['all', 'critical', 'high', 'medium', 'low'].map(level => (
                <Button
                  key={level}
                  variant={filterUrgency === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterUrgency(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                  {level !== 'all' && ` (${predictions.filter(p => p.urgency === level).length})`}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {displayedPredictions.map((prediction) => (
            <div
              key={prediction.productId}
              className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                prediction.isOversold ? 'border-red-600 bg-red-50' :
                prediction.urgency === 'critical' ? 'border-red-500 bg-red-50' : 
                prediction.urgency === 'high' ? 'border-orange-300 bg-orange-50' : ''
              }`}
            >
              {/* Oversold Warning */}
              {prediction.isOversold && (
                <div className="mb-3 p-2 bg-red-600 text-white rounded flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-semibold">OVERSOLD: Reserved stock exceeds available inventory!</span>
                </div>
              )}

              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{prediction.productName}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span>Total: {prediction.currentStock}</span>
                    {prediction.reservedStock > 0 && (
                      <span className="text-orange-600 font-medium">Reserved: {prediction.reservedStock}</span>
                    )}
                    <span className={`font-medium ${prediction.isOversold ? 'text-red-600' : ''}`}>
                      Available: {prediction.availableStock}
                    </span>
                    <span>Avg Daily Sales: {prediction.avgDailySales.toFixed(2)}</span>
                  </div>
                  
                  {/* Stock Health Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Stock Health</span>
                      <span>{prediction.stockHealthPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getStockHealthColor(prediction.stockHealthPercent || 0)}`}
                        style={{ width: `${Math.max(0, Math.min(100, prediction.stockHealthPercent || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
                {getUrgencyBadge(prediction.urgency)}
              </div>

              <div className="grid grid-cols-3 gap-4 mt-3">
                <div className={`p-3 rounded ${
                  prediction.isOversold ? 'bg-red-200' :
                  prediction.urgency === 'critical' ? 'bg-red-100' : 
                  prediction.urgency === 'high' ? 'bg-orange-100' : 'bg-gray-50'
                }`}>
                  <p className="text-xs text-gray-600 mb-1">Days Until Stockout</p>
                  <p className="text-xl font-bold">
                    {prediction.isOversold ? 'OVERSOLD' :
                     prediction.daysUntilStockout !== null ? `${prediction.daysUntilStockout} days` : 'N/A'}
                  </p>
                  {prediction.urgency === 'critical' && !prediction.isOversold && (
                    <p className="text-xs text-red-600 mt-1">Less than lead time!</p>
                  )}
                </div>
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600 mb-1">Recommended Reorder</p>
                  <p className="text-xl font-bold text-blue-600">
                    {prediction.recommendedReorder} units
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Includes {prediction.leadTimeDays}d lead time + 7d safety stock
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-xs text-gray-600 mb-1">Lead Time</p>
                  <p className="text-xl font-bold text-green-600">
                    {prediction.leadTimeDays} days
                  </p>
                  {!prediction.hasSalesData && (
                    <p className="text-xs text-gray-600 mt-1">No recent sales</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedPredictions.length > 10 && !showAll && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setShowAll(true)}>
              Show All {sortedPredictions.length} Products
            </Button>
          </div>
        )}

        {showAll && sortedPredictions.length > 10 && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setShowAll(false)}>
              Show Less
            </Button>
          </div>
        )}

        {sortedPredictions.length === 0 && predictions.length > 0 && (
          <p className="text-center text-gray-500 py-8">
            No products match your search or filter criteria.
          </p>
        )}

        {predictions.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No inventory predictions available. Add some sales data to see predictions.
          </p>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            How It Works (Improved Algorithm)
          </h4>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• Analyzes last 30 days of valid sales data (excludes cancelled/void orders)</li>
            <li>• Calculates average daily sales velocity</li>
            <li>• Uses available stock (current - reserved) for accurate predictions</li>
            <li>• Considers supplier lead time for reorder recommendations</li>
            <li>• Includes 7-day safety stock buffer to prevent stockouts</li>
            <li>• Urgency levels based on lead time (Critical = less than lead time remaining)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
