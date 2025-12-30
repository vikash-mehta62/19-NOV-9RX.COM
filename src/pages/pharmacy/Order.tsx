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
import PaymentAdjustmentService from "@/services/paymentAdjustmentService";

// Invoice creation function for paid orders (when total is 0)
const createInvoiceForOrder = async (order: any, totalAmount: number, taxAmount: number) => {
  try {
    console.log(`🧾 Creating invoice for paid order: ${order.id}`);

    const year = new Date().getFullYear();
    const { data: inData, error: fetchError } = await supabase
      .from("centerize_data")
      .select("id, invoice_no, invoice_start")
      .order("id", { ascending: false })
      .limit(1);

    if (fetchError) throw new Error(fetchError.message);

    const newInvNo = (inData?.[0]?.invoice_no || 0) + 1;
    const invoiceStart = inData?.[0]?.invoice_start || "INV";

    if (inData?.[0]?.id) {
      const { error: updateError } = await supabase
        .from("centerize_data")
        .update({ invoice_no: newInvNo })
        .eq("id", inData[0].id);

      if (updateError) throw new Error(updateError.message);
    }

    const invoiceNumber = `${invoiceStart}-${year}${newInvNo.toString().padStart(6, "0")}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const invoiceData = {
      invoice_number: invoiceNumber,
      order_id: order.id,
      profile_id: order.profile_id,
      due_date: dueDate,
      status: "paid" as const,
      amount: totalAmount, // Original subtotal amount
      tax_amount: taxAmount,
      total_amount: Math.max(0, order.total_amount || 0), // Final total (0 after discount, never negative)
      payment_status: "paid" as const,
      payment_method: order.payment_method,
      notes: order.notes || null,
      purchase_number_external: order.purchase_number_external,
      items: order.items,
      customer_info: order.customerInfo,
      shipping_info: order.shippingAddress,
      shippin_cost: order.shipping_cost,
      subtotal: totalAmount, // Original subtotal
      discount_amount: order.discount_amount || 0,
      discount_details: order.discount_details || [],
    };

    const { error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoiceData);

    if (invoiceError) throw new Error(invoiceError.message);

    console.log(`✅ Invoice Created Successfully: ${invoiceNumber}`);

    await supabase
      .from("orders")
      .update({ invoice_created: true, updated_at: new Date().toISOString() })
      .eq("id", order.id);

    console.log("🟢 Order updated with invoice_created = true");
    return invoiceNumber;
  } catch (err: any) {
    console.error("❌ Invoice create error:", err.message);
    throw new Error(err.message);
  }
};

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
    console.log("🔵 Order total:", orderData.total);
    console.log("🔵 Total discount:", orderData.totalDiscount);
    console.log("🔵 Final total (after discount):", orderData.total - (orderData.totalDiscount || 0));
    
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
      
      // Calculate final total after discounts
      const finalTotal = Math.max(0, (orderData.total || 0) - (orderData.totalDiscount || 0));
      
      console.log("🔵 Payment method:", paymentMethod);
      console.log("🔵 Final total for payment check:", finalTotal);
      
      // If payment method is "card", open payment modal
      // BUT if total is 0, skip payment modal and create order directly
      if (paymentMethod === "card" && finalTotal > 0) {
        console.log("✅ Credit card payment - opening payment page");
        setPendingOrderData(orderData);
        setIsPaymentModalOpen(true);
        return;
      }
      
      // If total is 0 (fully discounted), create order directly without payment
      if (finalTotal === 0) {
        console.log("✅ Total is $0 - creating order directly without payment");
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

        if (finalTotal > availableCredit) {
          toast({
            title: "Credit Limit Exceeded",
            description: `Available credit: ${availableCredit.toFixed(2)}. Order total: ${finalTotal.toFixed(2)}.`,
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

      // Determine payment status based on total and payment method
      let paymentStatus = "pending";
      let orderStatus = "new";
      
      if (finalTotal === 0) {
        // If total is 0 (fully discounted), mark as paid
        paymentStatus = "paid";
        orderStatus = "new";
      } else if (paymentMethod === "credit") {
        paymentStatus = "pending";
        orderStatus = "credit_approval_processing";
      }

      // Prepare order data
      const orderToSubmit = {
        order_number: newOrderId,
        profile_id: session.user.id,
        location_id: session.user.id, // For pharmacy, location_id is same as profile_id
        customerInfo: customerInfo,
        shippingAddress: shippingAddressData,
        items: orderData.cartItems,
        total_amount: finalTotal, // Use final total after discounts
        tax_amount: orderData.tax,
        shipping_cost: orderData.shipping,
        payment_method: paymentMethod,
        notes: orderData.specialInstructions,
        purchase_number_external: orderData.poNumber,
        status: orderStatus,
        payment_status: paymentStatus,
        customization: false,
        void: false,
        // Store discount information
        discount_amount: orderData.totalDiscount || 0,
        discount_details: orderData.appliedDiscounts || [],
      };

      console.log("Final order data for pharmacy:", orderToSubmit);
      console.log("Final total:", finalTotal);
      console.log("Payment status:", paymentStatus);

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

      // Create invoice if order is paid (total = 0 from credit memo/discount)
      if (paymentStatus === "paid" && finalTotal === 0) {
        console.log("🧾 Creating invoice for paid order (fully discounted - no payment required)");
        // Use originalTotal (before discount) or subtotal for invoice amount
        const originalSubtotal = orderData.originalTotal || orderData.subtotal || 0;
        await createInvoiceForOrder(insertedOrder, originalSubtotal, orderData.tax || 0);
        
        // Apply credit memo if used
        const appliedDiscounts = orderData.appliedDiscounts || [];
        for (const discount of appliedDiscounts) {
          if (discount.type === "credit_memo" && discount.creditMemoId) {
            console.log("💳 Applying credit memo:", discount.creditMemoId, "Amount:", discount.amount);
            const creditMemoResult = await PaymentAdjustmentService.applyCreditMemo(
              discount.creditMemoId,
              insertedOrder.id,
              discount.amount,
              session.user.id
            );
            
            if (!creditMemoResult.success) {
              console.error("❌ Error applying credit memo:", creditMemoResult.error);
            } else {
              console.log("✅ Credit memo applied successfully:", creditMemoResult.data);
            }
          }
        }
      }

      // Handle applied discounts (deduct points, increment offer usage)
      console.log("📦 Applied discounts:", orderData.appliedDiscounts);
      if (orderData.appliedDiscounts && orderData.appliedDiscounts.length > 0) {
        for (const discount of orderData.appliedDiscounts) {
          console.log("🎁 Processing discount:", discount);
          
          // Handle reward points redemption
          if (discount.type === "rewards" && discount.pointsUsed) {
            // Deduct points from pharmacy's profile
            const { data: currentProfile } = await supabase
              .from("profiles")
              .select("reward_points")
              .eq("id", session.user.id)
              .single();

            if (currentProfile) {
              const newPoints = Math.max(0, (currentProfile.reward_points || 0) - discount.pointsUsed);
              await supabase
                .from("profiles")
                .update({ reward_points: newPoints })
                .eq("id", session.user.id);

              // Log reward transaction
              await supabase
                .from("reward_transactions")
                .insert({
                  user_id: session.user.id,
                  points: -discount.pointsUsed,
                  transaction_type: "redeem",
                  description: `Redeemed ${discount.pointsUsed} points for order ${newOrderId}`,
                  reference_type: "order",
                  reference_id: insertedOrder.id,
                });
              
              console.log(`✅ Deducted ${discount.pointsUsed} points from pharmacy ${session.user.id}`);
            }
          }

          // Handle promo code / offer usage
          if ((discount.type === "promo" || discount.type === "offer") && discount.offerId) {
            // Increment used_count on the offer
            const { data: offer } = await supabase
              .from("offers")
              .select("used_count")
              .eq("id", discount.offerId)
              .single();

            if (offer) {
              await supabase
                .from("offers")
                .update({ used_count: (offer.used_count || 0) + 1 })
                .eq("id", discount.offerId);
              
              console.log(`✅ Incremented offer usage for offer ${discount.offerId}`);
            }
          }

          // Handle redeemed reward usage - mark as used
          if (discount.type === "redeemed_reward" && discount.redemptionId) {
            console.log("🔄 Marking redemption as used:", discount.redemptionId);
            const { error: updateError } = await supabase
              .from("reward_redemptions")
              .update({ 
                status: "used",
                used_at: new Date().toISOString(),
                used_in_order_id: insertedOrder.id
              })
              .eq("id", discount.redemptionId);
            
            if (updateError) {
              console.error("❌ Error marking redemption as used:", updateError);
            } else {
              console.log("✅ Marked reward redemption as used:", discount.redemptionId);
            }
          }
        }
      }

      // Award reward points for the order (only for non-credit orders and if total > 0)
      if (paymentMethod !== "credit" && insertedOrder.id && finalTotal > 0) {
        try {
          const rewardResult = await awardOrderPoints(
            session.user.id,
            insertedOrder.id,
            finalTotal,
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
          totalAmount: finalTotal,
          status: orderStatus,
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
      if (paymentMethod === "credit" && finalTotal > 0) {
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("credit_used")
          .eq("id", session.user.id)
          .single();

        const newCreditUsed = (customerProfile?.credit_used || 0) + finalTotal;

        await supabase
          .from("profiles")
          .update({ credit_used: newCreditUsed })
          .eq("id", session.user.id);
      }

      console.log("Order created successfully:", insertedOrder);

      // Show success message
      const successMessage = finalTotal === 0 
        ? `Order ${newOrderId} has been created (fully discounted - no payment required)`
        : `Order ${newOrderId} has been created and is ready for processing`;

      toast({
        title: "Order Created Successfully",
        description: successMessage,
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
            // Pass discount information
            appliedDiscounts: pendingOrderData.appliedDiscounts || [],
            totalDiscount: pendingOrderData.totalDiscount || 0,
          }}
          form={null}
          pId={currentUserId}
          setIsCus={() => {}}
          isCus={false}
          orderTotal={Math.max(0, (pendingOrderData.total || 0) - (pendingOrderData.totalDiscount || 0))}
          orderSubtotal={pendingOrderData.subtotal}
          orderTax={pendingOrderData.tax}
          orderShipping={pendingOrderData.shipping}
          discountAmount={pendingOrderData.totalDiscount || 0}
          discountDetails={pendingOrderData.appliedDiscounts || []}
        />
      )}
    </DashboardLayout>
  );
}
