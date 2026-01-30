import { supabase } from '@/integrations/supabase/client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PaymentForm from './PaymentModal';
import { Loader, ShoppingCart, User, Mail, Phone, MapPin, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

function PayNowOrder() {
  const [searchParams] = useSearchParams();
  const orderID = searchParams.get("orderid");
  const [orderData, setOrderData] = useState<any>(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchOrder = async () => {
    if (!orderID) return;
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderID)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      setOrderData(order);
    } catch (err) {
      console.error("Error fetching order:", err);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderID, refreshTrigger]);

  if (!orderData) return <p className="text-center text-gray-500 flex items-center justify-center"><Loader className="animate-spin" size={24} /> Loading...</p>;

  // Calculate amounts with PO charges
  const itemsSubtotal = orderData.items?.reduce((total: number, item: any) => {
    return total + (item.sizes?.reduce((sum: number, size: any) => sum + size.quantity * size.price, 0) || 0)
  }, 0) || 0;
  
  const shippingCost = parseFloat(orderData.shipping_cost || "0");
  const taxAmount = parseFloat(orderData.tax_amount?.toString() || "0");
  const discountAmount = parseFloat(orderData.discount_amount?.toString() || "0");
  
  // Add PO charges ONLY for Purchase Orders (check poAccept flag)
  const isPurchaseOrder = orderData.poAccept === false; // poAccept: false means it's a PO
  const handlingCharges = isPurchaseOrder ? parseFloat(orderData.po_handling_charges || "0") : 0;
  const fredCharges = isPurchaseOrder ? parseFloat(orderData.po_fred_charges || "0") : 0;
  
  // Calculate correct total including all charges (PO charges only for POs)
  const totalAmount = itemsSubtotal + shippingCost + taxAmount + handlingCharges + fredCharges - discountAmount;
  
  const paidAmount = Number(orderData.paid_amount || 0);
  const balanceDue = Math.abs(totalAmount - paidAmount) < 0.01 ? 0 : Math.max(0, totalAmount - paidAmount);
  const isPartiallyPaid = orderData.payment_status === 'partial_paid' || (paidAmount > 0 && paidAmount < totalAmount);
  const isPaid = orderData.payment_status === 'paid' || balanceDue === 0;
  const canPay = !isPaid && (orderData.payment_status === 'unpaid' || orderData.payment_status === 'pending' || orderData.payment_status === 'partial_paid');

  // Amount to pay - if partially paid, only balance due; otherwise full amount
  const amountToPay = isPartiallyPaid ? balanceDue : totalAmount;

  console.log("Order Data:", { 
    itemsSubtotal, 
    shippingCost, 
    taxAmount, 
    handlingCharges, 
    fredCharges, 
    discountAmount,
    totalAmount, 
    paidAmount, 
    balanceDue, 
    isPartiallyPaid, 
    isPaid, 
    amountToPay 
  });

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-xl rounded-xl border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center gap-2 justify-center">
        <ShoppingCart size={24} /> Order Details
      </h2>
      
      <div className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 mb-4 flex items-center gap-2">
        <strong>Order Number:</strong> {orderData.order_number}
      </div>

      {/* Payment Status Banner */}
      {isPaid ? (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <p className="font-semibold text-green-700">Payment Complete</p>
            <p className="text-sm text-green-600">This order has been fully paid.</p>
          </div>
        </div>
      ) : isPartiallyPaid ? (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="text-yellow-600" size={24} />
            <div>
              <p className="font-semibold text-yellow-700">Partial Payment Received</p>
              <p className="text-sm text-yellow-600">Additional payment required to complete this order.</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-yellow-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Already Paid:</span>
              <span className="font-medium text-green-600">${paidAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold text-red-600">Balance Due:</span>
              <span className="font-bold text-red-600 text-lg">${balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Pay Now Button */}
      {canPay && (
        <button
          onClick={() => setModalIsOpen(true)}
          className="bg-green-600 flex items-center gap-2 justify-center text-[14px] text-white px-5 py-3 rounded-md transition hover:bg-green-700 w-full mb-4 font-semibold"
        >
          <CreditCard size={18} /> 
          {isPartiallyPaid ? `Pay Balance Due - $${balanceDue.toFixed(2)}` : `Pay Now - $${totalAmount.toFixed(2)}`}
        </button>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <ShoppingCart size={20} /> Items
        </h3>
        <div className="space-y-4">
          {orderData.items.map((item: any, index: number) => (
            <div key={index} className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-gray-600"><strong>Price:</strong> ${item.price?.toFixed(2) || '0.00'}</p>
              <p className="text-gray-600"><strong>Quantity:</strong> {item.quantity}</p>
              {item.sizes?.map((size: any, i: number) => (
                <div key={i} className="text-gray-500 mt-1">
                  <p>Size: {size.size_value} {size.size_unit}</p>
                  {size.sku && <p className="text-xs text-gray-400">SKU: {size.sku}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Amount Summary */}
      <div className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={20} />
          <span className="font-semibold text-gray-700">Payment Summary</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-medium">${totalAmount.toFixed(2)}</span>
          </div>
          {paidAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Paid Amount:</span>
              <span className="font-medium">${paidAmount.toFixed(2)}</span>
            </div>
          )}
          <div className={`flex justify-between pt-2 border-t ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
            <span className="font-semibold">Balance Due:</span>
            <span className="font-bold text-lg">${balanceDue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200 mb-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <User size={20} /> Customer Info
        </h3>
        <p className="text-gray-600 flex items-center gap-2"><Mail size={16} /> <strong>Email:</strong> {orderData.customerInfo?.email}</p>
        <p className="text-gray-600 flex items-center gap-2"><Phone size={16} /> <strong>Phone:</strong> {orderData.customerInfo?.phone}</p>
        <p className="text-gray-600 flex items-center gap-2"><MapPin size={16} /> <strong>Address:</strong> {orderData.customerInfo?.address?.street}, {orderData.customerInfo?.address?.city}, {orderData.customerInfo?.address?.state}, {orderData.customerInfo?.address?.zip_code}</p>
      </div>

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
            // Refresh order data after successful payment
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}

export default PayNowOrder;
