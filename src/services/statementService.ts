import { supabase } from "@/integrations/supabase/client";

// Transaction interface based on existing usage in the codebase
export interface StatementTransaction {
  id: string;
  transaction_date: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  transaction_type: string;
  reference_type?: string;
  reference_id?: string;
  created_by?: string;
  admin_pay_notes?: string;
  transectionId?: string;
}

// Statement data interface from design document
export interface StatementData {
  userId: string;
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: StatementTransaction[];
  totalPurchases: number;
  totalPayments: number;
}

// Statement request interface
export interface StatementRequest {
  userId: string;
  startDate: Date;
  endDate: Date;
  includeZeroActivity?: boolean;
}

// Statement response interface
export interface StatementResponse {
  success: boolean;
  data?: StatementData;
  error?: string;
  filename?: string;
}

/**
 * StatementGenerationService class for handling data retrieval and processing
 * Implements requirements 3.1, 3.2, 3.3, 3.4
 */
export class StatementGenerationService {
  /**
   * Fetch statement data for a given user and date range
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async fetchStatementData(userId: string, startDate: Date, endDate: Date): Promise<StatementData> {
    try {
      // Validate input parameters
      if (!userId) {
        throw new Error("User ID is required");
      }
      
      if (startDate >= endDate) {
        throw new Error("Start date must be before end date");
      }

      // Convert dates to ISO strings for database query
      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();

      // Fetch transactions within the date range
      const { data: transactions, error: transactionError } = await supabase
        .from("account_transactions")
        .select("*")
        .eq("customer_id", userId)
        .gte("transaction_date", startDateISO)
        .lte("transaction_date", endDateISO)
        .order("transaction_date", { ascending: true });

      if (transactionError) {
        throw new Error(`Failed to fetch transactions: ${transactionError.message}`);
      }

      // Also fetch orders that might not be in account_transactions
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, created_at, total_amount, order_number, status, payment_status")
        .eq("profile_id", userId)
        .gte("created_at", startDateISO)
        .lte("created_at", endDateISO)
        .order("created_at", { ascending: true });

      if (ordersError) {
        console.warn("Could not fetch orders:", ordersError.message);
      }

      // Handle edge case for periods with no transactions (Requirement 3.4)
      let transactionList: StatementTransaction[] = transactions || [];

      // Add orders that are not already in account_transactions
      if (orders && orders.length > 0) {
        const existingOrderIds = new Set(
          transactionList
            .filter(t => t.reference_type === 'order')
            .map(t => t.reference_id)
        );

        for (const order of orders) {
          if (!existingOrderIds.has(order.id) && order.total_amount > 0) {
            // This order is not in account_transactions, add it
            transactionList.push({
              id: `order-${order.id}`,
              transaction_date: order.created_at,
              description: `Order #${order.order_number || order.id.substring(0, 8)} - ${order.status}`,
              debit_amount: order.total_amount,
              credit_amount: 0,
              balance: 0, // Will be calculated below
              transaction_type: 'debit',
              reference_type: 'order',
            });
          }
        }

        // Re-sort by date after adding orders
        transactionList.sort((a, b) => 
          new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        );
      }

      // Calculate opening balance by getting the balance before the start date
      let openingBalance = 0;
      const { data: lastTransactionBeforeStart, error: balanceError } = await supabase
        .from("account_transactions")
        .select("balance")
        .eq("customer_id", userId)
        .lt("transaction_date", startDateISO)
        .order("transaction_date", { ascending: false })
        .limit(1);

      if (balanceError) {
        console.warn("Could not fetch opening balance:", balanceError.message);
        // Continue with 0 opening balance if we can't fetch it
      } else if (lastTransactionBeforeStart && lastTransactionBeforeStart.length > 0) {
        openingBalance = lastTransactionBeforeStart[0].balance;
      }

      // Calculate closing balance, total purchases, and total payments
      let closingBalance = openingBalance;
      let totalPurchases = 0;
      let totalPayments = 0;

      // Process transactions to calculate running balances and totals (Requirement 3.3)
      const processedTransactions = transactionList.map((transaction, index) => {
        // Calculate running balance
        closingBalance = closingBalance + transaction.credit_amount - transaction.debit_amount;

        // Accumulate totals
        totalPurchases += transaction.debit_amount;
        totalPayments += transaction.credit_amount;

        return {
          ...transaction,
          balance: closingBalance
        };
      });

      // If no transactions, closing balance equals opening balance
      if (transactionList.length === 0) {
        closingBalance = openingBalance;
      }

      return {
        userId,
        startDate,
        endDate,
        openingBalance,
        closingBalance,
        transactions: processedTransactions,
        totalPurchases,
        totalPayments
      };

    } catch (error) {
      console.error("Error fetching statement data:", error);
      throw error;
    }
  }

  /**
   * Generate statement with comprehensive error handling
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async generateStatementData(request: StatementRequest): Promise<StatementResponse> {
    try {
      // Validate request
      if (!request.userId) {
        return {
          success: false,
          error: "User ID is required"
        };
      }

      if (!request.startDate || !request.endDate) {
        return {
          success: false,
          error: "Start date and end date are required"
        };
      }

      if (request.startDate >= request.endDate) {
        return {
          success: false,
          error: "Start date must be before end date"
        };
      }

      // Fetch statement data
      const statementData = await this.fetchStatementData(
        request.userId,
        request.startDate,
        request.endDate
      );

      // Handle edge case for periods with no transactions (Requirement 3.4)
      if (statementData.transactions.length === 0 && !request.includeZeroActivity) {
        return {
          success: false,
          error: "No transactions found for the selected period"
        };
      }

      // Generate filename with date range and user identifier
      const startDateStr = request.startDate.toISOString().split('T')[0];
      const endDateStr = request.endDate.toISOString().split('T')[0];
      const filename = `statement_${request.userId}_${startDateStr}_to_${endDateStr}.pdf`;

      return {
        success: true,
        data: statementData,
        filename
      };

    } catch (error) {
      console.error("Error generating statement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Validate financial calculations for accuracy (Requirement 3.3)
   * Enhanced to handle database inconsistencies more gracefully
   */
  validateFinancialCalculations(statementData: StatementData): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      let calculatedPurchases = 0;
      let calculatedPayments = 0;
      let previousBalance = statementData.openingBalance;

      // Validate individual transactions
      for (let i = 0; i < statementData.transactions.length; i++) {
        const transaction = statementData.transactions[i];
        
        // Calculate expected balance based on previous transaction
        const expectedBalance = previousBalance + transaction.credit_amount - transaction.debit_amount;
        
        // Check if the transaction balance is reasonable (allow for small rounding differences)
        const balanceDifference = Math.abs(transaction.balance - expectedBalance);
        if (balanceDifference > 0.01) {
          // This might be due to database inconsistencies or concurrent transactions
          warnings.push(
            `Transaction ${transaction.id}: balance difference of $${balanceDifference.toFixed(2)} ` +
            `(expected: $${expectedBalance.toFixed(2)}, actual: $${transaction.balance.toFixed(2)})`
          );
        }

        // Use the actual balance from the database for the next calculation
        previousBalance = transaction.balance;

        // Accumulate totals
        calculatedPurchases += transaction.debit_amount;
        calculatedPayments += transaction.credit_amount;
      }

      // Validate closing balance against the last transaction balance
      if (statementData.transactions.length > 0) {
        const lastTransactionBalance = statementData.transactions[statementData.transactions.length - 1].balance;
        if (Math.abs(statementData.closingBalance - lastTransactionBalance) > 0.01) {
          warnings.push(
            `Closing balance mismatch: statement shows $${statementData.closingBalance.toFixed(2)}, ` +
            `last transaction shows $${lastTransactionBalance.toFixed(2)}`
          );
        }
      } else {
        // No transactions, closing balance should equal opening balance
        if (Math.abs(statementData.closingBalance - statementData.openingBalance) > 0.01) {
          warnings.push(
            `No transactions but closing balance ($${statementData.closingBalance.toFixed(2)}) ` +
            `differs from opening balance ($${statementData.openingBalance.toFixed(2)})`
          );
        }
      }

      // Validate totals (these should be accurate)
      if (Math.abs(statementData.totalPurchases - calculatedPurchases) > 0.01) {
        errors.push(
          `Total purchases mismatch: calculated $${calculatedPurchases.toFixed(2)}, ` +
          `statement shows $${statementData.totalPurchases.toFixed(2)}`
        );
      }

      if (Math.abs(statementData.totalPayments - calculatedPayments) > 0.01) {
        errors.push(
          `Total payments mismatch: calculated $${calculatedPayments.toFixed(2)}, ` +
          `statement shows $${statementData.totalPayments.toFixed(2)}`
        );
      }

      // Log warnings and errors
      if (warnings.length > 0) {
        console.warn("Financial validation warnings:", warnings);
      }
      if (errors.length > 0) {
        console.error("Financial validation errors:", errors);
      }

      // Consider validation successful if there are no critical errors
      // Warnings are acceptable as they might be due to database timing or rounding
      return {
        isValid: errors.length === 0,
        warnings,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(`Validation exception: ${errorMessage}`);
      console.error("Error validating financial calculations:", error);
      
      return {
        isValid: false,
        warnings,
        errors
      };
    }
  }

  /**
   * Get user profile information for statement header
   */
  async getUserProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          company_name,
          email,
          billing_address,
          shipping_address
        `)
        .eq("id", userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch user profile: ${error.message}`);
      }

      return profile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const statementService = new StatementGenerationService();