import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Authorize.Net API endpoints
const AUTHORIZE_NET_SANDBOX =
  "https://apitest.authorize.net/xml/v1/request.api";
const AUTHORIZE_NET_PRODUCTION =
  "https://api.authorize.net/xml/v1/request.api";

interface CreditCardPayment {
  type: "card";
  cardNumber: string;
  expirationDate: string;
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
  echeckType?: "WEB" | "PPD" | "CCD";
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
}

// Helper to return JSON response (always 200 to ensure client gets the body)
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch payment settings from database - get any enabled authorize_net settings
    const { data: paymentSettingsData, error: settingsError } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("provider", "authorize_net")
      .limit(1)
      .maybeSingle();

    console.log("Payment settings query result:", { data: paymentSettingsData, error: settingsError });

    if (settingsError) {
      console.error("Error fetching payment settings:", settingsError);
      return jsonResponse({
        success: false,
        error: "Failed to load payment configuration. Please try again.",
        errorCode: "CONFIG_ERROR",
      });
    }

    if (!paymentSettingsData) {
      console.log("No payment settings found in database");
      return jsonResponse({
        success: false,
        error: "Payment gateway not configured. Please set up Authorize.net in Admin Settings → Payments.",
        errorCode: "NO_SETTINGS",
      });
    }

    const settings = paymentSettingsData.settings as any;
    console.log("Settings object:", settings);

    if (!settings) {
      return jsonResponse({
        success: false,
        error: "Payment settings are empty. Please configure in Admin Settings → Payments.",
        errorCode: "EMPTY_SETTINGS",
      });
    }

    if (!settings.enabled) {
      return jsonResponse({
        success: false,
        error: "Payment gateway is disabled. Please enable it in Admin Settings → Payments.",
        errorCode: "GATEWAY_DISABLED",
      });
    }

    // Clean and validate credentials - remove any whitespace or special characters
    const API_LOGIN_ID = (settings.apiLoginId || "").toString().trim();
    const TRANSACTION_KEY = (settings.transactionKey || "").toString().trim();
    const IS_TEST_MODE = settings.testMode === true;

    console.log("Credentials check - API_LOGIN_ID:", API_LOGIN_ID ? `${API_LOGIN_ID.substring(0, 3)}***` : "EMPTY", 
                "TRANSACTION_KEY:", TRANSACTION_KEY ? `${TRANSACTION_KEY.substring(0, 3)}***` : "EMPTY", 
                "Test Mode:", IS_TEST_MODE);

    if (!API_LOGIN_ID || !TRANSACTION_KEY) {
      return jsonResponse({
        success: false,
        error: "API Login ID and Transaction Key are required. Please add them in Admin Settings → Payments.",
        errorCode: "MISSING_CREDENTIALS",
      });
    }

    // Validate credential format (basic check)
    if (API_LOGIN_ID.length < 5 || TRANSACTION_KEY.length < 5) {
      return jsonResponse({
        success: false,
        error: "API credentials appear to be invalid. Please verify your Authorize.net credentials.",
        errorCode: "INVALID_CREDENTIALS_FORMAT",
      });
    }

    const body: PaymentRequest = await req.json();
    const {
      payment,
      amount,
      invoiceNumber,
      orderId,
      customerId,
      customerEmail,
      billing,
    } = body;

    if (!payment || !amount) {
      return jsonResponse({
        success: false,
        error: "Payment details and amount are required",
        errorCode: "INVALID_REQUEST",
      });
    }

    // Use sandbox for test mode, production otherwise
    const endpoint = IS_TEST_MODE
      ? AUTHORIZE_NET_SANDBOX
      : AUTHORIZE_NET_PRODUCTION;

    let paymentData: any;

    if (payment.type === "card") {
      // Authorize.net expects expiration date in YYYY-MM format
      // Input could be MMYY, MM/YY, or MMYYYY
      let expDate = payment.expirationDate.replace(/[\/\s-]/g, "");
      let formattedExpDate = expDate;
      
      if (expDate.length === 4) {
        // MMYY format -> YYYY-MM
        const month = expDate.substring(0, 2);
        const year = "20" + expDate.substring(2, 4);
        formattedExpDate = `${year}-${month}`;
      } else if (expDate.length === 6) {
        // MMYYYY format -> YYYY-MM
        const month = expDate.substring(0, 2);
        const year = expDate.substring(2, 6);
        formattedExpDate = `${year}-${month}`;
      }
      
      console.log("Expiration date conversion:", payment.expirationDate, "->", formattedExpDate);
      
      paymentData = {
        creditCard: {
          cardNumber: payment.cardNumber.replace(/\s/g, ""),
          expirationDate: formattedExpDate,
          cardCode: payment.cvv,
        },
      };
    } else if (payment.type === "ach" || payment.type === "echeck") {
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
      return jsonResponse({
        success: false,
        error: "Invalid payment type. Use 'card' or 'ach'.",
        errorCode: "INVALID_PAYMENT_TYPE",
      });
    }

    // Build billing address - sanitize all fields
    const sanitizeField = (value: string | undefined, maxLen: number): string | undefined => {
      if (!value) return undefined;
      // Remove control characters but keep basic punctuation
      return value.replace(/[\x00-\x1F\x7F]/g, "").trim().substring(0, maxLen) || undefined;
    };
    
    const billTo: any = {};
    if (billing) {
      const firstName = sanitizeField(billing.firstName, 50);
      const lastName = sanitizeField(billing.lastName, 50);
      const address = sanitizeField(billing.address, 60);
      const city = sanitizeField(billing.city, 40);
      const state = sanitizeField(billing.state, 40);
      const zip = sanitizeField(billing.zip, 20);
      const country = sanitizeField(billing.country, 60);
      
      if (firstName) billTo.firstName = firstName;
      if (lastName) billTo.lastName = lastName;
      if (address) billTo.address = address;
      if (city) billTo.city = city;
      if (state) billTo.state = state;
      if (zip) billTo.zip = zip;
      if (country) billTo.country = country;
    } else if (payment.type === "card" && payment.cardholderName) {
      const nameParts = payment.cardholderName.split(" ");
      billTo.firstName = sanitizeField(nameParts[0], 50) || "Customer";
      billTo.lastName = sanitizeField(nameParts.slice(1).join(" "), 50) || "Customer";
    } else if (
      (payment.type === "ach" || payment.type === "echeck") &&
      payment.nameOnAccount
    ) {
      const nameParts = payment.nameOnAccount.split(" ");
      billTo.firstName = sanitizeField(nameParts[0], 50) || "Customer";
      billTo.lastName = sanitizeField(nameParts.slice(1).join(" "), 50) || "Customer";
    }
    
    console.log("Billing info:", billTo);

    // Build order info - sanitize to remove special characters
    const orderInfo: any = {};
    if (invoiceNumber) {
      const cleanInvoice = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 20);
      if (cleanInvoice) orderInfo.invoiceNumber = cleanInvoice;
    }
    if (orderId) {
      const shortId = orderId.substring(0, 8);
      orderInfo.description = `Order ${shortId}`;
    }
    
    // Build customer info - sanitize values
    const customerInfo: any = {};
    if (customerEmail) {
      const cleanEmail = customerEmail.trim().substring(0, 255);
      if (cleanEmail && cleanEmail.includes("@")) {
        customerInfo.email = cleanEmail;
      }
    }

    // Build the transaction request object - ELEMENTS MUST BE IN CORRECT ORDER!
    // Authorize.net requires: transactionType, amount, payment, order, customer, billTo, shipTo...
    const transactionRequest: any = {
      transactionType: "authCaptureTransaction",
      amount: amount.toFixed(2),
      payment: paymentData,
    };

    // Add in correct order per Authorize.net schema
    if (Object.keys(orderInfo).length > 0) {
      transactionRequest.order = orderInfo;
    }
    
    // Customer MUST come before billTo
    if (Object.keys(customerInfo).length > 0) {
      transactionRequest.customer = customerInfo;
    }

    // billTo comes after customer
    if (Object.keys(billTo).length > 0) {
      transactionRequest.billTo = billTo;
    }
    
    console.log("Transaction request built:", JSON.stringify(transactionRequest, null, 2));
    
    console.log("Customer info:", transactionRequest.customer || "none");

    // Build the Authorize.Net request
    const authorizeRequest = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: API_LOGIN_ID,
          transactionKey: TRANSACTION_KEY,
        },
        refId: `REF-${Date.now()}`,
        transactionRequest,
      },
    };

    console.log("Sending request to Authorize.Net:", endpoint, "Test Mode:", IS_TEST_MODE);
    console.log("Request payload:", JSON.stringify(authorizeRequest, null, 2));

    // Make the API call
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authorizeRequest),
    });

    const responseText = await response.text();
    const cleanResponse = responseText.replace(/^\uFEFF/, "");
    
    let result;
    try {
      result = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("Failed to parse Authorize.Net response:", cleanResponse);
      return jsonResponse({
        success: false,
        error: "Invalid response from payment gateway",
        errorCode: "PARSE_ERROR",
      });
    }

    console.log("Authorize.Net response:", JSON.stringify(result, null, 2));

    const messages = result.messages;
    const transactionResponse = result.transactionResponse;

    if (
      messages?.resultCode === "Ok" &&
      transactionResponse?.responseCode === "1"
    ) {
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

      // Log to order_activities if we have order info
      if (orderId) {
        try {
          await supabase.from("order_activities").insert({
            order_id: orderId,
            activity_type: "payment_received",
            description: `Payment of $${amount.toFixed(2)} received via ${
              payment.type === "card" ? "Credit Card" : "ACH/eCheck"
            }`,
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

      return jsonResponse(successResponse);
    } else {
      // Error from Authorize.Net
      let errorMessage = "Transaction failed";
      let errorCode = "";

      if (transactionResponse?.errors?.error) {
        const errors = Array.isArray(transactionResponse.errors.error)
          ? transactionResponse.errors.error
          : [transactionResponse.errors.error];
        errorMessage = errors[0]?.errorText || errorMessage;
        errorCode = errors[0]?.errorCode || "";
      } else if (messages?.message) {
        const msgArray = Array.isArray(messages.message)
          ? messages.message
          : [messages.message];
        errorMessage = msgArray[0]?.text || errorMessage;
        errorCode = msgArray[0]?.code || "";
      }

      console.log("Transaction failed:", errorMessage, errorCode);

      return jsonResponse({
        success: false,
        error: errorMessage,
        errorCode: errorCode,
        responseCode: transactionResponse?.responseCode,
      });
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      errorCode: "INTERNAL_ERROR",
    });
  }
});
