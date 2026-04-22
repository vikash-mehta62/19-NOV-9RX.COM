import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "../../axiosconfig";
import { supabase } from "@/integrations/supabase/client";
import { generateOrderId } from "@/components/orders/utils/orderUtils";
import { processPaymentIPOSPay } from "@/services/paymentService";
import { OrderActivityService } from "@/services/orderActivityService";
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
  const [paymentFlowType, setPaymentFlowType] = useState<string | null>(null);
  const ordersPath =
    sessionStorage.getItem("userType") === "admin"
      ? "/admin/orders"
      : sessionStorage.getItem("userType") === "group"
        ? "/group/orders"
        : "/pharmacy/orders";

  useEffect(() => {
    void handlePaymentCallback();
  }, [searchParams]);

  const resolveGatewayPaymentMethod = (
    source: Partial<IPosPaymentCallbackData> & { cardType?: string; paymentMethod?: string },
    fallback: "card" | "ach" = "card",
  ): "card" | "ach" => {
    const methodText = String(source.paymentMethod || "").toUpperCase();
    const cardTypeText = String(source.cardType || "").toUpperCase();

    if (
      methodText.includes("ACH") ||
      methodText.includes("BANK") ||
      methodText.includes("CHECK") ||
      cardTypeText === "CHECK" ||
      Boolean(source.accountType) ||
      Boolean(source.accountLast4) ||
      Boolean(source.routingNumber) ||
      Boolean(source.achToken)
    ) {
      return "ach";
    }

    if (methodText.includes("CARD")) return "card";
    return fallback;
  };

  const handlePaymentCallback = async () => {
    try {
      const pendingPaymentStr = localStorage.getItem("pending_payment");
      if (!pendingPaymentStr) {
        console.error("No pending payment found");
        setLoading(false);
        return;
      }

      const pendingPayment = JSON.parse(pendingPaymentStr);
      setPaymentFlowType(pendingPayment?.flowType || null);
      setRetryOrderId(pendingPayment?.orderId || null);

      const responseCode = searchParams.get("responseCode");
      const responseMessage = searchParams.get("responseMessage");
      const transactionId = searchParams.get("transactionId");
      const transactionReferenceId = searchParams.get("transactionReferenceId") || pendingPayment.transactionReferenceId;
      const amount = searchParams.get("amount");
      const amt = searchParams.get("amt");
      const totalAmount = searchParams.get("totalAmount");
      const totalAmt = searchParams.get("totalAmt");
      const transactionTypeParam = searchParams.get("transactionType");
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
      const achAccountMaskedNumber = searchParams.get("accountNumber");
      const achAccountLast4 =
        searchParams.get("accountLast4") ||
        String(achAccountMaskedNumber || "").replace(/\D/g, "").slice(-4) ||
        null;
      const routingNumber = searchParams.get("routingNumber");
      const achToken = searchParams.get("achToken");
      const providerName = searchParams.get("providerName");
      const callbackHasAchSignals =
        String(transactionTypeParam || "") === "10" ||
        String(cardType || "").toUpperCase() === "CHECK" ||
        String(providerName || "").toUpperCase().includes("ACH") ||
        Boolean(String(achAccountMaskedNumber || "").trim()) ||
        Boolean(String(achToken || "").trim());

      let parsedData = parseCallbackResponse({
        responseCode: responseCode ? parseInt(responseCode, 10) : undefined,
        responseMessage: responseMessage || "",
        transactionId: transactionId || "",
        transactionReferenceId,
        transactionType: transactionTypeParam ? parseInt(transactionTypeParam, 10) : 1,
        amount: amount || amt,
        totalAmount: totalAmount || totalAmt || amount || amt,
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
        providerName: providerName || undefined,
        accountNumber: achAccountMaskedNumber || undefined,
        accountType: achAccountType || undefined,
        accountLast4: achAccountLast4 || undefined,
        routingNumber: routingNumber || undefined,
        achToken: achToken || undefined,
      });

      // Fallbacks for failed/incomplete callback payloads from iPOS
      parsedData = {
        ...parsedData,
        paymentMethod: resolveGatewayPaymentMethod(
          {
            ...parsedData,
            paymentMethod: parsedData.paymentMethod || paymentMethod || pendingPayment?.paymentMethod,
            cardType: parsedData.cardType || cardType || undefined,
          },
          String(pendingPayment?.paymentMethod || "").toLowerCase() === "ach" ? "ach" : "card",
        ),
        amount:
          Number(parsedData.amount || 0) > 0
            ? parsedData.amount
            : Number(pendingPayment?.baseAmount || pendingPayment?.amount || 0),
        totalAmount:
          Number(parsedData.totalAmount || 0) > 0
            ? parsedData.totalAmount
            : Number(pendingPayment?.estimatedChargedAmount || pendingPayment?.amount || pendingPayment?.baseAmount || 0),
      };

      if (transactionReferenceId) {
        const queryResult = await queryIPOSPayStatus(transactionReferenceId);
        if (queryResult.success && queryResult.data) {
          const queryData = queryResult.data;
          parsedData = {
            ...parsedData,
            ...queryData,
            // Prefer non-zero local values when query payload is empty/incomplete
            amount: Number(queryData.amount || 0) > 0 ? queryData.amount : parsedData.amount,
            totalAmount: Number(queryData.totalAmount || 0) > 0 ? queryData.totalAmount : parsedData.totalAmount,
            paymentMethod: resolveGatewayPaymentMethod(
              {
                ...queryData,
                paymentMethod: queryData.paymentMethod || parsedData.paymentMethod || paymentMethod || pendingPayment?.paymentMethod,
                cardType: queryData.cardType || parsedData.cardType || cardType || undefined,
              },
              parsedData.paymentMethod || "card",
            ),
            accountType: queryData.accountType || achAccountType || undefined,
            accountLast4: queryData.accountLast4 || achAccountLast4 || undefined,
            routingNumber: queryData.routingNumber || routingNumber || undefined,
            achToken: queryData.achToken || achToken || undefined,
          };
        }
      }

      if (pendingPayment?.flowType === "credit_line_payment") {
        const creditAmount = Number(
          (
            Number(pendingPayment?.baseAmount || pendingPayment?.amount || parsedData.amount || 0)
          ).toFixed(2)
        );
        const creditPaymentMethod = resolveGatewayPaymentMethod(
          {
            ...parsedData,
            paymentMethod: parsedData.paymentMethod || paymentMethod || pendingPayment?.paymentMethod,
            cardType: parsedData.cardType || cardType || undefined,
          },
          String(pendingPayment?.paymentMethod || "").toLowerCase() === "ach" ? "ach" : "card",
        );

        parsedData = {
          ...parsedData,
          paymentMethod: creditPaymentMethod,
          amount: Number(parsedData.amount || 0) > 0 ? parsedData.amount : creditAmount,
          totalAmount: Number(parsedData.totalAmount || 0) > 0 ? parsedData.totalAmount : creditAmount,
        };
      }

      // Hard guard: callback ACH signals must win over any stale fallback/query value.
      if (callbackHasAchSignals) {
        parsedData = {
          ...parsedData,
          paymentMethod: "ach",
          cardType: parsedData.cardType || cardType || "CHECK",
          accountLast4:
            parsedData.accountLast4 ||
            String(achAccountMaskedNumber || "").replace(/\D/g, "").slice(-4) ||
            achAccountLast4 ||
            undefined,
          achToken: parsedData.achToken || achToken || undefined,
        };
      }

      const normalizedResult = normalizePaymentResult(parsedData);

      setPaymentData(parsedData);
      setPaymentResult(normalizedResult);
      try {
        localStorage.setItem(
          "pending_payment",
          JSON.stringify({
            ...(pendingPayment || {}),
            paymentMethod: parsedData.paymentMethod || pendingPayment?.paymentMethod || "card",
            amount:
              Number(parsedData.amount || 0) > 0
                ? Number(parsedData.amount)
                : Number(pendingPayment?.amount || pendingPayment?.baseAmount || 0),
            baseAmount:
              Number(parsedData.amount || 0) > 0
                ? Number(parsedData.amount)
                : Number(pendingPayment?.baseAmount || pendingPayment?.amount || 0),
            estimatedChargedAmount:
              Number(parsedData.totalAmount || 0) > 0
                ? Number(parsedData.totalAmount)
                : Number(
                    pendingPayment?.estimatedChargedAmount ||
                      pendingPayment?.amount ||
                      pendingPayment?.baseAmount ||
                      0
                  ),
          }),
        );
      } catch (pendingSyncError) {
        console.error("Failed to sync pending payment callback data:", pendingSyncError);
      }

      if (normalizedResult.status === "success") {
        setProcessing(true);
        await processSuccessfulPayment(pendingPayment, parsedData, normalizedResult);
        setProcessing(false);
        localStorage.removeItem("pending_payment");
      } else {
        if (pendingPayment?.flowType === "credit_line_payment") {
          await logFailedCreditLinePayment(pendingPayment, parsedData, normalizedResult);
        } else {
          await logFailedPayment(pendingPayment, parsedData, normalizedResult);
        }
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

      if (pendingPayment.flowType === "credit_line_payment") {
        const creditResult = await finalizeCreditLinePayment(pendingPayment, result);
        if (creditResult.applied) {
          toast.success("Credit payment applied successfully.");
        } else {
          toast.error(creditResult.warning || "Payment captured, but allocation needs review.");
        }
        return;
      }

      const orderId = pendingPayment.orderId;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const isDirectOrderFlow = !pendingPayment?.flowType;

      const finalizeViaServer = async () => {
        const response = await axios.post("/api/pay-now-ipospay-callback", {
          orderId,
          callbackData,
          result,
          pendingPayment: {
            orderId: pendingPayment?.orderId,
            orderNumber: pendingPayment?.orderNumber,
            transactionReferenceId: pendingPayment?.transactionReferenceId,
          },
        });

        if (!response?.data?.success) {
          throw new Error(response?.data?.message || "Server callback processing failed");
        }

        if (response?.data?.orderNumber) {
          setCompletedOrderNumber(response.data.orderNumber);
        }

        toast.success(response?.data?.message || "Payment successful! Order updated.");
      };

      if (isDirectOrderFlow && !session?.user?.id) {
        await finalizeViaServer();
        return;
      }

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
        .maybeSingle();

      if (orderError || !order) {
        const combinedErrorMessage = `${orderError?.message || ""} ${orderError?.details || ""}`.toLowerCase();
        const authOrRlsFailure =
          combinedErrorMessage.includes("jwt") ||
          combinedErrorMessage.includes("unauthorized") ||
          combinedErrorMessage.includes("permission") ||
          combinedErrorMessage.includes("rls");

        if (isDirectOrderFlow && authOrRlsFailure) {
          await finalizeViaServer();
          return;
        }
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

      try {
        await OrderActivityService.logPaymentReceived({
          orderId,
          orderNumber: order.order_number || orderId,
          amount: result.baseAmount || chargedAmount,
          chargedAmount,
          processingFeeAmount: processingFee,
          paymentMethod: result.paymentMethod,
          paymentId: callbackData.transactionId || callbackData.transactionReferenceId,
        });
      } catch (activityError) {
        console.error("Failed to log payment activity:", activityError);
      }

      if (newPaymentStatus === "paid" && order.payment_status !== "paid") {
        try {
          await deductInventory(orderId);
        } catch (inventoryError) {
          console.error("Inventory deduction failed:", inventoryError);
        }
      }

      if (
        newPaymentStatus === "paid" &&
        ["unpaid", "pending", "partial_paid"].includes(String(order.payment_status || "").toLowerCase()) &&
        String(order.payment_method || "").toLowerCase() !== "credit"
      ) {
        try {
          const rewardUserId = order.profile_id || order.location_id || order.customer;
          const rewardOrderTotal = Number(newTotalAmount || 0);
          await maybeAwardOrderPoints(rewardUserId, orderId, rewardOrderTotal, order.order_number || orderId);
        } catch (rewardError) {
          console.error("Reward points award failed:", rewardError);
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
      .maybeSingle();

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
      discount_details: pendingPayment.discountDetails || data?.appliedDiscounts || [],
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

    try {
      await OrderActivityService.logPaymentReceived({
        orderId: insertedOrder.id,
        orderNumber: insertedOrder.order_number || orderNumber,
        amount: baseAmount,
        chargedAmount,
        processingFeeAmount: processingFee,
        paymentMethod: result.paymentMethod,
        paymentId: callbackData.transactionId || callbackData.transactionReferenceId,
      });
    } catch (activityError) {
      console.error("Failed to log callback create-order payment activity:", activityError);
    }

    const appliedDiscounts = pendingPayment.discountDetails || data?.appliedDiscounts || [];
    await applyPendingOrderDiscounts({
      orderId: insertedOrder.id,
      orderNumber: insertedOrder.order_number || orderNumber,
      customerId: insertedOrder.profile_id || profileId,
      discounts: appliedDiscounts,
    });

    await deductInventory(insertedOrder.id);

    if (String(result.paymentMethod || "").toLowerCase() !== "credit") {
      const rewardUserId = insertedOrder.profile_id || insertedOrder.location_id || pendingPayment.pId || null;
      await maybeAwardOrderPoints(rewardUserId, insertedOrder.id, orderTotal, insertedOrder.order_number || orderNumber);
    }

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

  const finalizeCreditLinePayment = async (
    pendingPayment: any,
    result: IPosNormalizedPaymentResult,
  ): Promise<{ applied: boolean; warning?: string }> => {
    const userId = pendingPayment.userId;
    const amountToApply = Number((Number(result.baseAmount || pendingPayment.baseAmount || pendingPayment.amount || 0)).toFixed(2));

    if (!userId) {
      throw new Error("Credit payment customer not found");
    }

    if (amountToApply <= 0) {
      throw new Error("Invalid credit payment amount");
    }

    const getCreditOutstanding = async (targetUserId: string) => {
      const { data: invoices } = await supabase
        .from("credit_invoices")
        .select("balance_due")
        .eq("user_id", targetUserId)
        .in("status", ["pending", "partial", "overdue"])
        .gt("balance_due", 0);

      const invoiceOutstanding = Number(
        (invoices || []).reduce((sum: number, row: any) => sum + Number(row?.balance_due || 0), 0).toFixed(2),
      );

      const { data: profileData } = await supabase
        .from("profiles")
        .select("credit_penalty")
        .eq("id", targetUserId)
        .maybeSingle();

      const profilePenalty = Number(profileData?.credit_penalty || 0);
      return Number((invoiceOutstanding + profilePenalty).toFixed(2));
    };

    const writeCreditLineTransaction = async (params: {
      status: "approved" | "pending" | "declined";
      message: string;
      allocationApplied: boolean;
      paymentResultRaw?: any;
      preOutstanding?: number;
      postOutstanding?: number;
    }) => {
      try {
        await supabase.from("payment_transactions").insert({
          profile_id: userId,
          order_id: null,
          transaction_id: result.transactionId || result.transactionReferenceId || null,
          transaction_type: "auth_capture",
          amount: amountToApply,
          payment_method_type: result.paymentMethod === "ach" ? "ach" : "card",
          card_last_four: result.paymentMethod === "ach" ? result.accountLast4 : result.cardLast4Digit,
          card_type: result.paymentMethod === "ach" ? result.accountType : result.cardType?.toLowerCase(),
          status: params.status,
          processor: "ipospay",
          response_code: "200",
          response_message: params.message,
          raw_response: {
            flowType: "credit_line_payment",
            normalizedResult: result,
            pendingPayment,
            credit_allocation: {
              applied: params.allocationApplied,
              pre_outstanding: params.preOutstanding,
              post_outstanding: params.postOutstanding,
              rpc_result: params.paymentResultRaw,
            },
          },
        });
      } catch (logError) {
        console.error("Failed to log credit line payment transaction:", logError);
      }
    };

    const rpcClient = supabase as unknown as {
      rpc: (
        fn: string,
        params: Record<string, unknown>
      ) => Promise<{ data: { success?: boolean; message?: string; error?: string } | null; error: { message?: string } | null }>;
    };

    const preOutstanding = await getCreditOutstanding(userId);

    const { data: paymentResult, error: paymentError } = await rpcClient.rpc("process_credit_payment_allocated", {
      p_user_id: userId,
      p_amount: amountToApply,
      p_payment_method: result.paymentMethod === "ach" ? "ach" : "card",
      p_transaction_id: result.transactionId || result.transactionReferenceId,
      p_card_fee: Number(result.processingFee || 0),
      p_payment_mode: pendingPayment.paymentMode || "full",
      p_target_invoice_id: null,
      p_notes: pendingPayment.notes || "iPOSPay credit line payment",
    });

    if (paymentError) {
      throw new Error(paymentError.message || "Failed to apply credit payment");
    }

    if (!paymentResult?.success) {
      const allocationMessage = String(paymentResult?.message || paymentResult?.error || "Credit payment allocation failed");
      const noAllocationApplied = allocationMessage.toLowerCase().includes("no invoice allocation was applied");

      if (noAllocationApplied) {
        const postOutstanding = await getCreditOutstanding(userId);
        const paymentLikelyApplied = postOutstanding < preOutstanding - 0.009;

        await writeCreditLineTransaction({
          status: "approved",
          message: paymentLikelyApplied
            ? "Credit payment captured and applied"
            : "Credit payment captured; allocation pending/manual review",
          allocationApplied: paymentLikelyApplied,
          paymentResultRaw: paymentResult,
          preOutstanding,
          postOutstanding,
        });

        return paymentLikelyApplied
          ? { applied: true }
          : { applied: false, warning: "Payment captured, but no invoice allocation was applied. Please review credit ledger." };
      }

      throw new Error(allocationMessage);
    }

    const postOutstanding = await getCreditOutstanding(userId);
    await writeCreditLineTransaction({
      status: "approved",
      message: result.responseMessage || "Credit line payment successful",
      allocationApplied: true,
      paymentResultRaw: paymentResult,
      preOutstanding,
      postOutstanding,
    });

    return { applied: true };
  };

  const logFailedCreditLinePayment = async (
    pendingPayment: any,
    callbackData: IPosPaymentCallbackData,
    result: IPosNormalizedPaymentResult,
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const profileId = pendingPayment?.userId || user?.id || null;
      if (!profileId) {
        toast.error(`Payment failed: ${callbackData.responseMessage || "Failed"}`);
        return;
      }

      const failedAmount = Number(
        (
          result.chargedAmount ||
          result.baseAmount ||
          pendingPayment?.baseAmount ||
          pendingPayment?.amount ||
          0
        ).toFixed(2)
      );

      await supabase.from("payment_transactions").insert({
        profile_id: profileId,
        order_id: null,
        transaction_id: callbackData.transactionId || callbackData.transactionReferenceId || null,
        transaction_type: "auth_capture",
        amount: failedAmount,
        payment_method_type: result.paymentMethod === "ach" ? "ach" : "card",
        card_last_four: result.paymentMethod === "ach" ? result.accountLast4 : result.cardLast4Digit,
        card_type: result.paymentMethod === "ach" ? result.accountType : callbackData.cardType?.toLowerCase(),
        status: "declined",
        processor: "ipospay",
        response_code: String(callbackData.responseCode || 400),
        response_message: callbackData.responseMessage || "Payment Failed",
        error_message: callbackData.errResponseMessage,
        raw_response: {
          flowType: "credit_line_payment",
          callbackData,
          normalizedResult: result,
          pendingPayment,
        },
      });

      toast.error(`Payment failed: ${callbackData.errResponseMessage || callbackData.responseMessage || "Failed"}`);
    } catch (error) {
      console.error("Error logging failed credit line payment:", error);
    }
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const requestedProfileId =
        order.data?.profile_id ||
        pendingPayment.profileId ||
        pendingPayment.userId ||
        pendingPayment.pId ||
        user?.id ||
        null;

      if (!requestedProfileId) {
        console.warn("Skipping failed payment log because no profile is available", {
          orderId,
          transactionId: callbackData.transactionId,
        });
        toast.error(`Payment failed: ${callbackData.responseMessage}`);
        return;
      }

      const failedTransactionPayload = {
        profile_id: requestedProfileId,
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
      };

      const { error: failedLogError } = await supabase
        .from("payment_transactions")
        .insert(failedTransactionPayload);

      if (failedLogError && failedLogError.code === "42501" && user?.id && user.id !== requestedProfileId) {
        const { error: retryLogError } = await supabase
          .from("payment_transactions")
          .insert({
            ...failedTransactionPayload,
            profile_id: user.id,
            raw_response: {
              ...failedTransactionPayload.raw_response,
              requestedProfileId,
              rlsFallbackProfileId: user.id,
            },
          });

        if (retryLogError) {
          console.error("Failed to log declined payment after RLS fallback:", retryLogError);
        }
      } else if (failedLogError) {
        console.error("Failed to log declined payment:", failedLogError);
      }

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

  const maybeAwardOrderPoints = async (
    userId: string | null,
    orderId: string,
    orderTotal: number,
    orderNumber: string,
  ) => {
    if (!userId || !(Number(orderTotal) > 0)) return;

    try {
      const { awardOrderPoints } = await import("@/services/rewardsService");
      const rewardResult = await awardOrderPoints(userId, orderId, Number(orderTotal), orderNumber);

      if (rewardResult?.success && Number(rewardResult.pointsEarned || 0) > 0) {
        console.log(`Reward points awarded for order ${orderNumber}: +${rewardResult.pointsEarned}`);
      }
    } catch (error) {
      console.error("Error awarding reward points from payment callback:", error);
    }
  };

  const applyPendingOrderDiscounts = async ({
    orderId,
    orderNumber,
    customerId,
    discounts,
  }: {
    orderId: string;
    orderNumber: string;
    customerId: string | null;
    discounts: any[];
  }) => {
    if (!Array.isArray(discounts) || discounts.length === 0) return;

    for (const discount of discounts) {
      try {
        if (discount?.type === "rewards" && discount?.pointsUsed && customerId) {
          const pointsToDeduct = Number(discount.pointsUsed || 0);
          if (pointsToDeduct > 0) {
            const { data: existingRedeemTx } = await supabase
              .from("reward_transactions")
              .select("id")
              .eq("reference_id", orderId)
              .eq("reference_type", "order")
              .eq("transaction_type", "redeem")
              .maybeSingle();

            if (!existingRedeemTx) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("reward_points")
                .eq("id", customerId)
                .maybeSingle();

              const currentPoints = Number(profileData?.reward_points || 0);
              const newPoints = Math.max(0, currentPoints - pointsToDeduct);

              await supabase
                .from("profiles")
                .update({ reward_points: newPoints })
                .eq("id", customerId);

              await supabase
                .from("reward_transactions")
                .insert({
                  user_id: customerId,
                  points: -pointsToDeduct,
                  transaction_type: "redeem",
                  description: `Redeemed ${pointsToDeduct} points for order ${orderNumber}`,
                  reference_type: "order",
                  reference_id: orderId,
                });
            }
          }
        }

        if ((discount?.type === "promo" || discount?.type === "offer") && discount?.offerId) {
          const { data: offerData } = await supabase
            .from("offers")
            .select("used_count")
            .eq("id", discount.offerId)
            .maybeSingle();

          if (offerData) {
            await supabase
              .from("offers")
              .update({ used_count: (offerData.used_count || 0) + 1 })
              .eq("id", discount.offerId);
          }
        }

        if (discount?.type === "redeemed_reward" && discount?.redemptionId) {
          await (supabase as any)
            .from("reward_redemptions")
            .update({
              status: "used",
              used_at: new Date().toISOString(),
              used_in_order_id: orderId,
            })
            .eq("id", discount.redemptionId)
            .eq("status", "pending");
        }

        if (discount?.type === "credit_memo" && discount?.creditMemoId && Number(discount?.amount || 0) > 0 && customerId) {
          await (supabase as any).rpc("apply_credit_memo", {
            p_credit_memo_id: discount.creditMemoId,
            p_order_id: orderId,
            p_amount: Number(discount.amount),
            p_applied_by: customerId,
          });
        }
      } catch (discountError) {
        console.error("Failed to process order discount after callback:", discountError, discount);
      }
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
      const flowType = pendingPayment?.flowType;
      const targetOrderId = pendingPayment?.orderId || retryOrderId;

      let orderData: any = null;
      let baseAmount = Number(Math.max(0, Number(pendingPayment?.baseAmount || 0)).toFixed(2));

      if (targetOrderId) {
        // Recalculate amount from latest order data (same as pay-now modal flow)
        const { data: orderResponse } = await axios.get(`/api/pay-now-order/${targetOrderId}`);
        orderData = orderResponse?.order;
        if (!orderData) {
          toast.error("Failed to load order for retry");
          return;
        }

        const orderTotalAmount = Number(orderData.total_amount || 0);
        const orderProcessingFee = Number(orderData.processing_fee_amount || 0);
        const paidAmount = Number(orderData.paid_amount || 0);
        // Retry should charge only the actual order base amount (no extra retry card fee).
        const fallbackBaseAmount = Math.max(0, (orderTotalAmount - orderProcessingFee) - paidAmount);
        baseAmount = Number(
          Math.max(0, Number(pendingPayment?.baseAmount || 0) || fallbackBaseAmount).toFixed(2)
        );
      } else if (flowType === "credit_line_payment") {
        baseAmount = Number(
          Math.max(
            0,
            Number(pendingPayment?.baseAmount || pendingPayment?.amount || 0)
          ).toFixed(2)
        );
      } else if (flowType === "create_order" || flowType === "pharmacy_checkout") {
        // Create-order and pharmacy checkout do not have a persisted order yet.
        // Retry with the draft payment payload captured before redirect.
        const draftSubtotal = Number(pendingPayment?.orderSubtotal || 0);
        const draftTax = Number(pendingPayment?.orderTax || 0);
        const draftShipping = Number(pendingPayment?.orderShipping || 0);
        const draftDiscount = Number(pendingPayment?.discountAmount || 0);
        const draftCalculatedBase = Math.max(0, draftSubtotal + draftTax + draftShipping - draftDiscount);

        baseAmount = Number(
          Math.max(
            0,
            Number(
              pendingPayment?.baseAmount ||
              pendingPayment?.amount ||
              draftCalculatedBase ||
              pendingPayment?.estimatedChargedAmount ||
              0
            )
          ).toFixed(2)
        );
      } else {
        toast.error("Order not found for retry");
        return;
      }

      if (baseAmount <= 0) {
        toast.error("Order already paid");
        return;
      }

      const cardProcessingFee = 0;
      const targetAmount = baseAmount;
      const retryOrderRef = targetOrderId || pendingPayment?.orderId || "draft-order";
      const fallbackCustomerInfo = pendingPayment?.formDataa?.customerInfo || {};

      const iPosResult = await processPaymentIPOSPay({
        amount: targetAmount,
        orderId: retryOrderRef,
        paymentMethod: pendingPayment?.paymentMethod === "ach" ? "ach" : "card",
        customerName:
          pendingPayment?.customerName ||
          orderData?.customerInfo?.name ||
          fallbackCustomerInfo?.name ||
          "Customer",
        customerEmail:
          pendingPayment?.customerEmail ||
          orderData?.customerInfo?.email ||
          fallbackCustomerInfo?.email ||
          "",
        customerMobile:
          pendingPayment?.customerPhone ||
          orderData?.customerInfo?.phone ||
          fallbackCustomerInfo?.phone ||
          "",
        description:
          flowType === "credit_line_payment"
            ? "Credit line payment"
            : `Order #${pendingPayment?.orderNumber || orderData?.order_number || retryOrderRef}`,
        merchantName: pendingPayment?.merchantName || orderData?.business_name || "RX Pharmacy",
        logoUrl: pendingPayment?.logoUrl || orderData?.logo_url,
        returnUrl: `${window.location.origin}/payment/callback`,
        failureUrl: `${window.location.origin}/payment/callback`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        calculateFee: flowType === "credit_line_payment" ? false : pendingPayment?.paymentMethod !== "ach",
        calculateTax: false,
        tipsInputPrompt: false,
        themeColor: "#2563EB",
      });

      if (iPosResult.success && iPosResult.paymentUrl) {
        localStorage.setItem(
          "pending_payment",
          JSON.stringify({
            ...(pendingPayment || {}),
            orderId: flowType === "credit_line_payment" ? null : targetOrderId || null,
            orderNumber: pendingPayment?.orderNumber || orderData?.order_number,
            amount: targetAmount,
            baseAmount,
            processingFee: cardProcessingFee,
            customerName:
              pendingPayment?.customerName ||
              orderData?.customerInfo?.name ||
              fallbackCustomerInfo?.name ||
              "Customer",
            customerEmail:
              pendingPayment?.customerEmail ||
              orderData?.customerInfo?.email ||
              fallbackCustomerInfo?.email,
            customerPhone:
              pendingPayment?.customerPhone ||
              orderData?.customerInfo?.phone ||
              fallbackCustomerInfo?.phone,
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
  const isCreditLinePayment = paymentFlowType === "credit_line_payment";
  const primaryNavigatePath = isCreditLinePayment ? "/pharmacy/credit" : ordersPath;
  const displayAppliedAmount = Number(
    (
      paymentResult.baseAmount ||
      paymentData.amount ||
      paymentData.totalAmount ||
      0
    ).toFixed(2)
  );
  const displayChargedAmount = Number(
    (
      paymentResult.chargedAmount ||
      paymentData.totalAmount ||
      paymentData.amount ||
      0
    ).toFixed(2)
  );
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
              <span className="text-sm text-muted-foreground">
                {isCreditLinePayment ? "Applied to Credit" : "Applied to Order"}
              </span>
              <span className="font-medium">${displayAppliedAmount.toFixed(2)}</span>
            </div>

            {success && paymentResult.processingFee > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Card Processing Fee</span>
                <span className="font-medium text-amber-700">${paymentResult.processingFee.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Total Charged</span>
              <span className="font-bold text-lg">${displayChargedAmount.toFixed(2)}</span>
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
              onClick={() => navigate(primaryNavigatePath)}
              className="w-full"
              variant={success ? "default" : "outline"}
            >
              {isCreditLinePayment
                ? success
                  ? "View Credit Account"
                  : "Back to Credit Account"
                : success
                  ? "View Orders"
                  : "Back to Orders"}
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
