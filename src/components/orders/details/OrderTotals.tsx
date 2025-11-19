import { useCart } from "@/hooks/use-cart";
import { OrderFormValues } from "../schemas/orderSchema";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateOrderTotal } from "../utils/orderUtils";

interface OrderTotalsProps {
  items: OrderFormValues["items"];
  paymentMethod: OrderFormValues["payment"]["method"];
  setIsCus?: React.Dispatch<React.SetStateAction<boolean>>;
  isCus?: boolean;
  isEditing?: boolean;
  orderData?: any;
}

export function OrderTotals({
  items,
  paymentMethod,
  isEditing,
  orderData,
}: OrderTotalsProps) {
  const { cartItems } = useCart();
  const [subtotal, setSubtotal] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [total, setTotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [taxper, setTaxper] = useState(0);

  useEffect(() => {
    if (!orderData?.customer) return;

    const fetchProfile = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", orderData.customer)
          .maybeSingle();

        if (profileError) {
          console.error("Database Error - Failed to fetch profile:", profileError);
          return;
        }

        if (!profileData) {
          console.error("Data Error: User profile not found for ID:", orderData.customer);
          return;
        }

        console.log("Successfully fetched profile:", profileData);
        setTaxper(Number(profileData.taxPercantage));

        // Fetch Order Details
        const { data: orderDetails, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderData.id)
          .maybeSingle();

        if (orderError) {
          console.error("Database Error - Failed to fetch order:", orderError);
          return;
        }

        if (!orderDetails) {
          console.error("Data Error: Order not found for ID:", orderData.id);
          return;
        }

        console.log("Successfully fetched order:", orderDetails);
        setShippingCost(Number(orderDetails.shipping_cost));
      } catch (err) {
        console.error("Unexpected Error:", err);
      }
    };

    fetchProfile();
  }, [orderData]);

  useEffect(() => {
    const calculateSubtotal = (items: any[]) =>
      
      items.reduce((total, item) => total + (parseFloat(item.price) || 0), 0);

    const calculateShipping = (items: any[]) => {
      if (isEditing) return shippingCost;
      return sessionStorage.getItem("shipping") === "true"
        ? 0
        : orderData?.shipping?.cost || items.reduce((total, item) => total + (item.shipping_cost || 0), 0);
    };

    const newSubtotal = calculateSubtotal(items || cartItems);
    const newShippingCost = calculateShipping(items || cartItems);
    const newTax = (newSubtotal * taxper) / 100;

    console.log(calculateOrderTotal(items || cartItems ,newShippingCost ))
    setSubtotal(newSubtotal);
    setShippingCost(newShippingCost);
    setTax(newTax);
    setTotal(newSubtotal + newShippingCost + newTax);
  }, [items, orderData, shippingCost, taxper]);

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal:</span>
        <span className="font-medium">${subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-blue-600">Shipping (Standard):</span>
        <span className="font-medium text-blue-600">${shippingCost.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-base font-bold">
        <span>Tax ({taxper}%)</span>
        <span>${tax.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-base font-bold">
        <span>Total:</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
