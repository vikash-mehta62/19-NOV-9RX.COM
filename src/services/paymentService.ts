import { supabase } from "@/integrations/supabase/client";

// Payment Types
export interface CardPayment {
  type: "card";
  cardNumber: string;
  expirationDate: string; // MMYY format
  cvv: string;
  cardholderName: string;
}

export interface ACHPayment {
  type: "ach" | "echeck";
  accountType: "checking" | "savings" | "businessChecking";
  routingNumber: string;
  accountNumber: string;
  nameOnAccount: string;
  bankName?: string;
  echeckType?: "WEB" | "PPD" | "CCD";
}

export interface BillingAddress {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface PaymentRequest {
  payment: CardPayment | ACHPayment;
  amount: number;
  invoiceNumber?: string;
  orderId?: string;
  customerId?: string;
  customerEmail?: string;
  billing?: BillingAddress;
  testMode?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  responseCode?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  cardNumber?: string;
  orderId?: string;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundTransactionId?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Process a payment via Supabase Edge Function
 * Supports Credit Card, ACH, and eCheck payments
 */
export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("process-payment", {
      body: request,
    });

    if (error) {
      console.error("Payment function error:", error);
      return {
        success: false,
        error: error.message || "Payment processing failed",
      };
    }

    return data as PaymentResponse;
  } catch (err) {
    console.error("Payment service error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error occurred",
    };
  }
}

/**
 * Process a refund via Supabase Edge Function
 */
export async function processRefund(request: RefundRequest): Promise<RefundResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("refund-payment", {
      body: request,
    });

    if (error) {
      console.error("Refund function error:", error);
      return {
        success: false,
        error: error.message || "Refund processing failed",
      };
    }

    return data as RefundResponse;
  } catch (err) {
    console.error("Refund service error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error occurred",
    };
  }
}

/**
 * Process Credit Card payment (convenience wrapper)
 */
export async function processCardPayment(params: {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
  amount: number;
  invoiceNumber?: string;
  orderId?: string;
  billing?: BillingAddress;
  testMode?: boolean;
}): Promise<PaymentResponse> {
  return processPayment({
    payment: {
      type: "card",
      cardNumber: params.cardNumber,
      expirationDate: params.expirationDate,
      cvv: params.cvv,
      cardholderName: params.cardholderName,
    },
    amount: params.amount,
    invoiceNumber: params.invoiceNumber,
    orderId: params.orderId,
    billing: params.billing,
    testMode: params.testMode,
  });
}

/**
 * Process ACH/eCheck payment (convenience wrapper)
 */
export async function processACHPayment(params: {
  accountType: "checking" | "savings" | "businessChecking";
  routingNumber: string;
  accountNumber: string;
  nameOnAccount: string;
  amount: number;
  bankName?: string;
  invoiceNumber?: string;
  orderId?: string;
  customerEmail?: string;
  testMode?: boolean;
}): Promise<PaymentResponse> {
  return processPayment({
    payment: {
      type: "ach",
      accountType: params.accountType,
      routingNumber: params.routingNumber,
      accountNumber: params.accountNumber,
      nameOnAccount: params.nameOnAccount,
      bankName: params.bankName,
      echeckType: "WEB",
    },
    amount: params.amount,
    invoiceNumber: params.invoiceNumber,
    orderId: params.orderId,
    customerEmail: params.customerEmail,
    testMode: params.testMode,
  });
}

// Routing number validation (ABA checksum)
export function validateRoutingNumber(routingNumber: string): boolean {
  if (!/^\d{9}$/.test(routingNumber)) return false;
  
  const digits = routingNumber.split("").map(Number);
  const sum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8]);
  
  return sum % 10 === 0;
}

// Card number validation (Luhn algorithm)
export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(cleaned)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Get card type from number
export function getCardType(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, "");
  
  if (/^4/.test(cleaned)) return "Visa";
  if (/^5[1-5]/.test(cleaned)) return "Mastercard";
  if (/^3[47]/.test(cleaned)) return "American Express";
  if (/^6(?:011|5)/.test(cleaned)) return "Discover";
  
  return "Unknown";
}
