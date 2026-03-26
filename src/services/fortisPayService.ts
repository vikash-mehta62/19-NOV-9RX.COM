/**
 * FortisPay client helpers.
 * All provider secrets must stay on the backend.
 */

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

export type FortisSecCode = "PPD" | "CCD" | "WEB" | "TEL" | "POP" | "C21";

/**
 * Process ACH payment through the shared process-payment edge function.
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
    const { processACHPaymentFortisPay } = await import("./paymentService");
    const result = await processACHPaymentFortisPay(
      {
        accountType: achData.accountType,
        routingNumber: achData.routingNumber,
        accountNumber: achData.accountNumber,
        nameOnAccount: achData.accountHolderName,
        checkNumber: achData.checkNumber,
        dlNumber: achData.dlNumber,
        dlState: achData.dlState,
        ssn4: achData.ssn4,
        dobYear: achData.dobYear,
      },
      {
        firstName: achData.accountHolderName,
        lastName: "",
        address: billingAddress.street,
        city: billingAddress.city,
        state: billingAddress.state,
        zip: billingAddress.zip,
        country: "USA",
      },
      amount,
      orderId,
      description,
      secCode
    );

    return {
      success: result.success,
      transactionId: result.transactionId,
      message: result.message,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      statusId: result.gatewayStatusId,
      authCode: result.authCode,
      verbiage: result.gatewayTransactionStatus,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      success: false,
      message: "ACH processing error",
      errorMessage: err.message || "Unexpected error",
    };
  }
}

/**
 * Transaction status lookup is backend-only in current architecture.
 */
export async function getFortisTransactionStatus(
  _transactionId: string
): Promise<FortisPaymentResult> {
  return {
    success: false,
    message: "Not supported from client. Use backend payment status endpoint.",
  };
}

/**
 * Refund execution is backend-only in current architecture.
 */
export async function refundFortisACHTransaction(
  _originalTransactionId: string,
  _amount: number
): Promise<FortisPaymentResult> {
  return {
    success: false,
    message: "Not supported from client. Use backend refund endpoint.",
  };
}

/**
 * Validate ACH account information before sending to backend.
 */
export function validateACHData(achData: FortisACHPaymentData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!achData.accountHolderName || achData.accountHolderName.trim().length < 2) {
    errors.push("Account holder name is required");
  }

  if (!/^\d{9}$/.test(achData.routingNumber)) {
    errors.push("Routing number must be exactly 9 digits");
  }

  if (!/^\d{4,19}$/.test(achData.accountNumber)) {
    errors.push("Account number must be between 4 and 19 digits");
  }

  if (!["checking", "savings"].includes(achData.accountType)) {
    errors.push("Account type must be 'checking' or 'savings'");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
