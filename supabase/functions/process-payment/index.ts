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

// ============================================
// AUTHORIZE.NET CUSTOMER PROFILE (CIM) FUNCTIONS
// ============================================

// Create Customer Profile in Authorize.net
async function createCustomerProfile(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  email: string,
  profileId: string
): Promise<{ success: boolean; customerProfileId?: string; error?: string }> {
  // Authorize.net merchantCustomerId has max 20 characters
  // UUID is 36 chars, so we take first 8 + last 8 = 16 chars (unique enough)
  const shortProfileId = profileId.replace(/-/g, "").substring(0, 20);
  
  const request = {
    createCustomerProfileRequest: {
      merchantAuthentication: {
        name: apiLoginId,
        transactionKey: transactionKey,
      },
      profile: {
        merchantCustomerId: shortProfileId,
        email: email,
      },
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const responseText = await response.text();
    const result = JSON.parse(responseText.replace(/^\uFEFF/, ""));

    if (result.messages?.resultCode === "Ok") {
      return {
        success: true,
        customerProfileId: result.customerProfileId,
      };
    }

    // Check if profile already exists
    if (result.messages?.message?.[0]?.code === "E00039") {
      // Extract existing profile ID from error message
      const match = result.messages.message[0].text.match(/ID (\d+)/);
      if (match) {
        return { success: true, customerProfileId: match[1] };
      }
    }

    return {
      success: false,
      error: result.messages?.message?.[0]?.text || "Failed to create customer profile",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Create Payment Profile (save card to customer profile)
async function createPaymentProfile(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  customerProfileId: string,
  cardNumber: string,
  expirationDate: string,
  cvv: string,
  billing: any
): Promise<{ success: boolean; paymentProfileId?: string; error?: string }> {
  // Format expiration date to YYYY-MM
  let expDate = expirationDate.replace(/[\/\s-]/g, "");
  let formattedExpDate = expDate;
  if (expDate.length === 4) {
    const month = expDate.substring(0, 2);
    const year = "20" + expDate.substring(2, 4);
    formattedExpDate = `${year}-${month}`;
  }

  const request = {
    createCustomerPaymentProfileRequest: {
      merchantAuthentication: {
        name: apiLoginId,
        transactionKey: transactionKey,
      },
      customerProfileId: customerProfileId,
      paymentProfile: {
        billTo: {
          firstName: billing?.firstName || "Customer",
          lastName: billing?.lastName || "Customer",
          address: billing?.address || "",
          city: billing?.city || "",
          state: billing?.state || "",
          zip: billing?.zip || "",
          country: billing?.country || "USA",
        },
        payment: {
          creditCard: {
            cardNumber: cardNumber.replace(/\s/g, ""),
            expirationDate: formattedExpDate,
            cardCode: cvv,
          },
        },
      },
      validationMode: "liveMode",
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const responseText = await response.text();
    const result = JSON.parse(responseText.replace(/^\uFEFF/, ""));

    console.log("Create Payment Profile Response:", JSON.stringify(result, null, 2));

    if (result.messages?.resultCode === "Ok") {
      return {
        success: true,
        paymentProfileId: result.customerPaymentProfileId,
      };
    }

    // Check for duplicate payment profile
    if (result.messages?.message?.[0]?.code === "E00039") {
      const match = result.messages.message[0].text.match(/ID (\d+)/);
      if (match) {
        return { success: true, paymentProfileId: match[1] };
      }
    }

    return {
      success: false,
      error: result.messages?.message?.[0]?.text || "Failed to create payment profile",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Charge a saved payment profile (token-based payment)
async function chargeCustomerProfile(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  customerProfileId: string,
  paymentProfileId: string,
  amount: number,
  invoiceNumber?: string,
  orderId?: string
): Promise<{
  success: boolean;
  transactionId?: string;
  authCode?: string;
  error?: string;
  errorCode?: string;
}> {
  const transactionRequest: any = {
    transactionType: "authCaptureTransaction",
    amount: amount.toFixed(2),
    profile: {
      customerProfileId: customerProfileId,
      paymentProfile: {
        paymentProfileId: paymentProfileId,
      },
    },
  };

  if (invoiceNumber) {
    transactionRequest.order = {
      invoiceNumber: invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 20),
    };
  }

  if (orderId) {
    transactionRequest.order = transactionRequest.order || {};
    transactionRequest.order.description = `Order ${orderId.substring(0, 8)}`;
  }

  const request = {
    createTransactionRequest: {
      merchantAuthentication: {
        name: apiLoginId,
        transactionKey: transactionKey,
      },
      refId: `REF-${Date.now()}`,
      transactionRequest,
    },
  };

  try {
    console.log("Charging customer profile:", JSON.stringify(request, null, 2));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const responseText = await response.text();
    const result = JSON.parse(responseText.replace(/^\uFEFF/, ""));

    console.log("Charge Profile Response:", JSON.stringify(result, null, 2));

    const transactionResponse = result.transactionResponse;

    if (result.messages?.resultCode === "Ok" && transactionResponse?.responseCode === "1") {
      return {
        success: true,
        transactionId: transactionResponse.transId,
        authCode: transactionResponse.authCode,
      };
    }

    let errorMessage = "Transaction failed";
    let errorCode = "";

    if (transactionResponse?.errors?.error) {
      const errors = Array.isArray(transactionResponse.errors.error)
        ? transactionResponse.errors.error
        : [transactionResponse.errors.error];
      errorMessage = errors[0]?.errorText || errorMessage;
      errorCode = errors[0]?.errorCode || "";
    } else if (result.messages?.message) {
      const msgArray = Array.isArray(result.messages.message)
        ? result.messages.message
        : [result.messages.message];
      errorMessage = msgArray[0]?.text || errorMessage;
      errorCode = msgArray[0]?.code || "";
    }

    return { success: false, error: errorMessage, errorCode };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Delete a payment profile
async function deletePaymentProfile(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  customerProfileId: string,
  paymentProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const request = {
    deleteCustomerPaymentProfileRequest: {
      merchantAuthentication: {
        name: apiLoginId,
        transactionKey: transactionKey,
      },
      customerProfileId: customerProfileId,
      customerPaymentProfileId: paymentProfileId,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const responseText = await response.text();
    const result = JSON.parse(responseText.replace(/^\uFEFF/, ""));

    if (result.messages?.resultCode === "Ok") {
      return { success: true };
    }

    return {
      success: false,
      error: result.messages?.message?.[0]?.text || "Failed to delete payment profile",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

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

    const endpoint = IS_TEST_MODE ? AUTHORIZE_NET_SANDBOX : AUTHORIZE_NET_PRODUCTION;
    const body = await req.json();

    // ============================================
    // ACTION: SAVE CARD (Create Customer + Payment Profile)
    // ============================================
    if (body.action === "saveCard") {
      const { profileId, email, cardNumber, expirationDate, cvv, billing } = body;

      if (!profileId || !email || !cardNumber || !expirationDate || !cvv) {
        return jsonResponse({
          success: false,
          error: "Missing required fields for saving card",
          errorCode: "INVALID_REQUEST",
        });
      }

      // Step 1: Create or get customer profile
      const customerResult = await createCustomerProfile(
        endpoint, API_LOGIN_ID, TRANSACTION_KEY, email, profileId
      );

      if (!customerResult.success) {
        return jsonResponse({
          success: false,
          error: customerResult.error || "Failed to create customer profile",
          errorCode: "CUSTOMER_PROFILE_ERROR",
        });
      }

      const customerProfileId = customerResult.customerProfileId!;

      // Step 2: Create payment profile (save card)
      const paymentResult = await createPaymentProfile(
        endpoint, API_LOGIN_ID, TRANSACTION_KEY,
        customerProfileId, cardNumber, expirationDate, cvv, billing
      );

      if (!paymentResult.success) {
        return jsonResponse({
          success: false,
          error: paymentResult.error || "Failed to save card",
          errorCode: "PAYMENT_PROFILE_ERROR",
        });
      }

      // Step 3: Save to database
      const cardLast4 = cardNumber.replace(/\s/g, "").slice(-4);
      const cleanNumber = cardNumber.replace(/\s/g, "");
      let cardType = "unknown";
      if (/^4/.test(cleanNumber)) cardType = "visa";
      else if (/^5[1-5]/.test(cleanNumber)) cardType = "mastercard";
      else if (/^3[47]/.test(cleanNumber)) cardType = "amex";
      else if (/^6(?:011|5)/.test(cleanNumber)) cardType = "discover";

      let expMonth = parseInt(expirationDate.substring(0, 2), 10);
      let expYear = parseInt("20" + expirationDate.substring(2, 4), 10);

      const { data: savedMethod, error: saveError } = await supabase
        .from("saved_payment_methods")
        .insert({
          profile_id: profileId,
          customer_profile_id: customerProfileId,
          payment_profile_id: paymentResult.paymentProfileId,
          method_type: "card",
          card_last_four: cardLast4,
          card_type: cardType,
          card_expiry_month: expMonth,
          card_expiry_year: expYear,
          billing_first_name: billing?.firstName || "",
          billing_last_name: billing?.lastName || "",
          billing_address: billing?.address || "",
          billing_city: billing?.city || "",
          billing_state: billing?.state || "",
          billing_zip: billing?.zip || "",
          billing_country: billing?.country || "USA",
          is_default: false,
          is_active: true,
          nickname: `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} •••• ${cardLast4}`,
        })
        .select()
        .single();

      if (saveError) {
        console.error("Error saving payment method to DB:", saveError);
      }

      return jsonResponse({
        success: true,
        customerProfileId,
        paymentProfileId: paymentResult.paymentProfileId,
        savedMethodId: savedMethod?.id,
        message: "Card saved successfully",
      });
    }

    // ============================================
    // ACTION: CHARGE SAVED CARD (Token-based payment)
    // ============================================
    if (body.action === "chargeSavedCard") {
      const { customerProfileId, paymentProfileId, amount, invoiceNumber, orderId } = body;

      if (!customerProfileId || !paymentProfileId || !amount) {
        return jsonResponse({
          success: false,
          error: "Missing required fields for charging saved card",
          errorCode: "INVALID_REQUEST",
        });
      }

      const chargeResult = await chargeCustomerProfile(
        endpoint, API_LOGIN_ID, TRANSACTION_KEY,
        customerProfileId, paymentProfileId, amount, invoiceNumber, orderId
      );

      if (!chargeResult.success) {
        return jsonResponse({
          success: false,
          error: chargeResult.error || "Payment failed",
          errorCode: chargeResult.errorCode || "CHARGE_ERROR",
        });
      }

      // Log to order_activities if we have order info
      if (orderId) {
        try {
          await supabase.from("order_activities").insert({
            order_id: orderId,
            activity_type: "payment_received",
            description: `Payment of $${amount.toFixed(2)} received via Saved Card`,
            metadata: {
              transaction_id: chargeResult.transactionId,
              auth_code: chargeResult.authCode,
              payment_type: "saved_card",
              amount: amount,
            },
          });
        } catch (logError) {
          console.error("Failed to log payment activity:", logError);
        }
      }

      return jsonResponse({
        success: true,
        transactionId: chargeResult.transactionId,
        authCode: chargeResult.authCode,
        message: "Payment successful",
      });
    }

    // ============================================
    // ACTION: DELETE SAVED CARD
    // ============================================
    if (body.action === "deleteCard") {
      const { customerProfileId, paymentProfileId, savedMethodId } = body;

      if (!customerProfileId || !paymentProfileId) {
        return jsonResponse({
          success: false,
          error: "Missing required fields for deleting card",
          errorCode: "INVALID_REQUEST",
        });
      }

      const deleteResult = await deletePaymentProfile(
        endpoint, API_LOGIN_ID, TRANSACTION_KEY,
        customerProfileId, paymentProfileId
      );

      // Also mark as inactive in database
      if (savedMethodId) {
        await supabase
          .from("saved_payment_methods")
          .update({ is_active: false })
          .eq("id", savedMethodId);
      }

      return jsonResponse({
        success: deleteResult.success,
        error: deleteResult.error,
        message: deleteResult.success ? "Card deleted successfully" : deleteResult.error,
      });
    }

    // ============================================
    // DEFAULT ACTION: DIRECT PAYMENT (existing logic)
    // ============================================
    const {
      payment,
      amount,
      invoiceNumber,
      orderId,
      customerId,
      customerEmail,
      billing,
    } = body as PaymentRequest & { amount: number; invoiceNumber?: string; orderId?: string; customerId?: string; customerEmail?: string; billing?: any };

    if (!payment || !amount) {
      return jsonResponse({
        success: false,
        error: "Payment details and amount are required",
        errorCode: "INVALID_REQUEST",
      });
    }

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
