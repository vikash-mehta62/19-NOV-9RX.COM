import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Package,
  Truck,
  CreditCard,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { OrderFormValues } from "../../schemas/orderSchema";

interface ActivityTabProps {
  order: OrderFormValues;
}

export const ActivityTab = ({ order }: ActivityTabProps) => {
  // Generate activity timeline based on order status
  const getActivityTimeline = () => {
    const activities = [
      {
        id: 1,
        title: "Order Created",
        description: `Order #${order.order_number} was created`,
        timestamp: order.date,
        icon: Package,
        status: "completed",
      },
    ];

    if (order.payment_status === "paid") {
      activities.push({
        id: 2,
        title: "Payment Received",
        description: `Payment of $${parseFloat(order.total || "0").toFixed(2)} received via ${
          order.payment?.method || "N/A"
        }`,
        timestamp: order.date,
        icon: CreditCard,
        status: "completed",
      });
    } else {
      activities.push({
        id: 2,
        title: "Payment Pending",
        description: "Waiting for payment confirmation",
        timestamp: order.date,
        icon: AlertCircle,
        status: "pending",
      });
    }

    if (order.status === "confirmed" || order.status === "processing" || order.status === "shipped" || order.status === "delivered") {
      activities.push({
        id: 3,
        title: "Order Confirmed",
        description: "Order has been confirmed and is being prepared",
        timestamp: order.date,
        icon: CheckCircle,
        status: "completed",
      });
    }

    if (order.status === "processing" || order.status === "shipped" || order.status === "delivered") {
      activities.push({
        id: 4,
        title: "Processing",
        description: "Order is being processed",
        timestamp: order.date,
        icon: Package,
        status: "completed",
      });
    }

    if (order.status === "shipped" || order.status === "delivered") {
      activities.push({
        id: 5,
        title: "Shipped",
        description: order.shipping?.trackingNumber
          ? `Shipped with tracking number: ${order.shipping.trackingNumber}`
          : "Order has been shipped",
        timestamp: order.date,
        icon: Truck,
        status: "completed",
      });
    }

    if (order.status === "delivered") {
      activities.push({
        id: 6,
        title: "Delivered",
        description: "Order has been delivered successfully",
        timestamp: order.date,
        icon: CheckCircle,
        status: "completed",
      });
    }

    if (order.status === "cancelled") {
      activities.push({
        id: 7,
        title: "Order Cancelled",
        description: "This order has been cancelled",
        timestamp: order.date,
        icon: XCircle,
        status: "cancelled",
      });
    }

    return activities;
  };

  const activities = getActivityTimeline();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6">
        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Order Timeline
        </h3>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Timeline Items */}
          <div className="space-y-6">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${getStatusColor(
                      activity.status
                    )}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-base">{activity.title}</h4>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(activity.status)} border-0 text-xs`}
                      >
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

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
