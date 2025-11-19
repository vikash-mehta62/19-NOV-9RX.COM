import { OrderFormValues } from "./schemas/orderSchema";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Eye, Truck } from "lucide-react";
import { OrderCustomerInfo } from "./details/OrderCustomerInfo";
import { OrderItemsList } from "./details/OrderItemsList";
import { OrderPaymentInfo } from "./details/OrderPaymentInfo";
import { OrderTotals } from "./details/OrderTotals";
import { getTrackingUrl } from "./utils/shippingUtils";
import { useCart } from "@/hooks/use-cart";
import { useEffect } from "react";

interface OrderPreviewProps {
  orderData: any; // Adjust type if needed
  setIsCus?: React.Dispatch<React.SetStateAction<boolean>>; // ✅ Accept as prop
  isCus?: boolean;
  isEditing?: boolean;
  form: any;

}

export function OrderPreview({
  orderData,
  setIsCus,
  isCus,
  isEditing,
  form
}: OrderPreviewProps) {
  // Ensure we have default values for all potentially undefined properties
  const { cartItems, clearCart } = useCart();

  const totalShippingCost =
    sessionStorage.getItem("shipping") == "true"
      ? 0
      : cartItems.reduce((total, item) => total + (item.shipping_cost || 0), 0);

  useEffect(() => {
    console.log(orderData);
  }, []);

  const safeOrderData = {
    customerInfo: orderData.customerInfo || {
      name: "",
      email: "",
      phone: "",
      type: "Pharmacy",
      address: { street: "", city: "", state: "", zip_code: "" },
    },

    shippingAddress: orderData.shippingAddress || {
      fullName: "",
      email: "",
      phone: "",
      type: "Pharmacy",
      address: { street: "", city: "", state: "", zip_code: "" },
    },
    items: orderData.items || [],
    shipping: orderData.shipping || {
      method: "FedEx",
      cost: totalShippingCost,
      trackingNumber: "",
      estimatedDelivery: "",
    },
    payment: orderData.payment || {
      method: "card",
      notes: "",
    },
    specialInstructions: orderData.specialInstructions || orderData.notes|| "",
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="lg" className="w-[200px]">
          <Eye className="mr-2 h-4 w-4" />
          Preview Order
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full md:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order Preview</SheetTitle>
          <SheetDescription>
            Review your order details before submission
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <OrderCustomerInfo
            customerInfo={safeOrderData.customerInfo}
            shippingAddress={safeOrderData.shippingAddress}
          />
          


          
          <OrderItemsList items={safeOrderData.items} />

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Shipping Details
            </h3>
            <p>Method: {safeOrderData.shipping?.method}</p>
            {safeOrderData.shipping?.trackingNumber && (
              <p>
                Tracking:
                <a
                  href={getTrackingUrl(
                    safeOrderData.shipping.method,
                    safeOrderData.shipping.trackingNumber
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline"
                >
                  {safeOrderData.shipping.trackingNumber}
                </a>
              </p>
            )}
          </div>

          <OrderPaymentInfo
            payment={safeOrderData.payment}
            specialInstructions={safeOrderData.specialInstructions}
          />
          <OrderTotals
          isEditing={isEditing}
            items={orderData.items}
            orderData={orderData}
            paymentMethod={safeOrderData.payment.method}
            setIsCus={setIsCus}
            isCus={isCus}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
