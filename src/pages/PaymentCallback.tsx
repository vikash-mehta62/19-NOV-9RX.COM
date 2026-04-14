import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "../../axiosconfig";
import { supabase } from "@/integrations/supabase/client";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import { processPaymentIPOSPay } from "@/services/paymentService";
import {
  formatCardType,
  isPaymentSuccessful,
  normalizePaymentResult,
  parseCallbackResponse,
  queryIPOSPayStatus,
  type IPosNormalizedPaymentResult,
  type IPosPaymentCallbackData,
} from "@/services/iPosPayService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<IPosPaymentCallbackData | null>(null);
  const [paymentResult, setPaymentResult] = useState<IPosNormalizedPaymentResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [retryOrderId, setRetryOrderId] = useState<string | null>(null);
  const ordersPath =
    sessionStorage.getItem("userType") === "admin"
      ? "/admin/orders"
      : sessionStorage.getItem("userType") === "group"
        ? "/group/orders"
        : "/pharmacy/orders";

  useEffect(() => {
    void handlePaymentCallback();
  }, [searchParams]);

  const handlePaymentCallback = async () => {
    try {
      const pendingPaymentStr = localStorage.getItem("pending_payment");
      if (!pendingPaymentStr) {
        console.error("No pending payment found");
        setLoading(false);
        return;
      }

      const pendingPayment = JSON.parse(pendingPaymentStr);
      setRetryOrderId(pendingPayment?.orderId || null);

      const responseCode = searchParams.get("responseCode");
      const responseMessage = searchParams.get("responseMessage");
      const transactionId = searchParams.get("transactionId");
      const transactionReferenceId = searchParams.get("transactionReferenceId") || pendingPayment.transactionReferenceId;
      const amount = searchParams.get("amount");
      const totalAmount = searchParams.get("totalAmount");
      const cardType = searchParams.get("cardType") || searchParams.get("CardType") || searchParams.get("label");
      const cardLast4Digit = searchParams.get("cardLast4Digit") || searchParams.get("maskedPan")?.slice(-4);
      const cardToken = searchParams.get("cardToken");
      const tips = searchParams.get("tips");
      const customFee = searchParams.get("customFee");
      const localTax = searchParams.get("localTax");
      const stateTax = searchParams.get("stateTax");
      const errResponseCode = searchParams.get("errResponseCode");
      const errResponseMessage = searchParams.get("errResponseMessage");
      const paymentMethod = searchParams.get("paymentMethod");
      const achAccountType = searchParams.get("accountType");
      const achAccountLast4 = searchParams.get("accountLast4");
      const routingNumber = searchParams.get("routingNumber");
      const achToken = searchParams.get("achToken");

      let parsedData = parseCallbackResponse({
        responseCode: responseCode ? parseInt(responseCode, 10) : undefined,
        responseMessage: responseMessage || "",
        transactionId: transactionId || "",
        transactionReferenceId,
        transactionType: 1,
        amount,
        totalAmount: totalAmount || amount,
        tips,
        customFee,
        localTax,
        stateTax,
        cardType,
        cardLast4Digit,
        cardToken,
        errResponseCode: errResponseCode || "",
        errResponseMessage: errResponseMessage || "",
        paymentMethod,
        accountType: achAccountType || undefined,
        accountLast4: achAccountLast4 || undefined,
        routingNumber: routingNumber || undefined,
        achToken: achToken || undefined,
      });

      if (transactionReferenceId) {
        const queryResult = await queryIPOSPayStatus(transactionReferenceId);
        if (queryResult.success && queryResult.data) {
          parsedData = {
            ...queryResult.data,
            paymentMethod: queryResult.data.paymentMethod || (paymentMethod === "ACH" ? "ach" : "card"),
            accountType: queryResult.data.accountType || achAccountType || undefined,
            accountLast4: queryResult.data.accountLast4 || achAccountLast4 || undefined,
            routingNumber: queryResult.data.routingNumber || routingNumber || undefined,
            achToken: queryResult.data.achToken || achToken || undefined,
          };
        }
      }

      const normalizedResult = normalizePaymentResult(parsedData);

      setPaymentData(parsedData);
      setPaymentResult(normalizedResult);

      if (normalizedResult.status === "success") {
        setProcessing(true);
        await processSuccessfulPayment(pendingPayment, parsedData, normalizedResult);
        setProcessing(false);
        localStorage.removeItem("pending_payment");
      } else {
        await logFailedPayment(pendingPayment, parsedData, normalizedResult);
      }

      setLoading(false);
    } catch (error) {
      console.error("Payment callback error:", error);
      toast.error("Error processing payment callback");
      setProcessing(false);
      setLoading(false);
    }
  };

  const processSuccessfulPayment = async (
    pendingPayment: any,
    callbackData: IPosPaymentCallbackData,
    result: IPosNormalizedPaymentResult,
  ) => {
    try {
      if (pendingPayment.flowType === "create_order") {
        const createdOrder = await createOrderFromPendingPayment(pendingPayment, callbackData, result);
        setCompletedOrderNumber(createdOrder.orderNumber);
        toast.success("Payment successful! Order created.");
        return;
      }

      if (pendingPayment.flowType === "pharmacy_checkout") {
        const createdLocalOrder = finalizePharmacyCheckout(pendingPayment, result);
        setCompletedOrderNumber(createdLocalOrder.orderNumber);
        toast.success("Payment successful! Order placed.");
        return;
      }

      const orderId = pendingPayment.orderId;

      const { data: existingTransaction } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("transaction_id", callbackData.transactionId)
        .maybeSingle();

      if (existingTransaction) {
        toast.success("Payment already recorded.");
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        throw new Error("Order not found");
      }

      const currentPaid = Number(order.paid_amount || 0);
      const currentTotal = Number(order.total_amount || 0);
      const previousProcessingFee = Number(order.processing_fee_amount || 0);

      const chargedAmount = result.chargedAmount;
      const processingFee = result.processingFee;
      const newPaidAmount = currentPaid + chargedAmount;
      const newTotalAmount = currentTotal + processingFee;
      const totalProcessingFee = previousProcessingFee + processingFee;
      const newPaymentStatus = newPaidAmount >= newTotalAmount - 0.01 ? "paid" : "partial_paid";

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          total_amount: newTotalAmount,
          processing_fee_amount: totalProcessingFee,
          payment_method: result.paymentMethod,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      const { error: logError } = await supabase.from("payment_transactions").insert({
        profile_id: order.profile_id,
        order_id: orderId,
        transaction_id: callbackData.transactionId,
        auth_code: callbackData.responseApprovalCode,
        transaction_type: "auth_capture",
        amount: chargedAmount,
        payment_method_type: result.paymentMethod,
        card_last_four: result.paymentMethod === "ach" ? result.accountLast4 : result.cardLast4Digit,
        card_type: result.paymentMethod === "ach" ? result.accountType : callbackData.cardType?.toLowerCase(),
        status: "approved",
        processor: "ipospay",
        response_code: callbackData.responseCode.toString(),
        response_message: callbackData.responseMessage,
        raw_response: {
          ...callbackData,
          normalizedResult: result,
        },
      });

      if (logError) {
        console.error("Failed to log transaction:", logError);
      }

      if (newPaymentStatus === "paid" && order.payment_status !== "paid") {
        try {
          await deductInventory(orderId);
        } catch (inventoryError) {
          console.error("Inventory deduction failed:", inventoryError);
        }
      }

      if (newPaymentStatus === "paid") {
        try {
          await createInvoiceForOrder(orderId, order, newTotalAmount, totalProcessingFee, result.paymentMethod);
        } catch (invoiceError) {
          console.error("Invoice creation failed:", invoiceError);
        }
      }

      try {
        await sendPaymentConfirmationEmail(order, result);
      } catch (emailError) {
        console.error("Email send failed:", emailError);
      }

      toast.success("Payment successful! Order updated.");
    } catch (error) {
      console.error("Error processing successful payment:", error);
      toast.error("Payment received but order update failed. Please contact support.");
      throw error;
    }
  };

  const createOrderFromPendingPayment = async (
    pendingPayment: any,
    callbackData: IPosPaymentCallbackData,
    result: IPosNormalizedPaymentResult,
  ) => {
    const data = pendingPayment.formDataa;
    const cleanedCartItems = pendingPayment.cartItems || data?.items || [];
    const orderSubtotal = Number(pendingPayment.orderSubtotal || 0);
    const taxAmount = Number(pendingPayment.orderTax || 0);
    const shippingAmount = Number(pendingPayment.orderShipping || 0);
    const discountAmount = Number(pendingPayment.discountAmount || 0);
    const defaultEstimatedDelivery = new Date();
    defaultEstimatedDelivery.setDate(defaultEstimatedDelivery.getDate() + 10);

    let profileId: string | null = null;
    const userType = sessionStorage.getItem("userType");
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (userType === "admin") {
      profileId = pendingPayment.pId || data?.customer || null;
    } else if (userType === "group") {
      profileId = pendingPayment.pId || null;
    } else {
      profileId = session?.user?.id || null;
    }

    if (!profileId) {
      throw new Error("Unable to determine customer profile for the new order.");
    }

    const orderNumber = await generateOrderId();
    if (!orderNumber) {
      throw new Error("Failed to generate order number");
    }

    const baseAmount = Number(pendingPayment.baseAmount || result.baseAmount || 0);
    const processingFee = Number(result.processingFee || 0);
    const chargedAmount = Number(result.chargedAmount || baseAmount);
    const orderTotal = Number((baseAmount + processingFee).toFixed(2));

    const orderPayload = {
      profile_id: profileId,
      location_id: pendingPayment.pId || null,
      status: data?.status || "new",
      order_number: orderNumber,
      total_amount: orderTotal,
      shipping_cost: shippingAmount,
      tax_amount: taxAmount,
      items: cleanedCartItems,
      payment_status: "paid",
      payment_method: result.paymentMethod,
      paid_amount: chargedAmount,
      notes: data?.specialInstructions,
      shipping_method: data?.shipping?.method,
      customerInfo: data?.customerInfo,
      shippingAddress: data?.shippingAddress,
      tracking_number: data?.shipping?.trackingNumber,
      estimated_delivery: data?.shipping?.estimatedDelivery || defaultEstimatedDelivery.toISOString(),
      customization: pendingPayment.isCus || false,
      void: false,
      discount_amount: discountAmount,
      discount_details: pendingPayment.discountDetails || data?.appliedDiscounts || [],
      processing_fee_amount: processingFee,
    };

    const { data: insertedOrder, error: orderInsertError } = await supabase
      .from("orders")
      .insert(orderPayload as any)
      .select()
      .single();

    if (orderInsertError || !insertedOrder) {
      throw new Error(orderInsertError?.message || "Failed to create order");
    }

    const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");
    const subtotal = orderSubtotal || baseAmount - shippingAmount - taxAmount + discountAmount;
    const dueDate = new Date(insertedOrder.estimated_delivery || Date.now());
    dueDate.setDate(dueDate.getDate() + 30);

    const { error: invoiceError } = await supabase.from("invoices").insert({
      invoice_number: invoiceNumber || `INV-${Date.now()}`,
      order_id: insertedOrder.id,
      profile_id: insertedOrder.profile_id,
      due_date: dueDate.toISOString(),
      status: "pending",
      amount: baseAmount,
      tax_amount: taxAmount,
      total_amount: orderTotal,
      processing_fee_amount: processingFee,
      payment_status: "paid",
      payment_method: result.paymentMethod,
      payment_transication: callbackData.transactionId,
      shippin_cost: shippingAmount,
      notes: insertedOrder.notes || null,
      items: insertedOrder.items || [],
      customer_info: insertedOrder.customerInfo || {},
      shipping_info: insertedOrder.shippingAddress || {},
      subtotal,
      paid_amount: chargedAmount,
      discount_amount: discountAmount,
      discount_details: pendingPayment.discountDetails || [],
    } as any);

    if (invoiceError) {
      throw new Error(invoiceError.message || "Failed to create invoice");
    }

    const { error: paymentLogError } = await supabase.from("payment_transactions").insert({
      profile_id: insertedOrder.profile_id,
      order_id: insertedOrder.id,
      transaction_id: callbackData.transactionId,
      auth_code: callbackData.responseApprovalCode,
      transaction_type: "auth_capture",
      amount: chargedAmount,
      payment_method_type: result.paymentMethod,
      card_last_four: result.paymentMethod === "ach" ? result.accountLast4 : result.cardLast4Digit,
      card_type: result.paymentMethod === "ach" ? result.accountType : callbackData.cardType?.toLowerCase(),
      status: "approved",
      processor: "ipospay",
      response_code: callbackData.responseCode.toString(),
      response_message: callbackData.responseMessage,
      raw_response: {
        ...callbackData,
        normalizedResult: result,
        flowType: pendingPayment.flowType,
      },
    });

    if (paymentLogError) {
      throw new Error(paymentLogError.message || "Failed to log payment transaction");
    }

    await deductInventory(insertedOrder.id);
    localStorage.removeItem("cartItems");

    return {
      orderId: insertedOrder.id,
      orderNumber: insertedOrder.order_number,
    };
  };

  const finalizePharmacyCheckout = (
    pendingPayment: any,
    result: IPosNormalizedPaymentResult,
  ) => {
    const orderDraft = pendingPayment.orderDraft || {};
    const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    const orderNumber = `RX-${Date.now()}`;
    const finalizedOrder = {
      ...orderDraft,
      orderNumber,
      status: "paid",
      paymentStatus: "paid",
      paymentMethod: result.paymentMethod,
      processingFeeAmount: result.processingFee,
      chargedAmount: result.chargedAmount,
      transactionId: result.transactionId,
      total: Number((Number(orderDraft.total || pendingPayment.baseAmount || 0) + result.processingFee).toFixed(2)),
    };

    existingOrders.push(finalizedOrder);
    localStorage.setItem("orders", JSON.stringify(existingOrders));
    localStorage.removeItem("cartItems");

    return {
      orderNumber,
    };
  };

  const logFailedPayment = async (
    pendingPayment: any,
    callbackData: IPosPaymentCallbackData,
    result: IPosNormalizedPaymentResult,
  ) => {
    try {
      const orderId = pendingPayment.orderId;
      const order = orderId
        ? await supabase
            .from("orders")
            .select("profile_id, payment_status")
            .eq("id", orderId)
            .maybeSingle()
        : { data: null };

      const currentOrderPaymentStatus = String(order.data?.payment_status || "").toLowerCase();
      if (
        orderId &&
        !["paid", "partial_paid"].includes(currentOrderPaymentStatus)
      ) {
        const { error: pendingStatusError } = await supabase
          .from("orders")
          .update({
            payment_status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        if (pendingStatusError) {
          console.error("Failed to keep order payment status pending:", pendingStatusError);
        }
      }

      await supabase.from("payment_transactions").insert({
        profile_id: order.data?.profile_id,
        order_id: orderId,
        transaction_id: callbackData.transactionId,
        transaction_type: "auth_capture",
        amount: result.chargedAmount || pendingPayment.amount || pendingPayment.baseAmount || 0,
        payment_method_type: result.paymentMethod,
        status: "declined",
        processor: "ipospay",
        response_code: callbackData.responseCode.toString(),
        response_message: callbackData.responseMessage,
        error_message: callbackData.errResponseMessage,
        raw_response: {
          ...callbackData,
          normalizedResult: result,
        },
      });

      toast.error(`Payment failed: ${callbackData.responseMessage}`);
    } catch (error) {
      console.error("Error logging failed payment:", error);
    }
  };

  const deductInventory = async (orderId: string) => {
    const { error } = await supabase.rpc("deduct_order_stock_after_payment_atomic", {
      p_order_id: orderId,
    });

    if (error) {
      throw new Error(`Inventory deduction failed: ${error.message}`);
    }
  };

  const createInvoiceForOrder = async (
    orderId: string,
    order: any,
    totalAmount: number,
    processingFeeAmount: number,
    paymentMethod: "card" | "ach",
  ) => {
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existing) return;

    const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");
    const dueDate = new Date(order.estimated_delivery || Date.now());
    dueDate.setDate(dueDate.getDate() + 30);

    const { error } = await supabase.from("invoices").insert({
      invoice_number: invoiceNumber || `INV-${Date.now()}`,
      order_id: orderId,
      due_date: dueDate.toISOString(),
      profile_id: order.profile_id || order.customer,
      status: "pending",
      amount: order.subtotal || totalAmount,
      tax_amount: order.tax_amount || 0,
      total_amount: totalAmount,
      processing_fee_amount: processingFeeAmount,
      payment_status: "paid",
      payment_method: paymentMethod,
      items: order.items,
      customer_info: order.customerInfo,
      shipping_info: order.shippingAddress,
    });

    if (error) {
      throw new Error(`Invoice creation failed: ${error.message}`);
    }
  };

  const sendPaymentConfirmationEmail = async (order: any, result: IPosNormalizedPaymentResult) => {
    console.log("Send confirmation email", { orderId: order.id, result });
  };

  const handleRetryPayment = async () => {
    try {
      setRetrying(true);
      const pendingPaymentStr = localStorage.getItem("pending_payment");
      const pendingPayment = pendingPaymentStr ? JSON.parse(pendingPaymentStr) : null;
      const targetOrderId = pendingPayment?.orderId || retryOrderId;

      if (!targetOrderId) {
        toast.error("Order not found for retry");
        return;
      }

      // Recalculate amount from latest order data (same as pay-now modal flow)
      const { data: orderResponse } = await axios.get(`/api/pay-now-order/${targetOrderId}`);
      const orderData = orderResponse?.order;
      if (!orderData) {
        toast.error("Failed to load order for retry");
        return;
      }

      const orderTotalAmount = Number(orderData.total_amount || 0);
      const orderProcessingFee = Number(orderData.processing_fee_amount || 0);
      const paidAmount = Number(orderData.paid_amount || 0);
      // Retry should charge only the actual order base amount (no extra retry card fee).
      const fallbackBaseAmount = Math.max(0, (orderTotalAmount - orderProcessingFee) - paidAmount);
      const baseAmount = Number(
        Math.max(0, Number(pendingPayment?.baseAmount || 0) || fallbackBaseAmount).toFixed(2)
      );

      if (baseAmount <= 0) {
        toast.error("Order already paid");
        return;
      }

      const cardProcessingFee = 0;
      const targetAmount = baseAmount;

      const iPosResult = await processPaymentIPOSPay(
        targetAmount,
        targetOrderId,
        pendingPayment?.customerName || orderData?.customerInfo?.name || "Customer",
        pendingPayment?.customerEmail || orderData?.customerInfo?.email,
        pendingPayment?.customerPhone || orderData?.customerInfo?.phone,
        `Order #${pendingPayment?.orderNumber || orderData?.order_number || targetOrderId}`,
        pendingPayment?.merchantName || orderData?.business_name || "Your Store",
        pendingPayment?.logoUrl || orderData?.logo_url
      );

      if (iPosResult.success && iPosResult.paymentUrl) {
        localStorage.setItem(
          "pending_payment",
          JSON.stringify({
            ...(pendingPayment || {}),
            orderId: targetOrderId,
            orderNumber: pendingPayment?.orderNumber || orderData?.order_number,
            amount: targetAmount,
            baseAmount,
            processingFee: cardProcessingFee,
            customerName: pendingPayment?.customerName || orderData?.customerInfo?.name || "Customer",
            customerEmail: pendingPayment?.customerEmail || orderData?.customerInfo?.email,
            customerPhone: pendingPayment?.customerPhone || orderData?.customerInfo?.phone,
            merchantName: pendingPayment?.merchantName || orderData?.business_name || "Your Store",
            logoUrl: pendingPayment?.logoUrl || orderData?.logo_url,
            transactionReferenceId: iPosResult.transactionReferenceId || pendingPayment?.transactionReferenceId,
            timestamp: new Date().toISOString(),
          })
        );
        window.location.href = iPosResult.paymentUrl;
        return;
      }

      toast.error(iPosResult.error || "Retry payment failed");
    } catch (error: any) {
      console.error("Direct iPOS retry failed:", error);
      toast.error(error?.message || "Retry payment failed");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-lg font-medium">Processing payment...</p>
              <p className="text-sm text-muted-foreground">Please wait while we verify your payment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-green-600" />
              <p className="text-lg font-medium">Updating order...</p>
              <p className="text-sm text-muted-foreground">Finalizing invoice and order records</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentData || !paymentResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              Invalid Payment Response
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              No payment data was available for this callback.
            </p>
            <Button onClick={() => navigate(ordersPath)} className="w-full">
              Go to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const success = paymentResult.status === "success";
  const displayMethod =
    paymentResult.paymentMethod === "ach"
      ? `ACH - ${paymentResult.accountType || "Bank"} •••• ${paymentResult.accountLast4 || ""}`.trim()
      : `${formatCardType(paymentData.cardType)}${paymentResult.cardLast4Digit ? ` •••• ${paymentResult.cardLast4Digit}` : ""}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-green-900">Payment Successful!</span>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                <span className="text-red-900">Payment Failed</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`font-medium ${success ? "text-green-600" : "text-red-600"}`}>
                {paymentData.responseMessage}
              </span>
            </div>

            {paymentData.transactionId && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-sm">{paymentData.transactionId}</span>
              </div>
            )}

            {paymentData.transactionReferenceId && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Reference ID</span>
                <span className="font-mono text-xs">{paymentData.transactionReferenceId}</span>
              </div>
            )}

            {completedOrderNumber && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Order Number</span>
                <span className="font-medium">{completedOrderNumber}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Applied to Order</span>
              <span className="font-medium">${paymentResult.baseAmount.toFixed(2)}</span>
            </div>

            {paymentResult.processingFee > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Card Processing Fee</span>
                <span className="font-medium text-amber-700">${paymentResult.processingFee.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Total Charged</span>
              <span className="font-bold text-lg">${paymentResult.chargedAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="font-medium">{displayMethod}</span>
            </div>

            {paymentData.responseApprovalCode && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Approval Code</span>
                <span className="font-mono text-sm">{paymentData.responseApprovalCode}</span>
              </div>
            )}

            {!success && paymentData.errResponseMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-1">Error Details</p>
                <p className="text-sm text-red-800">{paymentData.errResponseMessage}</p>
                {paymentData.errResponseCode && (
                  <p className="text-xs text-red-600 mt-1">Error Code: {paymentData.errResponseCode}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => navigate(ordersPath)}
              className="w-full"
              variant={success ? "default" : "outline"}
            >
              {success ? "View Orders" : "Back to Orders"}
            </Button>

            {!success && (
              <Button
                onClick={handleRetryPayment}
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={retrying}
              >
                {retrying ? "Retrying..." : "Try Again"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
