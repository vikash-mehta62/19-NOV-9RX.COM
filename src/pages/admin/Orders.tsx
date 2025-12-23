
import { DashboardLayout } from "@/components/DashboardLayout";
import { OrdersContainer } from "@/components/orders/OrdersContainer";
import { useOrderManagement } from "@/components/orders/hooks/useOrderManagement";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function Orders() {
  const location = useLocation();
  const [poIs, setPoIs] = useState(false);

  useEffect(() => {
    setOrders([])
    if (location.pathname.startsWith('/admin/po')) {
      setPoIs(true);
    } else {
      setPoIs(false);
    }
  }, [location.pathname,location]);

  const {
    handleProcessOrder,
    handleShipOrder,
    handleConfirmOrder,
    handleDeleteOrder,
    handleCancelOrder,
    setOrders
  } = useOrderManagement();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              {poIs ? "Purchase Orders" : "Sales Orders"}
            </h1>
            <p className="text-gray-500 mt-1">
              {poIs ? "Manage vendor purchase orders" : "Process and manage customer orders"}
            </p>
          </div>
        </div>

        <OrdersContainer
          userRole="admin"
          onProcessOrder={handleProcessOrder}
          onShipOrder={handleShipOrder}
          onConfirmOrder={handleConfirmOrder}
          onDeleteOrder={handleDeleteOrder}
          poIs={poIs}
          handleCancelOrder={handleCancelOrder}

        />
      </div>
    </DashboardLayout>
  );
}
