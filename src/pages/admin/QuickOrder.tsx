import { DashboardLayout } from "@/components/DashboardLayout";
import { QuickOrderCreation } from "@/components/orders/QuickOrderCreation";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import { useCart } from "@/hooks/use-cart";
import { OrderActivityService } from "@/services/orderActivityService";
import { detectCardType, logPaymentTransaction, processPayment } from "@/services/paymentService";
import axios from "../../../axiosconfig";

export default function QuickOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearCart } = useCart();

  const splitName = (fullName: string) => {
    const trimmed = String(fullName || "").trim();
    if (!trimmed) {
      return { firstName: "Customer", lastName: "Customer" };
    }

    const parts = trimmed.split(/\s+/);
    return {
      firstName: parts[0] || "Customer",
      lastName: parts.slice(1).join(" ") || parts[0] || "Customer",
    };
  };

  const handleOrderComplete = async (orderData: any) => {
    let createdOrderNumber: string | null = null;

    try {
      console.log("Quick Order Data:", orderData);

      // Generate order ID
      const orderId = await generateOrderId();

      // Prepare items array
      const items = orderData.cartItems.map((item: any) => ({
        product_id: item.productId,
        name: item.name,
        sku: item.sku || "",
        image: item.image || "",
        quantity: item.sizes?.reduce((sum: number, s: any) => sum + s.quantity, 0) || item.quantity || 1,
        price: item.price || 0,
        sizes: item.sizes || [],
        notes: item.notes || item.description || "",
      }));

      // Calculate totals
      const subtotal = orderData.subtotal || 0;
      const taxAmount = orderData.tax || 0;
      const shippingCost = orderData.shipping || 0;
      const totalAmount = orderData.total || 0;

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
        fullName: orderData.shippingAddress?.fullName || orderData.customer?.name || "",
        email: orderData.shippingAddress?.email || orderData.customer?.email || "",
        phone: orderData.shippingAddress?.phone || orderData.customer?.phone || "",
        address: {
          street: orderData.shippingAddress?.street || "",
          city: orderData.shippingAddress?.city || "",
          state: orderData.shippingAddress?.state || "",
          zip_code: orderData.shippingAddress?.zip_code || "",
        },
      };

      // Prepare order object matching database schema
      const orderPayload = {
        order_number: orderId,
        profile_id: orderData.customerId,
        location_id: orderData.customerId,
        order_type: "quick_order",
        customerInfo: customerInfo,
        shippingAddress: shippingAddressData,
        items: items,
        total_amount: totalAmount,
        paid_amount: 0,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        processing_fee_amount: 0,
        payment_method: orderData.paymentMethod || "manual",
        notes: orderData.specialInstructions || "",
        purchase_number_external: orderData.poNumber || "",
        status: "new",
        payment_status: "pending",
        customization: false,
        void: false,
        discount_amount: 0,
        discount_details: [],
      };

      // Insert order
      const { data: insertedOrder, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderError) {
        console.error("Order insert error:", orderError);
        throw new Error(orderError.message);
      }

      createdOrderNumber = orderId;

      let paymentResult: Awaited<ReturnType<typeof processPayment>> | null = null;
      let paymentProcessed = false;

      if (orderData.paymentMethod === "card" || orderData.paymentMethod === "ach") {
        const name = splitName(
          orderData.paymentMethod === "card"
            ? orderData.paymentDetails?.cardholderName || orderData.customer?.name || ""
            : orderData.paymentDetails?.nameOnAccount || orderData.customer?.name || ""
        );

        const billing = {
          firstName: name.firstName,
          lastName: name.lastName,
          address: orderData.billingAddress?.street || "",
          city: orderData.billingAddress?.city || "",
          state: orderData.billingAddress?.state || "",
          zip: orderData.billingAddress?.zip_code || "",
          country: "USA",
        };

        paymentResult = await processPayment(
          orderData.paymentMethod === "card"
            ? {
                payment: {
                  type: "card",
                  cardNumber: String(orderData.paymentDetails?.cardNumber || "").replace(/\s/g, ""),
                  expirationDate: String(orderData.paymentDetails?.expirationDate || "").replace("/", ""),
                  cvv: String(orderData.paymentDetails?.cvv || ""),
                  cardholderName: String(orderData.paymentDetails?.cardholderName || orderData.customer?.name || ""),
                },
                amount: totalAmount,
                chargedAmount: totalAmount,
                appliedAmount: totalAmount,
                processingFeeAmount: 0,
                invoiceNumber: orderId,
                orderId: insertedOrder.id,
                customerEmail: orderData.customer?.email,
                billing,
              }
            : {
                payment: {
                  type: "ach",
                  accountType: orderData.paymentDetails?.accountType || "checking",
                  routingNumber: String(orderData.paymentDetails?.routingNumber || ""),
                  accountNumber: String(orderData.paymentDetails?.accountNumber || ""),
                  nameOnAccount: String(orderData.paymentDetails?.nameOnAccount || orderData.customer?.name || ""),
                  echeckType: "WEB",
                },
                amount: totalAmount,
                chargedAmount: totalAmount,
                appliedAmount: totalAmount,
                processingFeeAmount: 0,
                invoiceNumber: orderId,
                orderId: insertedOrder.id,
                customerEmail: orderData.customer?.email,
                billing,
              }
        );

        await logPaymentTransaction(
          orderData.customerId,
          insertedOrder.id,
          null,
          "auth_capture",
          totalAmount,
          {
            success: !!paymentResult?.success,
            transactionId: paymentResult?.transactionId,
            authCode: paymentResult?.authCode,
            message: paymentResult?.message || paymentResult?.error || "Payment attempted",
            errorCode: paymentResult?.errorCode,
            errorMessage: paymentResult?.error,
          },
          orderData.paymentMethod === "card" ? "card" : "ach",
          orderData.paymentMethod === "card" ? String(orderData.paymentDetails?.cardNumber || "").replace(/\s/g, "").slice(-4) : undefined,
          orderData.paymentMethod === "card" ? detectCardType(String(orderData.paymentDetails?.cardNumber || "")) : undefined
        );

        if (!paymentResult?.success) {
          throw new Error(paymentResult?.error || paymentResult?.message || "Payment failed");
        }

        const { error: paymentUpdateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            payment_method: orderData.paymentMethod,
            paid_amount: totalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", insertedOrder.id);

        if (paymentUpdateError) {
          throw new Error(paymentUpdateError.message);
        }

        paymentProcessed = true;
      }

      // Log order creation activity
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await OrderActivityService.logOrderCreation({
          orderId: insertedOrder.id,
          orderNumber: orderId,
          totalAmount: totalAmount,
          status: "new",
          paymentMethod: "manual",
          performedBy: session?.user?.id,
          performedByName: session?.user?.user_metadata?.first_name || "Admin",
          performedByEmail: session?.user?.email,
        });

        if (paymentProcessed && paymentResult?.transactionId) {
          await OrderActivityService.logPaymentReceived({
            orderId: insertedOrder.id,
            orderNumber: orderId,
            amount: totalAmount,
            chargedAmount: totalAmount,
            processingFeeAmount: 0,
            paymentMethod: orderData.paymentMethod,
            paymentId: paymentResult.transactionId,
            performedBy: session?.user?.id,
            performedByName: session?.user?.user_metadata?.first_name || "Admin",
            performedByEmail: session?.user?.email,
          });
        }
      } catch (activityError) {
        console.error("Failed to log order creation activity:", activityError);
      }

      // Send order confirmation email (same behavior as create-order flow)
      try {
        const { data: customerProfileData } = await supabase
          .from("profiles")
          .select("email_notifaction, order_updates")
          .eq("id", orderData.customerId)
          .single();

        if (customerProfileData?.email_notifaction || customerProfileData?.order_updates) {
          const emailPayload = {
            id: insertedOrder.id,
            order_number: orderId,
            customerInfo: {
              name: orderData.customer?.name || "",
              email: orderData.customer?.email || "",
              phone: orderData.customer?.phone || "",
            },
            items,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            shipping_cost: shippingCost,
            payment_method: orderData.paymentMethod || "manual",
            payment_status: paymentProcessed ? "paid" : "pending",
            status: "new",
            shippingAddress: shippingAddressData,
          };

          await axios.post("/order-place", emailPayload);
          console.log("Quick order confirmation email sent");
        } else {
          console.log("Quick order email notification disabled for this customer");
        }
      } catch (emailError) {
        console.error("Failed to send quick order confirmation email:", emailError);
        // Don't throw - order creation succeeded
      }

      // Clear cart
      await clearCart();

      toast({
        title: paymentProcessed ? "Order Created And Paid" : "Order Created Successfully!",
        description: paymentProcessed
          ? `Order ${orderId} was created and payment was captured`
          : `Order ${orderId} has been created`,
      });

      // Navigate to orders list
      navigate("/admin/orders");
    } catch (error: any) {
      console.error("Quick order error:", error);
      toast({
        title: createdOrderNumber ? "Order Created, Payment Failed" : "Error Creating Order",
        description: createdOrderNumber
          ? `Order ${createdOrderNumber} was created, but payment could not be completed: ${error.message || "Unknown error"}`
          : error.message || "Something went wrong",
        variant: createdOrderNumber ? "default" : "destructive",
      });
    }
  };

  const handleCancel = () => {
    navigate("/admin/orders");
  };

  return (
    <DashboardLayout role="admin">
      <QuickOrderCreation
        onComplete={handleOrderComplete}
        onCancel={handleCancel}
      />
    </DashboardLayout>
  );
}
