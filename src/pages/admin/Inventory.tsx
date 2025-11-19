import { DashboardLayout } from "@/components/DashboardLayout";
import { InventoryStatsCards } from "@/components/inventory/InventoryStatsCards";
import { StockMovementChart } from "@/components/inventory/StockMovementChart";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { StockAdjustmentHistory } from "@/components/inventory/StockAdjustmentHistory";
import { InventoryReports } from "@/components/inventory/InventoryReports";
import { useInventoryTracking } from "@/hooks/use-inventory-tracking";
import { Skeleton } from "@/components/ui/skeleton";

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
          {/* <StockAdjustmentDialog /> */}
        </div>
        
        <div className="grid gap-8">
          {/* <InventoryStatsCards inventoryData={inventory} /> */}
          
          {/* <div className="grid gap-8 grid-cols-1 lg:grid-cols-4">
            <div className="lg:col-span-3 order-2 lg:order-1">
              <StockMovementChart />
            </div>
            <div className="lg:col-span-1 order-1 lg:order-2">
              <LowStockAlerts inventoryData={inventory} />
            </div>
          </div> */}

          <div className="">
            <InventoryReports inventoryData={inventory} />
            {/* <StockAdjustmentHistory /> */}
          </div>
        </div>
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