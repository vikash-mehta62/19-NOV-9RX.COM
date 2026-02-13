import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationStockView } from "@/components/inventory/LocationStockView";
import { StockTransferManager } from "@/components/inventory/StockTransferManager";
import { CycleCountManager } from "@/components/inventory/CycleCountManager";
import { StockAdjustmentForm } from "@/components/inventory/StockAdjustmentForm";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Warehouse, Truck, ClipboardList, FileEdit, Camera } from "lucide-react";
import { toast } from "sonner";

const InventoryPhase2 = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{ id: string; sku: string } | null>(null);

  const handleScan = (productId: string, sku: string) => {
    setScannedProduct({ id: productId, sku: sku });
    setShowScanner(false);
    toast.success(`Product scanned: ${sku}`);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Advanced Inventory Management
            </h1>
            <p className="text-base text-muted-foreground">
              Multi-location tracking, transfers, cycle counts, and stock adjustments
            </p>
          </div>
          <Button onClick={() => setShowScanner(!showScanner)}>
            <Camera className="h-4 w-4 mr-2" />
            Scan Barcode
          </Button>
        </div>

        {showScanner && (
          <Card className="p-4">
            <BarcodeScanner
              onScan={handleScan}
              onClose={() => setShowScanner(false)}
            />
          </Card>
        )}

        {scannedProduct && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-800">
              Last scanned product: <span className="font-semibold">{scannedProduct.sku}</span>
            </p>
          </Card>
        )}

        <Tabs defaultValue="locations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Transfers
            </TabsTrigger>
            <TabsTrigger value="counts" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Cycle Counts
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              Adjustments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="space-y-4">
            <Card className="p-6">
              <LocationStockView productId={scannedProduct?.id} />
            </Card>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4">
            <Card className="p-6">
              <StockTransferManager />
            </Card>
          </TabsContent>

          <TabsContent value="counts" className="space-y-4">
            <Card className="p-6">
              <CycleCountManager />
            </Card>
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4">
            <Card className="p-6">
              <StockAdjustmentForm />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default InventoryPhase2;
