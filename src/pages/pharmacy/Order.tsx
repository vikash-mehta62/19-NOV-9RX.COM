import { DashboardLayout } from "@/components/DashboardLayout";
import { OrderCreationWizard } from "@/components/orders/wizard/OrderCreationWizard";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import CreateOrderPaymentForm from "@/components/CreateOrderPayment";
import { OrderActivityService } from "@/services/orderActivityService";
import { awardOrderPoints } from "@/services/rewardsService";

export default function PharmacyOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    console.log("PharmacyOrder mounted/updated", { isLoading, prefilledData: !!prefilledData });
    const loadUserData = async () => {
      // Verify user is logged in and is a pharmacy
      const userType = sessionStorage.getItem("userType");
      const isLoggedIn = sessionStorage.getItem("isLoggedIn");

      if (!isLoggedIn || userType !== "pharmacy") {
        toast({
          title: "Unauthorized Access",
          description: "Please log in as a pharmacy to access this page.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/login");
          return;
        }

        setCurrentUserId(session.user.id);

        // Fetch user profile data
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
              name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
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
              fullName: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
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
        console.error("Error loading user data:", error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [navigate, toast]);

  const handleComplete = async (orderData: any) => {
    console.log("🔵 Pharmacy Order completed:", orderData);
    
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
      
      // If payment method is "card", open payment modal
      // BUT if total is 0, skip payment modal and create order directly
      if (paymentMethod === "card" && orderData.total > 0) {
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

      // Prepare customer info
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

      // Prepare shipping address
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

      // Prepare order data
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

      // Insert order
      const { data: insertedOrder, error } = await supabase
        .from("orders")
        .insert([orderToSubmit])
        .select()
        .single();

      if (error) {
        console.error("Error creating order:", error);
        throw error;
      }

      console.log("✅ Order created successfully:", insertedOrder);

      // Award reward points for the order (only for non-credit orders)
      if (paymentMethod !== "credit" && insertedOrder.id && orderData.total > 0) {
        try {
          const rewardResult = await awardOrderPoints(
            session.user.id,
            insertedOrder.id,
            orderData.total,
            newOrderId
          );
          
          if (rewardResult.success && rewardResult.pointsEarned > 0) {
            console.log("✅ Reward points awarded:", rewardResult.pointsEarned);
          }
        } catch (rewardError) {
          console.error("❌ Error awarding reward points:", rewardError);
          // Don't throw - order was created successfully
        }
      }

      // Log order creation activity
      try {
        console.log("🔵 Starting activity logging for pharmacy order:", insertedOrder.id);
        
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", session.user.id)
          .single();

        console.log("🔵 User profile for activity:", userProfile);

        const activityResult = await OrderActivityService.logOrderCreation({
          orderId: insertedOrder.id,
          orderNumber: newOrderId,
          totalAmount: orderData.total,
          status: orderToSubmit.status,
          paymentMethod: paymentMethod,
          performedBy: session.user.id,
          performedByName: userProfile ? `${userProfile.first_name} ${userProfile.last_name}`.trim() : "Pharmacy User",
          performedByEmail: userProfile?.email,
        });

        console.log("🔵 Activity logging result:", activityResult);
        
        if (!activityResult.success) {
          console.error("❌ Activity logging failed:", activityResult.error);
        } else {
          console.log("✅ Activity logged successfully for pharmacy order");
        }
      } catch (activityError) {
        console.error("❌ Failed to log order creation activity:", activityError);
        // Don't throw - continue with order creation
      }

      // If credit payment, update credit_used
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
    navigate("/pharmacy/orders");
  };

  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    setPendingOrderData(null);
    navigate("/pharmacy/orders");
  };

  if (isLoading) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="pharmacy">
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
          pId={currentUserId}
          setIsCus={() => {}}
          isCus={false}
        />
      )}
    </DashboardLayout>
  );
}
