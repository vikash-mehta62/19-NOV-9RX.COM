import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateWorkOrderPDF } from "@/utils/packing-slip";
import { useToast } from "@/hooks/use-toast";
import { Package, Truck, MapPin, Box, Download, AlertCircle, CheckCircle2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BatchInventoryService, BatchAllocation } from "@/services/batchInventoryService";

interface PackingSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: any;
}

export const PackingSlipModal = ({ open, onOpenChange, orderData }: PackingSlipModalProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [batchAllocations, setBatchAllocations] = useState<Record<string, BatchAllocation[]>>({});
  const [availableBatches, setAvailableBatches] = useState<Record<string, any[]>>({});
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({});
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [packingData, setPackingData] = useState({
    shipVia: "",
    trackingNumber: "",
    cartons: "1",
    weight: "",
    packedBy: "",
    checkedBy: "",
    notes: "",
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate packed items - quantity = cases ordered
  const packedItems = useMemo(() => {
    const items: any[] = [];
    orderData?.items?.forEach((item: any) => {
      item.sizes?.forEach((size: any) => {
        const casesOrdered = size.quantity || 0;
        const qtyPerCase = size.quantity_per_case || 1;
        const weightPerCase = size.weight_per_case || 2.5;
        items.push({
          sku: size.sku || "-",
          name: item.name,
          size: `${size.size_value} ${size.size_unit || ""}`.trim(),
          sizeId: size.id, // Store size ID for batch lookup
          qtyPerCase,
          casesOrdered,
          totalWeight: casesOrdered * weightPerCase,
        });
      });
    });
    return items;
  }, [orderData]);

  // Fetch batch allocations for all items
  useEffect(() => {
    const fetchBatchAllocations = async () => {
      if (!open || packedItems.length === 0) return;
      
      setLoadingBatches(true);
      const allocations: Record<string, BatchAllocation[]> = {};
      const available: Record<string, any[]> = {};
      const selected: Record<string, string> = {};
      
      try {
        for (const item of packedItems) {
          if (item.sizeId) {
            try {
              // Fetch ALL available batches for this size
              const allBatches = await BatchInventoryService.getAvailableBatches(item.sizeId);
              available[item.sizeId] = allBatches;

              // Calculate total units needed (cases × qty per case)
              const totalUnits = item.casesOrdered * item.qtyPerCase;
              
              // Get FIFO allocation (recommended)
              const batchAllocs = await BatchInventoryService.allocateQuantity(
                item.sizeId,
                totalUnits
              );
              allocations[item.sizeId] = batchAllocs;

              // Pre-select FIFO batch (first batch in allocation)
              if (batchAllocs.length > 0) {
                selected[item.sizeId] = batchAllocs[0].batch_id;
              }
            } catch (error) {
              console.warn(`No batches found for ${item.sku}:`, error);
              allocations[item.sizeId] = [];
              available[item.sizeId] = [];
            }
          }
        }
        setBatchAllocations(allocations);
        setAvailableBatches(available);
        setSelectedBatches(selected);
      } catch (error) {
        console.error('Error fetching batch allocations:', error);
      } finally {
        setLoadingBatches(false);
      }
    };

    fetchBatchAllocations();
  }, [open, packedItems]);

  // Handle batch selection change
  const handleBatchSelection = (sizeId: string, batchId: string) => {
    setSelectedBatches(prev => ({
      ...prev,
      [sizeId]: batchId
    }));
  };

  // Get selected batch info for display
  const getSelectedBatchInfo = (sizeId: string) => {
    const batchId = selectedBatches[sizeId];
    if (!batchId) return null;

    const batches = availableBatches[sizeId] || [];
    return batches.find(b => b.id === batchId);
  };

  // Check if selected batch is the FIFO recommended batch
  const isFIFOBatch = (sizeId: string, batchId: string) => {
    const fifoAllocation = batchAllocations[sizeId];
    return fifoAllocation && fifoAllocation.length > 0 && fifoAllocation[0].batch_id === batchId;
  };

  // Totals
  const totals = useMemo(() => {
    const totalCases = packedItems.reduce((sum, item) => sum + item.casesOrdered, 0);
    const totalWeight = packedItems.reduce((sum, item) => sum + item.totalWeight, 0);
    return { totalCases, totalWeight };
  }, [packedItems]);

  const handleInputChange = (field: string, value: string) => {
    setPackingData((prev) => ({ ...prev, [field]: value }));
  };

  // Validation
  const validate = (): boolean => {
    const errors: string[] = [];
    if (!packingData.shipVia) errors.push("Ship Via is required");
    if (!packingData.cartons || packingData.cartons === "0") errors.push("Cartons is required");
    if (!packingData.packedBy.trim()) errors.push("Packed By is required");
    if (!packingData.checkedBy.trim()) errors.push("Checked By is required");
    if (packingData.packedBy.trim().toLowerCase() === packingData.checkedBy.trim().toLowerCase()) {
      errors.push("Packer and Checker must be different");
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNextStep = () => {
    if (validate()) setCurrentStep(2);
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      
      // Prepare items with SELECTED batch information
      const itemsWithBatches = packedItems.map(item => {
        const selectedBatchId = selectedBatches[item.sizeId];
        const selectedBatch = getSelectedBatchInfo(item.sizeId);
        
        // Create batch allocation from selected batch
        const batches = selectedBatch ? [{
          batch_id: selectedBatch.id,
          lot_number: selectedBatch.lot_number,
          quantity: item.casesOrdered * item.qtyPerCase,
          expiry_date: selectedBatch.expiry_date
        }] : [];

        return {
          ...item,
          batches
        };
      });
      
      const completeData = {
        ...orderData,
        packingDetails: { ...packingData, packedAt: new Date().toLocaleString() },
        packedItems: itemsWithBatches,
        totals,
      };
      
      await generateWorkOrderPDF(orderData, completeData);
      
      // Deduct from SELECTED batches after successful PDF generation
      try {
        for (const item of itemsWithBatches) {
          if (item.batches && item.batches.length > 0) {
            await BatchInventoryService.deductFromBatches(
              item.batches,
              orderData.id,
              'order'
            );
          }
        }
      } catch (batchError) {
        console.error('Error deducting batches:', batchError);
        toast({ 
          title: "Warning", 
          description: "Packing slip created but batch deduction failed. Please update inventory manually.",
          variant: "destructive" 
        });
      }
      
      toast({ title: "Success", description: "Packing slip downloaded and inventory updated" });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const billingInfo = orderData?.customerInfo || {};
  const shipTo = orderData?.shippingAddress || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Packing Slip - {orderData?.order_number}</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {orderData?.purchase_number_external && `PO: ${orderData.purchase_number_external} • `}
                  {totals.totalCases} cases • {totals.totalWeight.toFixed(1)} lbs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
              </div>
              <div className={`w-8 h-0.5 ${currentStep > 1 ? 'bg-green-600' : 'bg-gray-200'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
            </div>
          </div>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 space-y-5">
          {/* STEP 1: Items + Shipping + QC */}
          {currentStep === 1 && (
            <>
              {/* Items Table */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600" /> Items to Pack
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 w-20">SKU</th>
                      <th className="text-left px-3 py-2">Description</th>
                      <th className="text-center px-3 py-2 w-28">Size</th>
                      <th className="text-center px-3 py-2 w-20">QTY/Case</th>
                      <th className="text-center px-3 py-2 bg-blue-100 w-16">Cases</th>
                      <th className="text-left px-3 py-2 w-80">Lot/Batch</th>
                      <th className="text-right px-3 py-2 w-20">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {packedItems.map((item, idx) => {
                      const batches = availableBatches[item.sizeId] || [];
                      const hasBatches = batches.length > 0;
                      const selectedBatchId = selectedBatches[item.sizeId];
                      const selectedBatch = getSelectedBatchInfo(item.sizeId);
                      const totalUnitsNeeded = item.casesOrdered * item.qtyPerCase;
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-600 text-xs">{item.sku}</td>
                          <td className="px-3 py-2 font-medium text-sm">{item.name}</td>
                          <td className="px-3 py-2 text-center text-sm">{item.size}</td>
                          <td className="px-3 py-2 text-center text-gray-600 text-sm">{item.qtyPerCase}</td>
                          <td className="px-3 py-2 text-center bg-blue-50">
                            <Badge className="bg-blue-600">{item.casesOrdered}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            {loadingBatches ? (
                              <span className="text-xs text-gray-400">Loading...</span>
                            ) : hasBatches ? (
                              <div className="space-y-1.5">
                                <Select
                                  value={selectedBatchId}
                                  onValueChange={(value) => handleBatchSelection(item.sizeId, value)}
                                >
                                  <SelectTrigger className="h-9 text-xs w-full">
                                    <SelectValue placeholder="Select batch" />
                                  </SelectTrigger>
                                  <SelectContent className="max-w-md">
                                    {batches.map((batch) => {
                                      const isFIFO = isFIFOBatch(item.sizeId, batch.id);
                                      const available = Number(batch.quantity_available);
                                      const hasEnough = available >= totalUnitsNeeded;
                                      
                                      return (
                                        <SelectItem 
                                          key={batch.id} 
                                          value={batch.id}
                                          disabled={!hasEnough}
                                          className="cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2 py-1">
                                            <Layers className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                            <span className="font-mono font-medium text-xs">{batch.lot_number}</span>
                                            {isFIFO && (
                                              <Badge className="bg-green-500 text-white text-[9px] px-1.5 py-0 h-4">
                                                Recommended
                                              </Badge>
                                            )}
                                            <span className="text-gray-500 text-xs whitespace-nowrap">
                                              Avail: {available}
                                            </span>
                                            {batch.expiry_date && (
                                              <span className="text-gray-500 text-xs whitespace-nowrap">
                                                Exp: {new Date(batch.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                              </span>
                                            )}
                                            {!hasEnough && (
                                              <span className="text-red-500 text-[9px] font-semibold">Insufficient</span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                                {selectedBatch && (
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                                    <span className="font-medium">Selected:</span>
                                    <span className="font-mono">{selectedBatch.lot_number}</span>
                                    {selectedBatch.expiry_date && (
                                      <>
                                        <span>•</span>
                                        <span>Exp: {new Date(selectedBatch.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No batch tracking</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-sm">{item.totalWeight.toFixed(1)} lbs</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right text-sm">Total:</td>
                      <td className="px-3 py-2 text-center bg-blue-100">
                        <Badge className="bg-blue-700">{totals.totalCases}</Badge>
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right text-sm">{totals.totalWeight.toFixed(1)} lbs</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" /> Bill To
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{billingInfo.company_name || billingInfo.name || "Not provided"}</p>
                    <p>{billingInfo.name}</p>
                    <p className="text-gray-600">{billingInfo.phone}</p>
                    <p className="text-gray-600">{billingInfo.email}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4" /> Ship To
                  </h4>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{shipTo.fullName || billingInfo.name}</p>
                    <p className="text-gray-600">{shipTo.phone}</p>
                    <p className="text-gray-600">
                      {shipTo.address?.street}, {shipTo.address?.city}, {shipTo.address?.state} {shipTo.address?.zip_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping & QC */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h3 className="font-semibold mb-3 text-blue-800 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Shipping
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Ship Via *</Label>
                      <Select value={packingData.shipVia} onValueChange={(v) => handleInputChange("shipVia", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UPS Ground">UPS Ground</SelectItem>
                          <SelectItem value="UPS 2-Day">UPS 2-Day</SelectItem>
                          <SelectItem value="FedEx Ground">FedEx Ground</SelectItem>
                          <SelectItem value="FedEx Express">FedEx Express</SelectItem>
                          <SelectItem value="Freight">Freight</SelectItem>
                          <SelectItem value="Customer Pickup">Customer Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tracking #</Label>
                      <Input className="h-9" placeholder="Optional" value={packingData.trackingNumber} onChange={(e) => handleInputChange("trackingNumber", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Cartons *</Label>
                      <Input className="h-9" type="number" min="1" value={packingData.cartons} onChange={(e) => handleInputChange("cartons", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Weight (lbs)</Label>
                      <Input className="h-9" type="number" placeholder={totals.totalWeight.toFixed(1)} value={packingData.weight} onChange={(e) => handleInputChange("weight", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <h3 className="font-semibold mb-3 text-amber-800 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Warehouse QC
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Packed By *</Label>
                      <Input className="h-9" placeholder="Packer name" value={packingData.packedBy} onChange={(e) => handleInputChange("packedBy", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Checked By * (different person)</Label>
                      <Input className="h-9" placeholder="Checker name" value={packingData.checkedBy} onChange={(e) => handleInputChange("checkedBy", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">Special Instructions</Label>
                <Textarea rows={2} placeholder="Optional notes..." value={packingData.notes} onChange={(e) => handleInputChange("notes", e.target.value)} />
              </div>
            </>
          )}

          {/* STEP 2: Final Review */}
          {currentStep === 2 && (
            <>
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-green-800">Ready to Ship</h3>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-2xl font-bold">{packingData.cartons}</div>
                    <div className="text-xs text-gray-500">Cartons</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{totals.totalCases}</div>
                    <div className="text-xs text-gray-500">Cases</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{packingData.weight || totals.totalWeight.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">lbs</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{packingData.shipVia}</div>
                    <div className="text-xs text-gray-500">Ship Via</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-500">Packed By:</span>
                  <span className="font-medium ml-2">{packingData.packedBy}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-500">Checked By:</span>
                  <span className="font-medium ml-2">{packingData.checkedBy}</span>
                </div>
              </div>

              {packingData.trackingNumber && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <span className="text-gray-500">Tracking:</span>
                  <span className="font-mono ml-2">{packingData.trackingNumber}</span>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => currentStep > 1 ? setCurrentStep(1) : onOpenChange(false)}>
              {currentStep > 1 ? "Back" : "Cancel"}
            </Button>
            {currentStep === 1 ? (
              <Button onClick={handleNextStep} className="bg-blue-600 hover:bg-blue-700">Next</Button>
            ) : (
              <Button onClick={handleDownload} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "Download Packing Slip"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
