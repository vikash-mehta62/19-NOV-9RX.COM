import { supabase } from '@/integrations/supabase/client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PaymentForm from './PaymentModal';
import { Loader, ShoppingCart, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';

function PayNowOrder() {
  const [searchParams] = useSearchParams();
  const orderID = searchParams.get("orderid");
  const [orderData, setOrderData] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  useEffect(() => {
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
    fetchOrder();
  }, [orderID]);

  if (!orderData) return <p className="text-center text-gray-500 flex items-center justify-center"><Loader className="animate-spin" size={24} /> Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-xl rounded-xl border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center gap-2">
        <ShoppingCart size={24} /> Order Details
      </h2>
      
      <div className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 mb-4 flex items-center gap-2">
        <strong>Order Number:</strong> {orderData.order_number}
      </div>
      {orderData?.payment_status.toLowerCase() === "unpaid" && (
        <button
          onClick={() => setModalIsOpen(true)}
          className="bg-green-600 flex items-center gap-2 justify-center text-[14px] text-white px-5 py-2 rounded-md transition hover:bg-green-700 w-full"
        >
          <CreditCard size={18} /> Pay Now
        </button>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <ShoppingCart size={20} /> Items
        </h3>
        <div className="space-y-4">
          {orderData.items.map((item, index) => (
            <div key={index} className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-gray-600"><strong>Price:</strong> ${item.price.toFixed(2)}</p>
              <p className="text-gray-600"><strong>Quantity:</strong> {item.quantity}</p>
              {item.sizes.map((size, i) => (
                <p key={i} className="text-gray-500">Size: {size.size_value} {size.size_unit}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 mb-4 flex items-center gap-2">
        <CreditCard size={20} />
        <p className="text-gray-700 text-lg font-semibold"><strong>Total Amount:</strong> ${orderData.total_amount.toFixed(2)}</p>
      </div>

      <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200 mb-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <User size={20} /> Customer Info
        </h3>
        <p className="text-gray-600 flex items-center gap-2"><Mail size={16} /> <strong>Email:</strong> {orderData.customerInfo.email}</p>
        <p className="text-gray-600 flex items-center gap-2"><Phone size={16} /> <strong>Phone:</strong> {orderData.customerInfo.phone}</p>
        <p className="text-gray-600 flex items-center gap-2"><MapPin size={16} /> <strong>Address:</strong> {orderData.customerInfo.address.street}, {orderData.customerInfo.address.city}, {orderData.customerInfo.address.state}, {orderData.customerInfo.address.zip_code}</p>
      </div>

  

      {modalIsOpen && (
        <PaymentForm
          modalIsOpen={modalIsOpen}
          setModalIsOpen={setModalIsOpen}
          customer={orderData.customerInfo}
          amountP={orderData.total_amount}
          orderId={orderData.id}
          orders={orderData}
          payNow={true}
        />
      )}
    </div>
  );
}

export default PayNowOrder;
