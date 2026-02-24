import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Calendar, Package, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface ExpiringSizeItem {
  id: string;
  size_value: string;
  size_unit: string;
  exipry: string;
  stock: string;
  sku: string;
  lotNumber?: string;
  product_name: string;
  category: string;
  days_until_expiry: number;
}

export function ExpiryAlertsDashboard() {
  const [expiringItems, setExpiringItems] = useState<ExpiringSizeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('30');

  useEffect(() => {
    loadExpiringItems(30);
  }, []);

  const loadExpiringItems = async (days: number) => {
    try {
      setLoading(true);
      
      // Get all product sizes with expiry dates
      const { data, error } = await supabase
        .from('product_sizes')
        .select(`
          id,
          size_value,
          size_unit,
          exipry,
          stock,
          sku,
          lotNumber,
          product:products!inner(name, category)
        `)
        .not('exipry', 'is', null)
        .not('exipry', 'eq', '');

      if (error) {
        console.error('Error fetching expiring items:', error);
        setExpiringItems([]);
        return;
      }

      // Calculate days until expiry and filter
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day

      const itemsWithDays = (data || [])
        .map(item => {
          try {
            const expiryDate = parseISO(item.exipry);
            expiryDate.setHours(0, 0, 0, 0); // Reset time to start of day
            const daysUntilExpiry = differenceInDays(expiryDate, today);
            
            return {
              id: item.id,
              size_value: item.size_value,
              size_unit: item.size_unit,
              exipry: item.exipry,
              stock: item.stock,
              sku: item.sku || '',
              lotNumber: item.lotNumber,
              product_name: item.product?.name || 'Unknown Product',
              category: item.product?.category || '',
              days_until_expiry: daysUntilExpiry
            };
          } catch (e) {
            console.error('Error parsing date:', item.exipry, e);
            return null;
          }
        })
        .filter((item): item is ExpiringSizeItem => item !== null)
        .filter(item => {
          // Show expired items in all tabs
          if (item.days_until_expiry < 0) return true;
          // Show items expiring within the selected range
          return item.days_until_expiry <= days;
        })
        .sort((a, b) => a.days_until_expiry - b.days_until_expiry);

      setExpiringItems(itemsWithDays);
    } catch (error) {
      console.error('Error loading expiring items:', error);
      setExpiringItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    loadExpiringItems(parseInt(value));
  };

  const getUrgencyColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return 'bg-red-100 text-red-800 border-red-200';
    if (daysUntilExpiry <= 7) return 'bg-red-100 text-red-800 border-red-200';
    if (daysUntilExpiry <= 30) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (daysUntilExpiry <= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getUrgencyLabel = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return 'EXPIRED';
    if (daysUntilExpiry <= 7) return 'CRITICAL';
    if (daysUntilExpiry <= 30) return 'HIGH';
    if (daysUntilExpiry <= 60) return 'MEDIUM';
    return 'LOW';
  };

  const expiredItems = expiringItems.filter(b => b.days_until_expiry < 0);
  const criticalItems = expiringItems.filter(b => b.days_until_expiry >= 0 && b.days_until_expiry <= 7);
  const highPriorityItems = expiringItems.filter(b => b.days_until_expiry > 7 && b.days_until_expiry <= 30);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Expiry Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{expiredItems.length}</div>
            <div className="text-sm text-red-800 mt-1">Expired</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{criticalItems.length}</div>
            <div className="text-sm text-orange-800 mt-1">Critical (≤7 days)</div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{highPriorityItems.length}</div>
            <div className="text-sm text-yellow-800 mt-1">High (≤30 days)</div>
          </div>
        </div>

        {/* Tabs for different time ranges */}
        <Tabs value={selectedTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="30">30 Days</TabsTrigger>
            <TabsTrigger value="60">60 Days</TabsTrigger>
            <TabsTrigger value="90">90 Days</TabsTrigger>
            <TabsTrigger value="180">180 Days</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {expiringItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg ${getUrgencyColor(item.days_until_expiry)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getUrgencyColor(item.days_until_expiry)}>
                          {getUrgencyLabel(item.days_until_expiry)}
                        </Badge>
                        <span className="font-semibold">{item.product_name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Size:</span>{' '}
                          <span className="font-medium">{item.size_value} {item.size_unit}</span>
                        </div>
                        {item.sku && (
                          <div>
                            <span className="text-gray-600">SKU:</span>{' '}
                            <span className="font-medium">{item.sku}</span>
                          </div>
                        )}
                        {item.lotNumber && (
                          <div>
                            <span className="text-gray-600">Lot:</span>{' '}
                            <span className="font-medium">{item.lotNumber}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Stock:</span>{' '}
                          <span className="font-medium">{item.stock} units</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Category:</span>{' '}
                          <span className="font-medium">{item.category}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Expiry:</span>{' '}
                          <span className="font-medium">
                            {format(parseISO(item.exipry), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold">
                        {item.days_until_expiry < 0 ? (
                          <span className="text-red-600">
                            {Math.abs(item.days_until_expiry)}d
                          </span>
                        ) : (
                          <span>{item.days_until_expiry}d</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.days_until_expiry < 0 ? 'overdue' : 'remaining'}
                      </div>
                    </div>
                  </div>

                  {item.days_until_expiry < 0 && (
                    <div className="mt-3 pt-3 border-t border-red-300">
                      <div className="flex items-center gap-2 text-sm text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Action Required: Remove from active inventory</span>
                      </div>
                    </div>
                  )}

                  {item.days_until_expiry >= 0 && item.days_until_expiry <= 7 && (
                    <div className="mt-3 pt-3 border-t border-orange-300">
                      <div className="flex items-center gap-2 text-sm text-orange-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Urgent: Prioritize for sale or disposal</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {expiringItems.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No batches expiring in the next {selectedTab} days</p>
                  <p className="text-gray-500 text-sm mt-2">All batches are within safe expiry range</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {expiringItems.length > 0 && (
          <div className="mt-6 pt-4 border-t flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Disposal
            </Button>
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
