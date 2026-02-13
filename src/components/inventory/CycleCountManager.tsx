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
import { ClipboardList, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { CycleCountService, CycleCount } from '@/services/cycleCountService';
import { supabase } from '@/supabaseClient';
import { toast } from 'sonner';

export const CycleCountManager: React.FC = () => {
  const [cycleCounts, setCycleCounts] = useState<any[]>([]);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [countItems, setCountItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);

  const [formData, setFormData] = useState<Partial<CycleCount>>({
    location_id: '',
    count_type: 'full',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'planned'
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [countsData, locationsData, productsData] = await Promise.all([
        CycleCountService.getAllCycleCounts(),
        supabase.from('locations').select('*').eq('status', 'active').order('name'),
        supabase.from('products').select('id, name, sku').order('name')
      ]);

      setCycleCounts(countsData);
      setLocations(locationsData.data || []);
      setProducts(productsData.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCount = async () => {
    if (!formData.count_type) {
      toast.error('Please select count type');
      return;
    }

    const countId = await CycleCountService.createCycleCount(
      formData as CycleCount,
      selectedProducts.length > 0 ? selectedProducts : undefined
    );

    if (countId) {
      toast.success('Cycle count created successfully');
      setShowCreateDialog(false);
      setFormData({
        location_id: '',
        count_type: 'full',
        scheduled_date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'planned'
      });
      setSelectedProducts([]);
      loadData();
    } else {
      toast.error('Failed to create cycle count');
    }
  };

  const handleStartCount = async (countId: string) => {
    const success = await CycleCountService.startCycleCount(countId);
    if (success) {
      toast.success('Cycle count started');
      loadData();
      openCountDialog(countId);
    } else {
      toast.error('Failed to start cycle count');
    }
  };

  const openCountDialog = async (countId: string) => {
    const count = await CycleCountService.getCycleCount(countId);
    const items = await CycleCountService.getCycleCountItems(countId);
    setSelectedCount(count);
    setCountItems(items);
    setShowCountDialog(true);
  };

  const handleRecordCount = async (itemId: string, countedQuantity: number, notes?: string) => {
    const success = await CycleCountService.recordCount(itemId, countedQuantity, notes);
    if (success) {
      toast.success('Count recorded');
      const items = await CycleCountService.getCycleCountItems(selectedCount.id);
      setCountItems(items);
    } else {
      toast.error('Failed to record count');
    }
  };

  const handleCompleteCount = async (countId: string) => {
    const success = await CycleCountService.completeCycleCount(countId);
    if (success) {
      toast.success('Cycle count completed');
      setShowCountDialog(false);
      loadData();
    } else {
      toast.error('Failed to complete cycle count');
    }
  };

  const handleApplyAdjustments = async (countId: string) => {
    const success = await CycleCountService.applyCountAdjustments(countId);
    if (success) {
      toast.success('Adjustments applied to inventory');
      loadData();
    } else {
      toast.error('Failed to apply adjustments');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      planned: { label: 'Planned', color: 'secondary' },
      in_progress: { label: 'In Progress', color: 'default' },
      completed: { label: 'Completed', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'destructive' }
    };
    const variant = variants[status] || variants.planned;
    return <Badge variant={variant.color}>{variant.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Cycle Counts
        </h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>Create Cycle Count</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Cycle Count</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Count Type</Label>
                <Select
                  value={formData.count_type}
                  onValueChange={(value: any) => setFormData({ ...formData, count_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Count</SelectItem>
                    <SelectItem value="partial">Partial Count</SelectItem>
                    <SelectItem value="spot">Spot Check</SelectItem>
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
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>

              {formData.count_type !== 'full' && (
                <div>
                  <Label>Select Products</Label>
                  <div className="border rounded p-2 max-h-40 overflow-y-auto">
                    {products.map((product) => (
                      <label key={product.id} className="flex items-center gap-2 p-1 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product.id]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                            }
                          }}
                        />
                        <span className="text-sm">{product.name} ({product.sku})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes"
                />
              </div>

              <Button onClick={handleCreateCount} className="w-full">
                Create Cycle Count
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : cycleCounts.length === 0 ? (
        <Card className="p-8 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No cycle counts scheduled</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cycleCounts.map((count) => (
            <Card key={count.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">Count #{count.count_number}</h4>
                    {getStatusBadge(count.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Type: {count.count_type} | Scheduled: {new Date(count.scheduled_date).toLocaleDateString()}
                  </p>
                  {count.location && (
                    <p className="text-sm text-gray-600">Location: {count.location.name}</p>
                  )}
                </div>
              </div>

              {count.notes && (
                <p className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                  {count.notes}
                </p>
              )}

              <div className="flex gap-2">
                {count.status === 'planned' && (
                  <Button
                    size="sm"
                    onClick={() => handleStartCount(count.id)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start Count
                  </Button>
                )}
                {count.status === 'in_progress' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => openCountDialog(count.id)}
                    >
                      Continue Counting
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteCount(count.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  </>
                )}
                {count.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplyAdjustments(count.id)}
                  >
                    Apply Adjustments
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Count Dialog */}
      <Dialog open={showCountDialog} onOpenChange={setShowCountDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cycle Count #{selectedCount?.count_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {countItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{item.product?.name}</h4>
                    <p className="text-sm text-gray-600">SKU: {item.product?.sku}</p>
                  </div>
                  {item.variance !== null && item.variance !== 0 && (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500">Expected</p>
                    <p className="font-semibold text-lg">{item.expected_quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Counted</p>
                    <p className="font-semibold text-lg text-blue-600">
                      {item.counted_quantity ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Variance</p>
                    <p className={`font-semibold text-lg ${
                      item.variance > 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : ''
                    }`}>
                      {item.variance ?? '-'}
                    </p>
                  </div>
                </div>
                {item.counted_quantity === null && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Enter counted quantity"
                      id={`count-${item.id}`}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById(`count-${item.id}`) as HTMLInputElement;
                        const quantity = Number(input.value);
                        if (quantity >= 0) {
                          handleRecordCount(item.id, quantity);
                        }
                      }}
                    >
                      Record
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
