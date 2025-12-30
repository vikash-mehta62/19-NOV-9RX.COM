import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { OrderCreationWizard } from "@/components/orders/wizard/OrderCreationWizard";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { OrderActivityService } from "@/services/orderActivityService";
import { awardOrderPoints } from "@/services/rewardsService";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import CreateOrderPaymentForm from "@/components/CreateOrderPayment";
import PaymentAdjustmentService from "@/services/paymentAdjustmentService";

// Invoice creation function for paid orders (when total is 0)
const createInvoiceForOrder = async (order: any, totalAmount: number, taxAmount: number) => {
  try {
    console.log(`🧾 Creating invoice for paid order: ${order.id}`);

    // Get invoice number
    const year = new Date().getFullYear();
    const { data: inData, error: fetchError } = await supabase
      .from("centerize_data")
      .select("id, invoice_no, invoice_start")
      .order("id", { ascending: false })
      .limit(1);

    if (fetchError) throw new Error(fetchError.message);

    const newInvNo = (inData?.[0]?.invoice_no || 0) + 1;
    const invoiceStart = inData?.[0]?.invoice_start || "INV";

    // Update invoice_no to next
    if (inData?.[0]?.id) {
      const { error: updateError } = await supabase
        .from("centerize_data")
        .update({ invoice_no: newInvNo })
        .eq("id", inData[0].id);

      if (updateError) throw new Error(updateError.message);
    }

    // Create invoice number
    const invoiceNumber = `${invoiceStart}-${year}${newInvNo.toString().padStart(6, "0")}`;

    // Calculate due date
    const estimatedDeliveryDate = new Date();
    const dueDate = new Date(estimatedDeliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

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

    // Insert invoice
    const { error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoiceData);

    if (invoiceError) throw new Error(invoiceError.message);

    console.log(`✅ Invoice Created Successfully: ${invoiceNumber}`);

    // Update order to mark invoice as created
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        invoice_created: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (orderUpdateError) throw new Error(orderUpdateError.message);

    console.log("🟢 Order updated with invoice_created = true");
    return invoiceNumber;
  } catch (err: any) {
    console.error("❌ Invoice create error:", err.message);
    throw new Error(err.message);
  }
};

// Fetch customer locations for group users - Using original logic
const fetchCustomerLocation = async (userId: string) => {
  try {
    console.log("Fetching locations for group user:", userId);
    
    // Original logic: Fetch profiles where group_id matches the user ID
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("group_id", userId);

    if (error) {
      console.error("Failed to fetch customer information:", error);
      throw new Error("Failed to fetch customer information: " + error.message);
    }

    if (!data || data.length === 0) {
      console.log("No locations found with group_id:", userId);
      return [];
    }

    console.log("Found locations:", data.length);
    return data;
  } catch (error) {
    console.error("Error fetching customer info:", error);
    return [];
  }
};

export default function GroupOrder() {
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>("");
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [wizardInitialData, setWizardInitialData] = useState<any>(null);
  const { toast } = useToast();
  const userProfile = useSelector(selectUserProfile);
  const navigate = useNavigate();
  const { clearCart } = useCart();

  // Fetch pharmacies for group users
  useEffect(() => {
    const fetchPharmacies = async () => {
      if (!userProfile?.id) return;

      try {
        const locations = await fetchCustomerLocation(userProfile.id);
        
        // Format locations for display - Using original logic
        const formattedPharmacies = await Promise.all(
          locations.map(async (location: any, index: number) => {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

            // Fetch orders count from Supabase
            const { count, error } = await supabase
              .from("orders")
              .select("*", { count: "exact", head: true })
              .eq("profile_id", location.id)
              .gte("created_at", startOfMonth)
              .lte("created_at", endOfMonth);

            if (error) {
              console.error("Error fetching count:", error);
            }

            // Extract address information
            const billingAddr = location.billing_address || {};
            const addressParts = [
              billingAddr.street1 || billingAddr.street || "N/A",
              billingAddr.city || "N/A",
              billingAddr.zip_code || "N/A"
            ].filter(part => part !== "N/A");

            return {
              id: location.id || `temp-${index + 1}`,
              name: location.display_name?.trim() || 
                    location.first_name?.trim() || 
                    location.company_name?.trim() || 
                    `Pharmacy ${index + 1}`,
              address: addressParts.length > 0 ? addressParts.join(", ") : "Address not available",
              countryRegion: location.countryRegion || "N/A",
              phone: location.phone || "N/A",
              faxNumber: location.faxNumber || "N/A",
              contact_email: location.email || "N/A",
              contact_phone: location.mobile_phone || location.work_phone || location.phone || "N/A",
              created_at: location.created_at ? new Date(location.created_at).toISOString() : "N/A",
              updated_at: location.updated_at ? new Date(location.updated_at).toISOString() : "N/A",
              profile_id: location.profile_id || location.id || "N/A",
              type: location.type || "Pharmacy",
              status: location.status || "active",
              manager: location.manager || "N/A",
              ordersThisMonth: count || 0,
              // Additional fields for order creation
              billing_address: billingAddr,
              email: location.email,
              mobile_phone: location.mobile_phone || location.phone,
              first_name: location.first_name || location.display_name?.split(' ')[0] || 'Customer',
            };
          })
        );
        
        console.log("Final formatted pharmacies:", formattedPharmacies);
        setPharmacies(formattedPharmacies);
      } catch (error) {
        console.error("Error fetching pharmacies:", error);
        toast({
          title: "Error",
          description: "Failed to load pharmacy locations",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPharmacies();
  }, [userProfile, toast]);

  const handlePharmacySelect = async (pharmacyId: string) => {
    setSelectedPharmacy(pharmacyId);
    
    const selectedPharmacyData = pharmacies.find(p => p.id === pharmacyId);
    if (!selectedPharmacyData) {
      console.error("Pharmacy not found for ID:", pharmacyId);
      return;
    }

    try {
      // Fetch complete pharmacy profile data
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", selectedPharmacyData.id)
        .maybeSingle();

      if (error) {
        console.error("Database Error - Failed to fetch profile:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        console.error("User profile not found for ID:", selectedPharmacyData.id);
        return;
      }

      // Set tax and shipping in sessionStorage
      sessionStorage.setItem("taxper", (data.taxPercantage || 0).toString());
      sessionStorage.setItem("shipping", (data.freeShipping || false).toString());

      // Store selected pharmacy data in session storage for order wizard
      sessionStorage.setItem("selectedPharmacyId", pharmacyId);
      sessionStorage.setItem("selectedPharmacyData", JSON.stringify({
        ...selectedPharmacyData,
        profileData: data
      }));

      // Create initial data for OrderCreationWizard with pharmacy's address
      const billingAddr = (data.billing_address as any) || {};
      const shippingAddr = (data.shipping_address as any) || (data.billing_address as any) || {};
      
      const initialData = {
        customer: {
          id: data.id,
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.display_name || data.company_name || "",
          email: data.email || "",
          phone: data.mobile_phone || data.work_phone || "",
          type: data.type || "Pharmacy",
          company_name: data.company_name || "",
          tax_percentage: data.taxPercantage || 0,
          freeShipping: data.freeShipping || false,
        },
        customerId: data.id,
        billingAddress: {
          company_name: data.company_name || billingAddr.company_name || "",
          attention: billingAddr.attention || "",
          street: billingAddr.street1 || billingAddr.street || "",
          city: billingAddr.city || "",
          state: billingAddr.state || "",
          zip_code: billingAddr.zip_code || "",
        },
        shippingAddress: {
          fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.display_name || "",
          email: data.email || "",
          phone: data.mobile_phone || data.work_phone || "",
          street: shippingAddr.street1 || shippingAddr.street || billingAddr.street1 || billingAddr.street || "",
          city: shippingAddr.city || billingAddr.city || "",
          state: shippingAddr.state || billingAddr.state || "",
          zip_code: shippingAddr.zip_code || billingAddr.zip_code || "",
        },
        cartItems: [],
        paymentMethod: "card",
        specialInstructions: "",
        poNumber: "",
      };

      console.log("Initial data for wizard:", initialData);
      setWizardInitialData(initialData);

      // Show the order wizard
      setShowOrderWizard(true);
    } catch (err) {
      console.error("Error in handlePharmacySelect:", err);
      toast({
        title: "Error",
        description: "Failed to load pharmacy data",
        variant: "destructive",
      });
    }
  };

  // Handle order completion - Same logic as pharmacy
  const handleOrderComplete = async (orderData: any) => {
    try {
      console.log("🔵 Group order completion started:", orderData);
      console.log("🔵 Order total:", orderData.total);
      console.log("🔵 Total discount:", orderData.totalDiscount);
      console.log("🔵 Final total (after discount):", orderData.total - (orderData.totalDiscount || 0));
      
      if (!userProfile?.id) {
        toast({
          title: "Error",
          description: "User profile not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Get selected pharmacy data
      const selectedPharmacyData = pharmacies.find(p => p.id === selectedPharmacy);
      if (!selectedPharmacyData) {
        toast({
          title: "Error", 
          description: "Selected pharmacy not found",
          variant: "destructive",
        });
        return;
      }

      // Check payment method - Same logic as pharmacy
      const paymentMethod = orderData.paymentMethod;
      
      // Calculate final total after discounts
      const finalTotal = Math.max(0, (orderData.total || 0) - (orderData.totalDiscount || 0));
      
      console.log("🔵 Payment method:", paymentMethod);
      console.log("🔵 Final total for payment check:", finalTotal);
      
      // If payment method is "card", open payment modal
      // BUT if total is 0, skip payment modal and create order directly (same as pharmacy)
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

      // If payment method is "credit", check credit limit (same as pharmacy)
      if (paymentMethod === "credit") {
        const { data: customerProfile, error: profileError } = await supabase
          .from("profiles")
          .select("credit_used, credit_limit")
          .eq("id", selectedPharmacyData.id)
          .single();

        if (profileError) {
          console.error("Error fetching customer profile:", profileError);
          throw new Error(profileError.message);
        }

        const creditUsed = Number(customerProfile.credit_used || 0);
        const creditLimit = Number(customerProfile.credit_limit || 0);
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

      // Continue with order creation for non-card payments, zero total, or credit payments
      await createGroupOrder(orderData, selectedPharmacyData);

    } catch (error) {
      console.error("Group order completion error:", error);
      toast({
        title: "Order Creation Failed",
        description: error instanceof Error ? error.message : "An error occurred while creating the order",
        variant: "destructive",
      });
    }
  };

  // Separate function to create the actual order - Same logic as pharmacy
  const createGroupOrder = async (orderData: any, selectedPharmacyData: any) => {
    try {
      console.log("🔵 Group Order creation started:", orderData);

      // Generate order ID - Same as pharmacy
      const newOrderId = await generateOrderId();
      
      if (!newOrderId) {
        throw new Error("Failed to generate order ID");
      }

      // Calculate final total after discounts
      const finalTotal = Math.max(0, (orderData.total || 0) - (orderData.totalDiscount || 0));
      
      // Determine payment status based on total and payment method
      let paymentStatus = "pending";
      let orderStatus = "new";
      
      if (finalTotal === 0) {
        // If total is 0 (fully discounted), mark as paid
        paymentStatus = "paid";
        orderStatus = "new";
      } else if (orderData.paymentMethod === "credit") {
        paymentStatus = "pending";
        orderStatus = "credit_approval_processing";
      }

      // Prepare customer info - Same as pharmacy
      const customerInfo = {
        name: selectedPharmacyData.name,
        email: selectedPharmacyData.email || selectedPharmacyData.contact_email,
        phone: selectedPharmacyData.mobile_phone || selectedPharmacyData.contact_phone,
        type: "Pharmacy",
        address: {
          street: selectedPharmacyData.billing_address?.street || "",
          city: selectedPharmacyData.billing_address?.city || "",
          state: selectedPharmacyData.billing_address?.state || "",
          zip_code: selectedPharmacyData.billing_address?.zip_code || "",
        },
      };

      // Prepare shipping address - Same as pharmacy
      const shippingAddressData = {
        fullName: selectedPharmacyData.name,
        email: selectedPharmacyData.email || selectedPharmacyData.contact_email,
        phone: selectedPharmacyData.mobile_phone || selectedPharmacyData.contact_phone,
        address: {
          street: selectedPharmacyData.billing_address?.street || "",
          city: selectedPharmacyData.billing_address?.city || "",
          state: selectedPharmacyData.billing_address?.state || "",
          zip_code: selectedPharmacyData.billing_address?.zip_code || "",
        },
      };

      // Prepare order data - Same structure as pharmacy
      const orderToSubmit = {
        order_number: newOrderId,
        profile_id: selectedPharmacyData.id,
        location_id: selectedPharmacyData.id,
        customerInfo: customerInfo,
        shippingAddress: shippingAddressData,
        items: orderData.cartItems,
        total_amount: finalTotal, // Use final total after discounts
        tax_amount: orderData.tax || 0,
        shipping_cost: orderData.shipping || 0,
        payment_method: orderData.paymentMethod,
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

      console.log("Final order data for group:", orderToSubmit);
      console.log("Final total:", finalTotal);
      console.log("Payment status:", paymentStatus);

      // Insert order - Same as pharmacy
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
              selectedPharmacyData.id
            );
            
            if (!creditMemoResult.success) {
              console.error("❌ Error applying credit memo:", creditMemoResult.error);
            } else {
              console.log("✅ Credit memo applied successfully:", creditMemoResult.data);
            }
          }
        }
      }

      // Handle applied discounts (deduct points, increment offer usage) - Same as pharmacy
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
              .eq("id", selectedPharmacyData.id)
              .single();

            if (currentProfile) {
              const newPoints = Math.max(0, (currentProfile.reward_points || 0) - discount.pointsUsed);
              await supabase
                .from("profiles")
                .update({ reward_points: newPoints })
                .eq("id", selectedPharmacyData.id);

              // Log reward transaction
              await supabase
                .from("reward_transactions")
                .insert({
                  user_id: selectedPharmacyData.id,
                  points: -discount.pointsUsed,
                  transaction_type: "redeem",
                  description: `Redeemed ${discount.pointsUsed} points for order ${newOrderId}`,
                  reference_type: "order",
                  reference_id: insertedOrder.id,
                });
              
              console.log(`✅ Deducted ${discount.pointsUsed} points from pharmacy ${selectedPharmacyData.id}`);
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
      if (orderData.paymentMethod !== "credit" && insertedOrder.id && finalTotal > 0) {
        try {
          const rewardResult = await awardOrderPoints(
            selectedPharmacyData.id,
            insertedOrder.id,
            finalTotal,
            newOrderId
          );
          
          if (rewardResult.success && rewardResult.pointsEarned > 0) {
            console.log("✅ Reward points awarded:", rewardResult.pointsEarned);
          }
        } catch (rewardError) {
          console.error("❌ Error awarding reward points:", rewardError);
        }
      }

      // Log order creation activity - Same as pharmacy
      try {
        const activityResult = await OrderActivityService.logOrderCreation({
          orderId: insertedOrder.id,
          orderNumber: newOrderId,
          totalAmount: finalTotal,
          status: orderStatus,
          paymentMethod: orderData.paymentMethod,
          performedBy: userProfile.id,
          performedByName: `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || "Group User",
          performedByEmail: userProfile.email,
        });

        if (!activityResult.success) {
          console.error("❌ Activity logging failed:", activityResult.error);
        }
      } catch (activityError) {
        console.error("❌ Failed to log order creation activity:", activityError);
      }

      // If credit payment, update credit_used - Same as pharmacy
      if (orderData.paymentMethod === "credit" && finalTotal > 0) {
        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("credit_used")
          .eq("id", selectedPharmacyData.id)
          .single();

        const newCreditUsed = (customerProfile?.credit_used || 0) + finalTotal;

        await supabase
          .from("profiles")
          .update({ credit_used: newCreditUsed })
          .eq("id", selectedPharmacyData.id);
      }

      // Clear cart and session data
      await clearCart();
      localStorage.removeItem("cart");
      localStorage.removeItem("cartItems");
      sessionStorage.removeItem("selectedPharmacyId");
      sessionStorage.removeItem("selectedPharmacyData");

      // Show success message - Same as pharmacy
      const successMessage = finalTotal === 0 
        ? `Order ${newOrderId} has been created (fully discounted - no payment required)`
        : `Order ${newOrderId} has been created and is ready for processing`;

      toast({
        title: "Order Created Successfully",
        description: successMessage,
      });

      // Navigate to group orders page
      navigate("/group/orders");

    } catch (error) {
      console.error("Error creating group order:", error);
      toast({
        title: "Error Creating Order",
        description: error instanceof Error ? error.message : "An error occurred while creating the order",
        variant: "destructive",
      });
    }
  };

  // Handle payment modal close - Same as pharmacy
  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    setPendingOrderData(null);
    // Navigate to orders page after payment completion
    navigate("/group/orders");
  };

  if (isLoading) {
    return (
      <DashboardLayout role="group">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </DashboardLayout>
    );
  }

  // If pharmacy is selected, show the order wizard
  if (showOrderWizard && selectedPharmacy) {
    // If payment modal is open, show ONLY the payment form (no DashboardLayout)
    if (isPaymentModalOpen && pendingOrderData) {
      return (
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
          pId={pharmacies.find(p => p.id === selectedPharmacy)?.id || ""}
          setIsCus={() => {}}
          isCus={false}
          orderTotal={Math.max(0, (pendingOrderData.total || 0) - (pendingOrderData.totalDiscount || 0))}
          orderSubtotal={pendingOrderData.subtotal}
          orderTax={pendingOrderData.tax}
          orderShipping={pendingOrderData.shipping}
          discountAmount={pendingOrderData.totalDiscount || 0}
          discountDetails={pendingOrderData.appliedDiscounts || []}
        />
      );
    }

    // Normal wizard view
    return (
      <DashboardLayout role="group">
        <div className="space-y-6">
          {/* Header with selected pharmacy info */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create Group Order</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Order for: {pharmacies.find(p => p.id === selectedPharmacy)?.name}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowOrderWizard(false);
                setSelectedPharmacy("");
                sessionStorage.removeItem("selectedPharmacyId");
                sessionStorage.removeItem("selectedPharmacyData");
              }}
            >
              Change Pharmacy
            </Button>
          </div>

          {/* Order Creation Wizard - Same as Pharmacy/Admin */}
          <OrderCreationWizard 
            userType="group"
            selectedPharmacyId={selectedPharmacy}
            initialData={wizardInitialData}
            isPharmacyMode={true}
            onComplete={handleOrderComplete}
            onCancel={() => {
              setShowOrderWizard(false);
              setSelectedPharmacy("");
              setWizardInitialData(null);
              sessionStorage.removeItem("selectedPharmacyId");
              sessionStorage.removeItem("selectedPharmacyData");
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Pharmacy selection screen
  return (
    <DashboardLayout role="group">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Group Order</h1>
          <p className="text-muted-foreground mt-2">
            Select a pharmacy location to place an order
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Select Pharmacy Location</h2>
                  <p className="text-sm text-gray-600">Choose which pharmacy this order is for</p>
                </div>
              </div>

              {pharmacies.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pharmacy Locations Found</h3>
                  <p className="text-gray-600">
                    No pharmacy locations are associated with your group. Please contact support.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Label htmlFor="pharmacy-select" className="text-base font-medium">
                    Available Pharmacy Locations ({pharmacies.length})
                  </Label>
                  
                  <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
                    <SelectTrigger className="w-full min-h-[80px]">
                      <SelectValue placeholder="Choose a pharmacy location..." />
                    </SelectTrigger>
                    <SelectContent className="max-w-[500px]">
                      {pharmacies.map((pharmacy) => (
                        <SelectItem key={pharmacy.id} value={pharmacy.id} className="py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-base">{pharmacy.name}</span>
                            <span className="text-sm text-gray-500">
                              {pharmacy.address}
                            </span>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                              {pharmacy.contact_email && pharmacy.contact_email !== "N/A" && (
                                <span className="flex items-center gap-1">
                                  <span>📧</span>
                                  <span className="truncate max-w-[180px]">{pharmacy.contact_email}</span>
                                </span>
                              )}
                              {pharmacy.contact_phone && pharmacy.contact_phone !== "N/A" && (
                                <span className="flex items-center gap-1">
                                  <span>📞</span>
                                  <span>{pharmacy.contact_phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    onClick={() => handlePharmacySelect(selectedPharmacy)}
                    disabled={!selectedPharmacy}
                  >
                    Continue to Order Creation
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
