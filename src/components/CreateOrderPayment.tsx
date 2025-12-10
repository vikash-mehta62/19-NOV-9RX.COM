import { useEffect, useState } from "react";
import axios from "../../axiosconfig";
import {
  CreditCard,
  Landmark,
  User,
  Hash,
  MapPin,
  Building,
  Globe,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Package,
  Receipt,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateOrderTotal,
  generateOrderId,
} from "./orders/utils/orderUtils";
import { useCart } from "@/hooks/use-cart";
import { validateOrderItems } from "./orders/form/OrderFormValidation";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { InvoiceStatus } from "./invoices/types/invoice.types";
import { useNavigate } from "react-router-dom";
import { OrderActivityService } from "@/services/orderActivityService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateOrderPaymentFormProps {
  modalIsOpen: boolean;
  setModalIsOpen: (open: boolean) => void;
  form?: any;
  formDataa: any;
  pId?: string;
  setIsCus?: (val: boolean) => void;
  isCus?: boolean;
}

const CreateOrderPaymentForm = ({
  modalIsOpen,
  setModalIsOpen,
  form,
  formDataa,
  pId,
  setIsCus,
  isCus,
}: CreateOrderPaymentFormProps) => {
  const [paymentType, setPaymentType] = useState("credit_card");
  const { toast } = useToast();
  const { cartItems, clearCart } = useCart();
  const userProfile = useSelector(selectUserProfile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tax, settax] = useState(0);
  const taxper = sessionStorage.getItem("taxper");

  const [formData, setFormData] = useState({
    amount: 0,
    cardNumber: "",
    expirationDate: "",
    cvv: "",
    cardholderName: "",
    accountType: "checking",
    routingNumber: "",
    accountNumber: "",
    nameOnAccount: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "USA",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalShippingCost =
    sessionStorage.getItem("shipping") == "true"
      ? 0
      : Math.max(...cartItems.map((item) => item.shipping_cost || 0));

  function cleanCartItems(cartItems: any[]) {
    const cleanedItems = cartItems.map((item) => {
      const updatedSizes = item.sizes.map((size: any) => ({
        ...size,
        quantity: Number(size.quantity),
        price: Number(size.price),
      }));

      const updatedPrice = updatedSizes.reduce(
        (sum: number, size: any) => sum + size.quantity * size.price,
        0
      );

      const updatedQuantity = updatedSizes.reduce(
        (sum: number, size: any) => sum + size.quantity,
        0
      );

      return {
        ...item,
        price: parseFloat(updatedPrice.toFixed(2)),
        quantity: updatedQuantity,
        sizes: updatedSizes,
      };
    });

    localStorage.setItem("cartItems", JSON.stringify(cleanedItems));
    return cleanedItems;
  }

  useEffect(() => {
    const cleanedCartItems = cleanCartItems(cartItems);

    if (formDataa) {
      const totalAmount = calculateOrderTotal(cleanedCartItems, totalShippingCost || 0);
      const newtax = ((totalAmount - totalShippingCost) * Number(taxper)) / 100;
      settax(newtax);
      setFormData((prevData) => ({
        ...prevData,
        nameOnAccount: formDataa.customerInfo?.name || "",
        cardholderName: formDataa.customerInfo?.name || "",
        address: formDataa.customerInfo?.address?.street || "",
        city: formDataa.customerInfo?.address?.city || "",
        state: formDataa.customerInfo?.address?.state || "",
        zip: formDataa.customerInfo?.address?.zip_code || "",
        amount: totalAmount + newtax,
      }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData({ ...formData, cardNumber: formatted });
    if (errors.cardNumber) {
      setErrors({ ...errors, cardNumber: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (paymentType === "credit_card") {
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, "").length < 15) {
        newErrors.cardNumber = "Please enter a valid card number";
      }
      if (!formData.expirationDate || formData.expirationDate.length !== 4) {
        newErrors.expirationDate = "Enter expiry as MMYY";
      }
      if (!formData.cvv || formData.cvv.length < 3) {
        newErrors.cvv = "Enter valid CVV";
      }
      if (!formData.cardholderName) {
        newErrors.cardholderName = "Cardholder name is required";
      }
    } else {
      if (!formData.routingNumber || formData.routingNumber.length !== 9) {
        newErrors.routingNumber = "Enter valid 9-digit routing number";
      }
      if (!formData.accountNumber) {
        newErrors.accountNumber = "Account number is required";
      }
      if (!formData.nameOnAccount) {
        newErrors.nameOnAccount = "Name on account is required";
      }
    }

    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.zip) newErrors.zip = "ZIP code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const year = new Date().getFullYear();
    const cleanedCartItems = cleanCartItems(cartItems);

    const { data: inData, error: erroIn } = await supabase
      .from("centerize_data")
      .select("id, invoice_no, invoice_start")
      .order("id", { ascending: false })
      .limit(1);

    if (erroIn) {
      console.error("Supabase Fetch Error:", erroIn);
      setLoading(false);
      return null;
    }

    let newInvNo = 1;
    let invoiceStart = "INV";

    if (inData && inData.length > 0) {
      newInvNo = (inData[0].invoice_no || 0) + 1;
      invoiceStart = inData[0].invoice_start || "INV";
    }

    const invoiceNumber = `${invoiceStart}-${year}${newInvNo.toString().padStart(6, "0")}`;

    const paymentData =
      paymentType === "credit_card"
        ? {
            paymentType,
            amount: formData.amount,
            cardNumber: formData.cardNumber.replace(/\s/g, ""),
            expirationDate: formData.expirationDate,
            cvv: formData.cvv,
            cardholderName: formData.cardholderName,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country,
            invoiceNumber: invoiceNumber,
          }
        : {
            paymentType,
            amount: formData.amount,
            accountType: formData.accountType,
            routingNumber: formData.routingNumber,
            accountNumber: formData.accountNumber,
            nameOnAccount: formData.nameOnAccount,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country,
            invoiceNumber: invoiceNumber,
          };

    try {
      const response = await axios.post("/pay", paymentData);
      
      if (response.status === 200) {
        await processOrder(response, cleanedCartItems, invoiceNumber, newInvNo, inData);
      }
    } catch (error: any) {
      setLoading(false);
      
      if (error.response?.data?.errors?.error?.[0]?.errorCode === "27") {
        toast({
          title: "Payment Declined",
          description: "Your billing address does not match your card's registered address. Please verify and try again.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Payment Failed",
          description: error.response?.data?.message || "Something went wrong. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    }
  };

  const processOrder = async (
    response: any,
    cleanedCartItems: any[],
    invoiceNumber: string,
    newInvNo: number,
    inData: any
  ) => {
    try {
      const data = formDataa;
      validateOrderItems(data.items);

      const calculatedTotal = calculateOrderTotal(cleanedCartItems, totalShippingCost || 0);

      if (userProfile?.id == null) {
        toast({
          title: "User profile not found",
          description: "Please log in to create an order.",
          duration: 5000,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const defaultEstimatedDelivery = new Date();
      defaultEstimatedDelivery.setDate(defaultEstimatedDelivery.getDate() + 10);

      const orderNumber = await generateOrderId();

      let profileID = userProfile?.id;
      if (sessionStorage.getItem("userType") === "admin") {
        profileID = pId || data.customer;
      } else if (sessionStorage.getItem("userType") === "group") {
        profileID = pId;
      }

      const orderData = {
        order_number: orderNumber,
        profile_id: profileID,
        location_id: pId,
        status: data.status || "new",
        total_amount: calculatedTotal + tax,
        shipping_cost: totalShippingCost || 0,
        tax_amount: Number(tax),
        items: cleanedCartItems,
        payment_status: "paid",
        payment_method: "card",
        notes: data.specialInstructions,
        shipping_method: data.shipping?.method,
        customerInfo: data.customerInfo,
        shippingAddress: data.shippingAddress,
        tracking_number: data.shipping?.trackingNumber,
        estimated_delivery: data.shipping?.estimatedDelivery || defaultEstimatedDelivery.toISOString(),
        customization: isCus || false,
        void: false,
      };

      const { data: orderResponse, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select();

      if (orderError) {
        throw new Error(orderError.message);
      }

      const newOrder = orderResponse[0];

      await supabase
        .from("centerize_data")
        .update({ invoice_no: newInvNo })
        .eq("id", inData[0]?.id);

      const estimatedDeliveryDate = new Date(newOrder.estimated_delivery);
      const dueDate = new Date(estimatedDeliveryDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceData = {
        invoice_number: invoiceNumber,
        order_id: newOrder.id,
        due_date: dueDate.toISOString(),
        profile_id: newOrder.profile_id,
        status: "pending" as InvoiceStatus,
        amount: parseFloat((calculatedTotal + tax).toString()) || 0,
        tax_amount: orderData.tax_amount || 0,
        total_amount: parseFloat((calculatedTotal + (isCus ? 0.5 : 0)).toString()),
        payment_status: "paid",
        payment_transication: response.data.transactionId || "",
        payment_method: "card",
        shippin_cost: totalShippingCost || 0,
        notes: newOrder.notes || null,
        items: newOrder.items || [],
        customer_info: newOrder.customerInfo || {
          name: newOrder.customerInfo?.name,
          email: newOrder.customerInfo?.email || "",
          phone: newOrder.customerInfo?.phone || "",
        },
        shipping_info: orderData.shippingAddress || {},
        subtotal: calculatedTotal || parseFloat(calculatedTotal.toString()),
      };

      const { data: invoicedata2, error } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (error) throw error;

      // Log activities
      await logOrderActivities(newOrder, orderNumber, calculatedTotal, response, invoiceNumber, invoicedata2);

      // Send email notification
      const { data: profileData } = await supabase
        .from("profiles")
        .select()
        .eq("id", newOrder.profile_id)
        .maybeSingle();

      if (profileData?.email_notifaction) {
        try {
          await axios.post("/order-place", newOrder);
        } catch (apiError) {
          console.error("Failed to send order notification:", apiError);
        }
      }

      // Save order items
      const orderItemsData = data.items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.quantity * item.price,
        notes: item.notes,
      }));

      await supabase.from("order_items").insert(orderItemsData);

      // Update stock
      await updateProductStock(cleanedCartItems);

      toast({
        title: "Payment Successful!",
        description: `Order #${orderNumber} has been created successfully.`,
      });

      await clearCart();
      navigate("/pharmacy/orders");
    } catch (error) {
      console.error("Order creation error:", error);
      setLoading(false);
      toast({
        title: "Error Creating Order",
        description: error instanceof Error ? error.message : "There was a problem creating your order.",
        variant: "destructive",
      });
    }
  };

  const logOrderActivities = async (
    newOrder: any,
    orderNumber: string,
    calculatedTotal: number,
    response: any,
    invoiceNumber: string,
    invoicedata2: any
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userProfileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", session?.user?.id || "")
        .single();

      await OrderActivityService.logOrderCreation({
        orderId: newOrder.id,
        orderNumber: orderNumber,
        totalAmount: calculatedTotal + tax,
        status: newOrder.status,
        paymentMethod: "card",
        performedBy: session?.user?.id,
        performedByName: userProfileData ? `${userProfileData.first_name} ${userProfileData.last_name}`.trim() : "User",
        performedByEmail: userProfileData?.email,
      });

      await OrderActivityService.logActivity({
        orderId: newOrder.id,
        activityType: "updated",
        description: `Invoice ${invoiceNumber} created for order`,
        performedBy: session?.user?.id,
        performedByName: userProfileData ? `${userProfileData.first_name} ${userProfileData.last_name}`.trim() : "User",
        performedByEmail: userProfileData?.email,
        metadata: {
          invoice_number: invoiceNumber,
          invoice_id: invoicedata2?.id,
          amount: calculatedTotal + tax,
        },
      });

      await OrderActivityService.logPaymentReceived({
        orderId: newOrder.id,
        orderNumber: orderNumber,
        amount: calculatedTotal + tax,
        paymentMethod: "card",
        paymentId: response.data.transactionId,
        performedBy: session?.user?.id,
        performedByName: userProfileData ? `${userProfileData.first_name} ${userProfileData.last_name}`.trim() : "User",
        performedByEmail: userProfileData?.email,
      });

      const logsData = {
        user_id: newOrder.profile_id,
        order_id: orderNumber,
        action: "order_and_payment_success",
        details: {
          message: `Order Created And Payment Successful: ${orderNumber}`,
          items: formDataa.items,
          orderCreateBY: userProfile,
        },
      };
      await axios.post("/logs/create", logsData);
    } catch (activityError) {
      console.error("Failed to log activities:", activityError);
    }
  };

  const updateProductStock = async (cleanedCartItems: any[]) => {
    for (const item of cleanedCartItems) {
      if (item.sizes && item.sizes.length > 0) {
        for (const size of item.sizes) {
          const { data: currentSize, error: fetchError } = await supabase
            .from("product_sizes")
            .select("stock")
            .eq("id", size.id)
            .single();

          if (fetchError || !currentSize) continue;

          const newQuantity = currentSize.stock - size.quantity;

          await supabase
            .from("product_sizes")
            .update({ stock: newQuantity })
            .eq("id", size.id);
        }
      }
    }
  };

  const subtotal = formData.amount - tax - totalShippingCost;

  if (!modalIsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 to-slate-100 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalIsOpen(false)}
                className="gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Cart
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-700">Secure Checkout</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setModalIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method Selection */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CreditCard className="w-6 h-6" />
                  Payment Method
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  Choose your preferred payment method
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentType("credit_card")}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      paymentType === "credit_card"
                        ? "border-emerald-500 bg-emerald-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <CreditCard className={`w-8 h-8 ${paymentType === "credit_card" ? "text-emerald-600" : "text-gray-400"}`} />
                    <span className={`font-medium ${paymentType === "credit_card" ? "text-emerald-700" : "text-gray-600"}`}>
                      Credit Card
                    </span>
                    {paymentType === "credit_card" && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute top-2 right-2" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("ach")}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      paymentType === "ach"
                        ? "border-emerald-500 bg-emerald-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Landmark className={`w-8 h-8 ${paymentType === "ach" ? "text-emerald-600" : "text-gray-400"}`} />
                    <span className={`font-medium ${paymentType === "ach" ? "text-emerald-700" : "text-gray-600"}`}>
                      Bank Transfer (ACH)
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details Form */}
            <form onSubmit={handleSubmit}>
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {paymentType === "credit_card" ? "Card Details" : "Bank Account Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {paymentType === "credit_card" ? (
                    <>
                      {/* Card Number */}
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber" className="text-sm font-medium">
                          Card Number
                        </Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="cardNumber"
                            name="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={formData.cardNumber}
                            onChange={handleCardNumberChange}
                            maxLength={19}
                            className={`pl-11 h-12 text-lg ${errors.cardNumber ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.cardNumber && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.cardNumber}
                          </p>
                        )}
                      </div>

                      {/* Expiry & CVV */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expirationDate" className="text-sm font-medium">
                            Expiry Date
                          </Label>
                          <Input
                            id="expirationDate"
                            name="expirationDate"
                            placeholder="MMYY"
                            value={formData.expirationDate}
                            onChange={handleChange}
                            maxLength={4}
                            className={`h-12 text-lg ${errors.expirationDate ? "border-red-500" : ""}`}
                          />
                          {errors.expirationDate && (
                            <p className="text-sm text-red-500">{errors.expirationDate}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv" className="text-sm font-medium">
                            CVV
                          </Label>
                          <Input
                            id="cvv"
                            name="cvv"
                            placeholder="123"
                            value={formData.cvv}
                            onChange={handleChange}
                            maxLength={4}
                            type="password"
                            className={`h-12 text-lg ${errors.cvv ? "border-red-500" : ""}`}
                          />
                          {errors.cvv && (
                            <p className="text-sm text-red-500">{errors.cvv}</p>
                          )}
                        </div>
                      </div>

                      {/* Cardholder Name */}
                      <div className="space-y-2">
                        <Label htmlFor="cardholderName" className="text-sm font-medium">
                          Cardholder Name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="cardholderName"
                            name="cardholderName"
                            placeholder="John Doe"
                            value={formData.cardholderName}
                            onChange={handleChange}
                            className={`pl-11 h-12 ${errors.cardholderName ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.cardholderName && (
                          <p className="text-sm text-red-500">{errors.cardholderName}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Account Type */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Account Type</Label>
                        <Select
                          value={formData.accountType}
                          onValueChange={(value) => setFormData({ ...formData, accountType: value })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">Checking Account</SelectItem>
                            <SelectItem value="savings">Savings Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Routing Number */}
                      <div className="space-y-2">
                        <Label htmlFor="routingNumber" className="text-sm font-medium">
                          Routing Number
                        </Label>
                        <div className="relative">
                          <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="routingNumber"
                            name="routingNumber"
                            placeholder="123456789"
                            value={formData.routingNumber}
                            onChange={handleChange}
                            maxLength={9}
                            className={`pl-11 h-12 ${errors.routingNumber ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.routingNumber && (
                          <p className="text-sm text-red-500">{errors.routingNumber}</p>
                        )}
                      </div>

                      {/* Account Number */}
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber" className="text-sm font-medium">
                          Account Number
                        </Label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="accountNumber"
                            name="accountNumber"
                            placeholder="Enter account number"
                            value={formData.accountNumber}
                            onChange={handleChange}
                            className={`pl-11 h-12 ${errors.accountNumber ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.accountNumber && (
                          <p className="text-sm text-red-500">{errors.accountNumber}</p>
                        )}
                      </div>

                      {/* Name on Account */}
                      <div className="space-y-2">
                        <Label htmlFor="nameOnAccount" className="text-sm font-medium">
                          Name on Account
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="nameOnAccount"
                            name="nameOnAccount"
                            placeholder="John Doe"
                            value={formData.nameOnAccount}
                            onChange={handleChange}
                            className={`pl-11 h-12 ${errors.nameOnAccount ? "border-red-500" : ""}`}
                          />
                        </div>
                        {errors.nameOnAccount && (
                          <p className="text-sm text-red-500">{errors.nameOnAccount}</p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card className="shadow-lg border-0 mt-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Street Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">
                      Street Address
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="address"
                        name="address"
                        placeholder="123 Main Street"
                        value={formData.address}
                        onChange={handleChange}
                        className={`pl-11 h-12 ${errors.address ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors.address && (
                      <p className="text-sm text-red-500">{errors.address}</p>
                    )}
                  </div>

                  {/* City & State */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-medium">
                        City
                      </Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="city"
                          name="city"
                          placeholder="New York"
                          value={formData.city}
                          onChange={handleChange}
                          className={`pl-11 h-12 ${errors.city ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.city && (
                        <p className="text-sm text-red-500">{errors.city}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm font-medium">
                        State
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="state"
                          name="state"
                          placeholder="NY"
                          value={formData.state}
                          onChange={handleChange}
                          className={`pl-11 h-12 ${errors.state ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.state && (
                        <p className="text-sm text-red-500">{errors.state}</p>
                      )}
                    </div>
                  </div>

                  {/* ZIP & Country */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip" className="text-sm font-medium">
                        ZIP Code
                      </Label>
                      <Input
                        id="zip"
                        name="zip"
                        placeholder="10001"
                        value={formData.zip}
                        onChange={handleChange}
                        className={`h-12 ${errors.zip ? "border-red-500" : ""}`}
                      />
                      {errors.zip && (
                        <p className="text-sm text-red-500">{errors.zip}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm font-medium">
                        Country
                      </Label>
                      <Input
                        id="country"
                        name="country"
                        placeholder="USA"
                        value={formData.country}
                        onChange={handleChange}
                        className="h-12"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button - Mobile */}
              <div className="lg:hidden mt-6">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay ${formData.amount.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Order Summary - Right Side */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Order Summary Card */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gray-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Cart Items Preview */}
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {cartItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name || "Product"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity || 1}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          ${(item.price || 0).toFixed(2)}
                        </p>
                      </div>
                    ))}
                    {cartItems.length > 3 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        +{cartItems.length - 3} more items
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        {totalShippingCost === 0 ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            FREE
                          </Badge>
                        ) : (
                          `$${totalShippingCost.toFixed(2)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({taxper || 0}%)</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-emerald-600">${formData.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button - Desktop */}
              <div className="hidden lg:block">
                <Button
                  type="submit"
                  form="payment-form"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pay ${formData.amount.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>

              {/* Security Badges */}
              <Card className="border-0 bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs">SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Lock className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs">256-bit Encryption</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Your payment information is encrypted and secure. We never store your full card details.
                  </p>
                </CardContent>
              </Card>

              {/* Accepted Cards */}
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="px-3 py-1 bg-white rounded border text-xs font-semibold text-blue-600">VISA</div>
                <div className="px-3 py-1 bg-white rounded border text-xs font-semibold text-red-600">MasterCard</div>
                <div className="px-3 py-1 bg-white rounded border text-xs font-semibold text-blue-800">AMEX</div>
                <div className="px-3 py-1 bg-white rounded border text-xs font-semibold text-orange-600">Discover</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderPaymentForm;
