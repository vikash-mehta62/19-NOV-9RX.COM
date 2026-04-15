/**
 * iPOSPay Hosted Payment Page helpers.
 * The app owns subtotal/shipping/tax logic and sends the base payable amount.
 * iPOSPay may add a card processing fee on top of that amount.
 */

import { supabase } from "@/supabaseClient";
import { SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export type IPosPaymentMethod = "card" | "ach";

export interface IPosPaySettings {
  enabled: boolean;
  tpn: string;
  authToken: string;
  testMode: boolean;
}

export interface IPosHostedPaymentRequest {
  amount: number;
  orderId: string;
  paymentMethod?: IPosPaymentMethod;
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

export interface IPosHostedPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionReferenceId?: string;
  message?: string;
  error?: string;
  errorCode?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface IPosPaymentCallbackData {
  rawResponseCode: number;
  responseCode: number;
  responseMessage: string;
  transactionReferenceId: string;
  transactionId: string;
  transactionType: number;
  transactionNumber?: string;
  batchNumber?: string;
  cardType?: string;
  cardLast4Digit?: string;
  amount: number;
  tips: number;
  customFee: number;
  localTax: number;
  stateTax: number;
  totalAmount: number;
  responseApprovalCode?: string;
  rrn?: string;
  cardToken?: string;
  errResponseCode?: string;
  errResponseMessage?: string;
  avsRspMsg?: string;
  consumerId?: string;
  accountType?: string;
  accountLast4?: string;
  routingNumber?: string;
  achToken?: string;
  paymentMethod: IPosPaymentMethod;
}

export interface IPosNormalizedPaymentResult {
  status: "success" | "failed" | "cancelled" | "rejected";
  paymentMethod: IPosPaymentMethod;
  baseAmount: number;
  processingFee: number;
  chargedAmount: number;
  transactionReferenceId: string;
  transactionId: string;
  responseMessage: string;
  responseApprovalCode?: string;
  cardType?: string;
  cardLast4Digit?: string;
  accountType?: string;
  accountLast4?: string;
  errResponseCode?: string;
  errResponseMessage?: string;
}

export interface IPosQueryStatusResponse {
  success: boolean;
  data?: IPosPaymentCallbackData;
  error?: string;
  errorCode?: string;
}

function hasProcessorDecline(callbackData: Pick<IPosPaymentCallbackData, "errResponseCode" | "errResponseMessage">) {
  const errCode = String(callbackData.errResponseCode || "").trim().toUpperCase();
  const errMessage = String(callbackData.errResponseMessage || "").trim().toLowerCase();

  if (!errCode && !errMessage) return false;

  const nonDeclineCodes = new Set(["0", "00", "000"]);
  if (errCode && !nonDeclineCodes.has(errCode)) {
    return true;
  }

  return /(declin|mismatch|invalid|fail|error|reject|void)/.test(errMessage);
}

function derivePaymentStatus(
  callbackData: IPosPaymentCallbackData,
): IPosNormalizedPaymentResult["status"] {
  const responseMessage = String(callbackData.responseMessage || "").trim().toLowerCase();

  if (callbackData.responseCode === 401 || responseMessage.includes("cancelled")) {
    return "cancelled";
  }

  if (callbackData.responseCode === 402 || responseMessage.includes("rejected")) {
    return "rejected";
  }

  if (callbackData.responseCode === 200) {
    if (
      responseMessage.includes("declined") ||
      responseMessage.includes("failed") ||
      responseMessage.includes("error") ||
      hasProcessorDecline(callbackData)
    ) {
      return "failed";
    }

    return "success";
  }

  return "failed";
}

export function generateTransactionReferenceId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${timestamp}${random}`;
}

export function formatAmountForIPOS(amount: number): string {
  return Math.round(amount * 100).toString();
}

export function parseAmountFromIPOS(amount: number | string | null | undefined): number {
  if (amount == null || amount === "") return 0;
  const parsed = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(parsed)) return 0;
  return parsed / 100;
}

export function getIPosPayUrls(testMode: boolean) {
  return testMode
    ? {
        paymentUrl: "https://payment.ipospays.tech/api/v1/external-payment-transaction",
        queryUrl: "https://api.ipospays.tech/v1/queryPaymentStatus",
      }
    : {
        paymentUrl: "https://payment.ipospays.com/api/v1/external-payment-transaction",
        queryUrl: "https://api.ipospays.com/v1/queryPaymentStatus",
      };
}

export function validateIPosPaySettings(settings: IPosPaySettings) {
  const errors: string[] = [];

  if (!settings.tpn?.trim()) {
    errors.push("TPN (Terminal Provider Number) is required");
  }

  if (!settings.authToken?.trim()) {
    errors.push("Auth Token is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildPaymentRequestPayload(settings: IPosPaySettings, request: IPosHostedPaymentRequest) {
  return {
    merchantAuthentication: {
      merchantId: settings.tpn,
      transactionReferenceId: generateTransactionReferenceId(),
    },
    transactionRequest: {
      transactionType: 1,
      amount: formatAmountForIPOS(request.amount),
      calculateFee: request.calculateFee ?? true,
      tipsInputPrompt: request.tipsInputPrompt ?? false,
      calculateTax: request.calculateTax ?? false,
    },
    notificationOption: {
      notifyBySMS: false,
      mobileNumber: "",
      notifyByPOST: false,
      authHeader: "",
      postAPI: "",
      notifyByRedirect: true,
      returnUrl: request.returnUrl,
      failureUrl: request.failureUrl || request.returnUrl,
      cancelUrl: request.cancelUrl || request.returnUrl,
    },
    preferences: {
      integrationType: 1,
      avsVerification: true,
      eReceipt: !!request.customerEmail || !!request.customerMobile,
      eReceiptInputPrompt: !request.customerEmail && !request.customerMobile,
      customerName: request.customerName || "",
      customerEmail: request.customerEmail || "",
      customerMobile: request.customerMobile || "",
      requestCardToken: true,
      shortenURL: false,
      sendPaymentLink: false,
      integrationVersion: "v2",
      enableACH: true,
    },
    personalization: {
      merchantName: request.merchantName || "",
      logoUrl: request.logoUrl || "",
      themeColor: request.themeColor || "#2563EB",
      description: request.description || "",
      payNowButtonText: request.paymentMethod === "ach" ? "Pay with Bank" : "Pay Now",
      buttonColor: request.themeColor || "#2563EB",
      cancelButtonText: "Cancel",
      disclaimer: "",
    },
  };
}

function normalizeIPosResponseCode(response: any): number {
  const rawCode = Number(response?.responseCode ?? 0);
  if (rawCode === 0) {
    const isAch =
      response?.paymentMethod === "ACH" ||
      response?.cardType === "CHECK" ||
      response?.achData ||
      response?.accountLast4 ||
      Number(response?.transactionType) === 10;
    if (isAch) return 200;
  }
  return rawCode;
}

function inferPaymentMethod(response: any): IPosPaymentMethod {
  const paymentMethod = String(response?.paymentMethod || "").toUpperCase();
  if (
    paymentMethod === "ACH" ||
    response?.cardType === "CHECK" ||
    response?.achData ||
    response?.accountLast4 ||
    Number(response?.transactionType) === 10
  ) {
    return "ach";
  }

  return "card";
}

function unwrapIPosResponse(data: any): any {
  if (!data) return {};
  if (data.iposHPResponse) return data.iposHPResponse;
  if (data.data?.iposHPResponse) return data.data.iposHPResponse;
  if (data.data && typeof data.data === "object") return data.data;
  return data;
}

export function parseCallbackResponse(data: any): IPosPaymentCallbackData {
  const response = unwrapIPosResponse(data);
  const paymentMethod = inferPaymentMethod(response);
  const achData = response?.achData || {};

  return {
    rawResponseCode: Number(response.responseCode ?? 0),
    responseCode: normalizeIPosResponseCode(response),
    responseMessage: response.responseMessage || "",
    transactionReferenceId: response.transactionReferenceId || "",
    transactionId: response.transactionId || "",
    transactionType: Number(response.transactionType ?? 0),
    transactionNumber: response.transactionNumber,
    batchNumber: response.batchNumber,
    cardType: response.cardType,
    cardLast4Digit: response.cardLast4Digit,
    amount: parseAmountFromIPOS(response.amount),
    tips: parseAmountFromIPOS(response.tips),
    customFee: parseAmountFromIPOS(response.customFee),
    localTax: parseAmountFromIPOS(response.localTax),
    stateTax: parseAmountFromIPOS(response.stateTax),
    totalAmount: parseAmountFromIPOS(response.totalAmount),
    responseApprovalCode: response.responseApprovalCode,
    rrn: response.rrn,
    cardToken: response.cardToken || response.responseCardToken,
    errResponseCode: response.errResponseCode,
    errResponseMessage: response.errResponseMessage,
    avsRspMsg: response.avsRspMsg || response.avsRespMeg,
    consumerId: response.consumerId,
    accountType: response.accountType || achData.accountType,
    accountLast4: response.accountLast4 || achData.accountNumber?.slice?.(-4),
    routingNumber: response.routingNumber,
    achToken: response.achToken || achData.achToken,
    paymentMethod,
  };
}

export function isPaymentSuccessful(callbackData: IPosPaymentCallbackData): boolean {
  return derivePaymentStatus(callbackData) === "success";
}

export function isPaymentCancelled(callbackData: IPosPaymentCallbackData): boolean {
  return derivePaymentStatus(callbackData) === "cancelled";
}

export function isPaymentRejected(callbackData: IPosPaymentCallbackData): boolean {
  return derivePaymentStatus(callbackData) === "rejected";
}

export function getPaymentStatusText(callbackData: IPosPaymentCallbackData): string {
  switch (callbackData.responseCode) {
    case 200:
      return "Payment Successful";
    case 400:
      return "Payment Failed";
    case 401:
      return "Payment Cancelled";
    case 402:
      return "Payment Rejected";
    default:
      return "Unknown Status";
  }
}

export function formatCardType(cardType?: string): string {
  if (!cardType) return "Card";

  const types: Record<string, string> = {
    VISA: "Visa",
    MASTERCARD: "Mastercard",
    AMEX: "American Express",
    DISCOVER: "Discover",
    DINNERS: "Diners Club",
    JCB: "JCB",
    CHECK: "Bank Account",
  };

  return types[cardType.toUpperCase()] || cardType;
}

export function normalizePaymentResult(callbackData: IPosPaymentCallbackData): IPosNormalizedPaymentResult {
  const status = derivePaymentStatus(callbackData);

  return {
    status,
    paymentMethod: callbackData.paymentMethod,
    baseAmount: callbackData.amount,
    processingFee: callbackData.customFee,
    chargedAmount: callbackData.totalAmount || callbackData.amount,
    transactionReferenceId: callbackData.transactionReferenceId,
    transactionId: callbackData.transactionId,
    responseMessage: callbackData.responseMessage,
    responseApprovalCode: callbackData.responseApprovalCode,
    cardType: callbackData.cardType,
    cardLast4Digit: callbackData.cardLast4Digit,
    accountType: callbackData.accountType,
    accountLast4: callbackData.accountLast4,
    errResponseCode: callbackData.errResponseCode,
    errResponseMessage: callbackData.errResponseMessage,
  };
}

export async function queryIPOSPayStatus(
  transactionReferenceId: string,
): Promise<IPosQueryStatusResponse> {
  try {
    const supabaseUrl = supabase.supabaseUrl;
    const functionUrl = `${supabaseUrl}/functions/v1/ipospay-payment`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        action: "queryPaymentStatus",
        transactionReferenceId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || `HTTP ${response.status}: Failed to query payment status`,
        errorCode: "HTTP_ERROR",
      };
    }

    return {
      success: true,
      data: data?.data ? parseCallbackResponse(data.data) : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to query payment status",
      errorCode: "EXCEPTION",
    };
  }
}
