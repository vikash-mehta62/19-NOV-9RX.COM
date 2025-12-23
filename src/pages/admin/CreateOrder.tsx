import { DashboardLayout } from "@/components/DashboardLayout";
import { OrderCreationWizard } from "@/components/orders/wizard/OrderCreationWizard";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import { useState, useEffect } from "react";
import CreateOrderPaymentForm from "@/components/CreateOrderPayment";
import { OrderActivityService } from "@/services/orderActivityService";

// Read preselected customer data synchronously before component renders
const getPreselectedCustomerData = () => {
  try {
    const data = sessionStorage.getItem("preselectedCustomer");
    if (data) {
      const parsed = JSON.parse(data);
      sessionStorage.removeItem("preselectedCustomer"); // Clear after reading
      console.log("Preselected customer data loaded:", parsed);
      return parsed;
    }
  } catch (e) {
    console.error("Error parsing preselected customer data:", e);
  }
  return null;
};

export default function CreateOrder() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { toast } = useToast();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [existingOrderData, setExistingOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Read preselected data synchronously on first render
  const [preselectedCustomerData] = useState<any>(() => orderId ? null : getPreselectedCustomerData());
  const isEditMode = !!orderId;

  // Load existing order data if in edit mode
  useEffect(() => {
    const loadOrderData = async () => {
      if (!orderId) return;

      setIsLoading(true);
      try {
        const { data: orderData, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (error) throw error;

        if (orderData) {
          console.log("Loading order data:", orderData);
          
          // Get customer profile for tax and shipping info
          const { data: customerProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", orderData.location_id || orderData.profile_id)
            .single();

          // Set tax and shipping in sessionStorage
          if (customerProfile) {
            sessionStorage.setItem("taxper", (customerProfile.taxPercantage || 0).toString());
            sessionStorage.setItem("shipping", (customerProfile.freeShipping || false).toString());
          }

          // Transform order data to wizard format
          const transformedData = {
            orderId: orderData.id, // Store original order ID
            customer: {
              id: orderData.location_id || orderData.profile_id,
              name: orderData.customerInfo?.name || "",
              email: orderData.customerInfo?.email || "",
              phone: orderData.customerInfo?.phone || "",
              type: orderData.customerInfo?.type || "Pharmacy",
              company_name: customerProfile?.company_name || "",
              tax_percentage: customerProfile?.taxPercantage || 0,
              freeShipping: customerProfile?.freeShipping || false,
            },
            customerId: orderData.location_id || orderData.profile_id,
            billingAddress: {
              company_name: orderData.customerInfo?.address?.company_name || customerProfile?.company_name || "",
              attention: orderData.customerInfo?.address?.attention || "",
              street: orderData.customerInfo?.address?.street || "",
              city: orderData.customerInfo?.address?.city || "",
              state: orderData.customerInfo?.address?.state || "",
              zip_code: orderData.customerInfo?.address?.zip_code || "",
            },
            shippingAddress: {
              fullName: orderData.shippingAddress?.fullName || orderData.customerInfo?.name || "",
              email: orderData.shippingAddress?.email || orderData.customerInfo?.email || "",
              phone: orderData.shippingAddress?.phone || orderData.customerInfo?.phone || "",
              street: orderData.shippingAddress?.address?.street || "",
              city: orderData.shippingAddress?.address?.city || "",
              state: orderData.shippingAddress?.address?.state || "",
              zip_code: orderData.shippingAddress?.address?.zip_code || "",
            },
            cartItems: orderData.items || [],
            paymentMethod: orderData.payment_method || "card",
            specialInstructions: orderData.notes || "",
            poNumber: orderData.purchase_number_external || "",
            subtotal: orderData.total_amount - orderData.tax_amount - orderData.shipping_cost,
            tax: orderData.tax_amount,
            shipping: orderData.shipping_cost,
            total: orderData.total_amount,
          };

          console.log("Transformed data:", transformedData);
          setExistingOrderData(transformedData);
        }
      } catch (error) {
        console.error("Error loading order:", error);
        toast({
          title: "Error",
          description: "Failed to load order data",
          variant: "destructive",
        });
        navigate("/admin/orders");
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderData();
  }, [orderId, navigate, toast]);

  const handleComplete = async (orderData: any) => {
    console.log("Order completed:", orderData);
    console.log("Customer ID from orderData:", orderData.customerId);
    console.log("Customer object from orderData:", orderData.customer);
    console.log("Applied discounts:", orderData.appliedDiscounts);
    
    
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
console.log(sessionStorage.getItem("userType") )
console.log(session)

const profileID =
        sessionStorage.getItem("userType") === "admin"
          ? orderData.customerId : session.user.id;
    


      // Check if we're in edit mode
      if (isEditMode && orderId) {
        // UPDATE EXISTING ORDER
        const updateData = {
          location_id: orderData.customerId,
          customerInfo: {
            name: orderData.customer?.name || "",
            email: orderData.customer?.email || "",
            phone: orderData.customer?.phone || "",
            type: orderData.customer?.type || "Pharmacy",
            address: orderData.billingAddress || {},
          },
          shippingAddress: {
            fullName: orderData.shippingAddress?.fullName || "",
            email: orderData.shippingAddress?.email || "",
            phone: orderData.shippingAddress?.phone || "",
            address: orderData.shippingAddress || {},
          },
          items: orderData.cartItems,
          total_amount: orderData.total,
          tax_amount: orderData.tax,
          shipping_cost: orderData.shipping,
          payment_method: orderData.paymentMethod,
          notes: orderData.specialInstructions,
          purchase_number_external: orderData.poNumber,
        };

        // Get old order data for comparison
        const { data: oldOrderData } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        const { error: updateError } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId);

        if (updateError) throw updateError;

        // Log order update activity
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", user?.id || "")
          .single();

        await OrderActivityService.logOrderUpdate({
          orderId: orderId,
          orderNumber: oldOrderData?.order_number || "",
          description: "Order details updated ",
          oldData: oldOrderData,
          newData: updateData,
          performedBy: user?.id,
          performedByName: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : undefined,
          performedByEmail: userProfile?.email,
        });

        // Update invoice if exists
        const { data: invoiceData } = await supabase
          .from("invoices")
          .select("id")
          .eq("order_id", orderId)
          .maybeSingle();

        if (invoiceData) {
          await supabase
            .from("invoices")
            .update({
              amount: orderData.total,
              tax_amount: orderData.tax,
              total_amount: orderData.total,
              items: orderData.cartItems,
              customer_info: updateData.customerInfo,
              shipping_info: updateData.shippingAddress,
              shippin_cost: orderData.shipping,
              subtotal: orderData.total,
            })
            .eq("id", invoiceData.id);
        }

        toast({
          title: "Order Updated Successfully",
          description: "The order has been updated",
        });

        navigate("/admin/orders");
        return;
      }

      // CREATE NEW ORDER (existing logic)
      // Check payment method
      const paymentMethod = orderData.paymentMethod;
      
      // If payment method is "card", open payment modal instead of creating order directly
      if (paymentMethod === "card") {
        // Store order data and open payment modal
        console.log("Opening payment modal with orderData:", orderData);
        console.log("Customer ID being passed to payment modal:", orderData.customerId);
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
        profile_id: profileID,
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
        // Store discount information
        discount_amount: orderData.totalDiscount || 0,
        discount_details: orderData.appliedDiscounts || [],
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

      // Handle applied discounts (deduct points, increment offer usage)
      if (orderData.appliedDiscounts && orderData.appliedDiscounts.length > 0) {
        for (const discount of orderData.appliedDiscounts) {
          // Handle reward points redemption
          if (discount.type === "rewards" && discount.pointsUsed && orderData.customerId) {
            // Deduct points from user's profile
            const { data: currentProfile } = await supabase
              .from("profiles")
              .select("reward_points")
              .eq("id", orderData.customerId)
              .single();

            if (currentProfile) {
              const newPoints = Math.max(0, (currentProfile.reward_points || 0) - discount.pointsUsed);
              await supabase
                .from("profiles")
                .update({ reward_points: newPoints })
                .eq("id", orderData.customerId);

              // Log reward transaction
              await supabase
                .from("reward_transactions")
                .insert({
                  user_id: orderData.customerId,
                  points: -discount.pointsUsed,
                  transaction_type: "redeem",
                  description: `Redeemed ${discount.pointsUsed} points for order ${newOrderId}`,
                  reference_type: "order",
                  reference_id: insertedOrder.id,
                });
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
            }
          }
        }
      }

      // Log order creation activity
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user?.id || "")
        .single();

      await OrderActivityService.logOrderCreation({
        orderId: insertedOrder.id,
        orderNumber: newOrderId,
        totalAmount: orderData.total,
        status: orderToSubmit.status,
        paymentMethod: paymentMethod,
        performedBy: user?.id,
        performedByName: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : undefined,
        performedByEmail: userProfile?.email,
      });

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
        description: `Order ${newOrderId} has been created and is ready for processing`,
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        {isEditMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900">Edit Order Mode</h2>
            <p className="text-sm text-blue-700 mt-1">
              You can edit addresses and products. Customer selection is locked.
            </p>
          </div>
        )}
        {preselectedCustomerData && !isEditMode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-green-900">
              Creating Order for: {preselectedCustomerData.customer?.name || preselectedCustomerData.customer?.company_name}
            </h2>
            <p className="text-sm text-green-700 mt-1">
              Customer and addresses are pre-filled. You can start adding products.
            </p>
          </div>
        )}
      </div>
      <OrderCreationWizard
        initialData={preselectedCustomerData || existingOrderData}
        isEditMode={isEditMode}
        isPharmacyMode={!!preselectedCustomerData?.skipToProducts}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
      
      {/* Payment Modal */}
      {isPaymentModalOpen && pendingOrderData && (
        <>
          {console.log("Rendering payment modal with pId:", pendingOrderData.customerId)}
          {console.log("Full pendingOrderData:", pendingOrderData)}
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
            orderTotal={pendingOrderData.total}
            orderSubtotal={pendingOrderData.subtotal}
            orderTax={pendingOrderData.tax}
            orderShipping={pendingOrderData.shipping}
          />
        </>
      )}
    </DashboardLayout>
  );
}
