import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderFormValues } from "../../schemas/orderSchema";
import { OrderActivityTimeline } from "../../OrderActivityTimeline";
import { 
  Activity, FileText, DollarSign, Package, 
  Calendar, Hash, CreditCard, AlertCircle
} from "lucide-react";

interface ActivityTabProps {
  order: OrderFormValues;
}

export const ActivityTab = ({ order }: ActivityTabProps) => {
  if (!order.id) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Order ID not available</p>
          <p className="text-sm text-gray-400 mt-1">Activity timeline requires a valid order</p>
        </CardContent>
      </Card>
    );
  }

  const isPaid = order.payment_status === "paid";

  return (
    <div className="space-y-6">
      {/* Activity Timeline Header */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">Order history and updates</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <OrderActivityTimeline orderId={order.id} />
        </CardContent>
      </Card>

      {/* Order Summary Card */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Order Summary</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">Quick overview of order details</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
            {/* Order Number */}
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Hash className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Order Number</p>
                  <p className="font-semibold text-gray-900 font-mono">#{order.order_number}</p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Package className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</p>
                  <Badge 
                    variant="secondary" 
                    className={`mt-1 capitalize ${
                      order.status === "delivered" 
                        ? "bg-green-100 text-green-700" 
                        : order.status === "shipped"
                        ? "bg-blue-100 text-blue-700"
                        : order.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Payment Status</p>
                  <Badge 
                    variant="secondary" 
                    className={`mt-1 capitalize ${
                      isPaid 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {order.payment_status || "N/A"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Total Amount */}
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Amount</p>
                  <p className="font-semibold text-emerald-600 text-lg">${parseFloat(order.total || "0").toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Date Footer */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mr-2">Order Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(order.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
