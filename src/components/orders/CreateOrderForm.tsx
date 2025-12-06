import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form } from "@/components/ui/form";
import { OrderFormValues, orderFormSchema } from "./schemas/orderSchema";
import { CustomerSelectionField } from "./fields/CustomerSelectionField";
import { OrderItemsSection } from "./sections/OrderItemsSection";
import { PaymentSection } from "./sections/PaymentSection";
import { ShippingSection } from "./sections/ShippingSection";
import { OrderFormActions } from "./form/OrderFormActions";
import { useLocation, useNavigate } from "react-router-dom";
import {
  generateOrderId,
  calculateOrderTotal,
  generatePurchaseOrderId,
} from "./utils/orderUtils";
import {
  validateOrderItems,
  useOrderValidation,
} from "./form/OrderFormValidation";
import { supabase } from "@/supabaseClient";
import { useDispatch, useSelector } from "react-redux";
import { selectUserProfile } from "../../store/selectors/userSelectors";
import { useCart } from "@/hooks/use-cart";
import axios from "../../../axiosconfig";
import { InvoiceStatus, PaymentMethod } from "../invoices/types/invoice.types";
import CreateOrderPaymentForm from "../CreateOrderPayment";
import { pid } from "process";
import CartItemsPricing from "../CartItemsPricing";
import CustomProductForm from "./Customitems";
import ProductShowcase from "../pharmacy/ProductShowcase";
import { OrderActivityService } from "@/services/orderActivityService";

export interface CreateOrderFormProps {
  initialData?: Partial<OrderFormValues>;
  onFormChange?: (data: Partial<OrderFormValues>) => void;
  isEditing?: boolean;
  poIs?: boolean;
  use?: string;
  locationId?: any;
}

export function CreateOrderForm({
  initialData,
  onFormChange,
  isEditing,
  use,
  locationId,
}: CreateOrderFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orderItems, setOrderItems] = useState([{ id: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const userProfile = useSelector(selectUserProfile);
  const { cartItems, clearCart, addToCart } = useCart();
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isCus, setIsCus] = useState<boolean>(false);
  const [isPriceChange, setIsPriceChange] = useState<boolean>(false);
  const location = useLocation();
  const [poIs, setPoIs] = useState(false);
  console.log(initialData?.customerInfo);
  useEffect(() => {
    if (location.pathname.startsWith("/admin/po")) {
      setPoIs(true);
    } else {
      setPoIs(false);
    }
  }, [location.pathname]);

  console.log(userProfile);
  const [pId, setPId] = useState(initialData?.customerInfo.cusid || "");
  const userTypeRole = sessionStorage.getItem("userType");
  console.log(initialData);
  useEffect(() => {
    setPId(initialData?.customerInfo.cusid || initialData?.customer);
  }, [initialData, userProfile]);

  const totalShippingCost =
    sessionStorage.getItem("shipping") == "true"
      ? 0
      : Math.max(...cartItems.map((item) => item.shipping_cost || 0));

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      id: "", // ✅ Initialize as empty
      customer: pId || userProfile?.id || "",
      date: new Date().toISOString(),
      total: "0",
      status: "new",
      payment_status: "unpaid",
      customization: isCus,
      poAccept: !poIs,

      customerInfo: {
        name:
          initialData?.customerInfo?.name ||
          `${initialData?.customerInfo?.name || ""} ${
            userProfile?.last_name || ""
          }`,
        email: initialData?.customerInfo?.email || "",
        phone: userProfile?.mobile_phone || "",
        type: initialData?.customerInfo?.type || "Pharmacy",
        address: {
          street:
            initialData?.customerInfo?.address?.street ||
            userProfile?.company_name ||
            "",
          city:
            initialData?.customerInfo?.address?.city || userProfile?.city || "",
          state:
            initialData?.customerInfo?.address?.state ||
            userProfile?.state ||
            "",
          zip_code:
            initialData?.customerInfo?.address?.zip_code ||
            userProfile?.zip_code ||
            "",
        },
      },

      shippingAddress: {
        fullName:
          initialData?.customerInfo?.name ||
          `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`,
        email: initialData?.customerInfo?.email || "",
        phone: userProfile?.mobile_phone || "",
        address: {
          street: userProfile?.company_name || "",
          city: userProfile?.city || "",
          state: userProfile?.state || "",
          zip_code: userProfile?.zip_code || "",
        },
      },

      order_number: "",
      items: initialData.items || cartItems,
      shipping: {
        method: "FedEx",
        cost: totalShippingCost,
        trackingNumber: "",
        estimatedDelivery: "",
      },
      payment: {
        method: "card",
        notes: "",
      },
      specialInstructions: "",
      purchase_number_external: "",
      ...initialData,
    },
  });

  // ✅ Fetch and update order ID asynchronously after form initialization
  // useEffect(() => {
  //   const fetchOrderId = async () => {
  //     const orderId = await generateOrderId();
  //     form.setValue("id", orderId); // ✅ Set order ID in form
  //   };

  //   fetchOrderId();
  // }, [form.setValue]);

  // Load pending order items from localStorage if they exist
  useEffect(() => {
    const pendingOrderItems = localStorage.getItem("cartItems");
    if (pendingOrderItems) {
      const items = JSON.parse(pendingOrderItems);
      form.setValue("items", items);
      setOrderItems(items.map((_, index) => ({ id: index + 1 })));
      localStorage.removeItem("pendingOrderItems"); // Clear after loading
    }
  }, [form, cartItems]);

  const { validateForm } = useOrderValidation(form, onFormChange);

  useEffect(() => {
    const subscription = form.watch((data) => {
      setIsValidating(true);
      validateForm(data);
      setIsValidating(false);
    });
    return () => subscription.unsubscribe();
  }, [form, validateForm]);

  function cleanCartItems(cartItems) {
    const cleanedItems = cartItems.map((item) => {
      const updatedSizes = item.sizes.map((size) => ({
        ...size,
        quantity: Number(size.quantity),
        price: Number(size.price),
      }));

      const updatedPrice = updatedSizes.reduce(
        (sum, size) => sum + size.quantity * size.price,
        0
      );

      const updatedQuantity = updatedSizes.reduce(
        (sum, size) => sum + size.quantity,
        0
      );

      return {
        ...item,
        price: parseFloat(updatedPrice.toFixed(2)),
        quantity: updatedQuantity,
        sizes: updatedSizes,
      };
    });

    // ✅ Save to localStorage
    localStorage.setItem("cartItems", JSON.stringify(cleanedItems));

    return cleanedItems;
  }

  // const onSubmit = async (data: OrderFormValues) => {
  //   console.log(cartItems);

  //   try {
  //     setIsSubmitting(true);
  //     console.log("Starting order submission:", data);
  //     const taxper = sessionStorage.getItem("taxper")

  //     const cleanedCartItems = cleanCartItems(cartItems); // ✅ fixed items
  //     // Validate order items
  //     validateOrderItems(data.items);

  //     // Calculate order total
  //     const calculatedTotal = calculateOrderTotal(
  //       cleanedCartItems,
  //       totalShippingCost || 0
  //     );

  //     const newtax = ((calculatedTotal - totalShippingCost) * Number(taxper)) / 100;

  //     console.log(cleanedCartItems)
  //     console.log(calculatedTotal + newtax)

  //     if (userProfile?.id == null) {
  //       toast({
  //         title: "User profile not found",
  //         description: "Please log in to create an order.",
  //         duration: 5000,
  //         variant: "destructive",
  //       });
  //       return;
  //     }

  //     const defaultEstimatedDelivery = new Date();
  //     defaultEstimatedDelivery.setDate(defaultEstimatedDelivery.getDate() + 10);

  //     console.log(pId)

  //     const generateUniqueOrderNumber = () => {
  //       const timestamp = Date.now().toString().slice(-5); // Last 5 digits of time
  //       const random = Math.floor(100 + Math.random() * 900); // 3 digit random number
  //       return `PO-${timestamp}${random}`; // Total 8 digits after 'PO-'
  //     };

  //     // const orderNumber = "DEV-TEST123";
  //     const orderNumber = poIs ? await generatePurchaseOrderId() : await generateOrderId();

  //     if (!userProfile?.id) return
  //     let profileID = userProfile?.id

  //     sessionStorage.getItem('userType') === "admin" ? profileID = data.customer : userProfile?.id
  //     sessionStorage.getItem('userType') === "group" ? profileID = pId : userProfile?.id
  //     console.log(profileID)

  //     const orderData = {
  //       order_number: orderNumber,
  //       profile_id: profileID,
  //       status: data.status,
  //       total_amount: calculatedTotal + newtax,
  //       shipping_cost: totalShippingCost || 0,
  //       tax_amount: newtax,
  //       customization: isCus,
  //       items: cleanedCartItems,
  //       notes: data.specialInstructions,
  //       shipping_method: data.shipping?.method,
  //       customerInfo: data.customerInfo,
  //       shippingAddress: data.shippingAddress,
  //       tracking_number: data.shipping?.trackingNumber,
  //       estimated_delivery:
  //         data.shipping?.estimatedDelivery ||
  //         defaultEstimatedDelivery.toISOString(),
  //       location_id: pId,
  //       poAccept: !poIs
  //     };

  //     // Save order to Supabase
  //     const { data: orderResponse, error: orderError } = await supabase
  //       .from("orders")
  //       .insert([orderData])
  //       .select();

  //     if (orderError) {
  //       console.error("Order creation error:", orderError);
  //       throw new Error(orderError.message);
  //     }

  //     console.log(orderResponse);
  //     const newOrder = orderResponse[0];
  //     console.log("Order saved:", newOrder);

  //     // !poIs
  //     if (!poIs) {
  //       const year = new Date().getFullYear(); // Get current year (e.g., 2025)

  //       const { data: inData, error: erroIn } = await supabase
  //         .from("centerize_data")
  //         .select("id, invoice_no, invoice_start")
  //         .order("id", { ascending: false }) // Get latest order
  //         .limit(1);

  //       if (erroIn) {
  //         console.error("🚨 Supabase Fetch Error:", erroIn);
  //         return null;
  //       }

  //       let newInvNo = 1; // Default to 1 if no previous order exists
  //       let invoiceStart = "INV"; // Default order prefix

  //       if (inData && inData.length > 0) {
  //         newInvNo = (inData[0].invoice_no || 0) + 1; // Increment last order number
  //         invoiceStart = inData[0].invoice_start || "INV"; // Use existing order_start
  //       }

  //       const invoiceNumber = `${invoiceStart}-${year}${newInvNo.toString().padStart(6, "0")}`;
  //       // const invoiceNumber = "DEV-TEST123";

  //       const { error: updateError } = await supabase
  //         .from("centerize_data")
  //         .update({ invoice_no: newInvNo }) // Correct update syntax
  //         .eq("id", inData[0]?.id); // Update only the latest record

  //       if (updateError) {
  //         console.error("🚨 Supabase Update Error:", updateError);
  //       } else {
  //         console.log("✅ Order No Updated to:", newInvNo);
  //       }

  //       const estimatedDeliveryDate = new Date(newOrder.estimated_delivery);

  //       // Calculate the due_date by adding 30 days to the estimated delivery
  //       const dueDate = new Date(estimatedDeliveryDate);
  //       dueDate.setDate(dueDate.getDate() + 30); // Add 30 days

  //       // Format the due_date as a string in ISO 8601 format with time zone (UTC in this case)
  //       const formattedDueDate = dueDate.toISOString(); // Example: "2025-04-04T13:45:00.000Z"

  //       const invoiceData = {
  //         invoice_number: invoiceNumber,
  //         order_id: newOrder.id,
  //         due_date: formattedDueDate,
  //         profile_id: newOrder.profile_id,
  //         status: "pending" as InvoiceStatus,
  //         amount: parseFloat(calculatedTotal + newtax) || 0,
  //         tax_amount: orderData.tax_amount || 0,
  //         total_amount: parseFloat(calculatedTotal + newtax),
  //         payment_status: newOrder.payment_status,
  //         payment_method: newOrder.paymentMethod as PaymentMethod,
  //         payment_notes: newOrder.notes || null,
  //         items: newOrder.items || [],
  //         customer_info: newOrder.customerInfo || {
  //           name: newOrder.customerInfo?.name,
  //           email: newOrder.customerInfo?.email || "",
  //           phone: newOrder.customerInfo?.phone || "",
  //         },
  //         shipping_info: orderData.shippingAddress || {},
  //         shippin_cost: totalShippingCost,
  //         subtotal:
  //           calculatedTotal + newtax + (isCus ? 0.5 : 0) ||
  //           parseFloat(calculatedTotal + newtax + (isCus ? 0.5 : 0)),
  //       };

  //       const { invoicedata2, error } = await supabase
  //         .from("invoices")
  //         .insert(invoiceData)
  //         .select()
  //         .single();

  //       if (error) {
  //         console.error("Error creating invoice:", error);
  //         throw error;
  //       }

  //       // Prepare and save order items
  //       const orderItemsData = cleanedCartItems.map((item) => ({
  //         order_id: newOrder.id,
  //         product_id: item.productId,
  //         quantity: item.quantity,
  //         unit_price: item.price,
  //         total_price: item.quantity * item.price,
  //         notes: item.notes,
  //       }));

  //       const { error: itemsError } = await supabase
  //         .from("order_items")
  //         .insert(orderItemsData);

  //       if (itemsError) {
  //         throw new Error(itemsError.message);
  //       }

  //       // Update product stock
  //       for (const item of data.items) {
  //         // console.log("Updating stock for quantity ID:", item.quantity);
  //         const { error: stockUpdateError } = await supabase.rpc(
  //           "decrement_stock",
  //           { product_id: item.productId, quantity: item.quantity }
  //         );
  //         // console.log("stockUpdateError", stockUpdateError);
  //         if (stockUpdateError) {
  //           throw new Error(
  //             `Failed to update stock for product ID: ${item.productId}`
  //           );
  //         }
  //       }

  //       const { data: orderResponse2, error: orderError2 } = await supabase
  //         .from("orders")
  //         .select()
  //         .eq("id", newOrder.id);

  //       if (orderError2) {
  //         console.error("Order creation error:", orderError2);
  //         throw new Error(orderError2.message);
  //       }

  //       const { data: profileData, error: profileEror } = await supabase
  //         .from("profiles")
  //         .select()
  //         .eq("id", newOrder.profile_id)
  //         .maybeSingle();

  //       if (profileEror) {
  //         console.error("🚨 Supabase Fetch Error:", profileEror);
  //         return;
  //       }
  //       if (profileData.email_notifaction) {
  //         try {
  //           await axios.post("/order-place", newOrder);
  //           console.log("Order status sent successfully to backend.");
  //         } catch (apiError) {
  //           console.error("Failed to send order status to backend:", apiError);
  //         }

  //       }
  //     }

  //     if(poIs && false){

  //         const estimatedDeliveryDate = new Date(newOrder.estimated_delivery);

  //       // Calculate the due_date by adding 30 days to the estimated delivery
  //       const dueDate = new Date(estimatedDeliveryDate);
  //       dueDate.setDate(dueDate.getDate() + 30); // Add 30 days

  //       // Format the due_date as a string in ISO 8601 format with time zone (UTC in this case)
  //       const formattedDueDate = dueDate.toISOString(); // Example: "2025-04-04T13:45:00.000Z"

  //       const invoiceData = {
  //         invoice_number: `INV-${orderNumber}`,
  //         order_id: newOrder.id,
  //         due_date: formattedDueDate,
  //         profile_id: newOrder.profile_id,
  //         status: "pending" as InvoiceStatus,
  //         amount: parseFloat(calculatedTotal + newtax) || 0,
  //         tax_amount: orderData.tax_amount || 0,
  //         total_amount: parseFloat(calculatedTotal + newtax),
  //         payment_status: newOrder.payment_status,
  //         payment_method: newOrder.paymentMethod as PaymentMethod,
  //         payment_notes: newOrder.notes || null,
  //         items: newOrder.items || [],
  //         customer_info: newOrder.customerInfo || {
  //           name: newOrder.customerInfo?.name,
  //           email: newOrder.customerInfo?.email || "",
  //           phone: newOrder.customerInfo?.phone || "",
  //         },
  //         shipping_info: orderData.shippingAddress || {},
  //         shippin_cost: totalShippingCost,
  //         subtotal:
  //           calculatedTotal + newtax + (isCus ? 0.5 : 0) ||
  //           parseFloat(calculatedTotal + newtax + (isCus ? 0.5 : 0)),
  //       };

  //       const { invoicedata2, error } = await supabase
  //         .from("invoices")
  //         .insert(invoiceData)
  //         .select()
  //         .single();

  //       if (error) {
  //         console.error("Error creating invoice:", error);
  //         throw error;
  //       }

  //       // Prepare and save order items
  //       const orderItemsData = cleanedCartItems.map((item) => ({
  //         order_id: newOrder.id,
  //         product_id: item.productId,
  //         quantity: item.quantity,
  //         unit_price: item.price,
  //         total_price: item.quantity * item.price,
  //         notes: item.notes,
  //       }));

  //       const { error: itemsError } = await supabase
  //         .from("order_items")
  //         .insert(orderItemsData);

  //       if (itemsError) {
  //         throw new Error(itemsError.message);
  //       }

  //     }

  //     if (!poIs) {
  //       for (const item of data.items) {
  //         if (item.sizes && item.sizes.length > 0) {
  //           for (const size of item.sizes) {
  //             // Step 1: Fetch current size
  //             const { data: currentSize, error: fetchError } = await supabase
  //               .from("product_sizes")
  //               .select("stock")
  //               .eq("id", size.id)
  //               .single();

  //             if (fetchError || !currentSize) {
  //               console.warn(`⚠️ Size not found in Supabase for ID: ${size.id}, skipping...`);
  //               continue; // ✅ Skip this size if not found
  //             }

  //             const newQuantity = currentSize.stock - size.quantity;

  //             // Step 2: Update with new quantity
  //             const { error: updateError } = await supabase
  //               .from("product_sizes")
  //               .update({ stock: newQuantity })
  //               .eq("id", size.id);

  //             if (updateError) {
  //               console.error(`❌ Failed to update size quantity for ID: ${size.id}`, updateError);
  //               throw new Error(`Failed to update size quantity`);
  //             } else {
  //               console.log(`✅ Updated size quantity for ID: ${size.id}`);
  //             }
  //           }
  //         }
  //       }
  //     }

  //     // Reset form and local state
  //     localStorage.removeItem("cart");
  //     localStorage.removeItem("cartItems");
  //     window.location.reload();

  //     toast({
  //       title: "Order Created Successfully",
  //       description: `Order ID: ${newOrder.id} has been created.`,
  //     });

  //     const logsData = {
  //       user_id: newOrder.profile_id,
  //       order_id: orderNumber,
  //       action: 'order_created',
  //       details: {
  //         message: `Order Created : ${orderNumber}`,
  //         items: cleanedCartItems,
  //         orderCreateBY: userProfile
  //       },
  //     };
  //     try {
  //       await axios.post("/logs/create", logsData);
  //       console.log("LOGS STORED SUCCESSFULLYY");
  //     } catch (apiError) {
  //       console.error("Failed to store logs:", apiError);
  //     }

  //     form.reset();
  //     // setOrderItems([{ id: 1 }]);

  //     const userType = sessionStorage.getItem('userType');

  //     if (userType.toLocaleLowerCase() === 'group') {
  //       navigate("/group/orders");

  //     }
  //     if (userType.toLocaleLowerCase() === 'pharmacy') {
  //       navigate("/pharmacy/orders");

  //     }
  //     if (userType.toLocaleLowerCase() === 'admin') {
  //       if (poIs) {
  //         navigate("/admin/po", { state: { createOrder: false } });
  //       } else {
  //         navigate("/admin/orders", { state: { createOrder: false } });
  //       }
  //     }

  //     await clearCart();
  //   } catch (error) {
  //     console.error("Order creation error:", error);
  //     toast({
  //       title: "Error Creating Order",
  //       description:
  //         error instanceof Error
  //           ? error.message
  //           : "There was a problem creating your order.",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const onSubmit = async (data: OrderFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("Starting order submission:", data);

      // Early validation
      if (!userProfile?.id) {
        toast({
          title: "User profile not found",
          description: "Please log in to create an order.",
          duration: 5000,
          variant: "destructive",
        });
        return;
      }

      // Parallel data preparation
      const [taxPer, cleanedCartItems] = await Promise.all([
        Promise.resolve(Number(sessionStorage.getItem("taxper") || 0)),
        Promise.resolve(cleanCartItems(cartItems)),
      ]);

      validateOrderItems(data.items);

      const calculatedTotal = calculateOrderTotal(
        cleanedCartItems,
        totalShippingCost || 0
      );
      const newTax = ((calculatedTotal - totalShippingCost) * taxPer) / 100;
      const totalAmount = calculatedTotal + newTax;

      // Determine profile ID
      const profileID =
        sessionStorage.getItem("userType") === "admin"
          ? data.customer
          : sessionStorage.getItem("userType") === "group"
          ? pId
          : userProfile.id;

      // Generate order number
      const orderNumber = poIs
        ? await generatePurchaseOrderId()
        : await generateOrderId();

      // Prepare order data
      const orderData = {
        order_number: orderNumber,
        profile_id: profileID,
        status: data.status,
        total_amount: totalAmount,
        shipping_cost: totalShippingCost || 0,
        tax_amount: newTax,
        customization: isCus,
        items: cleanedCartItems,
        notes: data.specialInstructions,
        purchase_number_external: data.purchase_number_external,
        shipping_method: data.shipping?.method,
        customerInfo: data.customerInfo,
        shippingAddress: data.shippingAddress,
        tracking_number: data.shipping?.trackingNumber,
        estimated_delivery:
          data.shipping?.estimatedDelivery ||
          new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        location_id: pId,
        poAccept: !poIs,
      };

      // Create order
      const { data: orderResponse, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw new Error(orderError.message);

      // Log order creation activity
      try {
        await OrderActivityService.logOrderCreation({
          orderId: orderResponse.id,
          orderNumber: orderNumber,
          totalAmount: totalAmount,
          status: data.status,
          paymentMethod: data.payment?.method || "N/A",
          performedBy: userProfile?.id,
          performedByName: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() || "User",
          performedByEmail: userProfile?.email,
        });
      } catch (activityError) {
        console.error("Failed to log order creation activity:", activityError);
        // Don't throw - continue with order creation
      }

      // Parallel processing for non-PO orders
      if (!poIs) {
        // Parallel operations
        await Promise.all([
          createInvoice(orderResponse, totalAmount, newTax),
          updateStock(data.items),
          handlePostOrderProcessing(
            orderResponse,
            cleanedCartItems,
            totalAmount
          ),
        ]);
      } else {
        // For PO orders, just handle post-processing
        await handlePostOrderProcessing(
          orderResponse,
          cleanedCartItems,
          totalAmount
        );
      }

      // Final cleanup
      localStorage.removeItem("cart");
      localStorage.removeItem("cartItems");
      form.reset();
      await clearCart();

      // Navigation
      const userType = sessionStorage.getItem("userType");
      const routes = {
        group: "/group/orders",
        pharmacy: "/pharmacy/orders",
        admin: poIs ? "/admin/po" : "/admin/orders",
      };

      // if (routes[userType as keyof typeof routes]) {
      //   navigate(routes[userType as keyof typeof routes], {
      //     state: { createOrder: false },
      //   });
      // }
      // window.location.reload();
      toast({
        title: "Order Created Successfully",
        description: `Order ID: ${orderResponse.id} has been created.`,
      });
    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        title: "Error Creating Order",
        description:
          error instanceof Error
            ? error.message
            : "There was a problem creating your order.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimized helper functions
  const createInvoice = async (
    order: any,
    totalAmount: number,
    newTax: number
  ) => {
    // ✅ STEP 1: Check customer payment terms
    const { data: customerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("payment_terms")
      .eq("id", order.profile_id)
      .single();

    if (profileError) {
      console.error("Error fetching customer profile:", profileError);
      throw new Error(profileError.message);
    }

    // ✅ STEP 2: Skip invoice generation for credit customers
    const isCreditCustomer =
      customerProfile.payment_terms === "credit" ||
      customerProfile.payment_terms === "net_30";

    if (isCreditCustomer) {
      console.log(
        `⏭️ Skipping invoice generation for credit customer: ${order.profile_id}`
      );
      return; // Exit early - no invoice created
    }

    // ✅ STEP 3: Generate invoice ONLY for prepay customers
    console.log(`✅ Creating invoice for prepay customer: ${order.profile_id}`);

    const year = new Date().getFullYear();

    // Get invoice number
    const { data: inData, error: fetchError } = await supabase
      .from("centerize_data")
      .select("id, invoice_no, invoice_start")
      .order("id", { ascending: false })
      .limit(1);

    if (fetchError) throw new Error(fetchError.message);

    const newInvNo = (inData?.[0]?.invoice_no || 0) + 1;
    const invoiceStart = inData?.[0]?.invoice_start || "INV";

    // Update invoice number
    if (inData?.[0]?.id) {
      const { error: updateError } = await supabase
        .from("centerize_data")
        .update({ invoice_no: newInvNo })
        .eq("id", inData[0].id);

      if (updateError) throw new Error(updateError.message);
    }

    const invoiceNumber = `${invoiceStart}-${year}${newInvNo
      .toString()
      .padStart(6, "0")}`;
    const dueDate = new Date(
      new Date(order.estimated_delivery).getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Create invoice
    const invoiceData = {
      invoice_number: invoiceNumber,
      order_id: order.id,
      due_date: dueDate,
      profile_id: order.profile_id,
      status: "pending" as InvoiceStatus,
      amount: totalAmount,
      tax_amount: newTax,
      total_amount: totalAmount,
      payment_status: order.payment_status,
      payment_method: order.paymentMethod as PaymentMethod,
      notes: order.notes || null,
      purchase_number_external: order.purchase_number_external,
      items: order.items,
      customer_info: order.customerInfo,
      shipping_info: order.shippingAddress,
      shippin_cost: order.shipping_cost,
      subtotal: totalAmount + (isCus ? 0.5 : 0),
    };

    const { data: invoiceResult, error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) throw new Error(invoiceError.message);

    console.log(
      `✅ Invoice ${invoiceNumber} created successfully for prepay customer`
    );

    // Log invoice creation activity
    try {
      await OrderActivityService.logActivity({
        orderId: order.id,
        activityType: "updated",
        description: `Invoice ${invoiceNumber} created for order`,
        performedBy: userProfile?.id,
        performedByName: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() || "System",
        performedByEmail: userProfile?.email,
        metadata: {
          invoice_number: invoiceNumber,
          invoice_id: invoiceResult?.id,
          amount: totalAmount,
        },
      });
    } catch (activityError) {
      console.error("Failed to log invoice creation activity:", activityError);
      // Don't throw - continue with invoice creation
    }
  };

  const updateStock = async (items: any[]) => {
    // Batch product updates
    const productUpdates = items.map((item) =>
      supabase.rpc("decrement_stock", {
        product_id: item.productId,
        quantity: item.quantity,
      })
    );

    // Batch size updates
    const sizeUpdates = items.flatMap(
      (item) =>
        item.sizes?.map((size) =>
          supabase
            .from("product_sizes")
            .select("stock")
            .eq("id", size.id)
            .single()
            .then(({ data, error }) => {
              if (error || !data)
                throw new Error(`Size not found for ID: ${size.id}`);
              return supabase
                .from("product_sizes")
                .update({ stock: data.stock - size.quantity })
                .eq("id", size.id);
            })
        ) || []
    );

    // Execute all updates in parallel
    const updatePromises = [...productUpdates, ...sizeUpdates];
    const results = await Promise.allSettled(updatePromises);

    // Check for errors
    const errors = results.filter((r) => r.status === "rejected");
    if (errors.length > 0) {
      throw new Error("Stock update failed for some items");
    }
  };

  const handlePostOrderProcessing = async (
    order: any,
    cartItems: any[],
    totalAmount: number
  ) => {
    // Get profile data
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email_notifaction")
      .eq("id", order.profile_id)
      .maybeSingle();

    // Parallel operations
    await Promise.all([
      // Send email notification
      (async () => {
        if (profileData?.email_notifaction && !poIs) {
          await axios
            .post("/order-place", order)
            .then(() => {
              console.log("Order status sent successfully to backend.");
            })
            .catch((err) => {
              console.error("Failed to send order status:", err);
            });
        }
      })(),

      // Create logs
      (async () => {
        const logsData = {
          user_id: order.profile_id,
          order_id: order.order_number,
          action: "order_created",
          details: {
            message: `Order Created: ${order.order_number}`,
            items: cartItems,
            orderCreateBY: userProfile,
          },
        };

        try {
          await axios.post("/logs/create", logsData);
        } catch (err) {
          console.error("Failed to store logs:", err);
        }
      })(),
    ]);
  };

  useEffect(() => {
    const VVV = form.getValues();
    console.log(VVV);
  }, []);

  const [isOpen, setIsOpen] = useState(false);

  const [isCustom, setIsCustom] = useState(false);
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CustomerSelectionField
            form={form}
            initialData={initialData}
            locationId={locationId}
            poIs={poIs}
          />

          <div className="">
            {userTypeRole === "admin" && (
              <div className="flex justify-end w-full gap-5">
                <p
                  onClick={(e) => {
                    e.preventDefault(); // Form submit hone se rokne ke liye
                    setIsPriceChange(!isPriceChange);
                  }}
                  className="cursor-pointer px-4 py-2 bg-green-600 text-white font-medium rounded-lg shadow-md hover:bg-green-700 active:scale-95 transition-all inline-block text-center"
                >
                  {isPriceChange ? "Close Edit Price" : "Edit Price"}
                </p>

                {
                  <div>
                    <div className=" flex gap-4">
                      <p
                        onClick={() => setIsOpen(true)}
                        className="p-2 cursor-pointer bg-blue-600 text-white rounded"
                      >
                        Add Items
                      </p>
                      {
                        <p
                          onClick={() => setIsCustom(true)}
                          className="p-2 cursor-pointer bg-gray-600 text-white rounded"
                        >
                          Add Additional Items
                        </p>
                      }
                    </div>

                    <CustomProductForm
                      isOpen={isCustom}
                      onClose={() => setIsCustom(false)}
                      isEditing={isEditing}
                      form={form}
                    />
                  </div>
                }
              </div>
            )}

            {isPriceChange && <CartItemsPricing />}

            {isOpen && (
              <div className="fixed -inset-4 flex items-center justify-center bg-black bg-opacity-50 h-screen z-[50]">
                <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] md:w-[50%] relative h-[80vh] overflow-y-scroll">
                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-3 right-3 text-gray-600 hover:text-black text-lg"
                  >
                    ✖
                  </button>

                  {/* Modal Content */}

                  <ProductShowcase
                    groupShow={true}
                    isEditing={isEditing}
                    form={form}
                  />
                </div>
              </div>
            )}
            <OrderItemsSection
              orderItems={form.getValues("items") || cartItems}
              form={form}
              setIsCus={setIsCus}
              isCus={isCus}
              isEditing={isEditing}
              poIs={poIs}
            />
          </div>
          <ShippingSection form={form} />

          {<PaymentSection form={form} isEditing={isEditing} poIs={poIs} />}

          <OrderFormActions
            orderData={form.getValues()}
            isSubmitting={isSubmitting}
            isValidating={isValidating}
            isEditing={isEditing}
            setModalIsOpen={setModalIsOpen}
            setIsCus={setIsCus}
            isCus={isCus}
            form={form}
            poIs={poIs}
          />
        </form>
      </Form>
      {modalIsOpen && (
        <CreateOrderPaymentForm
          modalIsOpen={modalIsOpen}
          setModalIsOpen={setModalIsOpen}
          formDataa={form.getValues()}
          form={form}
          pId={pId}
          setIsCus={setIsCus}
          isCus={isCus}
        />
      )}
    </>
  );
}
