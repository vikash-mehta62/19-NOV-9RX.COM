import { DashboardLayout } from "@/components/DashboardLayout";
import { QuickOrderCreation } from "@/components/orders/QuickOrderCreation";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import { useCart } from "@/hooks/use-cart";
import { OrderActivityService } from "@/services/orderActivityService";

export default function QuickOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearCart } = useCart();

  const handleOrderComplete = async (orderData: any) => {
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
        customerInfo: customerInfo,
        shippingAddress: shippingAddressData,
        items: items,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        payment_method: "manual",
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
      } catch (activityError) {
        console.error("Failed to log order creation activity:", activityError);
      }

      // Clear cart
      await clearCart();

      toast({
        title: "Order Created Successfully!",
        description: `Order ${orderId} has been created`,
      });

      // Navigate to orders list
      navigate("/admin/orders");
    } catch (error: any) {
      console.error("Quick order error:", error);
      toast({
        title: "Error Creating Order",
        description: error.message || "Something went wrong",
        variant: "destructive",
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
