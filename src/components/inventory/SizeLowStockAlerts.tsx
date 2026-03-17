import { useEffect, useMemo, useState } from 'react';
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
  size_name: string;
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
    subcategory?: string;
  };
}

export const SizeLowStockAlerts = () => {
  const navigate = useNavigate();
  const [lowStockSizes, setLowStockSizes] = useState<LowStockSize[]>([]);
  const [filteredSizes, setFilteredSizes] = useState<LowStockSize[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const subcategories = useMemo(() => {
    const uniqueSubcategories = new Set(
      lowStockSizes
        .filter((item) => item.product?.subcategory)
        .map((item) => item.product.subcategory as string)
    );
    return Array.from(uniqueSubcategories).sort();
  }, [lowStockSizes]);

  useEffect(() => {
    fetchLowStockSizes();
  }, []);

  const formatSizeDetails = (item: LowStockSize) => {
    const sizeValue = [item.size_value, item.size_unit?.toUpperCase()].filter(Boolean).join(' ');
    return item.size_name ? `${item.size_name} - ${sizeValue}` : sizeValue;
  };

  useEffect(() => {
    filterSizes();
  }, [searchQuery, subcategoryFilter, lowStockSizes]);

  const filterSizes = () => {
    let filtered = lowStockSizes;

    if (subcategoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.product?.subcategory === subcategoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.product?.name.toLowerCase().includes(query) ||
          item.product?.category.toLowerCase().includes(query) ||
          item.product?.subcategory?.toLowerCase().includes(query) ||
          formatSizeDetails(item).toLowerCase().includes(query) ||
          item.size_name?.toLowerCase().includes(query) ||
          item.size_value.toLowerCase().includes(query) ||
          item.size_unit?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query)
      );
    }

    setFilteredSizes(filtered);
  };

  const fetchLowStockSizes = async () => {
    try {
      setLoading(true);
      const data = await SizeInventoryService.getLowStockSizes(20);
      const validData = data.filter((item) => item.product && item.product.name);
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
    if (stockNum === 0) return { label: 'Out of Stock', color: 'destructive', bgColor: 'bg-red-50 border-red-200' };
    if (stockNum <= 5) return { label: 'Critical', color: 'destructive', bgColor: 'bg-red-50 border-red-200' };
    if (stockNum <= 10) return { label: 'Very Low', color: 'warning', bgColor: 'bg-amber-50 border-amber-200' };
    return { label: 'Low', color: 'warning', bgColor: 'bg-yellow-50 border-yellow-200' };
  };

  const criticalItems = filteredSizes.filter((s) => Number(s.stock) <= 5);
  const warningItems = filteredSizes.filter((s) => Number(s.stock) > 5 && Number(s.stock) <= 20);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-3/4 rounded bg-gray-200"></div>
            <div className="h-4 w-1/2 rounded bg-gray-200"></div>
            <div className="h-4 w-5/6 rounded bg-gray-200"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-red-50 to-amber-50 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
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
        <div className="mb-4 flex flex-col gap-2 md:flex-row">
          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Filter by subcategory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
              {subcategories.map((subcategory) => (
                <SelectItem key={subcategory} value={subcategory}>
                  {subcategory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by product, subcategory, size name, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <ScrollArea className="h-[500px] pr-4">
          {filteredSizes.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {searchQuery ? 'No matching low stock items' : 'No low stock alerts'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {searchQuery ? 'Try a different search term' : 'All sizes are well stocked'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSizes.map((item) => {
                const stockNum = Number(item.stock);
                const status = getStockStatus(stockNum);
                const stockPercentage = (stockNum / 20) * 100;

                if (!item.product) {
                  return null;
                }

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${status.bgColor}`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-gray-900">{item.product.name}</p>
                          <Badge variant={status.color as any} className="rounded-full">
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="font-medium text-slate-800">{formatSizeDetails(item)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                          {item.sku && <span>SKU: {item.sku}</span>}
                          <span>Price: ${item.price.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4 md:block md:text-right">
                        <div>
                          <p
                            className={`text-3xl font-bold leading-none ${
                              stockNum === 0
                                ? 'text-red-600'
                                : stockNum <= 5
                                  ? 'text-red-500'
                                  : 'text-amber-500'
                            }`}
                          >
                            {stockNum}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">units left</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-0 text-indigo-600 hover:bg-transparent hover:text-indigo-700 md:mt-4 md:px-3 md:hover:bg-indigo-50"
                          onClick={() => navigate('/admin/po')}
                        >
                          Reorder <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <TrendingDown className="h-4 w-4 text-gray-400" />
                        <span>Inventory level</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            stockPercentage <= 25
                              ? 'bg-red-500'
                              : stockPercentage <= 50
                                ? 'bg-amber-500'
                                : 'bg-yellow-500'
                          }`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
