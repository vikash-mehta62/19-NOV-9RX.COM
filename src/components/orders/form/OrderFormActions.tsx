import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderFormValues } from "../schemas/orderSchema";
import { OrderPreview } from "../OrderPreview";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { calculateOrderTotal } from "../utils/orderUtils";
import axios from "../../../../axiosconfig";

interface OrderFormActionsProps {
  orderData: OrderFormValues;
  form: any;
  isSubmitting?: boolean;
  isValidating?: boolean; // Added this prop
  isEditing?: boolean; // Added this prop
  setModalIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCus?: React.Dispatch<React.SetStateAction<boolean>>;
  isCus?: boolean;
  poIs?: boolean;
}

export function OrderFormActions({
  orderData,
  isSubmitting,
  isValidating,
  isEditing,
  form,
  setModalIsOpen,
  setIsCus, // ✅ Added missing prop
  isCus, // ✅ Added missing prop
  poIs = false
}: OrderFormActionsProps) {
  const { toast } = useToast();
  const userType = sessionStorage.getItem("order_pay");
  const userRole = sessionStorage.getItem('userType');
  console.log(orderData)


  const onSubmit = async () => {
    console.log(orderData);

    const calculatedTotal = calculateOrderTotal(
      orderData.items,
      orderData.shipping.cost
    );

    const { data: profileTax, error: profileError } = await supabase
      .from("profiles")
      .select("taxPercantage")
      .eq("id", orderData.customer)
      .maybeSingle();

    if (profileError) {
      console.error("🚨 Supabase Fetch Error:", profileError);
      return;
    }

    if (!profileTax) {
      console.warn("⚠️ No user found for this customer.");
      return;
    }

    const newtax = (calculatedTotal * Number(profileTax.taxPercantage)) / 100;

    const updatedData = orderData;
    const orderId = updatedData.id;

    try {
      // Step 1: Fetch old order to reverse inventory
      const { data: oldOrderData, error: oldOrderError } = await supabase
        .from("orders")
        .select("items")
        .eq("id", orderId)
        .maybeSingle();

      if (oldOrderError || !oldOrderData) {
        console.error("⚠️ Failed to fetch old order for stock reversal", oldOrderError);
        throw new Error("Could not fetch previous order to reverse inventory");
      }

      for (const item of oldOrderData.items || []) {
        if (item.sizes && item.sizes.length > 0) {
          for (const size of item.sizes) {
            const { data: currentSize, error: fetchError } = await supabase
              .from("product_sizes")
              .select("stock")
              .eq("id", size.id)
              .single();

            if (fetchError || !currentSize) {
              console.warn(`⚠️ Size not found for reverse: ${size.id}`);
              continue;
            }

            const newQuantity = currentSize.stock + size.quantity;

            const { error: updateError } = await supabase
              .from("product_sizes")
              .update({ stock: newQuantity })
              .eq("id", size.id);

            if (updateError) {
              console.error(`❌ Failed to reverse stock for size ID ${size.id}`, updateError);
              throw new Error("Failed to reverse stock update");
            } else {
              console.log(`🔄 Reversed stock for size ID ${size.id}`);
            }
          }
        }
      }

      // Step 2: Update order record
      const { data: newOrder, error: updateOrderError } = await supabase
        .from("orders")
        .update({
          profile_id: updatedData.customer || null,
          customerInfo: updatedData.customerInfo || null,
          updated_at: new Date().toISOString(),
          items: updatedData.items || [],
          total_amount: calculatedTotal + newtax || 0,
          tax_amount: newtax || 0,
          notes:updatedData?.specialInstructions || "",
          purchase_number_external:updatedData?.purchase_number_external || ""
        })
        .eq("id", orderId)
        .select("*")
        .maybeSingle();

      if (updateOrderError) {
        console.error("Error updating order:", updateOrderError);
        throw updateOrderError;
      }

      // Step 3: Update invoice
      const { error: invoiceUpdateError } = await supabase
        .from("invoices")
        .update({
          profile_id: updatedData.customer || null,
          customer_info: updatedData.customerInfo || null,
          updated_at: new Date().toISOString(),
          items: updatedData.items || [],
          amount: calculatedTotal + newtax || 0,
          subtotal: calculatedTotal + newtax || 0,
          total_amount: calculatedTotal + newtax || 0,
          tax_amount: newtax || 0,
          notes:updatedData?.specialInstructions || "",
          purchase_number_external:updatedData?.purchase_number_external || ""

        })
        .eq("order_id", orderId);

      if (invoiceUpdateError) {
        console.error("Error updating invoice:", invoiceUpdateError);
        throw invoiceUpdateError;
      }

      // Step 4: Apply new inventory changes
      for (const item of updatedData.items || []) {
        if (item.sizes && item.sizes.length > 0) {
          for (const size of item.sizes) {
            const { data: currentSize, error: fetchError } = await supabase
              .from("product_sizes")
              .select("stock")
              .eq("id", size.id)
              .single();

            if (fetchError || !currentSize) {
              console.warn(`⚠️ Size not found during apply: ${size.id}`);
              continue;
            }

            const newQuantity = currentSize.stock - size.quantity;

            const { error: updateError } = await supabase
              .from("product_sizes")
              .update({ stock: newQuantity })
              .eq("id", size.id);

            if (updateError) {
              console.error(`❌ Failed to apply new stock for size ID ${size.id}`, updateError);
              throw new Error("Failed to apply new inventory");
            } else {
              console.log(`✅ Updated inventory for size ID ${size.id}`);
            }
          }
        }
      }

      // Step 5: Success Toast & Logs
      toast({
        title: "Order Status",
        description: "Order updated successfully!",
      });

      const logsData = {
        user_id: updatedData.customer,
        order_id: updatedData.order_number,
        action: 'order_edited',
        details: {
          message: `Order Edited : ${updatedData.order_number}`,
          oldOrder: oldOrderData,
          updateOrder: newOrder
        },
      };

      try {
        await axios.post("/logs/create", logsData);
        console.log("📝 Order edit logs stored successfully");
      } catch (apiError) {
        console.error("❌ Failed to store logs:", apiError);
      }

      // Step 6: Redirect
      setTimeout(() => {
        window.location.href = "/admin/orders";
      }, 500);

      return { success: true };
    } catch (error) {
      console.error("Update order error:", error);
      toast({
        title: "Error Updating Order",
        description: error.message || "Something went wrong while updating the order.",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };


  useEffect(() => {
    const storedOrderPay = sessionStorage.getItem("order_pay");
    console.log(storedOrderPay + " Check section");
  }, []);

  return (
    <div className="flex flex-col md:flex-row justify-end gap-2">
      <OrderPreview form={form} orderData={orderData} setIsCus={setIsCus} isCus={isCus} isEditing={isEditing} />

      {!isEditing && (
        <>
          {(userType === "true" || userType === null || userRole.toLocaleLowerCase() === "admin") ? (<Button
            type="submit"
            size="lg"
            disabled={isSubmitting || isValidating}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isSubmitting
              ? "Creating Order..."
              : poIs
                ? "Create Purchase Order"
                : "Create Order"}

          </Button>) :

            <p
              onClick={() => setModalIsOpen(true)}
              className="flex items-center gap-3 text-center justify-center px-4 py-2 text-white bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 transition duration-300 active:scale-95 select-none"
            >
              <ShoppingCart className="h-5 w-5" /> Pay And Order

              {isSubmitting
                ? "Creating Order..."
                : poIs
                  ? "Create Purchase Order"
                  : "Create Order"}
            </p>

          }

          {userRole.toLocaleLowerCase() === "admin" && !poIs &&
            <p
              onClick={() => setModalIsOpen(true)}
              className="flex items-center gap-3 text-center justify-center px-4 py-2 text-white bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 transition duration-300 active:scale-95 select-none"
            >
              <ShoppingCart className="h-5 w-5" /> Pay And Order
            </p>
          }
        </>
      )}

      {isEditing && (
        <p
          onClick={onSubmit}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 transition duration-300 active:scale-95 select-none"
        >
          <ShoppingCart className="h-5 w-5" />
          {isSubmitting ? "Updating Order..." : "Update Order"}
        </p>
      )}
    </div>
  );
}
