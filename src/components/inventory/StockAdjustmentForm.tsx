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
import { FileEdit, CheckCircle, XCircle, Clock } from 'lucide-react';
import { StockAdjustmentService, StockAdjustment, REASON_CODES } from '@/services/stockAdjustmentService';
import { supabase } from '@/supabaseClient';
import { toast } from 'sonner';

export const StockAdjustmentForm: React.FC = () => {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [pendingAdjustments, setPendingAdjustments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [formData, setFormData] = useState<Partial<StockAdjustment>>({
    product_id: '',
    location_id: '',
    adjustment_type: 'increase',
    quantity: 0,
    reason_code: '',
    reason_description: '',
    status: 'pending'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingData, historyData, productsData, locationsData] = await Promise.all([
        StockAdjustmentService.getPendingAdjustments(),
        StockAdjustmentService.getAdjustmentHistory(),
        supabase.from('products').select('id, name, sku').order('name'),
        supabase.from('locations').select('*').eq('status', 'active').order('name')
      ]);

      setPendingAdjustments(pendingData);
      setAdjustments(historyData);
      setProducts(productsData.data || []);
      setLocations(locationsData.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdjustment = async () => {
    if (!formData.product_id || !formData.adjustment_type || !formData.quantity || !formData.reason_code) {
      toast.error('Please fill all required fields');
      return;
    }

    const adjustmentId = await StockAdjustmentService.requestAdjustment(formData as StockAdjustment);

    if (adjustmentId) {
      toast.success('Stock adjustment requested');
      setShowCreateDialog(false);
      setFormData({
        product_id: '',
        location_id: '',
        adjustment_type: 'increase',
        quantity: 0,
        reason_code: '',
        reason_description: '',
        status: 'pending'
      });
      loadData();
    } else {
      toast.error('Failed to request adjustment');
    }
  };

  const handleApprove = async (adjustmentId: string) => {
    const success = await StockAdjustmentService.approveAdjustment(adjustmentId);
    if (success) {
      toast.success('Adjustment approved and applied');
      loadData();
    } else {
      toast.error('Failed to approve adjustment');
    }
  };

  const handleReject = async (adjustmentId: string) => {
    const success = await StockAdjustmentService.rejectAdjustment(adjustmentId);
    if (success) {
      toast.success('Adjustment rejected');
      loadData();
    } else {
      toast.error('Failed to reject adjustment');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { label: 'Pending', color: 'secondary', icon: Clock },
      approved: { label: 'Approved', color: 'success', icon: CheckCircle },
      rejected: { label: 'Rejected', color: 'destructive', icon: XCircle },
      applied: { label: 'Applied', color: 'default', icon: CheckCircle }
    };
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    return (
      <Badge variant={variant.color} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {variant.label}
      </Badge>
    );
  };

  const renderAdjustmentCard = (adjustment: any) => (
    <Card key={adjustment.id} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{adjustment.product?.name}</h4>
            {getStatusBadge(adjustment.status)}
          </div>
          <p className="text-sm text-gray-600">
            Adjustment #{adjustment.adjustment_number}
          </p>
          {adjustment.location && (
            <p className="text-sm text-gray-600">Location: {adjustment.location.name}</p>
          )}
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${
            adjustment.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'
          }`}>
            {adjustment.adjustment_type === 'increase' ? '+' : '-'}{adjustment.quantity}
          </p>
          <p className="text-xs text-gray-500">units</p>
        </div>
      </div>

      <div className="mb-3 p-2 bg-gray-50 rounded">
        <p className="text-sm font-semibold text-gray-700">{adjustment.reason_code}</p>
        {adjustment.reason_description && (
          <p className="text-sm text-gray-600 mt-1">{adjustment.reason_description}</p>
        )}
      </div>

      <div className="text-xs text-gray-500 mb-3">
        <p>Requested by: {adjustment.requested_user?.first_name} {adjustment.requested_user?.last_name}</p>
        <p>Requested at: {new Date(adjustment.requested_at).toLocaleString()}</p>
        {adjustment.approved_user && (
          <p>
            {adjustment.status === 'approved' || adjustment.status === 'applied' ? 'Approved' : 'Rejected'} by:{' '}
            {adjustment.approved_user.first_name} {adjustment.approved_user.last_name}
          </p>
        )}
      </div>

      {adjustment.status === 'pending' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleApprove(adjustment.id)}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleReject(adjustment.id)}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileEdit className="h-5 w-5" />
          Stock Adjustments
        </h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>Request Adjustment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Stock Adjustment</DialogTitle>
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
                <Label>Location (Optional)</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Adjustment Type</Label>
                <Select
                  value={formData.adjustment_type}
                  onValueChange={(value: any) => setFormData({ ...formData, adjustment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase Stock</SelectItem>
                    <SelectItem value="decrease">Decrease Stock</SelectItem>
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
                <Label>Reason</Label>
                <Select
                  value={formData.reason_code}
                  onValueChange={(value) => setFormData({ ...formData, reason_code: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REASON_CODES).map(([code, label]) => (
                      <SelectItem key={code} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={formData.reason_description}
                  onChange={(e) => setFormData({ ...formData, reason_description: e.target.value })}
                  placeholder="Add details about this adjustment"
                />
              </div>

              <Button onClick={handleCreateAdjustment} className="w-full">
                Request Adjustment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'pending' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({pendingAdjustments.length})
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('history')}
        >
          History
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : activeTab === 'pending' ? (
        pendingAdjustments.length === 0 ? (
          <Card className="p-8 text-center">
            <FileEdit className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No pending adjustments</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingAdjustments.map(renderAdjustmentCard)}
          </div>
        )
      ) : (
        adjustments.length === 0 ? (
          <Card className="p-8 text-center">
            <FileEdit className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No adjustment history</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {adjustments.map(renderAdjustmentCard)}
          </div>
        )
      )}
    </div>
  );
};
