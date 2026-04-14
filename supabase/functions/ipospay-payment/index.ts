import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentMethod = "card" | "ach";

interface GeneratePaymentUrlRequest {
  action: "generatePaymentUrl";
  amount: number;
  orderId: string;
  paymentMethod?: PaymentMethod;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  description?: string;
  calculateFee?: boolean;
  calculateTax?: boolean;
  tipsInputPrompt?: boolean;
  merchantName?: string;
  logoUrl?: string;
  themeColor?: string;
  returnUrl: string;
  failureUrl?: string;
  cancelUrl?: string;
}

interface QueryPaymentStatusRequest {
  action: "queryPaymentStatus";
  transactionReferenceId: string;
}

type IPosPayRequest = GeneratePaymentUrlRequest | QueryPaymentStatusRequest;

interface IPosPayCredentials {
  enabled: boolean;
  testMode: boolean;
  tpn: string;
  authToken: string;
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readBoolEnv(name: string, fallback: boolean) {
  const value = Deno.env.get(name);
  if (value == null) return fallback;
  return value === "true";
}

function getIPosPayCredentials(): IPosPayCredentials {
  const enabled = readBoolEnv("IPOSPAY_ENABLED", false);
  const testMode = readBoolEnv("IPOSPAY_TEST_MODE", true);

  const tpn = testMode
    ? Deno.env.get("IPOSPAY_SANDBOX_TPN") || ""
    : Deno.env.get("IPOSPAY_PRODUCTION_TPN") || "";

  const authToken = testMode
    ? Deno.env.get("IPOSPAY_SANDBOX_AUTH_TOKEN") || ""
    : Deno.env.get("IPOSPAY_PRODUCTION_AUTH_TOKEN") || "";

  return {
    enabled,
    testMode,
    tpn,
    authToken,
  };
}

function getIPosPayBaseUrls(testMode: boolean) {
  return {
    paymentBaseUrl: testMode
      ? "https://payment.ipospays.tech/api/v1"
      : "https://payment.ipospays.com/api/v1",
    queryBaseUrl: testMode
      ? "https://api.ipospays.tech/v1"
      : "https://api.ipospays.com/v1",
  };
}

function generateTransactionReferenceId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TXN${timestamp}${random}`;
}

function formatAmountForIPosPay(amount: number) {
  return Math.round(amount * 100).toString();
}

function validateGeneratePaymentUrlRequest(body: Partial<GeneratePaymentUrlRequest>) {
  if (!body.orderId?.trim()) {
    return "Order ID is required";
  }

  if (!body.returnUrl?.trim()) {
    return "Return URL is required";
  }

  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    return "Amount must be greater than 0";
  }

  return null;
}

async function handleGeneratePaymentUrl(body: GeneratePaymentUrlRequest, credentials: IPosPayCredentials) {
  const validationError = validateGeneratePaymentUrlRequest(body);
  if (validationError) {
    return jsonResponse(200, {
      success: false,
      error: validationError,
      errorCode: "INVALID_REQUEST",
    });
  }

  const { paymentBaseUrl } = getIPosPayBaseUrls(credentials.testMode);
  const transactionReferenceId = generateTransactionReferenceId();

  const payload = {
    merchantAuthentication: {
      merchantId: credentials.tpn,
      transactionReferenceId,
    },
    transactionRequest: {
      transactionType: 1,
      amount: formatAmountForIPosPay(body.amount),
      calculateFee: body.calculateFee ?? true,
      calculateTax: body.calculateTax ?? false,
      tipsInputPrompt: body.tipsInputPrompt ?? false,
    },
    notificationOption: {
      notifyBySMS: false,
      mobileNumber: "",
      notifyByPOST: false,
      authHeader: "",
      postAPI: "",
      notifyByRedirect: true,
      returnUrl: body.returnUrl,
      failureUrl: body.failureUrl || body.returnUrl,
      cancelUrl: body.cancelUrl || body.returnUrl,
    },
    preferences: {
      integrationType: 1,
      avsVerification: true,
      eReceipt: Boolean(body.customerEmail || body.customerMobile),
      eReceiptInputPrompt: !body.customerEmail && !body.customerMobile,
      customerName: body.customerName || "",
      customerEmail: body.customerEmail || "",
      customerMobile: body.customerMobile || "",
      requestCardToken: true,
      shortenURL: false,
      sendPaymentLink: false,
      integrationVersion: "v2",
      enableACH: true,
    },
    personalization: {
      merchantName: body.merchantName || "9RX Pharmacy",
      logoUrl: body.logoUrl || "",
      themeColor: body.themeColor || "#2563EB",
      description: body.description || `Order #${body.orderId}`,
      payNowButtonText: body.paymentMethod === "ach" ? "Pay with Bank" : "Pay Now",
      buttonColor: body.themeColor || "#2563EB",
      cancelButtonText: "Cancel",
      disclaimer: "",
    },
  };

  const response = await fetch(`${paymentBaseUrl}/external-payment-transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: credentials.authToken,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    return jsonResponse(200, {
      success: false,
      error: data?.errors?.[0]?.message || data?.message || "Failed to connect to iPOSPay",
      errors: data?.errors,
      errorCode: "PAYMENT_URL_HTTP_ERROR",
    });
  }

  if (data?.information) {
    return jsonResponse(200, {
      success: true,
      paymentUrl: data.information,
      transactionReferenceId,
      message: data.message || "Payment URL generated successfully",
    });
  }

  return jsonResponse(200, {
    success: false,
    error: data?.errors?.[0]?.message || data?.message || "Failed to generate payment URL",
    errors: data?.errors,
    errorCode: "PAYMENT_URL_GENERATION_FAILED",
  });
}

async function handleQueryPaymentStatus(body: QueryPaymentStatusRequest, credentials: IPosPayCredentials) {
  if (!body.transactionReferenceId?.trim()) {
    return jsonResponse(200, {
      success: false,
      error: "Transaction reference ID is required",
      errorCode: "INVALID_REQUEST",
    });
  }

  const { queryBaseUrl } = getIPosPayBaseUrls(credentials.testMode);
  const url = `${queryBaseUrl}/queryPaymentStatus?tpn=${encodeURIComponent(
    credentials.tpn,
  )}&transactionReferenceId=${encodeURIComponent(body.transactionReferenceId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: credentials.authToken,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return jsonResponse(200, {
      success: false,
      error: data?.message || data?.error || "Failed to query payment status",
      errorCode: "QUERY_HTTP_ERROR",
    });
  }

  return jsonResponse(200, {
    success: true,
    data: data?.iposHPResponse || data,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const credentials = getIPosPayCredentials();
    if (!credentials.enabled) {
      return jsonResponse(200, {
        success: false,
        error: "iPOSPay is disabled",
        errorCode: "GATEWAY_DISABLED",
      });
    }

    if (!credentials.tpn || !credentials.authToken) {
      return jsonResponse(200, {
        success: false,
        error: "iPOSPay credentials are not configured",
        errorCode: "INVALID_CREDENTIALS",
      });
    }

    const body = (await req.json()) as IPosPayRequest;

    if (body.action === "generatePaymentUrl") {
      return await handleGeneratePaymentUrl(body, credentials);
    }

    if (body.action === "queryPaymentStatus") {
      return await handleQueryPaymentStatus(body, credentials);
    }

    return jsonResponse(400, {
      success: false,
      error: "Invalid action. Use 'generatePaymentUrl' or 'queryPaymentStatus'",
      errorCode: "INVALID_ACTION",
    });
  } catch (error) {
    console.error("iPOSPay function error:", error);
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      errorCode: "INTERNAL_ERROR",
    });
  }
});
