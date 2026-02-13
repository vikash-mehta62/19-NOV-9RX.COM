/**
 * FortisPay ACH Payment Integration Service
 * Documentation: https://docs.fortispay.com/developers/api/endpoints/transactions
 */

import { supabase } from "@/integrations/supabase/client";

// FortisPay API Configuration
const FORTIS_API_URL = import.meta.env.VITE_FORTIS_API_URL || "https://api.fortispay.com/v2";
const FORTIS_USER_ID = import.meta.env.VITE_FORTIS_USER_ID;
const FORTIS_USER_API_KEY = import.meta.env.VITE_FORTIS_USER_API_KEY;
const FORTIS_LOCATION_ID = import.meta.env.VITE_FORTIS_LOCATION_ID;
const FORTIS_PRODUCT_TRANSACTION_ID = import.meta.env.VITE_FORTIS_PRODUCT_TRANSACTION_ID_ACH;

export interface FortisACHPaymentData {
  accountHolderName: string;
  accountNumber: string;
  accountType: "checking" | "savings";
  routingNumber: string;
  checkNumber?: string;
  dlNumber?: string;
  dlState?: string;
  ssn4?: string;
  dobYear?: string;
}

export interface FortisBillingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

export interface FortisPaymentResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  errorCode?: string;
  errorMessage?: string;
  statusId?: number;
  authCode?: string;
  verbiage?: string;
}

/**
 * SEC Codes for ACH Transactions:
 * - PPD: Prearranged Payment and Deposit (Personal)
 * - CCD: Corporate Credit or Debit
 * - WEB: Internet-Initiated Entry
 * - TEL: Telephone-Initiated Entry
 * - POP: Point of Purchase
 * - C21: Check 21 (requires check images)
 */
export type FortisSecCode = "PPD" | "CCD" | "WEB" | "TEL" | "POP" | "C21";

/**
 * Process ACH payment through FortisPay
 */
export async function processFortisACHPayment(
  achData: FortisACHPaymentData,
  billingAddress: FortisBillingAddress,
  amount: number,
  secCode: FortisSecCode = "WEB",
  orderId?: string,
  description?: string
): Promise<FortisPaymentResult> {
  try {
    // Validate required environment variables
    if (!FORTIS_USER_ID || !FORTIS_USER_API_KEY || !FORTIS_LOCATION_ID || !FORTIS_PRODUCT_TRANSACTION_ID) {
      return {
        success: false,
        message: "FortisPay configuration missing",
        errorMessage: "Please configure FortisPay API credentials in environment variables",
      };
    }

    // Build transaction request
    const transactionRequest = {
      transaction: {
        action: "debit", // "debit" for charging, "credit" for refund
        payment_method: "ach",
        account_holder_name: achData.accountHolderName,
        account_number: achData.accountNumber,
        account_type: achData.accountType,
        routing: achData.routingNumber,
        ach_sec_code: secCode,
        transaction_amount: amount.toFixed(2),
        location_id: FORTIS_LOCATION_ID,
        product_transaction_id: FORTIS_PRODUCT_TRANSACTION_ID,
        
        // Billing information
        billing_street: billingAddress.street,
        billing_city: billingAddress.city,
        billing_state: billingAddress.state,
        billing_zip: billingAddress.zip,
        billing_phone: billingAddress.phone,
        
        // Optional fields
        description: description || "ACH Payment",
        order_num: orderId,
        check_number: achData.checkNumber,
        
        // Identity verification (required for certain SEC codes)
        dl_number: achData.dlNumber,
        dl_state: achData.dlState,
        ssn4: achData.ssn4,
        dob_year: achData.dobYear,
        
        // Effective date (defaults to current day if not provided)
        effective_date: new Date().toISOString().split('T')[0],
      },
    };

    // Make API request to FortisPay
    const response = await fetch(`${FORTIS_API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": FORTIS_USER_ID,
        "user-api-key": FORTIS_USER_API_KEY,
      },
      body: JSON.stringify(transactionRequest),
    });

    const result = await response.json();

    // Check if request was successful
    if (!response.ok) {
      return {
        success: false,
        message: "FortisPay API error",
        errorMessage: result.message || result.error || "Failed to process ACH payment",
        errorCode: result.code,
      };
    }

    // Parse FortisPay response
    const transaction = result.transaction;
    
    // Status IDs:
    // 131 = Pending Origination (ACH)
    // 132 = Originating (ACH)
    // 133 = Originated (ACH)
    // 134 = Settled (ACH)
    // 301 = Declined
    // 331 = Charged Back (ACH)
    
    const isSuccess = transaction.status_id === 131 || 
                     transaction.status_id === 132 || 
                     transaction.status_id === 133 || 
                     transaction.status_id === 134;

    if (isSuccess) {
      // Store transaction in database
      await storeACHTransaction({
        fortisTransactionId: transaction.id,
        profileId: orderId, // You may want to pass actual profile_id
        orderId: orderId,
        accountType: achData.accountType,
        accountName: achData.accountHolderName,
        routingNumber: achData.routingNumber,
        accountNumber: `****${achData.accountNumber.slice(-4)}`, // Store only last 4 digits
        amount: amount,
        status: getStatusFromStatusId(transaction.status_id),
        transactionReference: transaction.id,
      });

      return {
        success: true,
        transactionId: transaction.id,
        message: transaction.verbiage || "ACH payment initiated successfully",
        statusId: transaction.status_id,
        authCode: transaction.auth_code,
        verbiage: transaction.verbiage,
      };
    } else {
      return {
        success: false,
        message: transaction.verbiage || "ACH payment declined",
        errorMessage: transaction.response_message,
        errorCode: transaction.reason_code_id?.toString(),
        statusId: transaction.status_id,
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

/**
 * Store ACH transaction in Supabase
 */
async function storeACHTransaction(data: {
  fortisTransactionId: string;
  profileId?: string;
  orderId?: string;
  accountType: string;
  accountName: string;
  routingNumber: string;
  accountNumber: string;
  amount: number;
  status: string;
  transactionReference: string;
}) {
  try {
    const { error } = await supabase.from("ach_transactions").insert({
      profile_id: data.profileId,
      order_id: data.orderId,
      account_type: data.accountType,
      account_name: data.accountName,
      routing_number: data.routingNumber,
      account_number: data.accountNumber,
      amount: data.amount,
      status: data.status,
      transaction_reference: data.transactionReference,
      processed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error storing ACH transaction:", error);
    }
  } catch (error) {
    console.error("Error storing ACH transaction:", error);
  }
}

/**
 * Convert FortisPay status_id to readable status
 */
function getStatusFromStatusId(statusId: number): string {
  const statusMap: Record<number, string> = {
    131: "pending",
    132: "processing",
    133: "originated",
    134: "completed",
    201: "voided",
    301: "declined",
    331: "charged_back",
  };
  return statusMap[statusId] || "unknown";
}

/**
 * Get transaction status from FortisPay
 */
export async function getFortisTransactionStatus(
  transactionId: string
): Promise<FortisPaymentResult> {
  try {
    if (!FORTIS_USER_ID || !FORTIS_USER_API_KEY) {
      return {
        success: false,
        message: "FortisPay configuration missing",
      };
    }

    const response = await fetch(`${FORTIS_API_URL}/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "user-id": FORTIS_USER_ID,
        "user-api-key": FORTIS_USER_API_KEY,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: "Failed to get transaction status",
        errorMessage: result.message || result.error,
      };
    }

    const transaction = result.transaction;

    return {
      success: true,
      transactionId: transaction.id,
      statusId: transaction.status_id,
      message: transaction.verbiage,
      authCode: transaction.auth_code,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Error fetching transaction status",
      errorMessage: error.message,
    };
  }
}

/**
 * Refund ACH transaction
 */
export async function refundFortisACHTransaction(
  originalTransactionId: string,
  amount: number
): Promise<FortisPaymentResult> {
  try {
    if (!FORTIS_USER_ID || !FORTIS_USER_API_KEY || !FORTIS_LOCATION_ID) {
      return {
        success: false,
        message: "FortisPay configuration missing",
      };
    }

    const transactionRequest = {
      transaction: {
        action: "refund",
        payment_method: "ach",
        previous_transaction_id: originalTransactionId,
        transaction_amount: amount.toFixed(2),
        location_id: FORTIS_LOCATION_ID,
      },
    };

    const response = await fetch(`${FORTIS_API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": FORTIS_USER_ID,
        "user-api-key": FORTIS_USER_API_KEY,
      },
      body: JSON.stringify(transactionRequest),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: "Refund failed",
        errorMessage: result.message || result.error,
      };
    }

    const transaction = result.transaction;

    return {
      success: true,
      transactionId: transaction.id,
      message: "Refund processed successfully",
      statusId: transaction.status_id,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Refund processing error",
      errorMessage: error.message,
    };
  }
}

/**
 * Validate ACH account information
 * This is a client-side validation before sending to FortisPay
 */
export function validateACHData(achData: FortisACHPaymentData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate account holder name
  if (!achData.accountHolderName || achData.accountHolderName.trim().length < 2) {
    errors.push("Account holder name is required");
  }

  // Validate routing number (must be 9 digits)
  if (!/^\d{9}$/.test(achData.routingNumber)) {
    errors.push("Routing number must be exactly 9 digits");
  }

  // Validate account number (4-19 digits)
  if (!/^\d{4,19}$/.test(achData.accountNumber)) {
    errors.push("Account number must be between 4 and 19 digits");
  }

  // Validate account type
  if (!["checking", "savings"].includes(achData.accountType)) {
    errors.push("Account type must be 'checking' or 'savings'");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
