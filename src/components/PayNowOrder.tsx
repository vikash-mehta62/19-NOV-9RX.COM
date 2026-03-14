import axios from "../../axiosconfig";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PaymentForm from "./PaymentModal";
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
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const money = (n: number) => Math.round(n * 100) / 100;

  const fetchOrder = async () => {
    if (!orderID) return;

    try {
      setFetchError(null);

      const response = await axios.get(`/api/pay-now-order/${orderID}`);

      if (response.data?.success && response.data?.order) {
        console.log(response.data.order,"response.data.order")
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

  useEffect(() => {
    fetchOrder();
  }, [orderID, refreshTrigger]);

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
          onClick={() => setModalIsOpen(true)}
          className="bg-green-600 flex items-center gap-2 justify-center text-white px-5 py-3 rounded-md hover:bg-green-700 w-full mb-4 font-semibold"
        >
          <CreditCard size={18} />
          Pay Now - ${amountToPay.toFixed(2)}
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
                  {size.size_value} {size.size_unit} — Qty {size.quantity}
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
              <span>Card Processing Fee</span>
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

          <div className="flex justify-between font-bold text-red-600">
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

      {/* PAYMENT MODAL */}

      {modalIsOpen && (
        <PaymentForm
          modalIsOpen={modalIsOpen}
          setModalIsOpen={setModalIsOpen}
          customer={orderData.customerInfo}
          amountP={amountToPay}
          orderId={orderData.id}
          orders={orderData}
          payNow={true}
          isBalancePayment={isPartiallyPaid}
          previousPaidAmount={paidAmount}
          onPaymentSuccess={() => {
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}

export default PayNowOrder;