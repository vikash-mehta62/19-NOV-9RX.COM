import { supabase } from "@/integrations/supabase/client";
import { 
  processFortisACHPayment, 
  FortisACHPaymentData, 
  FortisBillingAddress,
  FortisSecCode,
  validateACHData 
} from "./fortisPayService";

export interface CardPaymentData {
  cardNumber: string;
  expirationDate: string; // MMYY format
  cvv: string;
  cardholderName: string;
}

export interface ACHPaymentData {
  accountType: "checking" | "savings" | "businessChecking";
  routingNumber: string;
  accountNumber: string;
  nameOnAccount: string;
  bankName?: string;
  // FortisPay specific fields (optional)
  checkNumber?: string;
  dlNumber?: string;
  dlState?: string;
  ssn4?: string;
  dobYear?: string;
}

export interface BillingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  message: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface SavedPaymentMethod {
  id: string;
  profile_id: string;
  customer_profile_id: string | null;
  payment_profile_id: string;
  method_type: "card" | "ach";
  card_last_four: string | null;
  card_type: string | null;
  card_expiry_month: number | null;
  card_expiry_year: number | null;
  bank_name: string | null;
  account_type: string | null;
  account_last_four: string | null;
  billing_first_name: string | null;
  billing_last_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  is_default: boolean;
  is_active: boolean;
  nickname: string | null;
  created_at: string;
}

// Detect card type from number
export function detectCardType(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  
  if (/^4/.test(cleanNumber)) return "visa";
  if (/^5[1-5]/.test(cleanNumber)) return "mastercard";
  if (/^3[47]/.test(cleanNumber)) return "amex";
  if (/^6(?:011|5)/.test(cleanNumber)) return "discover";
  if (/^35(?:2[89]|[3-8])/.test(cleanNumber)) return "jcb";
  if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) return "diners";
  
  return "unknown";
}

// Format card number for display
export function formatCardNumber(value: string): string {
  const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || "";
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length ? parts.join(" ") : value;
}

// Validate card number using Luhn algorithm
export function validateCardNumber(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(cleanNumber)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Validate expiry date
export function validateExpiry(expiry: string): boolean {
  if (!/^\d{4}$/.test(expiry)) return false;
  
  const month = parseInt(expiry.substring(0, 2), 10);
  const year = parseInt("20" + expiry.substring(2, 4), 10);
  
  if (month < 1 || month > 12) return false;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  
  return true;
}

// Validate routing number
export function validateRoutingNumber(routingNumber: string): boolean {
  if (!/^\d{9}$/.test(routingNumber)) return false;
  
  // ABA routing number checksum validation
  const digits = routingNumber.split("").map(Number);
  const checksum = 
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8]);
  
  return checksum % 10 === 0;
}


// Process card payment - Uses Supabase Edge Function
export async function processCardPayment(
  cardData: CardPaymentData,
  billingAddress: BillingAddress,
  amount: number,
  invoiceNumber: string
): Promise<PaymentResult> {
  try {
    const { data, error } = await supabase.functions.invoke("process-payment", {
      body: {
        payment: {
          type: "card",
          cardNumber: cardData.cardNumber.replace(/\s/g, ""),
          expirationDate: cardData.expirationDate,
          cvv: cardData.cvv,
          cardholderName: cardData.cardholderName,
        },
        amount,
        invoiceNumber,
        billing: {
          firstName: billingAddress.firstName,
          lastName: billingAddress.lastName,
          address: billingAddress.address,
          city: billingAddress.city,
          state: billingAddress.state,
          zip: billingAddress.zip,
          country: billingAddress.country,
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: "Payment processing error",
        errorMessage: error.message,
      };
    }

    if (data?.success) {
      return {
        success: true,
        transactionId: data.transactionId,
        authCode: data.authCode,
        message: "Payment successful",
      };
    }

    return {
      success: false,
      message: data?.message || "Payment failed",
      errorCode: data?.errorCode,
      errorMessage: data?.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Payment processing error",
      errorMessage: error.message,
    };
  }
}

// Process ACH payment - Uses Supabase Edge Function (Authorize.Net)
export async function processACHPayment(
  achData: ACHPaymentData,
  billingAddress: BillingAddress,
  amount: number,
  invoiceNumber: string
): Promise<PaymentResult> {
  try {
    const { data, error } = await supabase.functions.invoke("process-payment", {
      body: {
        payment: {
          type: "ach",
          accountType: achData.accountType,
          routingNumber: achData.routingNumber,
          accountNumber: achData.accountNumber,
          nameOnAccount: achData.nameOnAccount,
          bankName: achData.bankName,
          echeckType: "WEB",
        },
        amount,
        invoiceNumber,
        billing: {
          firstName: billingAddress.firstName,
          lastName: billingAddress.lastName,
          address: billingAddress.address,
          city: billingAddress.city,
          state: billingAddress.state,
          zip: billingAddress.zip,
          country: billingAddress.country,
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: "ACH processing error",
        errorMessage: error.message,
      };
    }

    if (data?.success) {
      return {
        success: true,
        transactionId: data.transactionId,
        message: "ACH payment initiated",
      };
    }

    return {
      success: false,
      message: data?.message || "ACH payment failed",
      errorCode: data?.errorCode,
      errorMessage: data?.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "ACH processing error",
      errorMessage: error.message,
    };
  }
}

// Process ACH payment via FortisPay (using backend endpoint)
export async function processACHPaymentFortisPay(
  achData: ACHPaymentData,
  billingAddress: BillingAddress,
  amount: number,
  orderId?: string,
  description?: string,
  secCode: FortisSecCode = "WEB"
): Promise<PaymentResult> {
  try {
    // Validate ACH data
    const validation = validateACHData({
      accountHolderName: achData.nameOnAccount,
      accountNumber: achData.accountNumber,
      accountType: achData.accountType === "businessChecking" ? "checking" : achData.accountType,
      routingNumber: achData.routingNumber,
      checkNumber: achData.checkNumber,
      dlNumber: achData.dlNumber,
      dlState: achData.dlState,
      ssn4: achData.ssn4,
      dobYear: achData.dobYear,
    });

    if (!validation.valid) {
      return {
        success: false,
        message: "Validation failed",
        errorMessage: validation.errors.join(", "),
      };
    }

    // Get API base URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://9rx.mahitechnocrafts.in";

    // Call backend FortisPay endpoint
    const response = await fetch(`${apiBaseUrl}/pay-ach-fortispay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        accountType: achData.accountType === "businessChecking" ? "checking" : achData.accountType,
        routingNumber: achData.routingNumber,
        accountNumber: achData.accountNumber,
        nameOnAccount: achData.nameOnAccount,
        address: billingAddress.address,
        city: billingAddress.city,
        state: billingAddress.state,
        zip: billingAddress.zip,
        country: billingAddress.country || "USA",
        orderId,
        description,
        secCode,
        checkNumber: achData.checkNumber,
        dlNumber: achData.dlNumber,
        dlState: achData.dlState,
        ssn4: achData.ssn4,
        dobYear: achData.dobYear,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "FortisPay API error",
        errorMessage: result.error || "Failed to process ACH payment",
        errorCode: result.errorCode,
      };
    }

    if (result.success) {
      return {
        success: true,
        transactionId: result.transactionId,
        authCode: result.authCode,
        message: result.message || "ACH payment initiated successfully",
      };
    } else {
      return {
        success: false,
        message: result.message || "ACH payment failed",
        errorCode: result.errorCode,
        errorMessage: result.error,
      };
    }
  } catch (error: any) {
    console.error("FortisPay ACH Payment Error:", error);
    return {
      success: false,
      message: "ACH processing error",
      errorMessage: error.message || "An unexpected error occurred",
    };
  }
}

// Get saved payment methods for a user
export async function getSavedPaymentMethods(
  profileId: string
): Promise<SavedPaymentMethod[]> {
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching payment methods:", error);
    return [];
  }

  return data as SavedPaymentMethod[];
}

// Save a new payment method
export async function savePaymentMethod(
  profileId: string,
  methodType: "card" | "ach",
  paymentData: CardPaymentData | ACHPaymentData,
  billingAddress: BillingAddress,
  nickname?: string,
  isDefault?: boolean
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Verify the user is authenticated and matches the profileId
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "You must be logged in to save payment methods" };
    }
    
    if (user.id !== profileId) {
      console.error("Profile ID mismatch:", { userId: user.id, profileId });
      return { success: false, error: "Profile ID does not match authenticated user" };
    }
    
    // For now, we'll save masked data locally
    // In production, you'd create a Customer Profile in Authorize.net CIM
    
    let insertData: any = {
      profile_id: user.id, // Use authenticated user ID
      method_type: methodType,
      payment_profile_id: `local_${Date.now()}`, // Placeholder - would be from Authorize.net
      billing_first_name: billingAddress.firstName,
      billing_last_name: billingAddress.lastName,
      billing_address: billingAddress.address,
      billing_city: billingAddress.city,
      billing_state: billingAddress.state,
      billing_zip: billingAddress.zip,
      billing_country: billingAddress.country,
      is_default: isDefault || false,
      nickname,
    };

    if (methodType === "card") {
      const cardData = paymentData as CardPaymentData;
      const cleanNumber = cardData.cardNumber.replace(/\s/g, "");
      insertData = {
        ...insertData,
        card_last_four: cleanNumber.slice(-4),
        card_type: detectCardType(cleanNumber),
        card_expiry_month: parseInt(cardData.expirationDate.substring(0, 2), 10),
        card_expiry_year: parseInt("20" + cardData.expirationDate.substring(2, 4), 10),
      };
    } else {
      const achData = paymentData as ACHPaymentData;
      insertData = {
        ...insertData,
        bank_name: achData.bankName,
        account_type: achData.accountType,
        account_last_four: achData.accountNumber.slice(-4),
        routing_last_four: achData.routingNumber.slice(-4),
      };
    }

    const { data, error } = await supabase
      .from("saved_payment_methods")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error saving payment method:", error);
      return { success: false, error: `Failed to save payment method: ${error.message}` };
    }

    return { success: true, id: data.id };
  } catch (error: any) {
    console.error("Exception saving payment method:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

// Delete a saved payment method
export async function deletePaymentMethod(
  methodId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("saved_payment_methods")
    .update({ is_active: false })
    .eq("id", methodId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Set default payment method
export async function setDefaultPaymentMethod(
  profileId: string,
  methodId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("saved_payment_methods")
    .update({ is_default: true })
    .eq("id", methodId)
    .eq("profile_id", profileId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Log payment transaction
export async function logPaymentTransaction(
  profileId: string,
  orderId: string | null,
  invoiceId: string | null,
  transactionType: string,
  amount: number,
  result: PaymentResult,
  paymentMethodType: "card" | "ach",
  cardLastFour?: string,
  cardType?: string,
  savedPaymentMethodId?: string
): Promise<void> {
  try {
    await supabase.from("payment_transactions").insert({
      profile_id: profileId,
      order_id: orderId,
      invoice_id: invoiceId,
      saved_payment_method_id: savedPaymentMethodId,
      transaction_id: result.transactionId,
      auth_code: result.authCode,
      transaction_type: transactionType,
      amount,
      payment_method_type: paymentMethodType,
      card_last_four: cardLastFour,
      card_type: cardType,
      status: result.success ? "approved" : "declined",
      response_code: result.errorCode,
      response_message: result.message,
      error_code: result.errorCode,
      error_message: result.errorMessage,
    });
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
}

// Get payment transactions for a user
export async function getPaymentTransactions(
  profileId: string,
  limit: number = 50
): Promise<any[]> {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return data;
}

// ============================================
// AUTHORIZE.NET CUSTOMER PROFILE (CIM) FUNCTIONS
// Token-based payment - no card number needed!
// ============================================

// Save card to Authorize.net Customer Profile
export async function saveCardToProfile(
  profileId: string,
  email: string,
  cardNumber: string,
  expirationDate: string,
  cvv: string,
  billing: BillingAddress
): Promise<{ success: boolean; savedMethodId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("process-payment", {
      body: {
        action: "saveCard",
        profileId,
        email,
        cardNumber: cardNumber.replace(/\s/g, ""),
        expirationDate,
        cvv,
        billing,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.success) {
      return {
        success: true,
        savedMethodId: data.savedMethodId,
      };
    }

    return { success: false, error: data?.error || "Failed to save card" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Charge a saved card (token-based payment - no card number needed!)
export async function chargeSavedCard(
  savedMethod: SavedPaymentMethod,
  amount: number,
  invoiceNumber?: string,
  orderId?: string
): Promise<PaymentResult> {
  try {
    if (!savedMethod.customer_profile_id || !savedMethod.payment_profile_id) {
      return {
        success: false,
        message: "This card cannot be charged. Please enter card details manually.",
        errorMessage: "Missing customer or payment profile ID",
      };
    }

    const { data, error } = await supabase.functions.invoke("process-payment", {
      body: {
        action: "chargeSavedCard",
        customerProfileId: savedMethod.customer_profile_id,
        paymentProfileId: savedMethod.payment_profile_id,
        amount,
        invoiceNumber,
        orderId,
      },
    });

    if (error) {
      return {
        success: false,
        message: "Payment processing error",
        errorMessage: error.message,
      };
    }

    if (data?.success) {
      return {
        success: true,
        transactionId: data.transactionId,
        authCode: data.authCode,
        message: "Payment successful",
      };
    }

    return {
      success: false,
      message: data?.error || "Payment failed",
      errorCode: data?.errorCode,
      errorMessage: data?.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Payment processing error",
      errorMessage: error.message,
    };
  }
}

// Delete a saved card from Authorize.net
export async function deleteSavedCard(
  savedMethod: SavedPaymentMethod
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!savedMethod.customer_profile_id || !savedMethod.payment_profile_id) {
      // Just mark as inactive in database
      const { error } = await supabase
        .from("saved_payment_methods")
        .update({ is_active: false })
        .eq("id", savedMethod.id);

      return { success: !error, error: error?.message };
    }

    const { data, error } = await supabase.functions.invoke("process-payment", {
      body: {
        action: "deleteCard",
        customerProfileId: savedMethod.customer_profile_id,
        paymentProfileId: savedMethod.payment_profile_id,
        savedMethodId: savedMethod.id,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, error: data?.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Check if a saved card can be charged directly (has valid profile IDs)
export function canChargeDirectly(savedMethod: SavedPaymentMethod): boolean {
  return !!(savedMethod.customer_profile_id && savedMethod.payment_profile_id);
}


// Payment Response interface
export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

// Payment Request interfaces
export interface CardPaymentRequest {
  payment: {
    type: "card";
    cardNumber: string;
    expirationDate: string;
    cvv: string;
    cardholderName: string;
  };
  amount: number;
  invoiceNumber?: string;
  orderId?: string;
  customerEmail?: string;
  billing: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface ACHPaymentRequest {
  payment: {
    type: "ach";
    accountType: "checking" | "savings";
    routingNumber: string;
    accountNumber: string;
    nameOnAccount: string;
    echeckType?: "WEB" | "PPD" | "CCD";
  };
  amount: number;
  invoiceNumber?: string;
  orderId?: string;
  customerEmail?: string;
  billing: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export type PaymentRequest = CardPaymentRequest | ACHPaymentRequest;

// Main processPayment function - Uses Supabase Edge Function
export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    // Build the request payload for the edge function
    const edgeFunctionPayload = {
      payment: request.payment.type === "card" 
        ? {
            type: "card" as const,
            cardNumber: (request as CardPaymentRequest).payment.cardNumber.replace(/\s/g, ""),
            expirationDate: (request as CardPaymentRequest).payment.expirationDate,
            cvv: (request as CardPaymentRequest).payment.cvv,
            cardholderName: (request as CardPaymentRequest).payment.cardholderName,
          }
        : {
            type: "ach" as const,
            accountType: (request as ACHPaymentRequest).payment.accountType,
            routingNumber: (request as ACHPaymentRequest).payment.routingNumber,
            accountNumber: (request as ACHPaymentRequest).payment.accountNumber,
            nameOnAccount: (request as ACHPaymentRequest).payment.nameOnAccount,
            echeckType: (request as ACHPaymentRequest).payment.echeckType || "WEB",
          },
      amount: request.amount,
      invoiceNumber: request.invoiceNumber,
      orderId: request.orderId,
      customerEmail: request.customerEmail,
      billing: request.billing,
    };

    // Call Supabase Edge Function
    console.log("Calling process-payment edge function with:", JSON.stringify(edgeFunctionPayload, null, 2));
    
    // Validate required fields before sending
    if (!edgeFunctionPayload.amount || edgeFunctionPayload.amount <= 0) {
      return {
        success: false,
        message: "Invalid payment amount",
        error: "Amount must be greater than 0",
        errorCode: "INVALID_AMOUNT",
      };
    }
    
    const response = await supabase.functions.invoke("process-payment", {
      body: edgeFunctionPayload,
    });

    console.log("Edge function response:", response);
    console.log("Edge function response data:", JSON.stringify(response.data, null, 2));
    console.log("Edge function response error:", response.error);

    // The edge function now always returns 200 with success: true/false in body
    const data = response.data;

    // Handle network/invoke errors
    if (response.error && !data) {
      console.error("Edge function invoke error:", response.error);
      return {
        success: false,
        message: response.error.message || "Failed to connect to payment service",
        error: response.error.message,
        errorCode: "NETWORK_ERROR",
      };
    }

    // Check the response data
    if (data?.success) {
      return {
        success: true,
        transactionId: data.transactionId,
        authCode: data.authCode,
        message: data.message || "Payment successful",
      };
    }

    // Payment failed - return error details
    return {
      success: false,
      message: data?.error || "Payment failed. Please try again.",
      error: data?.error,
      errorCode: data?.errorCode,
    };
  } catch (error: any) {
    console.error("Payment error:", error);
    return {
      success: false,
      message: "Payment processing error",
      error: error.message,
    };
  }
}
