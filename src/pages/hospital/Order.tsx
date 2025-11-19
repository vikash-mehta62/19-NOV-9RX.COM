import { DashboardLayout } from "@/components/DashboardLayout";
import { CreateOrderForm } from "@/components/orders/CreateOrderForm";

export default function HospitalOrder() {
  return (
    <DashboardLayout role="hospital">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Order</h2>
          <p className="text-muted-foreground">
            Place a new order for your hospital
          </p>
        </div>
        <CreateOrderForm />
      </div>
    </DashboardLayout>
  );
}