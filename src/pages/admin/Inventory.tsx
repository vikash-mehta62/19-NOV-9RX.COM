import { DashboardLayout } from "@/components/DashboardLayout";
import { InventoryReports } from "@/components/inventory/InventoryReports";
import { ExpiryAlertsDashboard } from "@/components/inventory/ExpiryAlertsDashboard";
import { SizeInventoryTable } from "@/components/inventory/SizeInventoryTable";
import { SizeLowStockAlerts } from "@/components/inventory/SizeLowStockAlerts";
import { useInventoryTracking } from "@/hooks/use-inventory-tracking";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, FileText, AlertTriangle, BarChart3 } from "lucide-react";

const Inventory = () => {
  const { inventory, loading } = useInventoryTracking();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[160px]" />
            <Skeleton className="h-[160px]" />
            <Skeleton className="h-[160px]" />
            <Skeleton className="h-[160px]" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Inventory Management
            </h1>
            <p className="text-base text-muted-foreground">
              Monitor and manage your inventory levels and stock movements
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="size-inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="size-inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Size Inventory
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="expiry" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Expiry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="size-inventory" className="space-y-6">
            <SizeInventoryTable />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <SizeLowStockAlerts />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <InventoryReports inventoryData={inventory} />
          </TabsContent>

          <TabsContent value="expiry" className="space-y-6">
            <ExpiryAlertsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <DashboardLayout role="admin">
      {renderContent()}
    </DashboardLayout>
  );
};

export default Inventory;