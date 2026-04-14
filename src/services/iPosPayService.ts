/**
 * iPOS Pays Payment Gateway Service
 * Hosted Payment Page (HPP) Integration
 */

export interface IPosPaySettings {
  enabled: boolean;
  tpn: string; // Terminal Provider Number (Merchant ID)
  authToken: string;
  testMode: boolean; // true = sandbox, false = production
}

export interface IPosPaymentRequest {
  amount: number; // Amount in dollars (will be multiplied by 100)
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  description?: string;
  calculateFee?: boolean;
  calculateTax?: boolean;
  tipsInputPrompt?: boolean;
  // Personalization
  merchantName?: string;
  logoUrl?: string;
  themeColor?: string;
  // Callback URLs
  returnUrl: string;
  failureUrl?: string;
  cancelUrl?: string;
}

export interface IPosPaymentResponse {
  success: boolean;
  paymentUrl?: string; // URL to redirect customer to
  transactionReferenceId?: string;
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface IPosPaymentCallbackData {
  responseCode: number; // 200 = success, 400 = failure, 401 = cancelled, 402 = rejected
  responseMessage: string;
  transactionReferenceId: string;
  transactionId: string;
  transactionType: number; // 1 = SALE, 2 = CARD VALIDATION
  transactionNumber?: string;
  batchNumber?: string;
  cardType?: string;
  cardLast4Digit?: string;
  amount: number;
  tips?: number;
  customFee?: number;
  localTax?: number;
  stateTax?: number;
  totalAmount: number;
  responseApprovalCode?: string;
  rrn?: string;
  cardToken?: string;
  errResponseCode?: string;
  errResponseMessage?: string;
  avsRspMsg?: string;
  consumerId?: string;
}

export interface IPosQueryStatusResponse {
  success: boolean;
  data?: IPosPaymentCallbackData;
  error?: string;
}

/**
 * Generate a unique transaction reference ID
 */
export function generateTransactionReferenceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`.toUpperCase();
}

/**
 * Convert dollar amount to iPOS Pays format (multiply by 100)
 */
export function formatAmountForIPOS(amount: number): string {
  return Math.round(amount * 100).toString();
}

/**
 * Convert iPOS Pays amount format to dollars (divide by 100)
 */
export function parseAmountFromIPOS(amount: number | string): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount / 100;
}

/**
 * Get iPOS Pays API URLs based on environment
 */
export function getIPosPayUrls(testMode: boolean) {
  if (testMode) {
    return {
      paymentUrl: 'https://payment.ipospays.tech/api/v1/external-payment-transaction',
      queryUrl: 'https://api.ipospays.tech/v1/queryPaymentStatus',
    };
  }
  return {
    paymentUrl: 'https://payment.ipospays.com/api/v1/external-payment-transaction',
    queryUrl: 'https://api.ipospays.com/v1/queryPaymentStatus',
  };
}

/**
 * Validate iPOS Pays settings
 */
export function validateIPosPaySettings(settings: IPosPaySettings): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!settings.tpn || settings.tpn.trim().length === 0) {
    errors.push('TPN (Terminal Provider Number) is required');
  }

  if (!settings.authToken || settings.authToken.trim().length === 0) {
    errors.push('Auth Token is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build payment request payload for iPOS Pays API
 */
export function buildPaymentRequestPayload(
  settings: IPosPaySettings,
  request: IPosPaymentRequest
): any {
  const transactionReferenceId = generateTransactionReferenceId();
  const amount = formatAmountForIPOS(request.amount);

  return {
    merchantAuthentication: {
      merchantId: settings.tpn,
      transactionReferenceId,
    },
    transactionRequest: {
      transactionType: 1, // 1 = SALE
      amount,
      calculateFee: request.calculateFee ?? true,
      tipsInputPrompt: request.tipsInputPrompt ?? false,
      calculateTax: request.calculateTax ?? true,
    },
    notificationOption: {
      notifyBySMS: false,
      mobileNumber: '',
      notifyByPOST: false,
      authHeader: '',
      postAPI: '',
      notifyByRedirect: true,
      returnUrl: request.returnUrl,
      failureUrl: request.failureUrl || request.returnUrl,
      cancelUrl: request.cancelUrl || request.returnUrl,
    },
    preferences: {
      integrationType: 1, // 1 = E-Commerce
      avsVerification: true,
      eReceipt: !!request.customerEmail || !!request.customerMobile,
      eReceiptInputPrompt: !request.customerEmail && !request.customerMobile,
      customerName: request.customerName || '',
      customerEmail: request.customerEmail || '',
      customerMobile: request.customerMobile || '',
      requestCardToken: true, // Enable for saved cards
      shortenURL: false,
      sendPaymentLink: false,
      integrationVersion: 'v2',
    },
    personalization: {
      merchantName: request.merchantName || '',
      logoUrl: request.logoUrl || '',
      themeColor: request.themeColor || '#4F46E5',
      description: request.description || '',
      payNowButtonText: 'Pay Now',
      buttonColor: request.themeColor || '#4F46E5',
      cancelButtonText: 'Cancel',
      disclaimer: '',
    },
  };
}

/**
 * Parse iPOS Pays callback response
 */
export function parseCallbackResponse(data: any): IPosPaymentCallbackData {
  const response = data.iposHPResponse || data;
  
  return {
    responseCode: response.responseCode,
    responseMessage: response.responseMessage,
    transactionReferenceId: response.transactionReferenceId,
    transactionId: response.transactionId,
    transactionType: response.transactionType,
    transactionNumber: response.transactionNumber,
    batchNumber: response.batchNumber,
    cardType: response.cardType,
    cardLast4Digit: response.cardLast4Digit,
    amount: parseAmountFromIPOS(response.amount || 0),
    tips: response.tips ? parseAmountFromIPOS(response.tips) : 0,
    customFee: response.customFee ? parseAmountFromIPOS(response.customFee) : 0,
    localTax: response.localTax ? parseAmountFromIPOS(response.localTax) : 0,
    stateTax: response.stateTax ? parseAmountFromIPOS(response.stateTax) : 0,
    totalAmount: parseAmountFromIPOS(response.totalAmount || 0),
    responseApprovalCode: response.responseApprovalCode,
    rrn: response.rrn,
    cardToken: response.cardToken,
    errResponseCode: response.errResponseCode,
    errResponseMessage: response.errResponseMessage,
    avsRspMsg: response.avsRspMsg,
    consumerId: response.consumerId,
  };
}

/**
 * Check if payment was successful
 */
export function isPaymentSuccessful(callbackData: IPosPaymentCallbackData): boolean {
  return callbackData.responseCode === 200;
}

/**
 * Check if payment was cancelled by customer
 */
export function isPaymentCancelled(callbackData: IPosPaymentCallbackData): boolean {
  return callbackData.responseCode === 401;
}

/**
 * Check if payment was rejected by customer
 */
export function isPaymentRejected(callbackData: IPosPaymentCallbackData): boolean {
  return callbackData.responseCode === 402;
}

/**
 * Get payment status text
 */
export function getPaymentStatusText(callbackData: IPosPaymentCallbackData): string {
  switch (callbackData.responseCode) {
    case 200:
      return 'Payment Successful';
    case 400:
      return 'Payment Failed';
    case 401:
      return 'Payment Cancelled';
    case 402:
      return 'Payment Rejected';
    default:
      return 'Unknown Status';
  }
}

/**
 * Format card type for display
 */
export function formatCardType(cardType?: string): string {
  if (!cardType) return 'Card';
  
  const types: Record<string, string> = {
    VISA: 'Visa',
    MASTERCARD: 'Mastercard',
    AMEX: 'American Express',
    DISCOVER: 'Discover',
    DINNERS: 'Diners Club',
    JCB: 'JCB',
  };
  
  return types[cardType.toUpperCase()] || cardType;
}
