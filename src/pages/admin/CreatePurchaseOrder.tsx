import { DashboardLayout } from "@/components/DashboardLayout";
import { CreatePurchaseOrderForm } from "@/components/orders/CreatePurchaseOrderForm";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatePurchaseOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as { vendorId?: string } | null;
  const vendorId = locationState?.vendorId;

  useEffect(() => {
    if (!vendorId) {
      navigate("/admin/po");
    }
  }, [vendorId, navigate]);

  if (!vendorId) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button  
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/po")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Purchase Orders
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Create Purchase Order
          </h1>
          <p className="text-gray-500">
            Add products to create a purchase order from the selected vendor
          </p>
        </div>

        <CreatePurchaseOrderForm vendorId={vendorId} />
      </div>
    </DashboardLayout>
  );
}
