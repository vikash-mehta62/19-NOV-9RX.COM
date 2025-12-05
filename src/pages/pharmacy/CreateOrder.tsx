import { DashboardLayout } from "@/components/DashboardLayout";
import { OrderCreationWizard } from "@/components/orders/wizard/OrderCreationWizard";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import { useState, useEffect } from "react";
import CreateOrderPaymentForm from "@/components/CreateOrderPayment";

export default function PharmacyCreateOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load current user's profile data to prefill customer info
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Authentication Required",
            description: "Please log in to create an order",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }

        // Fetch user profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        if (profile) {
          // Set tax and shipping in sessionStorage
          sessionStorage.setItem("taxper", (profile.taxPercantage || 0).toString());
          sessionStorage.setItem("shipping", (profile.freeShipping || false).toString());

          // Prepare prefilled data
          const prefilled = {
            customer: {
              id: profile.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.display_name || "",
              email: profile.email || "",
              phone: profile.mobile_phone || profile.work_phone || "",
              type: profile.type || "Pharmacy",
              company_name: profile.company_name || "",
              tax_percentage: profile.taxPercantage || 0,
              freeShipping: profile.freeShipping || false,
            },
            customerId: profile.id,
            billingAddress: {
              company_name: profile.company_name || "",
              attention: profile.billing_address?.attention || "",
              street: profile.billing_address?.street1 || "",
              city: profile.billing_address?.city || "",
              state: profile.billing_address?.state || "",
              zip_code: profile.billing_address?.zip_code || "",
            },
            shippingAddress: {
              fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.display_name || "",
              email: profile.email || "",
              phone: profile.mobile_phone || profile.work_phone || "",
              street: profile.shipping_address?.street1 || profile.billing_address?.street1 || "",
              city: profile.shipping_address?.city || profile.billing_address?.city || "",
              state: profile.shipping_address?.state || profile.billing_address?.state || "",
              zip_code: profile.shipping_address?.zip_code || profile.billing_address?.zip_code || "",
            },
            cartItems: [],
            paymentMethod: "card",
            specialInstructions: "",
            poNumber: "",
          };

          setPrefilledData(prefilled);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [navigate, toast]);

  const handleComplete = async (orderData: any) => {
    console.log("Order completed:", orderData);
    
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

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
          .eq("id", session.user.id)
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
      const newOrderId = await generateOrderId();
      
      if (!newOrderId) {
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
        order_number: newOrderId,
        profile_id: session.user.id,
        location_id: session.user.id, // For pharmacy, location_id is same as profile_id
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
          .eq("id", session.user.id)
          .single();

        const newCreditUsed = (customerProfile?.credit_used || 0) + orderData.total;

        await supabase
          .from("profiles")
          .update({ credit_used: newCreditUsed })
          .eq("id", session.user.id);
      }

      console.log("Order created successfully:", insertedOrder);

      toast({
        title: "Order Created Successfully",
        description: `Order ${newOrderId} has been created and is ready for processing`,
      });

      // Navigate back to orders list
      navigate("/pharmacy/orders");
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
    navigate("/pharmacy/orders");
  };

  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    setPendingOrderData(null);
    // Navigate to orders page after payment
    navigate("/pharmacy/orders");
  };

  if (isLoading) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your information...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pharmacy">
      <div className="mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900">Create New Order</h2>
          <p className="text-sm text-blue-700 mt-1">
            Your customer information is pre-filled. You can modify addresses and add products.
          </p>
        </div>
      </div>
      <OrderCreationWizard
        initialData={prefilledData}
        isEditMode={false}
        isPharmacyMode={true}
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
