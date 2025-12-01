import { DashboardLayout } from "@/components/DashboardLayout";
import { OrderCreationWizard } from "@/components/orders/wizard/OrderCreationWizard";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import { useState } from "react";
import CreateOrderPaymentForm from "@/components/CreateOrderPayment";

export default function CreateOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  const handleComplete = async (orderData: any) => {
    console.log("Order completed:", orderData);
    
    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to create orders",
          variant: "destructive",
        });
        return;
      }

      // Check payment method
      const paymentMethod = orderData.paymentMethod;
      
      // If payment method is "card", open payment modal instead of creating order directly
      if (paymentMethod === "card") {
        // Store order data and open payment modal
        setPendingOrderData(orderData);
        setIsPaymentModalOpen(true);
        return;
      }

      // If payment method is "credit", check credit limit
      if (paymentMethod === "credit") {
        const { data: customerProfile, error: profileError } = await supabase
          .from("profiles")
          .select("credit_used, credit_limit")
          .eq("id", orderData.customerId)
          .single();

        if (profileError) {
          console.error("Error fetching customer profile:", profileError);
          throw new Error(profileError.message);
        }

        const creditUsed = customerProfile.credit_used || 0;
        const creditLimit = customerProfile.credit_limit || 0;
        const availableCredit = creditLimit - creditUsed;

        // Check if order total exceeds available credit
        if (orderData.total > availableCredit) {
          toast({
            title: "Credit Limit Exceeded",
            description: `Available credit: $${availableCredit.toFixed(2)}. Order total: $${orderData.total.toFixed(2)}.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Generate order ID
      const orderId = await generateOrderId();
      
      if (!orderId) {
        throw new Error("Failed to generate order ID");
      }

      // Prepare customer info in the format expected by database
      const customerInfo = {
        name: orderData.customer?.name || "",
        email: orderData.customer?.email || "",
        phone: orderData.customer?.phone || "",
        type: orderData.customer?.type || "Pharmacy",
        address: {
          street: orderData.billingAddress?.street || "",
          city: orderData.billingAddress?.city || "",
          state: orderData.billingAddress?.state || "",
          zip_code: orderData.billingAddress?.zip_code || "",
        },
      };

      // Prepare shipping address in the format expected by database
      const shippingAddressData = {
        fullName: orderData.shippingAddress?.fullName || "",
        email: orderData.shippingAddress?.email || "",
        phone: orderData.shippingAddress?.phone || "",
        address: {
          street: orderData.shippingAddress?.street || "",
          city: orderData.shippingAddress?.city || "",
          state: orderData.shippingAddress?.state || "",
          zip_code: orderData.shippingAddress?.zip_code || "",
        },
      };

      // Prepare order data for database
      const orderToSubmit = {
        order_number: orderId,
        profile_id: session.user.id,
        location_id: orderData.customerId,
        customerInfo: customerInfo,
        shippingAddress: shippingAddressData,
        items: orderData.cartItems,
        total_amount: orderData.total,
        tax_amount: orderData.tax,
        shipping_cost: orderData.shipping,
        payment_method: paymentMethod,
        notes: orderData.specialInstructions,
        purchase_number_external: orderData.poNumber,
        status: paymentMethod === "credit" ? "credit_approval_processing" : "new",
        payment_status: paymentMethod === "credit" ? "pending" : "pending",
        customization: false,
        void: false,
      };

      // Insert order into database
      const { data: insertedOrder, error } = await supabase
        .from("orders")
        .insert([orderToSubmit])
        .select()
        .single();

      if (error) {
        console.error("Error creating order:", error);
        throw error;
      }

      // If credit payment, update customer's credit_used
      if (paymentMethod === "credit") {
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("credit_used")
          .eq("id", orderData.customerId)
          .single();

        const newCreditUsed = (customerProfile?.credit_used || 0) + orderData.total;

        await supabase
          .from("profiles")
          .update({ credit_used: newCreditUsed })
          .eq("id", orderData.customerId);
      }

      console.log("Order created successfully:", insertedOrder);

      toast({
        title: "Order Created Successfully",
        description: `Order ${orderId} has been created and is ready for processing`,
      });

      // Navigate back to orders list
      navigate("/admin/orders");
    } catch (error) {
      console.error("Error in handleComplete:", error);
      toast({
        title: "Error Creating Order",
        description: error instanceof Error ? error.message : "An error occurred while creating the order",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    // Navigate back to orders list
    navigate("/admin/orders");
  };

  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    setPendingOrderData(null);
    // Navigate to orders page after payment (CreateOrderPayment handles order creation)
    navigate("/admin/orders");
  };

  return (
    <DashboardLayout>
      <OrderCreationWizard
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
      
      {/* Payment Modal */}
      {isPaymentModalOpen && pendingOrderData && (
        <CreateOrderPaymentForm
          modalIsOpen={isPaymentModalOpen}
          setModalIsOpen={handlePaymentModalClose}
          formDataa={{
            status: "new",
            customerInfo: {
              name: pendingOrderData.customer?.name || "",
              email: pendingOrderData.customer?.email || "",
              phone: pendingOrderData.customer?.phone || "",
              address: {
                street: pendingOrderData.billingAddress?.street || "",
                city: pendingOrderData.billingAddress?.city || "",
                state: pendingOrderData.billingAddress?.state || "",
                zip_code: pendingOrderData.billingAddress?.zip_code || "",
              },
            },
            shippingAddress: {
              fullName: pendingOrderData.shippingAddress?.fullName || "",
              email: pendingOrderData.shippingAddress?.email || "",
              phone: pendingOrderData.shippingAddress?.phone || "",
              address: {
                street: pendingOrderData.shippingAddress?.street || "",
                city: pendingOrderData.shippingAddress?.city || "",
                state: pendingOrderData.shippingAddress?.state || "",
                zip_code: pendingOrderData.shippingAddress?.zip_code || "",
              },
            },
            items: pendingOrderData.cartItems,
            specialInstructions: pendingOrderData.specialInstructions || "",
            shipping: {
              method: "FedEx",
            },
          }}
          form={null}
          pId={pendingOrderData.customerId}
          setIsCus={() => {}}
          isCus={false}
        />
      )}
    </DashboardLayout>
  );
}
