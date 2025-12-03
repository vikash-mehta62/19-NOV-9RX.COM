import { OrderFormValues } from "../../schemas/orderSchema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Package, Calendar, Edit } from "lucide-react";

interface ShippingTabProps {
  order: OrderFormValues;
  onEdit?: () => void;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
}

export const ShippingTab = ({ order, onEdit, userRole }: ShippingTabProps) => {
  const canEdit = userRole === "admin" && order.status !== "cancelled" && !order.void;
  return (
    <div className="space-y-4">
      {/* Shipping Status */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Shipping Status
          </h3>
          <Badge
            className={`${
              order.status === "delivered"
                ? "bg-green-100 text-green-800 border-green-300"
                : order.status === "shipped"
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-gray-100 text-gray-800 border-gray-300"
            } border px-3 py-1 font-semibold`}
          >
            {order.status === "delivered"
              ? "Delivered"
              : order.status === "shipped"
              ? "Shipped"
              : "Not Shipped"}
          </Badge>
        </div>

        {/* Shipping Method */}
        {order.shipping && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Shipping Method</span>
              <span className="font-medium capitalize">
                {order.shipping.method || "Standard"}
              </span>
            </div>

            {order.shipping.trackingNumber && (
              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground">Tracking Number</span>
                <div className="text-right">
                  <span className="font-medium font-mono text-sm">
                    {order.shipping.trackingNumber}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(order.shipping.trackingNumber);
                    }}
                    className="ml-2 text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Shipping Cost</span>
              <span className="font-medium">${parseFloat(order.shipping_cost || "0").toFixed(2)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Shipping Address */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Delivery Address
          </h3>
          {canEdit && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="font-medium text-base">{order.shippingAddress?.fullName || "N/A"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              {order.shippingAddress?.address?.street || "N/A"}
            </p>
            {order.shippingAddress?.address?.city && order.shippingAddress?.address?.state && (
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.address.city}, {order.shippingAddress.address.state}{" "}
                {order.shippingAddress?.address.zip_code || ""}
              </p>
            )}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">{order.shippingAddress?.phone || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{order.shippingAddress?.email || "N/A"}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Order Items Summary */}
      <Card className="p-4 md:p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Package Contents
        </h3>

        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.sizes.length} size{item.sizes.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {item.sizes.reduce((sum, size) => sum + size.quantity, 0)} units
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between font-semibold">
            <span>Total Items</span>
            <span>
              {order.items.reduce(
                (total, item) => total + item.sizes.reduce((sum, size) => sum + size.quantity, 0),
                0
              )}{" "}
              units
            </span>
          </div>
        </div>
      </Card>

      {/* Order Date */}
      <Card className="p-4 md:p-6 bg-gray-50">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Order Date</p>
            <p className="font-medium">
              {new Date(order.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
