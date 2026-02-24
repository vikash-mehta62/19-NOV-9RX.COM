import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, TrendingDown, Package, ArrowRight, Search } from 'lucide-react';
import { SizeInventoryService } from '@/services/sizeInventoryService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface LowStockSize {
  id: string;
  size_value: string;
  size_unit: string;
  stock: number;
  price: number;
  sku: string;
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
}

export const SizeLowStockAlerts = () => {
  const navigate = useNavigate();
  const [lowStockSizes, setLowStockSizes] = useState<LowStockSize[]>([]);
  const [filteredSizes, setFilteredSizes] = useState<LowStockSize[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Get unique categories from the data
  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      lowStockSizes
        .filter(item => item.product?.category)
        .map(item => item.product.category)
    );
    return Array.from(uniqueCategories).sort();
  }, [lowStockSizes]);

  useEffect(() => {
    fetchLowStockSizes();
  }, []);

  useEffect(() => {
    filterSizes();
  }, [searchQuery, categoryFilter, lowStockSizes]);

  const filterSizes = () => {
    let filtered = lowStockSizes;

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.product?.category === categoryFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.product?.name.toLowerCase().includes(query) ||
        item.product?.category.toLowerCase().includes(query) ||
        item.size_value.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query)
      );
    }

    setFilteredSizes(filtered);
  };

  const fetchLowStockSizes = async () => {
    try {
      setLoading(true);
      const data = await SizeInventoryService.getLowStockSizes(20);
      // Filter out items without product data
      const validData = data.filter(item => item.product && item.product.name);
      console.log('Low stock sizes data:', validData);
      setLowStockSizes(validData);
      setFilteredSizes(validData);
    } catch (error) {
      console.error('Error fetching low stock sizes:', error);
      toast.error('Failed to load low stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (stock: number) => {
    const stockNum = Number(stock);
    if (stockNum === 0) return { label: 'Out of Stock', color: 'destructive', bgColor: 'bg-red-50' };
    if (stockNum <= 5) return { label: 'Critical', color: 'destructive', bgColor: 'bg-red-50' };
    if (stockNum <= 10) return { label: 'Very Low', color: 'warning', bgColor: 'bg-amber-50' };
    return { label: 'Low', color: 'warning', bgColor: 'bg-yellow-50' };
  };

  const criticalItems = filteredSizes.filter(s => Number(s.stock) <= 5);
  const warningItems = filteredSizes.filter(s => Number(s.stock) > 5 && Number(s.stock) <= 20);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b bg-gradient-to-r from-red-50 to-amber-50">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          Low Stock Alerts (Size Level)
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="destructive" className="rounded-full">
            {criticalItems.length} Critical
          </Badge>
          <Badge className="rounded-full bg-amber-500 hover:bg-amber-600">
            {warningItems.length} Warning
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4 flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by product, size, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <ScrollArea className="h-[500px] pr-4">
          {filteredSizes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">
                {searchQuery ? 'No matching low stock items' : 'No low stock alerts'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Try a different search term' : 'All sizes are well stocked'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSizes.map((item) => {
                const stockNum = Number(item.stock);
                const status = getStockStatus(stockNum);
                const stockPercentage = (stockNum / 20) * 100;
                
                // Skip items without product data
                if (!item.product) {
                  return null;
                }

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col space-y-3 rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${status.bgColor}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{item.product.name}</p>
                          <Badge variant={status.color as any} className="rounded-full">
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">
                            {item.size_value} {item.size_unit.toUpperCase()}
                          </span>
                          <span>•</span>
                          <span>{item.product.category}</span>
                        </div>
                        {item.sku && (
                          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${
                          stockNum === 0 ? 'text-red-600' :
                          stockNum <= 5 ? 'text-red-500' :
                          'text-amber-500'
                        }`}>
                          {stockNum}
                        </p>
                        <p className="text-xs text-gray-500">units left</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Price: ${item.price.toFixed(2)}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={()=> navigate('/admin/po')}
                      >
                        Reorder <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stockPercentage <= 25
                            ? "bg-red-500"
                            : stockPercentage <= 50
                            ? "bg-amber-500"
                            : "bg-yellow-500"
                        }`}
                        style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
