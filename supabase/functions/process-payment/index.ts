import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AUTHORIZE_NET_SANDBOX = "https://apitest.authorize.net/xml/v1/request.api";
const AUTHORIZE_NET_PRODUCTION = "https://api.authorize.net/xml/v1/request.api";

async function createCustomerProfile(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  email: string,
  profileId: string
): Promise<{ success: boolean; customerProfileId?: string; error?: string }> {
  const shortProfileId = profileId.replace(/-/g, "").substring(0, 20);
  const request = {
    createCustomerProfileRequest: {
      merchantAuthentication: { name: apiLoginId, transactionKey: transactionKey },
      profile: { merchantCustomerId: shortProfileId, email: email },
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
      return { success: true, customerProfileId: result.customerProfileId };
    }
    if (result.messages?.message?.[0]?.code === "E00039") {
      const match = result.messages.message[0].text.match(/ID (\d+)/);
      if (match) return { success: true, customerProfileId: match[1] };
    }
    return { success: false, error: result.messages?.message?.[0]?.text || "Failed to create customer profile" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

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
  let expDate = expirationDate.replace(/[\/\s-]/g, "");
  let formattedExpDate = expDate;
  if (expDate.length === 4) {
    const month = expDate.substring(0, 2);
    const year = "20" + expDate.substring(2, 4);
    formattedExpDate = `${year}-${month}`;
  }

  const request = {
    createCustomerPaymentProfileRequest: {
      merchantAuthentication: { name: apiLoginId, transactionKey: transactionKey },
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

    if (result.messages?.resultCode === "Ok") {
      return { success: true, paymentProfileId: result.customerPaymentProfileId };
    }
    if (result.messages?.message?.[0]?.code === "E00039") {
      const match = result.messages.message[0].text.match(/ID (\d+)/);
      if (match) return { success: true, paymentProfileId: match[1] };
    }
    return { success: false, error: result.messages?.message?.[0]?.text || "Failed to create payment profile" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function chargeCustomerProfile(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  customerProfileId: string,
  paymentProfileId: string,
  amount: number,
  invoiceNumber?: string,
  orderId?: string
): Promise<{ success: boolean; transactionId?: string; authCode?: string; error?: string; errorCode?: string }> {
  const transactionRequest: any = {
    transactionType: "authCaptureTransaction",
    amount: amount.toFixed(2),
    profile: {
      customerProfileId: customerProfileId,
      paymentProfile: { paymentProfileId: paymentProfileId },
    },
  };

  if (invoiceNumber) {
    transactionRequest.order = {
      invoiceNumber: invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 20),
    };
  }

  const request = {
    createTransactionRequest: {
      merchantAuthentication: { name: apiLoginId, transactionKey: transactionKey },
      refId: `REF-${Date.now()}`,
      transactionRequest,
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

async function deletePaymentProfile(
  endpoint: string,
  apiLoginId: string,
  transactionKey: string,
  customerProfileId: string,
  paymentProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const request = {
    deleteCustomerPaymentProfileRequest: {
      merchantAuthentication: { name: apiLoginId, transactionKey: transactionKey },
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
    return { success: false, error: result.messages?.message?.[0]?.text || "Failed to delete payment profile" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: paymentSettingsData, error: settingsError } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("provider", "authorize_net")
      .limit(1)
      .maybeSingle();

    if (settingsError || !paymentSettingsData) {
      return jsonResponse({ success: false, error: "Payment gateway not configured.", errorCode: "NO_SETTINGS" });
    }

    const settings = paymentSettingsData.settings as any;
    if (!settings || !settings.enabled) {
      return jsonResponse({ success: false, error: "Payment gateway is disabled.", errorCode: "GATEWAY_DISABLED" });
    }

    const API_LOGIN_ID = (settings.apiLoginId || "").toString().trim();
    const TRANSACTION_KEY = (settings.transactionKey || "").toString().trim();
    const IS_TEST_MODE = settings.testMode === true;

    if (!API_LOGIN_ID || !TRANSACTION_KEY) {
      return jsonResponse({ success: false, error: "API credentials are required.", errorCode: "MISSING_CREDENTIALS" });
    }

    const endpoint = IS_TEST_MODE ? AUTHORIZE_NET_SANDBOX : AUTHORIZE_NET_PRODUCTION;
    const body = await req.json();

    if (body.action === "saveCard") {
      const { profileId, email, cardNumber, expirationDate, cvv, billing } = body;
      if (!profileId || !email || !cardNumber || !expirationDate || !cvv) {
        return jsonResponse({ success: false, error: "Missing required fields", errorCode: "INVALID_REQUEST" });
      }

      const customerResult = await createCustomerProfile(endpoint, API_LOGIN_ID, TRANSACTION_KEY, email, profileId);
      if (!customerResult.success) {
        return jsonResponse({ success: false, error: customerResult.error, errorCode: "CUSTOMER_PROFILE_ERROR" });
      }

      const customerProfileId = customerResult.customerProfileId!;
      const paymentResult = await createPaymentProfile(endpoint, API_LOGIN_ID, TRANSACTION_KEY, customerProfileId, cardNumber, expirationDate, cvv, billing);
      if (!paymentResult.success) {
        return jsonResponse({ success: false, error: paymentResult.error, errorCode: "PAYMENT_PROFILE_ERROR" });
      }

      const cardLast4 = cardNumber.replace(/\s/g, "").slice(-4);
      const cleanNumber = cardNumber.replace(/\s/g, "");
      let cardType = "unknown";
      if (/^4/.test(cleanNumber)) cardType = "visa";
      else if (/^5[1-5]/.test(cleanNumber)) cardType = "mastercard";
      else if (/^3[47]/.test(cleanNumber)) cardType = "amex";
      else if (/^6(?:011|5)/.test(cleanNumber)) cardType = "discover";

      const expMonth = parseInt(expirationDate.substring(0, 2), 10);
      const expYear = parseInt("20" + expirationDate.substring(2, 4), 10);

      const { data: savedMethod } = await supabase.from("saved_payment_methods").insert({
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
      }).select().single();

      return jsonResponse({
        success: true,
        customerProfileId,
        paymentProfileId: paymentResult.paymentProfileId,
        savedMethodId: savedMethod?.id,
        message: "Card saved successfully",
      });
    }

    if (body.action === "chargeSavedCard") {
      const { customerProfileId, paymentProfileId, amount, invoiceNumber, orderId } = body;
      if (!customerProfileId || !paymentProfileId || !amount) {
        return jsonResponse({ success: false, error: "Missing required fields", errorCode: "INVALID_REQUEST" });
      }

      const chargeResult = await chargeCustomerProfile(endpoint, API_LOGIN_ID, TRANSACTION_KEY, customerProfileId, paymentProfileId, amount, invoiceNumber, orderId);
      if (!chargeResult.success) {
        return jsonResponse({ success: false, error: chargeResult.error, errorCode: chargeResult.errorCode || "CHARGE_ERROR" });
      }

      if (orderId) {
        try {
          await supabase.from("order_activities").insert({
            order_id: orderId,
            activity_type: "payment_received",
            description: `Payment of $${amount.toFixed(2)} received via Saved Card`,
            metadata: { transaction_id: chargeResult.transactionId, auth_code: chargeResult.authCode, payment_type: "saved_card", amount },
          });
        } catch (e) { console.error("Failed to log activity:", e); }
      }

      return jsonResponse({ success: true, transactionId: chargeResult.transactionId, authCode: chargeResult.authCode, message: "Payment successful" });
    }

    if (body.action === "deleteCard") {
      const { customerProfileId, paymentProfileId, savedMethodId } = body;
      if (!customerProfileId || !paymentProfileId) {
        return jsonResponse({ success: false, error: "Missing required fields", errorCode: "INVALID_REQUEST" });
      }

      const deleteResult = await deletePaymentProfile(endpoint, API_LOGIN_ID, TRANSACTION_KEY, customerProfileId, paymentProfileId);
      if (savedMethodId) {
        await supabase.from("saved_payment_methods").update({ is_active: false }).eq("id", savedMethodId);
      }

      return jsonResponse({ success: deleteResult.success, error: deleteResult.error, message: deleteResult.success ? "Card deleted" : deleteResult.error });
    }

    const { payment, amount, invoiceNumber, orderId, customerEmail, billing } = body;
    if (!payment || !amount) {
      return jsonResponse({ success: false, error: "Payment details and amount are required", errorCode: "INVALID_REQUEST" });
    }

    let paymentData: any;
    if (payment.type === "card") {
      let expDate = payment.expirationDate.replace(/[\/\s-]/g, "");
      let formattedExpDate = expDate;
      if (expDate.length === 4) {
        formattedExpDate = `20${expDate.substring(2, 4)}-${expDate.substring(0, 2)}`;
      }
      paymentData = {
        creditCard: {
          cardNumber: payment.cardNumber.replace(/\s/g, ""),
          expirationDate: formattedExpDate,
          cardCode: payment.cvv,
        },
      };
    } else if (payment.type === "ach" || payment.type === "echeck") {
      paymentData = {
        bankAccount: {
          accountType: payment.accountType || "checking",
          routingNumber: payment.routingNumber,
          accountNumber: payment.accountNumber,
          nameOnAccount: payment.nameOnAccount,
          echeckType: payment.echeckType || "WEB",
          bankName: payment.bankName || "",
        },
      };
    } else {
      return jsonResponse({ success: false, error: "Invalid payment type", errorCode: "INVALID_PAYMENT_TYPE" });
    }

    const billTo: any = {};
    if (billing) {
      if (billing.firstName) billTo.firstName = billing.firstName.substring(0, 50);
      if (billing.lastName) billTo.lastName = billing.lastName.substring(0, 50);
      if (billing.address) billTo.address = billing.address.substring(0, 60);
      if (billing.city) billTo.city = billing.city.substring(0, 40);
      if (billing.state) billTo.state = billing.state.substring(0, 40);
      if (billing.zip) billTo.zip = billing.zip.substring(0, 20);
      if (billing.country) billTo.country = billing.country.substring(0, 60);
    }

    const orderInfo: any = {};
    if (invoiceNumber) orderInfo.invoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 20);
    if (orderId) orderInfo.description = `Order ${orderId.substring(0, 8)}`;

    const customerInfo: any = {};
    if (customerEmail && customerEmail.includes("@")) customerInfo.email = customerEmail.trim().substring(0, 255);

    const transactionRequest: any = {
      transactionType: "authCaptureTransaction",
      amount: amount.toFixed(2),
      payment: paymentData,
    };
    if (Object.keys(orderInfo).length > 0) transactionRequest.order = orderInfo;
    if (Object.keys(customerInfo).length > 0) transactionRequest.customer = customerInfo;
    if (Object.keys(billTo).length > 0) transactionRequest.billTo = billTo;

    const authorizeRequest = {
      createTransactionRequest: {
        merchantAuthentication: { name: API_LOGIN_ID, transactionKey: TRANSACTION_KEY },
        refId: `REF-${Date.now()}`,
        transactionRequest,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authorizeRequest),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText.replace(/^\uFEFF/, ""));
    } catch {
      return jsonResponse({ success: false, error: "Invalid response from payment gateway", errorCode: "PARSE_ERROR" });
    }

    const messages = result.messages;
    const transactionResponse = result.transactionResponse;

    if (messages?.resultCode === "Ok" && transactionResponse?.responseCode === "1") {
      if (orderId) {
        try {
          await supabase.from("order_activities").insert({
            order_id: orderId,
            activity_type: "payment_received",
            description: `Payment of $${amount.toFixed(2)} received via ${payment.type === "card" ? "Credit Card" : "ACH"}`,
            metadata: { transaction_id: transactionResponse.transId, auth_code: transactionResponse.authCode, payment_type: payment.type, amount },
          });
        } catch (e) { console.error("Failed to log activity:", e); }
      }

      return jsonResponse({
        success: true,
        transactionId: transactionResponse.transId,
        authCode: transactionResponse.authCode,
        message: "Transaction approved",
      });
    } else {
      let errorMessage = "Transaction failed";
      let errorCode = "";
      if (transactionResponse?.errors?.error) {
        const errors = Array.isArray(transactionResponse.errors.error) ? transactionResponse.errors.error : [transactionResponse.errors.error];
        errorMessage = errors[0]?.errorText || errorMessage;
        errorCode = errors[0]?.errorCode || "";
      } else if (messages?.message) {
        const msgArray = Array.isArray(messages.message) ? messages.message : [messages.message];
        errorMessage = msgArray[0]?.text || errorMessage;
        errorCode = msgArray[0]?.code || "";
      }
      return jsonResponse({ success: false, error: errorMessage, errorCode });
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Internal server error", errorCode: "INTERNAL_ERROR" });
  }
});
