import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parseCallbackResponse, isPaymentSuccessful } from "@/services/iPosPayService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [isACH, setIsACH] = useState(false);
  const [accountType, setAccountType] = useState<string>("");
  const [accountLast4, setAccountLast4] = useState<string>("");

  useEffect(() => {
    handlePaymentCallback();
  }, [searchParams]);

  const handlePaymentCallback = async () => {
    try {
      // 1. Get pending payment info from localStorage
      const pendingPaymentStr = localStorage.getItem('pending_payment');
      if (!pendingPaymentStr) {
        console.error("No pending payment found");
        setLoading(false);
        return;
      }

      const pendingPayment = JSON.parse(pendingPaymentStr);
      console.log("📦 Pending payment:", pendingPayment);

      // 2. Parse callback data from URL params
      const responseCode = searchParams.get("responseCode");
      const responseMessage = searchParams.get("responseMessage");
      const transactionId = searchParams.get("transactionId");
      const transactionReferenceId = searchParams.get("transactionReferenceId");
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
      const hostResponseCode = searchParams.get("hostResponseCode");
      const hostResponseMessage = searchParams.get("hostResponseMessage");
      
      // ACH specific fields
      const paymentMethod = searchParams.get("paymentMethod"); // "ACH" or "CARD"
      const achAccountType = searchParams.get("accountType"); // "checking" or "savings"
      const achAccountLast4 = searchParams.get("accountLast4");
      const routingNumber = searchParams.get("routingNumber");
      const achToken = searchParams.get("achToken");
      
      // Detect if this is an ACH payment
      const isACHPayment = paymentMethod === "ACH" || !!achAccountLast4;
      
      // Set state for display
      setIsACH(isACHPayment);
      setAccountType(achAccountType || "");
      setAccountLast4(achAccountLast4 || "");

      if (!responseCode) {
        console.error("❌ No response code in callback");
        setLoading(false);
        return;
      }

      // 3. Parse payment data
      const data = parseCallbackResponse({
        responseCode: parseInt(responseCode),
        responseMessage: responseMessage || "",
        transactionId: transactionId || "",
        transactionReferenceId: transactionReferenceId || pendingPayment.transactionReferenceId,
        amount: parseFloat(amount || "0") / 100, // Convert from cents to dollars
        totalAmount: parseFloat(totalAmount || amount || "0") / 100,
        tips: parseFloat(tips || "0") / 100,
        customFee: parseFloat(customFee || "0") / 100,
        localTax: parseFloat(localTax || "0") / 100,
        stateTax: parseFloat(stateTax || "0") / 100,
        cardType,
        cardLast4Digit,
        cardToken,
        transactionType: 1,
        errResponseCode: errResponseCode || "",
        errResponseMessage: errResponseMessage || "",
      });

      setPaymentData(data);
      console.log("💳 Parsed payment data:", data);

      // 4. Check if payment was successful
      const success = isPaymentSuccessful(data);

      if (success) {
        // ✅ Payment successful - process it
        setProcessing(true);
        await processSuccessfulPayment(pendingPayment, data);
        setProcessing(false);
      } else {
        // ❌ Payment failed - log it
        await logFailedPayment(pendingPayment, data);
      }

      // 5. Clear pending payment
      localStorage.removeItem('pending_payment');
      setLoading(false);

    } catch (error: any) {
      console.error("💥 Payment callback error:", error);
      toast.error("Error processing payment callback");
      setLoading(false);
    }
  };

  /**
   * Process successful payment
   * - Update order status
   * - Update paid amount
   * - Deduct inventory (if fully paid)
   * - Create invoice
   * - Send email
   */
  const processSuccessfulPayment = async (pendingPayment: any, paymentData: any) => {
    try {
      const orderId = pendingPayment.orderId;
      
      console.log("🔄 Processing successful payment for order:", orderId);

      // 1. Get current order data
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        throw new Error("Order not found");
      }

      console.log("📋 Current order:", order);

      // 2. Calculate new amounts
      const currentPaid = Number(order.paid_amount || 0);
      const currentTotal = Number(order.total_amount || 0);
      const paymentAmount = paymentData.totalAmount; // Full amount including fees from iPOS
      const baseAmount = pendingPayment.baseAmount || paymentAmount;
      
      // Auto-detect processing fee if charged amount is higher than base amount
      // This happens when customer pays with credit card (iPOS adds processing fee)
      let processingFee = pendingPayment.processingFee || 0;
      if (paymentAmount > baseAmount && processingFee === 0) {
        // Calculate processing fee from the difference
        processingFee = paymentAmount - baseAmount;
        console.log("💳 Auto-detected credit card processing fee:", processingFee);
      }

      const newPaidAmount = currentPaid + paymentAmount;
      const newTotalAmount = currentTotal + processingFee; // Add processing fee to total
      const previousProcessingFee = Number(order.processing_fee_amount || 0);
      const totalProcessingFee = previousProcessingFee + processingFee;

      // Determine new payment status
      // If paid amount >= total amount (with small tolerance for rounding), mark as paid
      const newPaymentStatus = (newPaidAmount >= newTotalAmount - 0.01) ? "paid" : "partial_paid";

      console.log("💰 Payment calculation:", {
        currentPaid,
        currentTotal,
        paymentAmount,
        baseAmount,
        processingFee,
        newPaidAmount,
        newTotalAmount,
        totalProcessingFee,
        newPaymentStatus
      });

      // 3. Update order
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          total_amount: newTotalAmount,
          processing_fee_amount: totalProcessingFee,
          payment_method: isACHPayment ? "ach" : "card",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        throw new Error("Failed to update order: " + updateError.message);
      }

      console.log("✅ Order updated successfully");

      // 4. Log payment transaction
      
      const { error: logError } = await supabase
        .from("payment_transactions")
        .insert({
          profile_id: order.profile_id,
          order_id: orderId,
          transaction_id: paymentData.transactionId,
          auth_code: paymentData.responseApprovalCode,
          transaction_type: "auth_capture",
          amount: paymentAmount,
          payment_method_type: isACHPayment ? "ach" : "card",
          card_last_four: isACHPayment ? accountLast4 : paymentData.cardLast4Digit,
          card_type: isACHPayment ? accountType : paymentData.cardType?.toLowerCase(),
          status: "approved",
          processor: "ipospay",
          response_code: paymentData.responseCode.toString(),
          response_message: paymentData.responseMessage,
          raw_response: {
            ...paymentData,
            paymentMethod: isACHPayment ? "ACH" : "CARD",
            accountType: achAccountType,
            routingNumber: routingNumber,
            accountLast4: achAccountLast4,
          },
        });

      if (logError) {
        console.error("⚠️ Failed to log transaction:", logError);
        // Don't throw - payment already succeeded
      } else {
        console.log("✅ Transaction logged");
      }

      // 5. Deduct inventory (only if fully paid and not already deducted)
      if (newPaymentStatus === "paid" && order.payment_status !== "paid") {
        try {
          console.log("📦 Deducting inventory...");
          await deductInventory(orderId, order.items);
          console.log("✅ Inventory deducted");
        } catch (invError) {
          console.error("⚠️ Inventory deduction failed:", invError);
          // Don't throw - payment succeeded, inventory can be manually adjusted
        }
      } else {
        console.log("ℹ️ Skipping inventory deduction (partial payment or already deducted)");
      }

      // 6. Create invoice (if fully paid and not already created)
      if (newPaymentStatus === "paid") {
        try {
          console.log("📄 Creating invoice...");
          await createInvoiceForOrder(orderId, order, newTotalAmount);
          console.log("✅ Invoice created");
        } catch (invError) {
          console.error("⚠️ Invoice creation failed:", invError);
          // Don't throw - payment succeeded
        }
      } else {
        console.log("ℹ️ Skipping invoice creation (partial payment)");
      }

      // 7. Send confirmation email
      try {
        console.log("📧 Sending confirmation email...");
        await sendPaymentConfirmationEmail(order, paymentData);
        console.log("✅ Email sent");
      } catch (emailError) {
        console.error("⚠️ Email send failed:", emailError);
        // Don't throw
      }

      toast.success("Payment successful! Order updated.");

    } catch (error: any) {
      console.error("💥 Error processing successful payment:", error);
      toast.error("Payment received but order update failed. Please contact support.");
      throw error;
    }
  };

  /**
   * Log failed payment
   */
  const logFailedPayment = async (pendingPayment: any, paymentData: any) => {
    try {
      const orderId = pendingPayment.orderId;
      
      const { data: order } = await supabase
        .from("orders")
        .select("profile_id")
        .eq("id", orderId)
        .single();

      // Log failed transaction
      await supabase
        .from("payment_transactions")
        .insert({
          profile_id: order?.profile_id,
          order_id: orderId,
          transaction_id: paymentData.transactionId,
          transaction_type: "auth_capture",
          amount: pendingPayment.amount,
          payment_method_type: "card",
          status: "declined",
          processor: "ipospay",
          response_code: paymentData.responseCode.toString(),
          response_message: paymentData.responseMessage,
          error_message: paymentData.errResponseMessage,
          raw_response: paymentData,
        });

      toast.error("Payment failed: " + paymentData.responseMessage);
    } catch (error) {
      console.error("Error logging failed payment:", error);
    }
  };

  /**
   * Deduct inventory for order
   */
  const deductInventory = async (orderId: string, items: any[]) => {
    console.log("Deducting inventory for order:", orderId);
    
    // Call your RPC function for atomic inventory deduction
    const { error } = await supabase.rpc("deduct_order_stock_after_payment_atomic", {
      p_order_id: orderId
    });

    if (error) {
      throw new Error("Inventory deduction failed: " + error.message);
    }
  };

  /**
   * Create invoice for order
   */
  const createInvoiceForOrder = async (orderId: string, order: any, totalAmount: number) => {
    console.log("Creating invoice for order:", orderId);
    
    // Check if invoice already exists
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existing) {
      console.log("Invoice already exists");
      return;
    }

    // Generate invoice number
    const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");

    // Create invoice
    const { error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber || `INV-${Date.now()}`,
        order_id: orderId,
        profile_id: order.profile_id || order.customer,
        status: "pending",
        amount: order.subtotal || totalAmount,
        tax_amount: order.tax_amount || 0,
        total_amount: totalAmount,
        payment_status: "paid",
        payment_method: "card",
        items: order.items,
        customer_info: order.customerInfo,
        shipping_info: order.shippingAddress,
      });

    if (error) {
      throw new Error("Invoice creation failed: " + error.message);
    }
  };

  /**
   * Send payment confirmation email
   */
  const sendPaymentConfirmationEmail = async (order: any, paymentData: any) => {
    console.log("Sending confirmation email for order:", order.id);
    
    // TODO: Implement email service
    // Example: Call your email service or edge function
    // await sendEmail({
    //   to: order.customerInfo?.email,
    //   subject: "Payment Confirmation",
    //   template: "payment-confirmation",
    //   data: { order, payment: paymentData }
    // });
  };

  // Loading state
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

  // Processing state
  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-green-600" />
              <p className="text-lg font-medium">Updating order...</p>
              <p className="text-sm text-muted-foreground">Creating invoice and updating inventory</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No payment data
  if (!paymentData) {
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
              No payment data received. This might happen if you navigated here directly.
            </p>
            <Button onClick={() => navigate("/admin/orders")} className="w-full">
              Go to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const success = isPaymentSuccessful(paymentData);

  // Payment result
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
          {/* Payment Details */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`font-medium ${success ? 'text-green-600' : 'text-red-600'}`}>
                {paymentData.responseMessage}
              </span>
            </div>

            {!success && paymentData.errResponseMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-1">Error Details:</p>
                <p className="text-sm text-red-800">
                  {paymentData.errResponseMessage}
                </p>
                {paymentData.errResponseCode && (
                  <p className="text-xs text-red-600 mt-1">
                    Error Code: {paymentData.errResponseCode}
                  </p>
                )}
              </div>
            )}

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

            {paymentData.totalAmount > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-bold text-lg">${paymentData.totalAmount.toFixed(2)}</span>
              </div>
            )}

            {(paymentData.cardType || accountLast4) && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <span className="font-medium">
                  {isACH ? (
                    <>
                      ACH - {accountType?.charAt(0).toUpperCase() + accountType?.slice(1)} •••• {accountLast4}
                    </>
                  ) : (
                    <>
                      {paymentData.cardType} {paymentData.cardLast4Digit && `•••• ${paymentData.cardLast4Digit}`}
                    </>
                  )}
                </span>
              </div>
            )}

            {paymentData.responseApprovalCode && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Approval Code</span>
                <span className="font-mono text-sm">{paymentData.responseApprovalCode}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button 
              onClick={() => navigate("/admin/orders")} 
              className="w-full"
              variant={success ? "default" : "outline"}
            >
              {success ? "View Orders" : "Back to Orders"}
            </Button>
            
            {!success && (
              <Button 
                onClick={() => {
                  // Clear pending payment and go back
                  localStorage.removeItem('pending_payment');
                  navigate(-2);
                }} 
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
