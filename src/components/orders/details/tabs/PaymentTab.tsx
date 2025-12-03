import { OrderFormValues } from "../../schemas/orderSchema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, Receipt, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PaymentTabProps {
  order: OrderFormValues;
  onSendPaymentLink?: () => void;
  isSendingLink?: boolean;
  poIs?: boolean;
}

export const PaymentTab = ({ order, onSendPaymentLink, isSendingLink, poIs }: PaymentTabProps) => {
  const calculateSubtotal = () => {
    return order.items.reduce((total, item) => {
      return total + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = parseFloat(order.shipping_cost || "0");
  const tax = parseFloat(order.tax_amount || "0");
  const handling = parseFloat(order.po_handling_charges || "0");
  const fred = parseFloat(order.po_fred_charges || "0");
  const total = subtotal + shipping + tax + handling + fred;

  return (
    <div className="space-y-4">
      {/* Payment Status */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Status
          </h3>
          <Badge
            className={`${
              order.payment_status === "paid"
                ? "bg-green-100 text-green-800 border-green-300"
                : "bg-red-100 text-red-800 border-red-300"
            } border px-3 py-1 font-semibold`}
          >
            {order.payment_status === "paid" ? "Paid" : "Unpaid"}
          </Badge>
        </div>

        {order.payment_status !== "paid" && !poIs && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 mb-2">
                  Payment Required
                </p>
                <p className="text-sm text-yellow-700 mb-3">
                  This order has not been paid yet. Send a payment link to the customer.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/pay-now?orderid=${order.id}`}>
                    <Button size="sm" variant="default">
                      Create Payment Link
                    </Button>
                  </Link>
                  {onSendPaymentLink && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onSendPaymentLink}
                      disabled={isSendingLink}
                    >
                      {isSendingLink ? "Sending..." : "Send Payment Link"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payment Method</span>
            <span className="font-medium capitalize">{order.payment?.method || "N/A"}</span>
          </div>

          {order.payment?.notes && (
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground">Notes</span>
              <span className="font-medium text-right max-w-[60%]">{order.payment.notes}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Order Totals */}
      <Card className="p-4 md:p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          Order Totals
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">${shipping.toFixed(2)}</span>
          </div>

          {poIs && handling > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Handling Charges</span>
              <span className="font-medium">${handling.toFixed(2)}</span>
            </div>
          )}

          {poIs && fred > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">FRED Charges</span>
              <span className="font-medium">${fred.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>

          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <Card className="p-4 md:p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-base mb-2">
            {poIs ? "Notes" : "Special Instructions"}
          </h3>
          <p className="text-sm text-muted-foreground">{order.specialInstructions}</p>
        </Card>
      )}
    </div>
  );
};
