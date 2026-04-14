# 🔄 iPOS Pays Complete Payment Flow - Real Implementation

## 📋 Overview

Tumhare system mein 3 main scenarios hain:
1. **New Order + Immediate Payment** - Order create + turant payment
2. **Existing Order + Later Payment** - Order pehle bana, payment baad mein
3. **Partial Payment** - Thoda pay kiya, baaki baad mein

## 🎯 Complete Flow Diagram

```
User Creates Order
       ↓
Order Status: "unpaid" / "pending"
       ↓
User Clicks "Pay Now"
       ↓
Redirect to iPOS Pays
       ↓
User Enters Card Details
       ↓
Payment Success/Failure
       ↓
Redirect Back to Your Site (/payment/callback)
       ↓
Verify Payment Status
       ↓
Update Order Status
       ↓
Deduct Inventory
       ↓
Create Invoice
       ↓
Send Confirmation Email
       ↓
Show Success Page
```

## 🔧 Implementation Steps

### Step 1: Payment Callback Page (CRITICAL!)

**File:** `src/pages/PaymentCallback.tsx`

```typescript
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

  useEffect(() => {
    handlePaymentCallback();
  }, [searchParams]);

  const handlePaymentCallback = async () => {
    try {
      // Get pending payment info from localStorage
      const pendingPaymentStr = localStorage.getItem('pending_payment');
      if (!pendingPaymentStr) {
        console.error("No pending payment found");
        setLoading(false);
        return;
      }

      const pendingPayment = JSON.parse(pendingPaymentStr);
      console.log("Pending payment:", pendingPayment);

      // Parse callback data from URL params
      const responseCode = searchParams.get("responseCode");
      const responseMessage = searchParams.get("responseMessage");
      const transactionId = searchParams.get("transactionId");
      const transactionReferenceId = searchParams.get("transactionReferenceId");
      const amount = searchParams.get("amount");
      const totalAmount = searchParams.get("totalAmount");
      const cardType = searchParams.get("cardType");
      const cardLast4Digit = searchParams.get("cardLast4Digit");
      const cardToken = searchParams.get("cardToken");
      const tips = searchParams.get("tips");
      const customFee = searchParams.get("customFee");
      const localTax = searchParams.get("localTax");
      const stateTax = searchParams.get("stateTax");

      if (!responseCode) {
        console.error("No response code in callback");
        setLoading(false);
        return;
      }

      // Parse payment data
      const data = parseCallbackResponse({
        responseCode: parseInt(responseCode),
        responseMessage: responseMessage || "",
        transactionId: transactionId || "",
        transactionReferenceId: transactionReferenceId || pendingPayment.transactionReferenceId,
        amount: parseFloat(amount || "0") / 100, // Convert from cents
        totalAmount: parseFloat(totalAmount || "0") / 100,
        tips: parseFloat(tips || "0") / 100,
        customFee: parseFloat(customFee || "0") / 100,
        localTax: parseFloat(localTax || "0") / 100,
        stateTax: parseFloat(stateTax || "0") / 100,
        cardType,
        cardLast4Digit,
        cardToken,
        transactionType: 1,
      });

      setPaymentData(data);
      console.log("Parsed payment data:", data);

      // Check if payment was successful
      const success = isPaymentSuccessful(data);

      if (success) {
        // Process successful payment
        setProcessing(true);
        await processSuccessfulPayment(pendingPayment, data);
        setProcessing(false);
      } else {
        // Log failed payment
        await logFailedPayment(pendingPayment, data);
      }

      // Clear pending payment
      localStorage.removeItem('pending_payment');
      setLoading(false);

    } catch (error: any) {
      console.error("Payment callback error:", error);
      toast.error("Error processing payment callback");
      setLoading(false);
    }
  };

  const processSuccessfulPayment = async (pendingPayment: any, paymentData: any) => {
    try {
      const orderId = pendingPayment.orderId;
      
      // 1. Get current order data
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        throw new Error("Order not found");
      }

      console.log("Current order:", order);

      // 2. Calculate new amounts
      const currentPaid = Number(order.paid_amount || 0);
      const currentTotal = Number(order.total_amount || 0);
      const paymentAmount = paymentData.totalAmount; // Full amount including fees
      const baseAmount = pendingPayment.baseAmount || paymentAmount;
      const processingFee = pendingPayment.processingFee || 0;

      const newPaidAmount = currentPaid + paymentAmount;
      const newTotalAmount = currentTotal + processingFee; // Add processing fee to total
      const previousProcessingFee = Number(order.processing_fee_amount || 0);
      const totalProcessingFee = previousProcessingFee + processingFee;

      // Determine new payment status
      const newPaymentStatus = (newPaidAmount >= newTotalAmount - 0.01) ? "paid" : "partial_paid";

      console.log("Payment calculation:", {
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
          payment_method: "card",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        throw new Error("Failed to update order: " + updateError.message);
      }

      // 4. Log payment transaction
      const { error: logError } = await supabase
        .from("payment_transactions")
        .insert({
          profile_id: order.profile_id || order.customer,
          order_id: orderId,
          transaction_id: paymentData.transactionId,
          auth_code: paymentData.responseApprovalCode,
          transaction_type: "auth_capture",
          amount: paymentAmount,
          payment_method_type: "card",
          card_last_four: paymentData.cardLast4Digit,
          card_type: paymentData.cardType?.toLowerCase(),
          status: "approved",
          processor: "ipospay",
          response_code: paymentData.responseCode.toString(),
          response_message: paymentData.responseMessage,
          raw_response: paymentData,
        });

      if (logError) {
        console.error("Failed to log transaction:", logError);
        // Don't throw - payment already succeeded
      }

      // 5. Deduct inventory (only if fully paid and not already deducted)
      if (newPaymentStatus === "paid" && order.payment_status !== "paid") {
        try {
          // Call your existing inventory deduction logic
          await deductInventory(orderId, order.items);
        } catch (invError) {
          console.error("Inventory deduction failed:", invError);
          // Don't throw - payment succeeded, inventory can be manually adjusted
        }
      }

      // 6. Create invoice (if fully paid and not already created)
      if (newPaymentStatus === "paid") {
        try {
          await createInvoiceForOrder(orderId, order, newTotalAmount);
        } catch (invError) {
          console.error("Invoice creation failed:", invError);
          // Don't throw - payment succeeded
        }
      }

      // 7. Send confirmation email
      try {
        await sendPaymentConfirmationEmail(order, paymentData);
      } catch (emailError) {
        console.error("Email send failed:", emailError);
        // Don't throw
      }

      toast.success("Payment successful! Order updated.");

    } catch (error: any) {
      console.error("Error processing successful payment:", error);
      toast.error("Payment received but order update failed. Please contact support.");
      throw error;
    }
  };

  const logFailedPayment = async (pendingPayment: any, paymentData: any) => {
    try {
      const orderId = pendingPayment.orderId;
      
      const { data: order } = await supabase
        .from("orders")
        .select("profile_id, customer")
        .eq("id", orderId)
        .single();

      // Log failed transaction
      await supabase
        .from("payment_transactions")
        .insert({
          profile_id: order?.profile_id || order?.customer,
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

  const deductInventory = async (orderId: string, items: any[]) => {
    // Your existing inventory deduction logic
    // This should match your current implementation
    console.log("Deducting inventory for order:", orderId);
    
    // Example: Call your RPC function
    const { error } = await supabase.rpc("deduct_order_stock_after_payment_atomic", {
      p_order_id: orderId
    });

    if (error) {
      throw new Error("Inventory deduction failed: " + error.message);
    }
  };

  const createInvoiceForOrder = async (orderId: string, order: any, totalAmount: number) => {
    // Your existing invoice creation logic
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

  const sendPaymentConfirmationEmail = async (order: any, paymentData: any) => {
    // Your existing email logic
    console.log("Sending confirmation email for order:", order.id);
    
    // Example: Call email service
    // await sendEmail({
    //   to: order.customerInfo?.email,
    //   subject: "Payment Confirmation",
    //   template: "payment-confirmation",
    //   data: { order, payment: paymentData }
    // });
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
              <p className="text-sm text-muted-foreground">Creating invoice and updating inventory</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <span className="font-medium">{paymentData.responseMessage}</span>
            </div>

            {paymentData.transactionId && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-sm">{paymentData.transactionId}</span>
              </div>
            )}

            {paymentData.totalAmount > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Amount Paid</span>
                <span className="font-bold text-lg">${paymentData.totalAmount.toFixed(2)}</span>
              </div>
            )}

            {paymentData.cardType && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <span className="font-medium">
                  {paymentData.cardType} •••• {paymentData.cardLast4Digit}
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
                onClick={() => navigate(-2)} 
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            )}
          </div>

          {/* Error Details */}
          {!success && paymentData.errResponseMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {paymentData.errResponseMessage}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 2: Add Route

**File:** `src/App.tsx` or your router file

```typescript
import PaymentCallback from "@/pages/PaymentCallback";

// In your routes
<Route path="/payment/callback" element={<PaymentCallback />} />
<Route path="/payment/cancel" element={<PaymentCancelled />} />
```

### Step 3: Payment Cancelled Page (Optional)

**File:** `src/pages/PaymentCancelled.tsx`

```typescript
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-yellow-600" />
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You cancelled the payment. Your order is still pending.
          </p>
          <div className="space-y-2">
            <Button onClick={() => navigate("/admin/orders")} className="w-full">
              Back to Orders
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🔍 Verification & Testing

### Test Scenarios:

#### 1. New Order + Immediate Payment
```
1. Create new order
2. Order status: "unpaid"
3. Click "Pay Now"
4. Complete payment
5. Verify:
   ✅ Order status: "paid"
   ✅ paid_amount updated
   ✅ Inventory deducted
   ✅ Invoice created
   ✅ Email sent
```

#### 2. Existing Order + Later Payment
```
1. Order already exists (status: "unpaid")
2. Click "Pay Now"
3. Complete payment
4. Verify:
   ✅ Order status: "paid"
   ✅ paid_amount updated
   ✅ Inventory deducted
   ✅ Invoice created
```

#### 3. Partial Payment
```
1. Order total: $100
2. Pay $50 first
3. Verify:
   ✅ Order status: "partial_paid"
   ✅ paid_amount: $50
   ✅ Inventory NOT deducted yet
4. Pay remaining $50
5. Verify:
   ✅ Order status: "paid"
   ✅ paid_amount: $100
   ✅ Inventory deducted NOW
   ✅ Invoice created
```

#### 4. Failed Payment
```
1. Use decline test card: 4000000000000002
2. Payment fails
3. Verify:
   ✅ Order status: still "unpaid"
   ✅ paid_amount: unchanged
   ✅ Transaction logged as "declined"
   ✅ User can try again
```

## 📊 Database Verification Queries

```sql
-- Check order status
SELECT 
  id, 
  order_number, 
  payment_status, 
  total_amount, 
  paid_amount,
  processing_fee_amount
FROM orders 
WHERE id = 'YOUR_ORDER_ID';

-- Check payment transactions
SELECT 
  transaction_id,
  amount,
  status,
  processor,
  card_last_four,
  created_at
FROM payment_transactions 
WHERE order_id = 'YOUR_ORDER_ID'
ORDER BY created_at DESC;

-- Check invoice
SELECT 
  invoice_number,
  total_amount,
  payment_status
FROM invoices 
WHERE order_id = 'YOUR_ORDER_ID';

-- Check inventory
SELECT 
  product_id,
  size_id,
  stock
FROM product_sizes 
WHERE id IN (SELECT size_id FROM order_items WHERE order_id = 'YOUR_ORDER_ID');
```

## 🚨 Error Handling

### Common Issues & Solutions:

1. **Payment succeeds but order not updated**
   - Check callback page logs
   - Verify localStorage has pending_payment
   - Check Supabase permissions

2. **Inventory deducted twice**
   - Check if deduction logic has duplicate prevention
   - Use RPC function with transaction

3. **Invoice not created**
   - Check if invoice already exists
   - Verify invoice number generation

4. **Email not sent**
   - Check email service configuration
   - Don't block payment success on email failure

## ✅ Production Checklist

- [ ] Callback page created and tested
- [ ] Routes added
- [ ] Payment verification working
- [ ] Order status updates correctly
- [ ] Inventory deduction working
- [ ] Invoice creation working
- [ ] Email notifications working
- [ ] Error handling in place
- [ ] Logging implemented
- [ ] Test all scenarios
- [ ] Get production credentials
- [ ] Switch to production mode
- [ ] Monitor first few transactions

## 🎉 Summary

**Flow:**
1. User pays → Redirect to iPOS Pays
2. Payment complete → Redirect to /payment/callback
3. Callback page → Verify payment
4. Update order → Deduct inventory → Create invoice
5. Show success → Send email

**Key Points:**
- Always verify payment status
- Update order atomically
- Deduct inventory only when fully paid
- Log all transactions
- Handle errors gracefully
- Don't block on non-critical operations (email)

Ye complete implementation hai! Test karo aur batao kya issue aaye! 🚀
