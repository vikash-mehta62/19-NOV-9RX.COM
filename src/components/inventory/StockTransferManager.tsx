import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowRight, Package, CheckCircle, XCircle, Truck } from 'lucide-react';
import { MultiLocationService, StockTransfer } from '@/services/multiLocationService';
import { supabase } from '@/supabaseClient';
import { toast } from 'sonner';

export const StockTransferManager: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [formData, setFormData] = useState<Partial<StockTransfer>>({
    product_id: '',
    from_location_id: '',
    to_location_id: '',
    quantity: 0,
    notes: '',
    status: 'pending'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transfersData, productsData, locationsData] = await Promise.all([
        MultiLocationService.getPendingTransfers(),
        supabase.from('products').select('id, name, sku').order('name'),
        supabase.from('locations').select('*').eq('status', 'active').order('name')
      ]);

      setTransfers(transfersData);
      setProducts(productsData.data || []);
      setLocations(locationsData.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!formData.product_id || !formData.from_location_id || !formData.to_location_id || !formData.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.from_location_id === formData.to_location_id) {
      toast.error('Source and destination locations must be different');
      return;
    }

    const transferId = await MultiLocationService.initiateTransfer(formData as StockTransfer);
    
    if (transferId) {
      toast.success('Transfer initiated successfully');
      setShowCreateDialog(false);
      setFormData({
        product_id: '',
        from_location_id: '',
        to_location_id: '',
        quantity: 0,
        notes: '',
        status: 'pending'
      });
      loadData();
    } else {
      toast.error('Failed to initiate transfer');
    }
  };

  const handleMarkInTransit = async (transferId: string) => {
    const success = await MultiLocationService.markInTransit(transferId);
    if (success) {
      toast.success('Transfer marked as in transit');
      loadData();
    } else {
      toast.error('Failed to update transfer');
    }
  };

  const handleCompleteTransfer = async (transferId: string) => {
    const success = await MultiLocationService.completeTransfer(transferId);
    if (success) {
      toast.success('Transfer completed successfully');
      loadData();
    } else {
      toast.error('Failed to complete transfer');
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    const success = await MultiLocationService.cancelTransfer(transferId);
    if (success) {
      toast.success('Transfer cancelled');
      loadData();
    } else {
      toast.error('Failed to cancel transfer');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { label: 'Pending', color: 'secondary' },
      in_transit: { label: 'In Transit', color: 'default' },
      completed: { label: 'Completed', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'destructive' }
    };
    const variant = variants[status] || variants.pending;
    return <Badge variant={variant.color}>{variant.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Stock Transfers
        </h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>Create Transfer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Stock Transfer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>From Location</Label>
                <Select
                  value={formData.from_location_id}
                  onValueChange={(value) => setFormData({ ...formData, from_location_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>To Location</Label>
                <Select
                  value={formData.to_location_id}
                  onValueChange={(value) => setFormData({ ...formData, to_location_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this transfer"
                />
              </div>

              <Button onClick={handleCreateTransfer} className="w-full">
                Create Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : transfers.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No pending transfers</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {transfers.map((transfer) => (
            <Card key={transfer.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{transfer.product?.name}</h4>
                    {getStatusBadge(transfer.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Transfer #{transfer.transfer_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{transfer.quantity}</p>
                  <p className="text-xs text-gray-500">units</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm">
                <div className="flex-1 text-center p-2 bg-gray-50 rounded">
                  <p className="text-gray-600">From</p>
                  <p className="font-semibold">{transfer.from_location?.name}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="flex-1 text-center p-2 bg-gray-50 rounded">
                  <p className="text-gray-600">To</p>
                  <p className="font-semibold">{transfer.to_location?.name}</p>
                </div>
              </div>

              {transfer.notes && (
                <p className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                  {transfer.notes}
                </p>
              )}

              <div className="flex gap-2">
                {transfer.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleMarkInTransit(transfer.id)}
                      className="flex-1"
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      Mark In Transit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelTransfer(transfer.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {transfer.status === 'in_transit' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleCompleteTransfer(transfer.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete Transfer
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelTransfer(transfer.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
