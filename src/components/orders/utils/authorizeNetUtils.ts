interface ACHPaymentDetails {
  accountType: 'checking' | 'savings' | 'businessChecking';
  accountName: string;
  routingNumber: string;
  accountNumber: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  apiLoginId: string;
  transactionKey: string;
  testMode?: boolean;
}

export enum ACHErrorCode {
  INVALID_ACCOUNT = 'E00027',
  DUPLICATE_TRANSACTION = 'E00028',
  INSUFFICIENT_FUNDS = 'E00029',
  ACCOUNT_CLOSED = 'E00030',
  INVALID_ROUTING = 'E00031',
  AUTHORIZATION_FAILED = 'E00032',
  INVALID_CREDENTIALS = 'E00033',
  GENERAL_ERROR = 'E00001',
}

interface ACHError {
  code: ACHErrorCode;
  text: string;
}

export interface ACHPaymentResponse {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  responseCode?: string;
  error?: ACHError;
}

const validateRoutingNumber = (routingNumber: string): boolean => {
  if (!/^\d{9}$/.test(routingNumber)) return false;
  
  const digits = routingNumber.split('').map(Number);
  const sum = 
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8]);
  
  return sum % 10 === 0;
};

const validateCredentials = (apiLoginId: string, transactionKey: string): boolean => {
  if (!apiLoginId || !transactionKey) {
    console.error("Missing API credentials");
    return false;
  }

  // Basic format validation
  if (apiLoginId.length < 8 || transactionKey.length < 16) {
    console.error("Invalid credential format");
    return false;
  }

  return true;
};

const sanitizeAccountNumber = (accountNumber: string): string => {
  return accountNumber.replace(/[^0-9]/g, '');
};

export const processACHPayment = async (paymentDetails: ACHPaymentDetails): Promise<ACHPaymentResponse> => {
  try {
    console.log("Starting ACH payment processing");

    // Validate API credentials
    if (!validateCredentials(paymentDetails.apiLoginId, paymentDetails.transactionKey)) {
      return {
        success: false,
        error: {
          code: ACHErrorCode.INVALID_CREDENTIALS,
          text: "Invalid API credentials",
        },
      };
    }

    // Validate routing number
    if (!validateRoutingNumber(paymentDetails.routingNumber)) {
      console.error("Invalid routing number");
      return {
        success: false,
        error: {
          code: ACHErrorCode.INVALID_ROUTING,
          text: "Invalid routing number checksum",
        },
      };
    }

    const sanitizedAccountNumber = sanitizeAccountNumber(paymentDetails.accountNumber);
    if (!/^\d{4,17}$/.test(sanitizedAccountNumber)) {
      console.error("Invalid account number format");
      return {
        success: false,
        error: {
          code: ACHErrorCode.INVALID_ACCOUNT,
          text: "Invalid account number format",
        },
      };
    }

    // Test mode handling with detailed logging
    if (paymentDetails.testMode) {
      console.log("Processing payment in test mode");
      
      const accountEnd = sanitizedAccountNumber.slice(-4);
      console.log("Test scenario based on account ending:", accountEnd);
      
      // Test scenarios based on account number endings
      const testScenarios: Record<string, { success: boolean; code?: ACHErrorCode }> = {
        '0000': { success: true },
        '1234': { success: false, code: ACHErrorCode.INSUFFICIENT_FUNDS },
        '5678': { success: false, code: ACHErrorCode.ACCOUNT_CLOSED },
        '9012': { success: false, code: ACHErrorCode.AUTHORIZATION_FAILED },
      };

      const scenario = testScenarios[accountEnd];
      if (scenario) {
        console.log("Using test scenario:", scenario);
        
        if (scenario.success) {
          return {
            success: true,
            transactionId: `TEST-${Date.now()}`,
            authCode: "TEST123",
            responseCode: "1",
          };
        } else if (scenario.code) {
          return {
            success: false,
            error: {
              code: scenario.code,
              text: `Test mode error: ${scenario.code}`,
            },
          };
        }
      }

      // Default test success response
      return {
        success: true,
        transactionId: `TEST-${Date.now()}`,
        authCode: "TEST123",
        responseCode: "1",
      };
    }

    // Production mode processing
    console.log("Processing payment in production mode");
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, this would make a real API call to Authorize.net
    // For now, we'll simulate a successful response
    return {
      success: true,
      transactionId: `ACH-${Date.now()}`,
      authCode: "123456",
      responseCode: "1",
    };

  } catch (error) {
    console.error("ACH Payment Error:", error);
    return {
      success: false,
      error: {
        code: ACHErrorCode.GENERAL_ERROR,
        text: error instanceof Error ? error.message : "Failed to process ACH payment",
      },
    };
  }
};