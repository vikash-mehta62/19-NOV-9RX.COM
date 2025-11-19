import { DashboardLayout } from "@/components/DashboardLayout";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OrdersContainer } from "@/components/orders/OrdersContainer";

export default function HospitalOrders() {
  return (
    <DashboardLayout role="hospital">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">View and manage your orders</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders History</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersContainer userRole={"hospital"} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}