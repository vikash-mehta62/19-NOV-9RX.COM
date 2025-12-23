import { OrderFormValues } from "../../schemas/orderSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, DollarSign, Receipt, AlertCircle, 
  CheckCircle2, XCircle, FileText, Wallet, 
  Building, Hash, Truck, Calculator
} from "lucide-react";
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
  const tax = parseFloat(order.tax_amount?.toString() || "0");
  const handling = parseFloat(order.po_handling_charges || "0");
  const fred = parseFloat(order.po_fred_charges || "0");
  const total = subtotal + shipping + tax + handling + fred;

  const isPaid = order.payment_status === "paid";

  // Get payment method display name
  const getPaymentMethodDisplay = (method: string) => {
    const methods: Record<string, { label: string; icon: React.ElementType }> = {
      card: { label: "Credit/Debit Card", icon: CreditCard },
      bank_transfer: { label: "Bank Transfer", icon: Building },
      manual: { label: "Manual Payment", icon: Wallet },
      ach: { label: "ACH Transfer", icon: Building },
      credit: { label: "Credit Line", icon: CreditCard },
    };
    return methods[method] || { label: method || "N/A", icon: Wallet };
  };

  const paymentMethod = getPaymentMethodDisplay(order.payment?.method || "");
  const PaymentIcon = paymentMethod.icon;

  return (
    <div className="space-y-6">
      {/* Payment Status Card */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className={`border-b pb-4 ${
          isPaid 
            ? "bg-gradient-to-r from-green-50 to-emerald-50" 
            : "bg-gradient-to-r from-red-50 to-rose-50"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-white rounded-lg shadow-sm`}>
                {isPaid ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Payment Status</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isPaid ? "Payment received" : "Payment pending"}
                </p>
              </div>
            </div>
            <Badge
              className={`px-4 py-1.5 text-sm font-semibold ${
                isPaid
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-red-100 text-red-800 border-red-300"
              } border`}
            >
              {isPaid ? "Paid" : "Unpaid"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Transaction ID for paid orders */}
          {isPaid && (order as any).payment_transication && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-100">
              <Hash className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Transaction ID</p>
                <p className="font-mono text-green-900 mt-1">{(order as any).payment_transication}</p>
              </div>
            </div>
          )}

          {/* Payment Required Alert */}
          {!isPaid && !poIs && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 mb-1">Payment Required</p>
                  <p className="text-sm text-amber-700 mb-4">
                    This order has not been paid yet. Send a payment link to the customer.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/pay-now?orderid=${order.id}`}>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                        <CreditCard className="w-4 h-4 mr-1.5" />
                        Create Payment Link
                      </Button>
                    </Link>
                    {onSendPaymentLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onSendPaymentLink}
                        disabled={isSendingLink}
                        className="border-amber-300 text-amber-700 hover:bg-amber-100"
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <PaymentIcon className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Payment Method</p>
                <p className="font-medium text-gray-900">{paymentMethod.label}</p>
              </div>
            </div>
          </div>

          {/* Payment Notes */}
          {order.payment?.notes && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Payment Notes</p>
                <p className="text-sm text-blue-900 mt-1">{order.payment.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Totals */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Calculator className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Order Totals</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">Complete pricing breakdown</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Subtotal</span>
              </div>
              <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
            </div>

            {/* Shipping */}
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Shipping</span>
              </div>
              <span className="font-medium text-gray-900">${shipping.toFixed(2)}</span>
            </div>

            {/* PO Charges */}
            {poIs && handling > 0 && (
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Handling Charges</span>
                </div>
                <span className="font-medium text-gray-900">${handling.toFixed(2)}</span>
              </div>
            )}

            {poIs && fred > 0 && (
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">FRED Charges</span>
                </div>
                <span className="font-medium text-gray-900">${fred.toFixed(2)}</span>
              </div>
            )}

            {/* Tax */}
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Tax</span>
              </div>
              <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
            </div>

            {/* Total */}
            <div className="border-t pt-4 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-emerald-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <Card className="overflow-hidden border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4 bg-blue-50/50">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  {poIs ? "Notes" : "Special Instructions"}
                </p>
                <p className="text-gray-700">{order.specialInstructions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
