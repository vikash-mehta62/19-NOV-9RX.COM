import { Card } from "@/components/ui/card";
import { OrderFormValues } from "../../schemas/orderSchema";
import { OrderActivityTimeline } from "../../OrderActivityTimeline";

interface ActivityTabProps {
  order: OrderFormValues;
}

export const ActivityTab = ({ order }: ActivityTabProps) => {
  if (!order.id) {
    return (
      <Card className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Order ID not available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <OrderActivityTimeline orderId={order.id} />

      {/* Order Summary Card */}
      <Card className="p-4 md:p-6 bg-gray-50">
        <h3 className="font-semibold text-base mb-3">Order Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Order Number</p>
            <p className="font-medium">#{order.order_number}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{order.status}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment Status</p>
            <p className="font-medium capitalize">{order.payment_status || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Amount</p>
            <p className="font-medium">${parseFloat(order.total || "0").toFixed(2)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
