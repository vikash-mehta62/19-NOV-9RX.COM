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
import { formatDate } from "../../utils/dateUtils";
import { getOrderStatusDisplay, getPaymentStatusDisplay } from "../../utils/orderDisplay";

interface OverviewTabProps {
  order: OrderFormValues;
  companyName?: string;
  poIs?: boolean;
  onCollectPayment?: () => void;
  hideFinancialData?: boolean;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
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

export const OverviewTab = ({
  order,
  companyName,
  poIs: poIsProp,
  onCollectPayment,
  hideFinancialData = false,
  userRole,
}: OverviewTabProps) => {
  const [paidAmount, setPaidAmount] = useState(0);
  const [chargedAmount, setChargedAmount] = useState(0);
  const [processingFeeAmount, setProcessingFeeAmount] = useState(order.processing_fee_amount || 0);
  const [loading, setLoading] = useState(true);
  const orderDate = order.date || (order as any).created_at;
  console.log(order,"orderMAIN")
  // Derive poIs from order data itself for reliability
  // This ensures we always use the correct order type regardless of prop
  const poIs = (order as any)?.poAccept === false;
  
  console.log("🔍 OverviewTab - Order Type Check:", {
    orderId: order.id,
    orderNumber: order.order_number,
    poAccept: (order as any)?.poAccept,
    poIsProp,
    poIsDerived: poIs,
    mismatch: poIsProp !== poIs
  });

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
  }, [order.id, poIs]); // Added poIs to ensure re-fetch when switching between SO/PO

 

  const calculateSubtotal = () => {
    return order.items.reduce((total, item) => {
      return total + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = parseFloat(order.shipping_cost || "0");
  const tax = parseFloat(order.tax_amount?.toString() || "0");
  const discountDetails = (order as any).discount_details || [];
  const discountDetailsTotal = discountDetails.reduce((sum: number, discount: any) => sum + Number(discount?.amount || 0), 0);
  const discountAmount = Math.max(
    parseFloat((order as any).discount_amount?.toString() || "0"),
    discountDetailsTotal
  );
  const hasDiscountRows = discountAmount > 0 || discountDetails.length > 0;
  const hasFedExShipmentData =
    order.shipping?.method === "FedEx" ||
    Boolean(order.shipping?.labelUrl || order.shipping?.labelBase64 || order.shipping?.labelStoragePath || order.shipping?.serviceType);
  const showAdminFedExCharge = userRole === "admin" && !poIs;
  const fedexLabelCharge =
    showAdminFedExCharge && hasFedExShipmentData
      ? Number(order.shipping?.quotedAmount ?? order.shipping?.cost ?? 0)
      : 0;
  
  // Add PO charges ONLY for Purchase Orders (check poIs flag)
  const handling = poIs ? parseFloat((order as any).po_handling_charges || "0") : 0;
  const fred = poIs ? parseFloat((order as any).po_fred_charges || "0") : 0;
  
  const orderTotalBeforeCardFee = subtotal + shipping + tax + handling + fred - discountAmount;
  const total = orderTotalBeforeCardFee + processingFeeAmount;
  const effectiveChargedAmount =  paidAmount;
  const displayTotal = total;

  // Debug logging
  console.log("📊 OverviewTab Calculations:", {
    orderId: order.id,
    orderNumber: order.order_number,
    poIs,
    poAccept: (order as any)?.poAccept,
    subtotal,
    shipping,
    tax,
    fedexLabelCharge,
    handling,
    fred,
    discountAmount,
    total,
    orderTotalBeforeCardFee,
    effectiveChargedAmount,
    processingFeeAmount,
    paidAmount,
    balanceDue: Math.max(0, total - paidAmount),
    orderTotal: order.total,
    paymentStatus: order.payment_status
  });

  const {
    label: paymentStatusLabel,
    badgeClass: paymentStatusBadgeClass,
  } = getPaymentStatusDisplay({
    paymentStatus: order.payment_status,
    paidAmount,
    totalAmount: total,
  });
  const statusDisplay = getOrderStatusDisplay(order.status);
  const isPaid = paymentStatusLabel === "Paid";
  const isPartiallyPaid = paymentStatusLabel === "Partial Paid";
  
  // Special case: Order paid via credit memo (paid_amount = 0 but payment_status = paid)
  const isPaidViaCreditMemo = isPaid && paidAmount === 0 && total > 0;
  
  // Calculate balance due with proper rounding to avoid floating point issues
  const rawBalanceDue = total - paidAmount;
  const balanceDue = Math.abs(rawBalanceDue) < 0.01 ? 0 : Math.max(0, rawBalanceDue);

  // Get shipping address
  const shippingStreet = getAddressField(order.shippingAddress, "shipping", "street1") || 
                         order.shippingAddress?.address?.street || "";
  const shippingCity = getAddressField(order.shippingAddress, "shipping", "city") || 
                       order.shippingAddress?.address?.city || "";
  const shippingState = getAddressField(order.shippingAddress, "shipping", "state") || 
                        order.shippingAddress?.address?.state || "";
  const shippingZip = getAddressField(order.shippingAddress, "shipping", "zipCode") || 
                      order.shippingAddress?.address?.zip_code || "";

  const totalUnits = order.items.reduce(
    (total, item) => total + item.sizes.reduce((sum, size) => sum + size.quantity, 0),
    0
  );
  const maskedAmountLabel = "Restricted";

  return (
    <div className="space-y-6">


      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Units</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">{totalUnits}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Customer Total</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {hideFinancialData ? maskedAmountLabel : `$${displayTotal.toFixed(2)}`}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Payment Status</p>
              <Badge
                variant="secondary"
                className={`mt-0.5 border text-[10px] sm:text-xs ${paymentStatusBadgeClass}`}
              >
                {paymentStatusLabel}
              </Badge>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 border-0 shadow-sm bg-gradient-to-br from-rose-50 to-pink-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Order Stage</p>
              <Badge
                variant="secondary"
                className={`mt-0.5 border text-[10px] sm:text-xs ${statusDisplay.badgeClass}`}
              >
                {statusDisplay.label}
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
      {!hideFinancialData && (
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
              <span className="text-gray-600">Items Subtotal ({totalUnits} units)</span>
              <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="text-gray-600">Shipping Collected From Buyer</span>
                <p className="text-xs text-gray-400">What the buyer paid for shipping on this order.</p>
              </div>
              <span className="font-medium text-gray-900">${shipping.toFixed(2)}</span>
            </div>

            {showAdminFedExCharge && (
              <div className="flex justify-between items-center py-2 px-3 -mx-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div>
                  <span className="text-slate-700 font-medium">FedEx Label Charge</span>
                  <p className="text-xs text-slate-600">Internal shipping cost paid by admin (not included in order total).</p>
                </div>
                <span className="font-semibold text-slate-900">${fedexLabelCharge.toFixed(2)}</span>
              </div>
            )}
            
            {/* PO Charges - Show only for Purchase Orders */}
            {poIs && handling > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Handling Charges</span>
                <span className="font-medium text-gray-900">${handling.toFixed(2)}</span>
              </div>
            )}
            
            {poIs && fred > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">FRED Charges</span>
                <span className="font-medium text-gray-900">${fred.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="text-gray-600">Sales Tax Collected</span>
                <p className="text-xs text-gray-400">Tax charged to the buyer on this order.</p>
              </div>
              <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
            </div>

            {processingFeeAmount > 0 && (
              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-gray-600">Card Processing Fee Collected</span>
                  <p className="text-xs text-gray-400">Extra fee collected from the buyer on the card payment.</p>
                </div>
                <span className="font-medium text-amber-600">${processingFeeAmount.toFixed(2)}</span>
              </div>
            )}
            
            {/* Show discount if applied */}
            {hasDiscountRows && (
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
            
            {processingFeeAmount > 0 && (
              <div className="flex justify-between items-center py-2 border-t mt-2">
                <div>
                  <span className="text-gray-600">Order Total</span>
                  <p className="text-xs text-gray-400">Before card processing fee</p>
                </div>
                <span className="font-semibold text-gray-900">${orderTotalBeforeCardFee.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t pt-3 mt-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-lg font-bold text-gray-900">
                    {processingFeeAmount > 0 ? "Total Charged to Buyer" : "Order Total"}
                  </span>
                  {processingFeeAmount > 0 && (
                    <p className="text-xs text-gray-500">Order total plus the card fee collected from the buyer.</p>
                  )}
                </div>
                <span className="text-2xl font-bold text-emerald-600">${displayTotal.toFixed(2)}</span>
              </div>
              
              {/* Paid Amount */}
              {effectiveChargedAmount > 0 && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">Paid Amount</span> 
                  </div>
                  <span className="font-bold text-green-600">${effectiveChargedAmount.toFixed(2)}</span>
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
                    {onCollectPayment ? (
                      <Button size="sm" className="w-full bg-red-600 hover:bg-red-700" onClick={onCollectPayment}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Collect Balance Payment
                      </Button>
                    ) : (
                      <Link to={`/pay-now?orderid=${order.id}`}>
                        <Button size="sm" className="w-full bg-red-600 hover:bg-red-700">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Collect Balance Payment
                        </Button>
                      </Link>
                    )}
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
              
              {/* Credit Memo Paid Message - Show when paid via credit memo (paid_amount = 0) */}
              {isPaidViaCreditMemo && (
                <div className="flex justify-between items-center mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-600 font-medium">Paid via Credit Memo</span>
                  </div>
                  <span className="text-sm text-blue-600">No balance due</span>
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
      )}

      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-0 shadow-sm bg-gray-50">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Order Date</p>
              <p className="font-semibold text-gray-900">
                {formatDate(orderDate)}
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
