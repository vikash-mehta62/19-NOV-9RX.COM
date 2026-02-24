import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SizeInventoryService } from '@/services/sizeInventoryService';
import { BatchInventoryService, ProductBatch } from '@/services/batchInventoryService';
import { toast } from 'sonner';
import { Package, DollarSign, FileText, Plus, Minus, Layers, Calendar, AlertCircle, Search, Filter } from 'lucide-react';

interface ProductSize {
  id: string;
  product_id: string;
  size_value: string;
  size_unit: string;
  sku: string;
  price: number;
  price_per_case: number;
  stock: number;
  quantity_per_case: number;
  ndcCode?: string;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
}

interface SizeStockEditModalProps {
  size: ProductSize;
  onClose: () => void;
  onUpdate: () => void;
}

const REASON_CODES = [
  'Damaged Goods',
  'Expired Products',
  'Theft/Loss',
  'Found Inventory',
  'System Correction',
  'Customer Return',
  'Sample/Demo',
  'Write Off',
  'Received Stock',
  'Other'
];

export const SizeStockEditModal = ({ size, onClose, onUpdate }: SizeStockEditModalProps) => {
  const [formData, setFormData] = useState({
    stock: size.stock,
    price: size.price,
    price_per_case: size.price_per_case,
    sku: size.sku || '',
    quantity_per_case: size.quantity_per_case,
    ndcCode: size.ndcCode || '',
    upcCode: size.upcCode || '',
    lotNumber: size.lotNumber || '',
    exipry: size.exipry || '',
  });

  // Calculate actual unit price (price per case ÷ quantity per case)
  const unitPrice = formData.quantity_per_case > 0 
    ? (formData.price / formData.quantity_per_case).toFixed(2)
    : '0.00';

  // Batch search and filter states
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
  const [batchExpiryFilter, setBatchExpiryFilter] = useState<string>('all');

  const [adjustmentData, setAdjustmentData] = useState({
    type: 'increase' as 'increase' | 'decrease',
    quantity: 0,
    reason: '',
    notes: ''
  });

  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [newBatch, setNewBatch] = useState({
    batch_number: '',
    lot_number: '',
    expiry_date: '',
    quantity: 0,
    cost_per_unit: 0,
    notes: ''
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches();
    }
  }, [activeTab]);

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      const data = await BatchInventoryService.getBatchesBySize(size.id);
      setBatches(data);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  // Filter batches based on search and filters
  const filteredBatches = useMemo(() => {
    let filtered = batches;

    // Apply search filter
    if (batchSearchQuery.trim()) {
      const query = batchSearchQuery.toLowerCase();
      filtered = filtered.filter(batch => 
        batch.batch_number?.toLowerCase().includes(query) ||
        batch.lot_number?.toLowerCase().includes(query)
      );
    }

    // Apply status filter (available/not available)
    if (batchStatusFilter !== 'all') {
      filtered = filtered.filter(batch => {
        const available = Number(batch.quantity_available);
        if (batchStatusFilter === 'available') {
          return available > 0;
        } else if (batchStatusFilter === 'empty') {
          return available === 0;
        }
        return true;
      });
    }

    // Apply expiry filter
    if (batchExpiryFilter !== 'all') {
      const today = new Date();
      filtered = filtered.filter(batch => {
        if (!batch.expiry_date) return batchExpiryFilter === 'no-expiry';
        
        const expiryDate = new Date(batch.expiry_date);
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (batchExpiryFilter) {
          case 'expired':
            return daysUntilExpiry < 0;
          case 'expiring-soon':
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
          case 'valid':
            return daysUntilExpiry > 90;
          case 'no-expiry':
            return false;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [batches, batchSearchQuery, batchStatusFilter, batchExpiryFilter]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await SizeInventoryService.updateSizeInventory(size.id, formData);
      
      if (success) {
        toast.success('Size inventory updated successfully');
        onUpdate();
        onClose();
      } else {
        toast.error('Failed to update size inventory');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdjustment = async () => {
    if (!adjustmentData.quantity || !adjustmentData.reason) {
      toast.error('Please enter quantity and reason');
      return;
    }

    try {
      setSaving(true);
      const success = await SizeInventoryService.adjustSizeStock({
        size_id: size.id,
        product_id: size.product_id,
        adjustment_type: adjustmentData.type,
        quantity: adjustmentData.quantity,
        reason_code: adjustmentData.reason,
        reason_description: adjustmentData.notes
      });

      if (success) {
        toast.success('Stock adjusted successfully');
        onUpdate();
        onClose();
      } else {
        toast.error('Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('An error occurred while adjusting stock');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBatch = async () => {
    if (!newBatch.batch_number || !newBatch.lot_number || !newBatch.quantity) {
      toast.error('Please fill in batch number, lot number, and quantity');
      return;
    }

    try {
      setSaving(true);
      await BatchInventoryService.createBatch({
        product_id: size.product_id,
        product_size_id: size.id,
        batch_number: newBatch.batch_number,
        lot_number: newBatch.lot_number,
        expiry_date: newBatch.expiry_date || undefined,
        quantity: newBatch.quantity,
        cost_per_unit: newBatch.cost_per_unit || undefined,
        notes: newBatch.notes || undefined,
      });

      toast.success('Batch added successfully');
      setNewBatch({
        batch_number: '',
        lot_number: '',
        expiry_date: '',
        quantity: 0,
        cost_per_unit: 0,
        notes: ''
      });
      fetchBatches();
      onUpdate();
    } catch (error) {
      console.error('Error adding batch:', error);
      toast.error('Failed to add batch');
    } finally {
      setSaving(false);
    }
  };

  const getBatchStatus = (batch: ProductBatch) => {
    if (batch.status !== 'active') return { label: batch.status, color: 'bg-gray-500' };
    
    const available = Number(batch.quantity_available);
    if (available === 0) return { label: 'Empty', color: 'bg-red-500' };
    
    if (batch.expiry_date) {
      const expiryDate = new Date(batch.expiry_date);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) return { label: 'Expired', color: 'bg-red-600' };
      if (daysUntilExpiry <= 30) return { label: `${daysUntilExpiry}d left`, color: 'bg-orange-500' };
      if (daysUntilExpiry <= 90) return { label: `${daysUntilExpiry}d left`, color: 'bg-yellow-500' };
    }
    
    return { label: 'Active', color: 'bg-green-500' };
  };

  const totalBatchQuantity = batches.reduce((sum, b) => sum + Number(b.quantity_available), 0);

  const newStock = adjustmentData.type === 'increase' 
    ? formData.stock + adjustmentData.quantity
    : formData.stock - adjustmentData.quantity;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Edit Size Inventory: {size.size_value} {size.size_unit.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="batches" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Batches
            </TabsTrigger>
            <TabsTrigger value="adjustment" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Quick Adjust
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Stock Information */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-800">Stock Information</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock">Current Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="quantity_per_case">Quantity per Case</Label>
                  <Input
                    id="quantity_per_case"
                    type="number"
                    min="1"
                    value={formData.quantity_per_case}
                    onChange={(e) => setFormData({ ...formData, quantity_per_case: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-800">Pricing</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">$/CS (Price per Case)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="unit_price">$/Unit (Calculated)</Label>
                  <Input
                    id="unit_price"
                    type="text"
                    value={`$${unitPrice}`}
                    disabled
                    className="bg-gray-100 text-gray-700 font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ${formData.price} ÷ {formData.quantity_per_case} units
                  </p>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">Product Details</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ndcCode">NDC Code</Label>
                  <Input
                    id="ndcCode"
                    value={formData.ndcCode}
                    onChange={(e) => setFormData({ ...formData, ndcCode: e.target.value })}
                    placeholder="12345-678-90"
                  />
                </div>
                <div>
                  <Label htmlFor="upcCode">UPC Code</Label>
                  <Input
                    id="upcCode"
                    value={formData.upcCode}
                    onChange={(e) => setFormData({ ...formData, upcCode: e.target.value })}
                    placeholder="012345678901"
                  />
                </div>
                <div>
                  <Label htmlFor="lotNumber">Lot Number</Label>
                  <Input
                    id="lotNumber"
                    value={formData.lotNumber}
                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                    placeholder="LOT-2024-001"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="exipry">Expiry Date</Label>
                  <Input
                    id="exipry"
                    type="date"
                    value={formData.exipry}
                    onChange={(e) => setFormData({ ...formData, exipry: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batches" className="space-y-4 mt-4">
            {/* Batch Summary */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Batch Quantity</p>
                  <p className="text-3xl font-bold text-blue-900">{totalBatchQuantity}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">Active Batches</p>
                  <p className="text-3xl font-bold text-blue-900">{batches.filter(b => b.status === 'active').length}</p>
                </div>
                <Layers className="h-12 w-12 text-blue-400" />
              </div>
            </div>

            {/* Add New Batch */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                Receive New Batch
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="batch_number">Batch Number *</Label>
                  <Input
                    id="batch_number"
                    value={newBatch.batch_number}
                    onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })}
                    placeholder="BATCH-2024-001"
                  />
                </div>
                <div>
                  <Label htmlFor="lot_number">Lot Number *</Label>
                  <Input
                    id="lot_number"
                    value={newBatch.lot_number}
                    onChange={(e) => setNewBatch({ ...newBatch, lot_number: e.target.value })}
                    placeholder="LOT-2024-001"
                  />
                </div>
                <div>
                  <Label htmlFor="batch_quantity">Quantity *</Label>
                  <Input
                    id="batch_quantity"
                    type="number"
                    min="1"
                    value={newBatch.quantity || ''}
                    onChange={(e) => setNewBatch({ ...newBatch, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="batch_expiry">Expiry Date</Label>
                  <Input
                    id="batch_expiry"
                    type="date"
                    value={newBatch.expiry_date}
                    onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cost_per_unit">Cost per Unit</Label>
                  <Input
                    id="cost_per_unit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBatch.cost_per_unit || ''}
                    onChange={(e) => setNewBatch({ ...newBatch, cost_per_unit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="batch_notes">Notes</Label>
                  <Input
                    id="batch_notes"
                    value={newBatch.notes}
                    onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddBatch} 
                disabled={saving}
                className="w-full mt-3"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Adding...' : 'Add Batch'}
              </Button>
            </div>

            {/* Existing Batches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-gray-600" />
                  Existing Batches (FIFO Order)
                </h3>
                <Badge variant="outline" className="text-xs">
                  {filteredBatches.length} of {batches.length}
                </Badge>
              </div>

              {/* Search and Filters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="relative col-span-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by batch or lot number..."
                    value={batchSearchQuery}
                    onChange={(e) => setBatchSearchQuery(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
                <Select value={batchStatusFilter} onValueChange={setBatchStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Available
                      </div>
                    </SelectItem>
                    <SelectItem value="empty">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        Empty
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={batchExpiryFilter} onValueChange={setBatchExpiryFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Expiry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Expiry</SelectItem>
                    <SelectItem value="valid">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Valid (&gt;90d)
                      </div>
                    </SelectItem>
                    <SelectItem value="expiring-soon">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Expiring Soon (≤90d)
                      </div>
                    </SelectItem>
                    <SelectItem value="expired">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Expired
                      </div>
                    </SelectItem>
                    <SelectItem value="no-expiry">No Expiry Date</SelectItem>
                  </SelectContent>
                </Select>
                {(batchSearchQuery || batchStatusFilter !== 'all' || batchExpiryFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchSearchQuery('');
                      setBatchStatusFilter('all');
                      setBatchExpiryFilter('all');
                    }}
                    className="h-9 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              {loadingBatches ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading batches...</p>
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">
                    {batches.length === 0 ? 'No batches found' : 'No matching batches'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {batches.length === 0 ? 'Add a batch to start tracking inventory' : 'Try adjusting your filters'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {filteredBatches.map((batch, index) => {
                      const status = getBatchStatus(batch);
                      const available = Number(batch.quantity_available);
                      const total = Number(batch.quantity);
                      const usedPercentage = ((total - available) / total) * 100;

                      return (
                        <div
                          key={batch.id}
                          className="p-3 bg-white rounded-lg border-2 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">#{index + 1}</span>
                                <Badge className={`${status.color} text-white text-xs`}>
                                  {status.label}
                                </Badge>
                                {index === 0 && available > 0 && (
                                  <Badge className="bg-purple-500 text-white text-xs">
                                    Next to Use
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <div>
                                  <span className="text-gray-500">Batch:</span>
                                  <span className="ml-1 font-medium">{batch.batch_number}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Lot:</span>
                                  <span className="ml-1 font-medium">{batch.lot_number}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Available:</span>
                                  <span className="ml-1 font-bold text-blue-600">{available}</span>
                                  <span className="text-gray-400"> / {total}</span>
                                </div>
                                {batch.expiry_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-500">Exp:</span>
                                    <span className="ml-1 font-medium">
                                      {new Date(batch.expiry_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Usage Progress Bar */}
                          <div className="mt-2">
                            <div className="h-2 w-full rounded-full bg-gray-200">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                                style={{ width: `${usedPercentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {usedPercentage.toFixed(0)}% used
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>FIFO Logic:</strong> When selling, the system automatically uses batches in order of expiry date (earliest first), then by received date.
                </span>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="adjustment" className="space-y-4 mt-4">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
              <h3 className="font-semibold text-lg mb-4 text-gray-800">Quick Stock Adjustment</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Current Stock</Label>
                    <div className="text-2xl font-bold text-gray-900">{formData.stock}</div>
                  </div>
                  <div>
                    <Label>New Stock</Label>
                    <div className={`text-2xl font-bold ${
                      newStock < 0 ? 'text-red-600' : 
                      newStock < formData.stock ? 'text-amber-600' : 
                      'text-emerald-600'
                    }`}>
                      {newStock}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Adjustment Type</Label>
                  <Select
                    value={adjustmentData.type}
                    onValueChange={(value: 'increase' | 'decrease') => 
                      setAdjustmentData({ ...adjustmentData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-emerald-600" />
                          Increase Stock
                        </div>
                      </SelectItem>
                      <SelectItem value="decrease">
                        <div className="flex items-center gap-2">
                          <Minus className="h-4 w-4 text-red-600" />
                          Decrease Stock
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: Number(e.target.value) })}
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <Label>Reason</Label>
                  <Select
                    value={adjustmentData.reason}
                    onValueChange={(value) => setAdjustmentData({ ...adjustmentData, reason: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASON_CODES.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={adjustmentData.notes}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                    placeholder="Add any additional notes..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleQuickAdjustment} 
                  disabled={saving || !adjustmentData.quantity || !adjustmentData.reason}
                  className="w-full"
                  size="lg"
                >
                  {saving ? 'Processing...' : 'Apply Adjustment'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {activeTab === 'details' && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
