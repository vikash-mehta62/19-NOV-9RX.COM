import { OrderFormValues, ShippingAddressData } from "../../schemas/orderSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Package, DollarSign, User, MapPin, Truck, 
  Calendar, FileText, CreditCard, Building, Phone, Mail, CheckCircle2, AlertCircle
} from "lucide-react";
import { calculateFinalTotal } from "@/utils/orderCalculations";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface OverviewTabProps {
  order: OrderFormValues;
  companyName?: string;
  poIs?: boolean;
}

// Helper function to safely get address fields
const getAddressField = (
  shippingAddress: ShippingAddressData | undefined,
  type: "billing" | "shipping",
  field: string
): string => {
  if (!shippingAddress) return "";
  
  const addressObj = shippingAddress[type];
  if (addressObj && typeof addressObj === 'object') {
    const value = (addressObj as Record<string, string>)[field];
    if (value) return value;
  }
  
  if (shippingAddress.address && typeof shippingAddress.address === 'object') {
    const legacyAddress = shippingAddress.address as Record<string, string>;
    const fieldMap: Record<string, string> = {
      street1: 'street',
      city: 'city',
      state: 'state',
      zipCode: 'zip_code',
    };
    const mappedField = fieldMap[field] || field;
    if (legacyAddress[mappedField]) return legacyAddress[mappedField];
  }
  
  return "";
};

export const OverviewTab = ({ order, companyName, poIs }: OverviewTabProps) => {
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaidAmount = async () => {
      if (!order.id) return;
      
      setLoading(true);
      try {
        // Fetch order with paid_amount field
        const { data: orderData, error } = await supabase
          .from("orders")
          .select("paid_amount, total_amount, payment_status")
          .eq("id", order.id)
          .single();

        if (error) {
          console.error("Error fetching order:", error);
          setLoading(false);
          return;
        }

        // Use paid_amount if set, otherwise use total_amount for paid orders
        let amount = Number(orderData?.paid_amount || 0);
        if (amount === 0 && orderData?.payment_status === 'paid') {
          amount = Number(orderData?.total_amount || 0);
        }
        
        setPaidAmount(amount);
        console.log("📊 OverviewTab - Paid Amount:", amount);
      } catch (error) {
        console.error("Error fetching paid amount:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaidAmount();
  }, [order.id]);

  const calculateSubtotal = () => {
    return order.items.reduce((total, item) => {
      return total + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = parseFloat(order.shipping_cost || "0");
  const tax = parseFloat(order.tax_amount?.toString() || "0");
  const discountAmount = parseFloat((order as any).discount_amount?.toString() || "0");
  const discountDetails = (order as any).discount_details || [];
  
  // Calculate total using single source of truth
  const total = calculateFinalTotal({
    subtotal,
    shipping,
    tax,
    discount: discountAmount,
  });

  // Debug logging
  console.log("📊 OverviewTab Calculations:", {
    subtotal,
    shipping,
    tax,
    discountAmount,
    total,
    paidAmount,
    balanceDue: Math.max(0, total - paidAmount),
    orderTotal: order.total,
    paymentStatus: order.payment_status
  });

  const isPaid = order.payment_status === "paid";
  const isPartiallyPaid = order.payment_status === "partial_paid" || (paidAmount > 0 && paidAmount < total);
  const isUnpaid = !isPaid && !isPartiallyPaid;
  const balanceDue = Math.max(0, total - paidAmount);

  // Get shipping address
  const shippingStreet = getAddressField(order.shippingAddress, "shipping", "street1") || 
                         order.shippingAddress?.address?.street || "";
  const shippingCity = getAddressField(order.shippingAddress, "shipping", "city") || 
                       order.shippingAddress?.address?.city || "";
  const shippingState = getAddressField(order.shippingAddress, "shipping", "state") || 
                        order.shippingAddress?.address?.state || "";
  const shippingZip = getAddressField(order.shippingAddress, "shipping", "zipCode") || 
                      order.shippingAddress?.address?.zip_code || "";

  const totalItems = order.items.reduce(
    (total, item) => total + item.sizes.reduce((sum, size) => sum + size.quantity, 0),
    0
  );

  return (
    <div className="space-y-6">


      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Items</p>
              <p className="text-lg font-bold text-gray-900">{order.items.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total</p>
              <p className="text-lg font-bold text-gray-900">${total.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Payment</p>
              <Badge 
                variant="secondary" 
                className={`mt-0.5 text-xs ${
                  order.payment_status === "paid" 
                    ? "bg-green-100 text-green-700" 
                    : isPartiallyPaid
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {order.payment_status === "paid" ? "Paid" : isPartiallyPaid ? "Partial" : "Unpaid"}
              </Badge>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-0 shadow-sm bg-gradient-to-br from-rose-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Truck className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Status</p>
              <Badge 
                variant="secondary" 
                className={`mt-0.5 text-xs capitalize ${
                  order.status === "delivered" 
                    ? "bg-green-100 text-green-700" 
                    : order.status === "shipped"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {order.status}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer & Shipping Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Summary */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">{poIs ? "Vendor" : "Customer"}</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Contact information</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {companyName && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <Building className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-900">{companyName}</span>
              </div>
            )}
            <div className="flex items-center gap-3 p-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{order.customerInfo?.name || "N/A"}</span>
            </div>
            <div className="flex items-center gap-3 p-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{order.customerInfo?.email || "N/A"}</span>
            </div>
            <div className="flex items-center gap-3 p-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{order.customerInfo?.phone || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Summary */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Shipping To</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Delivery address</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="font-semibold text-gray-900">
                {order.shippingAddress?.fullName || order.customerInfo?.name || "N/A"}
              </p>
              {shippingStreet ? (
                <>
                  <p className="text-gray-600">{shippingStreet}</p>
                  <p className="text-gray-600">
                    {[shippingCity, shippingState].filter(Boolean).join(", ")} {shippingZip}
                  </p>
                </>
              ) : (
                <p className="text-gray-400 italic">No address provided</p>
              )}
              {order.shippingAddress?.phone && (
                <div className="flex items-center gap-2 pt-2 text-sm text-gray-500">
                  <Phone className="w-3.5 h-3.5" />
                  {order.shippingAddress.phone}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Order Summary</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">Pricing breakdown</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Items ({totalItems} units)</span>
              <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium text-gray-900">${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
            </div>
            
            {/* Show discount if applied */}
            {discountAmount > 0 && (
              <>
                <Separator />
                {discountDetails && discountDetails.length > 0 ? (
                  discountDetails.map((discount: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <span className="text-green-600">{discount.name || "Discount"}</span>
                      <span className="font-medium text-green-600">
                        {discount.amount > 0 ? `-$${discount.amount.toFixed(2)}` : "Free Shipping"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-green-600">Discount</span>
                    <span className="font-medium text-green-600">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            
            <div className="border-t pt-3 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-emerald-600">${total.toFixed(2)}</span>
              </div>
              
              {/* Paid Amount */}
              {paidAmount > 0 && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">Paid Amount</span>
                  </div>
                  <span className="font-bold text-green-600">${paidAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Balance Due - Show when there's amount to collect */}
              {balanceDue > 0 && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-600 font-bold">Balance Due</span>
                    </div>
                    <span className="text-xl font-bold text-red-600">${balanceDue.toFixed(2)}</span>
                  </div>
                  {/* Payment Link Button */}
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <Link to={`/pay-now?orderid=${order.id}`}>
                      <Button size="sm" className="w-full bg-red-600 hover:bg-red-700">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Collect Balance Payment
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Fully Paid Message - Show when paid >= total */}
              {paidAmount > 0 && balanceDue === 0 && total > 0 && (
                <div className="flex justify-between items-center mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">Fully Paid</span>
                  </div>
                  <span className="text-sm text-green-600">No balance due</span>
                </div>
              )}
              
              {discountAmount > 0 && (
                <div className="text-right mt-1">
                  <span className="text-sm text-green-600">You saved: ${discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-0 shadow-sm bg-gray-50">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Order Date</p>
              <p className="font-semibold text-gray-900">
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
        
        <Card className="p-4 border-0 shadow-sm bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Order Number</p>
              <p className="font-semibold text-gray-900 font-mono">{order.order_number}</p>
            </div>
          </div>
        </Card>
      </div>

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
