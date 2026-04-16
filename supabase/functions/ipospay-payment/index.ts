import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface QueryBatchReportRequest {
  action: "queryBatchReport";
  batchDate?: string;
  batchNo?: string;
}

type IPosPayRequest = GeneratePaymentUrlRequest | QueryPaymentStatusRequest | QueryBatchReportRequest;

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

function getEnvIPosPayCredentials(): IPosPayCredentials {
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

async function getSettingsIPosPayCredentials(): Promise<IPosPayCredentials | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("settings")
    .select(`
      ipospay_enabled,
      ipospay_test_mode,
      ipospay_sandbox_tpn,
      ipospay_sandbox_auth_token,
      ipospay_production_tpn,
      ipospay_production_auth_token
    `)
    .eq("is_global", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to read iPOSPay settings from settings table:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const testMode = data.ipospay_test_mode ?? true;

  return {
    enabled: data.ipospay_enabled === true,
    testMode,
    tpn: testMode ? data.ipospay_sandbox_tpn || "" : data.ipospay_production_tpn || "",
    authToken: testMode ? data.ipospay_sandbox_auth_token || "" : data.ipospay_production_auth_token || "",
  };
}

async function getIPosPayCredentials(): Promise<IPosPayCredentials> {
  const settingsCredentials = await getSettingsIPosPayCredentials();

  if (settingsCredentials) {
    return settingsCredentials;
  }

  return getEnvIPosPayCredentials();
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

function sanitizeText(value: string | undefined, fallback = "", maxLength = 60) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function sanitizeEmail(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized.slice(0, 100) : "";
}

function sanitizePhone(value?: string) {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `1${digitsOnly}`;
  }
  if (digitsOnly.length < 11) return "";
  return digitsOnly.slice(0, 15);
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
  const customerName = sanitizeText(body.customerName, "Customer", 50);
  const customerEmail = sanitizeEmail(body.customerEmail);
  const customerMobile = sanitizePhone(body.customerMobile);
  const merchantName = sanitizeText(body.merchantName, "RX Pharmacy", 35);
  const description = sanitizeText(body.description, `Order #${body.orderId}`, 150);
  const hasReceiptDestination = Boolean(customerEmail || customerMobile);

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
      eReceipt: hasReceiptDestination,
      eReceiptInputPrompt: !hasReceiptDestination,
      customerName,
      customerEmail,
      customerMobile,
      requestCardToken: true,
      shortenURL: false,
      sendPaymentLink: false,
      integrationVersion: "v2",
    },
    personalization: {
      merchantName,
      logoUrl: body.logoUrl || "",
      themeColor: body.themeColor || "#2563EB",
      description,
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

function validateBatchDate(value?: string) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function handleQueryBatchReport(body: QueryBatchReportRequest, credentials: IPosPayCredentials) {
  if (body.batchNo?.trim() && !body.batchDate?.trim()) {
    return jsonResponse(200, {
      success: false,
      error: "Batch date is required when batch number is provided",
      errorCode: "INVALID_REQUEST",
    });
  }

  if (!validateBatchDate(body.batchDate)) {
    return jsonResponse(200, {
      success: false,
      error: "Batch date must be in YYYY-MM-DD format",
      errorCode: "INVALID_REQUEST",
    });
  }

  const { paymentBaseUrl } = getIPosPayBaseUrls(credentials.testMode);
  const payload: Record<string, string> = {
    merchantId: credentials.tpn,
  };

  if (body.batchDate?.trim()) {
    payload.batchDate = body.batchDate.trim();
  }

  if (body.batchNo?.trim()) {
    payload.batchNo = body.batchNo.trim();
  }

  const response = await fetch(`${paymentBaseUrl}/batch-report`, {
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
      error: data?.message || data?.error || "Failed to fetch iPOSPay batch report",
      errors: data?.errors,
      errorCode: "BATCH_REPORT_HTTP_ERROR",
    });
  }

  return jsonResponse(200, {
    success: true,
    data,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const credentials = await getIPosPayCredentials();
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

    if (body.action === "queryBatchReport") {
      return await handleQueryBatchReport(body, credentials);
    }

    return jsonResponse(400, {
      success: false,
      error: "Invalid action. Use 'generatePaymentUrl', 'queryPaymentStatus', or 'queryBatchReport'",
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
