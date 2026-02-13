import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BatchTrackingService, ExpiringBatch } from '@/services/batchTrackingService';
import { format, differenceInDays } from 'date-fns';
import { AlertTriangle, Calendar, Package, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function ExpiryAlertsDashboard() {
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('30');

  useEffect(() => {
    loadExpiringBatches(30);
  }, []);

  const loadExpiringBatches = async (days: number) => {
    try {
      setLoading(true);
      const data = await BatchTrackingService.getExpiringBatches(days);
      setExpiringBatches(data);
    } catch (error) {
      console.error('Error loading expiring batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    loadExpiringBatches(parseInt(value));
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

  const expiredBatches = expiringBatches.filter(b => b.days_until_expiry < 0);
  const criticalBatches = expiringBatches.filter(b => b.days_until_expiry >= 0 && b.days_until_expiry <= 7);
  const highPriorityBatches = expiringBatches.filter(b => b.days_until_expiry > 7 && b.days_until_expiry <= 30);

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
            <div className="text-2xl font-bold text-red-600">{expiredBatches.length}</div>
            <div className="text-sm text-red-800 mt-1">Expired</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{criticalBatches.length}</div>
            <div className="text-sm text-orange-800 mt-1">Critical (≤7 days)</div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{highPriorityBatches.length}</div>
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
              {expiringBatches.map((batch) => (
                <div
                  key={batch.batch_id}
                  className={`p-4 border rounded-lg ${getUrgencyColor(batch.days_until_expiry)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getUrgencyColor(batch.days_until_expiry)}>
                          {getUrgencyLabel(batch.days_until_expiry)}
                        </Badge>
                        <span className="font-semibold">{batch.product_name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Batch:</span>{' '}
                          <span className="font-medium">{batch.batch_number}</span>
                        </div>
                        {batch.lot_number && (
                          <div>
                            <span className="text-gray-600">Lot:</span>{' '}
                            <span className="font-medium">{batch.lot_number}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Quantity:</span>{' '}
                          <span className="font-medium">{batch.quantity} units</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Expiry:</span>{' '}
                          <span className="font-medium">
                            {format(new Date(batch.expiry_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold">
                        {batch.days_until_expiry < 0 ? (
                          <span className="text-red-600">
                            {Math.abs(batch.days_until_expiry)}d
                          </span>
                        ) : (
                          <span>{batch.days_until_expiry}d</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {batch.days_until_expiry < 0 ? 'overdue' : 'remaining'}
                      </div>
                    </div>
                  </div>

                  {batch.days_until_expiry < 0 && (
                    <div className="mt-3 pt-3 border-t border-red-300">
                      <div className="flex items-center gap-2 text-sm text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Action Required: Remove from active inventory</span>
                      </div>
                    </div>
                  )}

                  {batch.days_until_expiry >= 0 && batch.days_until_expiry <= 7 && (
                    <div className="mt-3 pt-3 border-t border-orange-300">
                      <div className="flex items-center gap-2 text-sm text-orange-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Urgent: Prioritize for sale or disposal</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {expiringBatches.length === 0 && (
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
        {expiringBatches.length > 0 && (
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
