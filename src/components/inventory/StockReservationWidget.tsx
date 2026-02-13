import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StockReservationService } from '@/services/stockReservationService';
import { Lock, Unlock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StockReservationWidgetProps {
  productId: string;
}

export function StockReservationWidget({ productId }: StockReservationWidgetProps) {
  const [stockInfo, setStockInfo] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [info, reservationList] = await Promise.all([
        StockReservationService.getStockInfo(productId),
        StockReservationService.getProductReservations(productId)
      ]);
      setStockInfo(info);
      setReservations(reservationList);
    } catch (error) {
      console.error('Error loading stock info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const availablePercentage = stockInfo 
    ? (stockInfo.available_stock / stockInfo.current_stock) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Stock Availability
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stockInfo && (
          <div className="space-y-4">
            {/* Stock Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stockInfo.current_stock}
                </div>
                <div className="text-xs text-gray-600 mt-1">Total Stock</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stockInfo.reserved_stock}
                </div>
                <div className="text-xs text-gray-600 mt-1">Reserved</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stockInfo.available_stock}
                </div>
                <div className="text-xs text-gray-600 mt-1">Available</div>
              </div>
            </div>

            {/* Availability Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Availability</span>
                <span className="font-medium">{availablePercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    availablePercentage > 50
                      ? 'bg-green-500'
                      : availablePercentage > 20
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${availablePercentage}%` }}
                />
              </div>
            </div>

            {/* Low Stock Warning */}
            {stockInfo.available_stock < 10 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div className="text-sm text-red-800">
                  <strong>Low Available Stock!</strong> Only {stockInfo.available_stock} units available for new orders.
                </div>
              </div>
            )}

            {/* Active Reservations */}
            {reservations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Active Reservations ({reservations.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          Order: {(reservation as any).orders?.order_number || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {reservation.quantity} units reserved
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {(reservation as any).orders?.status || 'pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reservations.length === 0 && stockInfo.reserved_stock === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm flex items-center justify-center gap-2">
                <Unlock className="h-4 w-4" />
                No active reservations
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
