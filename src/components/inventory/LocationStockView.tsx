import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Warehouse, Package, AlertTriangle, TrendingDown } from 'lucide-react';
import { MultiLocationService } from '@/services/multiLocationService';
import { supabase } from '@/supabaseClient';

interface LocationStockViewProps {
  productId?: string;
  locationId?: string;
}

export const LocationStockView: React.FC<LocationStockViewProps> = ({
  productId,
  locationId
}) => {
  const [stockData, setStockData] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>(locationId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadStockData();
    }
  }, [selectedLocation, productId]);

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (!error && data) {
      setLocations(data);
      if (!selectedLocation && data.length > 0) {
        setSelectedLocation(data[0].id);
      }
    }
  };

  const loadStockData = async () => {
    setLoading(true);
    try {
      if (productId) {
        const data = await MultiLocationService.getProductStockByLocation(productId);
        setStockData(data);
      } else if (selectedLocation) {
        const data = await MultiLocationService.getLocationInventory(selectedLocation);
        setStockData(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'destructive' };
    if (quantity <= minStock) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Warehouse className="h-5 w-5" />
          Stock by Location
        </h3>
        <div className="flex gap-2">
          {locations.map((loc) => (
            <Button
              key={loc.id}
              variant={selectedLocation === loc.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLocation(loc.id)}
            >
              {loc.name}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : stockData.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No stock data available</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {stockData.map((item) => {
            const product = item.product || {};
            const location = item.location || {};
            const status = getStockStatus(item.quantity, item.min_stock);
            const availableStock = item.quantity - item.reserved_quantity;

            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{product.name}</h4>
                      <Badge variant={status.color as any}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      SKU: {product.sku} | Location: {location.name}
                    </p>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Stock</p>
                        <p className="font-semibold text-lg">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Reserved</p>
                        <p className="font-semibold text-lg text-orange-600">
                          {item.reserved_quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Available</p>
                        <p className="font-semibold text-lg text-green-600">
                          {availableStock}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Min Stock</p>
                        <p className="font-semibold text-lg">{item.min_stock}</p>
                      </div>
                    </div>
                  </div>
                  {item.quantity <= item.min_stock && (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
