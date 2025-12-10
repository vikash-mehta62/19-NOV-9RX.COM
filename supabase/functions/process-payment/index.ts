import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Authorize.Net API endpoints
const AUTHORIZE_NET_SANDBOX = "https://apitest.authorize.net/xml/v1/request.api";
const AUTHORIZE_NET_PRODUCTION = "https://api.authorize.net/xml/v1/request.api";

interface CreditCardPayment {
  type: "card";
  cardNumber: string;
  expirationDate: string; // MMYY format
  cvv: string;
  cardholderName: string;
}

interface ACHPayment {
  type: "ach" | "echeck";
  accountType: "checking" | "savings" | "businessChecking";
  routingNumber: string;
  accountNumber: string;
  nameOnAccount: string;
  bankName?: string;
  echeckType?: "WEB" | "PPD" | "CCD"; // WEB for internet, PPD for personal, CCD for corporate
}

interface PaymentRequest {
  payment: CreditCardPayment | ACHPayment;
  amount: number;
  invoiceNumber?: string;
  orderId?: string;
  customerId?: string;
  customerEmail?: string;
  billing?: {
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  testMode?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_LOGIN_ID = Deno.env.get("AUTHORIZE_NET_API_LOGIN_ID");
    const TRANSACTION_KEY = Deno.env.get("AUTHORIZE_NET_TRANSACTION_KEY");
    const IS_PRODUCTION = Deno.env.get("AUTHORIZE_NET_PRODUCTION") === "true";

    if (!API_LOGIN_ID || !TRANSACTION_KEY) {
      throw new Error("Missing Authorize.Net API credentials");
    }

    const body: PaymentRequest = await req.json();
    const { payment, amount, invoiceNumber, orderId, customerId, customerEmail, billing, testMode } = body;

    if (!payment || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment details and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the Authorize.Net request
    const endpoint = (IS_PRODUCTION && !testMode) ? AUTHORIZE_NET_PRODUCTION : AUTHORIZE_NET_SANDBOX;
    
    let paymentData: any;
    
    if (payment.type === "card") {
      // Credit Card Payment
      paymentData = {
        creditCard: {
          cardNumber: payment.cardNumber.replace(/\s/g, ""),
          expirationDate: payment.expirationDate,
          cardCode: payment.cvv,
        },
      };
    } else if (payment.type === "ach" || payment.type === "echeck") {
      // ACH/eCheck Payment
      const accountTypeMap: Record<string, string> = {
        checking: "checking",
        savings: "savings",
        businessChecking: "businessChecking",
      };
      
      paymentData = {
        bankAccount: {
          accountType: accountTypeMap[payment.accountType] || "checking",
          routingNumber: payment.routingNumber,
          accountNumber: payment.accountNumber,
          nameOnAccount: payment.nameOnAccount,
          echeckType: payment.echeckType || "WEB",
          bankName: payment.bankName || "",
        },
      };
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid payment type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build billing address
    const billTo: any = {};
    if (billing) {
      if (billing.firstName) billTo.firstName = billing.firstName;
      if (billing.lastName) billTo.lastName = billing.lastName;
      if (billing.address) billTo.address = billing.address;
      if (billing.city) billTo.city = billing.city;
      if (billing.state) billTo.state = billing.state;
      if (billing.zip) billTo.zip = billing.zip;
      if (billing.country) billTo.country = billing.country;
    } else if (payment.type === "card" && payment.cardholderName) {
      const nameParts = payment.cardholderName.split(" ");
      billTo.firstName = nameParts[0] || "Customer";
      billTo.lastName = nameParts.slice(1).join(" ") || "Customer";
    } else if ((payment.type === "ach" || payment.type === "echeck") && payment.nameOnAccount) {
      const nameParts = payment.nameOnAccount.split(" ");
      billTo.firstName = nameParts[0] || "Customer";
      billTo.lastName = nameParts.slice(1).join(" ") || "Customer";
    }

    // Build the full request
    const authorizeRequest = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: API_LOGIN_ID,
          transactionKey: TRANSACTION_KEY,
        },
        refId: `REF-${Date.now()}`,
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: amount.toFixed(2),
          payment: paymentData,
          order: {
            invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
            description: orderId ? `Order ${orderId}` : "Payment",
          },
          billTo: Object.keys(billTo).length > 0 ? billTo : undefined,
          customer: customerId || customerEmail ? {
            id: customerId,
            email: customerEmail,
          } : undefined,
        },
      },
    };

    console.log("Sending request to Authorize.Net:", endpoint);

    // Make the API call
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authorizeRequest),
    });

    const responseText = await response.text();
    // Remove BOM if present
    const cleanResponse = responseText.replace(/^\uFEFF/, "");
    const result = JSON.parse(cleanResponse);

    console.log("Authorize.Net response:", JSON.stringify(result, null, 2));

    // Parse the response
    const messages = result.messages;
    const transactionResponse = result.transactionResponse;

    if (messages?.resultCode === "Ok" && transactionResponse?.responseCode === "1") {
      // Success
      const successResponse = {
        success: true,
        transactionId: transactionResponse.transId,
        authCode: transactionResponse.authCode,
        responseCode: transactionResponse.responseCode,
        message: "Transaction approved",
        avsResultCode: transactionResponse.avsResultCode,
        cvvResultCode: transactionResponse.cvvResultCode,
      };

      // Log to Supabase if we have order info
      if (orderId) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          await supabase.from("order_activities").insert({
            order_id: orderId,
            activity_type: "payment_received",
            description: `Payment of $${amount.toFixed(2)} received via ${payment.type === "card" ? "Credit Card" : "ACH/eCheck"}`,
            metadata: {
              transaction_id: transactionResponse.transId,
              auth_code: transactionResponse.authCode,
              payment_type: payment.type,
              amount: amount,
            },
          });
        } catch (logError) {
          console.error("Failed to log payment activity:", logError);
        }
      }

      return new Response(JSON.stringify(successResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Error
      let errorMessage = "Transaction failed";
      let errorCode = "";

      if (transactionResponse?.errors?.error) {
        const errors = Array.isArray(transactionResponse.errors.error)
          ? transactionResponse.errors.error
          : [transactionResponse.errors.error];
        errorMessage = errors[0]?.errorText || errorMessage;
        errorCode = errors[0]?.errorCode || "";
      } else if (messages?.message) {
        const msgArray = Array.isArray(messages.message) ? messages.message : [messages.message];
        errorMessage = msgArray[0]?.text || errorMessage;
        errorCode = msgArray[0]?.code || "";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          errorCode: errorCode,
          responseCode: transactionResponse?.responseCode,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
