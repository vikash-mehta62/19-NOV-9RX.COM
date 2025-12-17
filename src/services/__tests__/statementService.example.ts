// Example usage of StatementGenerationService in EnhancedPaymentTab context
// This file demonstrates how the service would be integrated

import { statementService } from "../statementService";

/**
 * Example function showing how EnhancedPaymentTab would use the statement service
 * This matches the handleStatementDownload function in EnhancedPaymentTab.tsx
 */
export async function exampleStatementGeneration(userId: string, startDate: Date, endDate: Date) {
  try {
    // Generate statement data using the service
    const result = await statementService.generateStatementData({
      userId,
      startDate,
      endDate,
      includeZeroActivity: true
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to generate statement");
    }

    // Validate financial calculations
    const isValid = statementService.validateFinancialCalculations(result.data!);
    if (!isValid) {
      throw new Error("Financial calculations validation failed");
    }

    // Get user profile for PDF header
    const userProfile = await statementService.getUserProfile(userId);

    // Return data ready for PDF generation
    return {
      statementData: result.data!,
      userProfile,
      filename: result.filename!
    };

  } catch (error) {
    console.error("Error in statement generation:", error);
    throw error;
  }
}

/**
 * Example of how the service handles edge cases
 */
export async function exampleEdgeCaseHandling() {
  const examples = {
    // Empty user ID
    invalidUser: async () => {
      const result = await statementService.generateStatementData({
        userId: "",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31")
      });
      return result; // Should return { success: false, error: "User ID is required" }
    },

    // Invalid date range
    invalidDates: async () => {
      const result = await statementService.generateStatementData({
        userId: "user123",
        startDate: new Date("2024-01-31"),
        endDate: new Date("2024-01-01") // End before start
      });
      return result; // Should return { success: false, error: "Start date must be before end date" }
    },

    // No transactions period
    noTransactions: async () => {
      const result = await statementService.generateStatementData({
        userId: "user123",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
        includeZeroActivity: false
      });
      return result; // May return error if no transactions found
    }
  };

  return examples;
}

/**
 * Example of financial validation
 */
export function exampleFinancialValidation() {
  const sampleStatementData = {
    userId: "user123",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-31"),
    openingBalance: 0,
    closingBalance: 50,
    totalPurchases: 100,
    totalPayments: 150,
    transactions: [
      {
        id: "1",
        transaction_date: "2024-01-15T00:00:00Z",
        description: "Purchase",
        debit_amount: 100,
        credit_amount: 0,
        balance: -100,
        transaction_type: "purchase"
      },
      {
        id: "2",
        transaction_date: "2024-01-20T00:00:00Z",
        description: "Payment",
        debit_amount: 0,
        credit_amount: 150,
        balance: 50,
        transaction_type: "payment"
      }
    ]
  };

  // This should return true for correct calculations
  return statementService.validateFinancialCalculations(sampleStatementData);
}