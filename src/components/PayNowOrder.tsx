import axios from "../../axiosconfig";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { processPaymentIPOSPay } from "@/services/paymentService";
import {
  Loader,
  ShoppingCart,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

function PayNowOrder() {
  const [searchParams] = useSearchParams();
  const orderID = searchParams.get("orderid");

  const [orderData, setOrderData] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);

  const money = (n: number) => Math.round(n * 100) / 100;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderID) return;

      try {
        setFetchError(null);

        const response = await axios.get(`/api/pay-now-order/${orderID}`);

        if (response.data?.success && response.data?.order) {
          console.log(response.data.order, "response.data.order");
          setOrderData(response.data.order);
        } else {
          setFetchError(response.data?.message || "Failed to fetch order");
        }
      } catch (err: any) {
        console.error("Error fetching order:", err);
        setFetchError(
          err?.response?.data?.message || "Failed to fetch order details"
        );
      }
    };

    fetchOrder();
  }, [orderID]);

  if (fetchError)
    return <p className="text-center text-red-500 p-8">{fetchError}</p>;

  if (!orderData)
    return (
      <p className="text-center text-gray-500 flex items-center justify-center p-8">
        <Loader className="animate-spin mr-2" size={24} /> Loading...
      </p>
    );

  /* ------------------------------
     ORDER TOTAL CALCULATIONS
  ------------------------------ */

  const itemsSubtotal =
    orderData.items?.reduce((total: number, item: any) => {
      return (
        total +
        (item.sizes?.reduce(
          (sum: number, size: any) => sum + size.quantity * size.price,
          0
        ) || 0)
      );
    }, 0) || 0;

  const shippingCost = Number(orderData.shipping_cost || 0);
  const taxAmount = Number(orderData.tax_amount || 0);
  const discountAmount = Number(orderData.discount_amount || 0);

  const processingFeeAmount = Number(orderData.processing_fee_amount || 0);

  const isPurchaseOrder = orderData.poAccept === false;

  const handlingCharges = isPurchaseOrder
    ? Number(orderData.po_handling_charges || 0)
    : 0;

  const fredCharges = isPurchaseOrder
    ? Number(orderData.po_fred_charges || 0)
    : 0;

  const totalAmount = money(
    itemsSubtotal +
      shippingCost +
      taxAmount +
      handlingCharges +
      fredCharges +
      processingFeeAmount -
      discountAmount
  );

  const paidAmount = Number(orderData.paid_amount || 0);

  const balanceDue = money(Math.max(0, totalAmount - paidAmount));

  const isPaid = balanceDue === 0;

  const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount;

  const canPay = !isPaid;

  const amountToPay = balanceDue > 0 ? balanceDue : 0;

  console.log("Order Payment Calculation:", {
    itemsSubtotal,
    shippingCost,
    taxAmount,
    handlingCharges,
    fredCharges,
    processingFeeAmount,
    discountAmount,
    totalAmount,
    paidAmount,
    balanceDue,
    amountToPay,
  });

  const handleDirectPayNow = async () => {
    if (!orderData?.id || amountToPay <= 0 || isRedirectingToPayment) {
      return;
    }

    try {
      setFetchError(null);
      setIsRedirectingToPayment(true);

      const iPosResult = await processPaymentIPOSPay({
        amount: amountToPay,
        orderId: orderData.id,
        paymentMethod: "card",
        customerName: orderData.customerInfo?.name,
        customerEmail: orderData.customerInfo?.email,
        customerMobile: orderData.customerInfo?.phone,
        description: `Order #${orderData.order_number}`,
        merchantName: orderData.business_name || "9RX",
        logoUrl: orderData.logo_url,
        returnUrl: `${window.location.origin}/payment/callback`,
        failureUrl: `${window.location.origin}/payment/callback`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        calculateFee: true,
        calculateTax: false,
        tipsInputPrompt: false,
        themeColor: "#2563EB",
      });

      if (!iPosResult.success || !iPosResult.paymentUrl) {
        throw new Error(iPosResult.error || "Failed to start secure checkout");
      }

      localStorage.setItem(
        "pending_payment",
        JSON.stringify({
          transactionReferenceId: iPosResult.transactionReferenceId,
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          amount: amountToPay,
          baseAmount: amountToPay,
          estimatedChargedAmount: amountToPay,
          estimatedProcessingFee: 0,
          customerName: orderData.customerInfo?.name,
          customerEmail: orderData.customerInfo?.email,
          paymentMethod: "card",
          timestamp: new Date().toISOString(),
        }),
      );

      window.location.href = iPosResult.paymentUrl;
    } catch (error: any) {
      console.error("Error launching direct iPOSPay checkout:", error);
      setFetchError(error?.message || "Failed to open secure payment page");
      setIsRedirectingToPayment(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-xl rounded-xl border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center gap-2 justify-center">
        <ShoppingCart size={24} /> Order Details
      </h2>

      <div className="p-4 bg-gray-50 rounded-lg border mb-4">
        <strong>Order Number:</strong> {orderData.order_number}
      </div>

      {/* PAYMENT STATUS */}

      {isPaid ? (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4 flex gap-3">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <p className="font-semibold text-green-700">Payment Complete</p>
            <p className="text-sm text-green-600">
              This order has been fully paid.
            </p>
          </div>
        </div>
      ) : isPartiallyPaid ? (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="text-yellow-600" size={24} />
            <div>
              <p className="font-semibold text-yellow-700">
                Partial Payment Received
              </p>
              <p className="text-sm text-yellow-600">
                Additional payment required.
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Amount</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm text-green-600">
              <span>Already Paid</span>
              <span>${paidAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between border-t pt-2 text-red-600">
              <span className="font-semibold">Balance Due</span>
              <span className="font-bold text-lg">
                ${balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* PAY BUTTON */}

      {canPay && (
        <button
          onClick={handleDirectPayNow}
          disabled={isRedirectingToPayment}
          className="bg-blue-600 flex items-center gap-2 justify-center text-white px-5 py-3 rounded-md hover:bg-blue-700 w-full mb-4 font-semibold"
        >
          {isRedirectingToPayment ? (
            <Loader className="animate-spin" size={18} />
          ) : (
            <CreditCard size={18} />
          )}
          {isRedirectingToPayment
            ? "Redirecting to Secure Checkout..."
            : `Pay Now - $${amountToPay.toFixed(2)}`}
        </button>
      )}

      {/* ITEMS */}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <ShoppingCart size={20} /> Items
        </h3>

        <div className="space-y-4">
          {orderData.items.map((item: any, index: number) => (
            <div
              key={index}
              className="p-4 bg-white rounded-lg shadow border"
            >
              <p className="font-medium">{item.name}</p>

              {item.sizes?.map((size: any, i: number) => (
                <div key={i} className="text-sm text-gray-600 mt-1">
                  {size.size_value} {item.unitToggle ? size.size_unit : ""} — Qty {size.quantity}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* PAYMENT SUMMARY */}

      <div className="p-4 bg-gray-50 rounded-lg border mb-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <CreditCard size={20} /> Payment Summary
        </h3>

        <div className="space-y-2 text-sm">

          <div className="flex justify-between">
            <span>Items Subtotal</span>
            <span>${itemsSubtotal.toFixed(2)}</span>
          </div>

          {shippingCost > 0 && (
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>${shippingCost.toFixed(2)}</span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
          )}

          {processingFeeAmount > 0 && (
            <div className="flex justify-between">
              <span>Card Processing Fee (Already Paid)</span>
              <span>${processingFeeAmount.toFixed(2)}</span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>- ${discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>

          {paidAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Paid</span>
              <span>${paidAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-red-600 border-t pt-2">
            <span>Balance Due</span>
            <span>${balanceDue.toFixed(2)}</span>
          </div>

        </div>
      </div>

      {/* CUSTOMER INFO */}

      <div className="p-4 bg-white rounded-lg shadow border mb-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <User size={20} /> Customer Info
        </h3>

        <p className="flex gap-2 text-sm">
          <Mail size={16} /> {orderData.customerInfo?.email}
        </p>

        <p className="flex gap-2 text-sm">
          <Phone size={16} /> {orderData.customerInfo?.phone}
        </p>

        <p className="flex gap-2 text-sm">
          <MapPin size={16} />
          {orderData.customerInfo?.address?.street},{" "}
          {orderData.customerInfo?.address?.city}
        </p>
      </div>
    </div>
  );
}

export default PayNowOrder;
