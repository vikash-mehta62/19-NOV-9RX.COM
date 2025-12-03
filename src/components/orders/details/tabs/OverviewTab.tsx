import { OrderFormValues } from "../../schemas/orderSchema";
import { Card } from "@/components/ui/card";
import { OrderWorkflowStatus } from "../../workflow/OrderWorkflowStatus";
import { Package, DollarSign, User, MapPin } from "lucide-react";

interface OverviewTabProps {
  order: OrderFormValues;
  companyName?: string;
  poIs?: boolean;
}

export const OverviewTab = ({ order, companyName, poIs }: OverviewTabProps) => {
  const calculateSubtotal = () => {
    return order.items.reduce((total, item) => {
      return total + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = parseFloat(order.shipping_cost || "0");
  const tax = parseFloat(order.tax_amount || "0");
  const total = subtotal + shipping + tax;

  return (
    <div className="space-y-4">
      {/* Order Status */}
      {!poIs && (
        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Order Status
          </h3>
          <OrderWorkflowStatus status={order.status} />
        </Card>
      )}

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Summary */}
        <Card className="p-4">
          <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {poIs ? "Vendor" : "Customer"}
          </h3>
          <div className="space-y-2 text-sm">
            {companyName && (
              <p className="font-medium text-base">{companyName}</p>
            )}
            <p className="text-muted-foreground">
              {order.customerInfo?.name || "N/A"}
            </p>
            <p className="text-muted-foreground">{order.customerInfo?.email || "N/A"}</p>
            <p className="text-muted-foreground">{order.customerInfo?.phone || "N/A"}</p>
          </div>
        </Card>

        {/* Shipping Summary */}
        <Card className="p-4">
          <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Shipping To
          </h3>
          <div className="space-y-2 text-sm">
            <p className="font-medium">{order.shippingAddress?.fullName || "N/A"}</p>
            <p className="text-muted-foreground">
              {order.shippingAddress?.address?.street || "N/A"}
            </p>
            <p className="text-muted-foreground">
              {order.shippingAddress?.address?.city && order.shippingAddress?.address?.state
                ? `${order.shippingAddress.address.city}, ${order.shippingAddress.address.state} ${
                    order.shippingAddress?.address.zip_code || ""
                  }`
                : "No address provided"}
            </p>
          </div>
        </Card>
      </div>

      {/* Order Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Order Summary
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Items ({order.items.length})</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">${shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-base mb-2">
            {poIs ? "Notes" : "Special Instructions"}
          </h3>
          <p className="text-sm text-muted-foreground">{order.specialInstructions}</p>
        </Card>
      )}
    </div>
  );
};
