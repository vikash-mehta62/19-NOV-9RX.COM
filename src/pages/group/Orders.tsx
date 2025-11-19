import { DashboardLayout } from "@/components/DashboardLayout";
import { OrdersContainer } from "@/components/orders/OrdersContainer";

export default function GroupOrders() {
  return (
    <DashboardLayout role="group">
      <div className="container mx-auto p-6">
        <OrdersContainer />
      </div>
    </DashboardLayout>
  );
}