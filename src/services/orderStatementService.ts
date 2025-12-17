import { supabase } from "@/integrations/supabase/client";
import {
  OrderStatementData,
  OrderStatementRecord,
  OrderStatementSummary,
  OrderStatementRequest,
  OrderStatementResponse,
  UserProfileInfo,
  CompanyInfo,
  OrderStatementService
} from "@/types/orderStatement";
import { orderPDFGenerator } from "@/utils/order-statement-pdf-generator";
import { orderStatementDownloadService } from "./orderStatementDownloadService";

/**
 * OrderStatementGenerationService class for handling order data retrieval and PDF generation
 * Implements requirements 3.1, 3.2, 3.3, 3.4
 */
export class OrderStatementGenerationService implements OrderStatementService {
  
  /**
   * Generate order statement with comprehensive error handling
   * Requirements: 3.1, 3.2, 3.3, 3.4, 2.5, 4.3
   */
  async generateOrderStatement(userId: string, startDate: Date, endDate?: Date): Promise<void> {
    try {
      const actualEndDate = endDate || new Date();
      const statementData = await this.fetchOrderData(userId, startDate, actualEndDate);
      
      // Use the download service to handle PDF generation and download with retry mechanism
      // Requirements: 2.5, 4.3
      const downloadResult = await orderStatementDownloadService.downloadOrderPDF(statementData, {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000
      });
      
      if (!downloadResult.success) {
        throw new Error(downloadResult.error || "Failed to download order statement");
      }
      
    } catch (error) {
      console.error("Error generating order statement:", error);
      throw error;
    }
  }

  /**
   * Fetch order data for a given user and date range
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async fetchOrderData(userId: string, startDate: Date, endDate?: Date): Promise<OrderStatementData> {
    try {
      // Validate input parameters
      if (!userId) {
        throw new Error("User ID is required");
      }
      
      const actualEndDate = endDate || new Date();
      
      if (startDate >= actualEndDate) {
        throw new Error("Start date must be before end date");
      }

      // Convert dates to ISO strings for database query
      const startDateISO = startDate.toISOString().split('T')[0];
      const endDateISO = actualEndDate.toISOString().split('T')[0];

      // Fetch orders within the date range
      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          created_at,
          status,
          payment_status,
          total_amount
        `)
        .eq("profile_id", userId)
        .gte("created_at", startDateISO)
        .lte("created_at", endDateISO + 'T23:59:59.999Z')
        .order("created_at", { ascending: true });

      if (orderError) {
        throw new Error(`Failed to fetch orders: ${orderError.message}`);
      }

      // Handle edge case for periods with no orders (Requirement 3.4)
      const orderList = orders || [];

      // Transform orders to OrderStatementRecord format
      const orderRecords: OrderStatementRecord[] = orderList.map(order => {
        // Use the order's payment_status directly
        const paymentStatus = this.normalizePaymentStatus(order.payment_status || 'pending');
        const orderAmount = order.total_amount || 0;
        
        // Calculate paid and pending amounts based on payment status
        let paidAmount = 0;
        let pendingAmount = orderAmount;

        if (paymentStatus === 'paid') {
          paidAmount = orderAmount;
          pendingAmount = 0;
        } else if (paymentStatus === 'partial') {
          // For partial payments, split 50/50 (can be enhanced with actual payment data)
          paidAmount = orderAmount * 0.5;
          pendingAmount = orderAmount * 0.5;
        }
        // For 'pending', 'unpaid', 'failed' - paidAmount stays 0, pendingAmount is full amount

        return {
          orderNumber: order.order_number || order.id,
          orderDate: new Date(order.created_at).toLocaleDateString(),
          orderStatus: this.normalizeOrderStatus(order.status),
          paymentStatus,
          orderAmount,
          paidAmount,
          pendingAmount
        };
      });

      // Calculate summary information (Requirement 3.2, 3.3)
      const summary: OrderStatementSummary = this.calculateSummary(orderRecords, startDate, actualEndDate);

      // Fetch user profile information
      const userInfo = await this.getUserProfile(userId);

      // Get company information
      const companyInfo = this.getCompanyInfo();

      return {
        userId,
        startDate,
        endDate: actualEndDate,
        orders: orderRecords,
        summary,
        userInfo,
        companyInfo
      };

    } catch (error) {
      console.error("Error fetching order data:", error);
      throw error;
    }
  }

  /**
   * Create PDF blob from order statement data
   * Requirements: 2.1, 2.2, 2.4, 6.1, 6.2, 6.3, 6.4
   */
  async createOrderPDF(statementData: OrderStatementData): Promise<Blob> {
    return orderPDFGenerator.createPDF(statementData);
  }

  /**
   * Calculate order summary statistics
   * Requirements: 3.2, 3.3
   */
  private calculateSummary(orders: OrderStatementRecord[], startDate: Date, endDate: Date): OrderStatementSummary {
    const totalOrders = orders.length;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalPending = 0;

    // Calculate totals with proper financial accuracy (Requirement 3.3)
    orders.forEach(order => {
      totalAmount += order.orderAmount;
      totalPaid += order.paidAmount;
      totalPending += order.pendingAmount;
    });

    // Round to 2 decimal places to handle floating point precision
    totalAmount = Math.round(totalAmount * 100) / 100;
    totalPaid = Math.round(totalPaid * 100) / 100;
    totalPending = Math.round(totalPending * 100) / 100;

    return {
      totalOrders,
      totalAmount,
      totalPaid,
      totalPending,
      periodStart: startDate,
      periodEnd: endDate
    };
  }

  /**
   * Normalize order status to expected values
   */
  private normalizeOrderStatus(status: string): 'pending' | 'processing' | 'completed' | 'cancelled' {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'processing':
      case 'completed':
      case 'cancelled':
        return normalizedStatus;
      case 'shipped':
      case 'delivered':
        return 'completed';
      default:
        return 'pending';
    }
  }

  /**
   * Normalize payment status to expected values
   */
  private normalizePaymentStatus(status: string): 'paid' | 'pending' | 'partial' | 'failed' {
    if (!status) return 'pending';
    
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'paid':
      case 'pending':
      case 'partial':
      case 'failed':
        return normalizedStatus;
      case 'completed':
      case 'success':
      case 'processed':
        return 'paid';
      case 'unpaid':
      case 'draft':
      case 'sent':
        return 'pending';
      case 'overdue':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Get user profile information for statement header
   */
  private async getUserProfile(userId: string): Promise<UserProfileInfo> {
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
      // Return minimal profile info if fetch fails
      return {
        id: userId,
        first_name: '',
        last_name: '',
        company_name: '',
        email: ''
      };
    }
  }

  /**
   * Get company information for PDF header
   */
  private getCompanyInfo(): CompanyInfo {
    return {
      name: "9RX Pharmacy Solutions",
      address: "Business Address Line 1, City, State, ZIP",
      contactInfo: "Phone: (555) 123-4567 | Email: info@9rx.com",
      logoPath: "/final.png"
    };
  }



  /**
   * Download order statement PDF with user-friendly error handling
   * Requirements: 2.5, 4.2, 4.3
   */
  async downloadOrderStatementPDF(
    userId: string,
    startDate: Date,
    endDate?: Date,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<{
    success: boolean;
    message: string;
    details?: string;
  }> {
    try {
      const actualEndDate = endDate || new Date();
      const statementData = await this.fetchOrderData(userId, startDate, actualEndDate);
      
      // Use download service with progress tracking
      if (onProgress) {
        const result = await orderStatementDownloadService.downloadOrderPDFWithProgress(
          statementData,
          onProgress
        );
        
        if (result.success) {
          return {
            success: true,
            message: "Order statement downloaded successfully!"
          };
        } else {
          return {
            success: false,
            message: result.error || "Failed to download order statement",
            details: result.error
          };
        }
      } else {
        // Use safe download method with user-friendly messages
        return orderStatementDownloadService.downloadOrderPDFSafely(statementData);
      }
      
    } catch (error) {
      console.error("Error downloading order statement:", error);
      return {
        success: false,
        message: "An unexpected error occurred while downloading the order statement.",
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate order statement with response format
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async generateOrderStatementData(request: OrderStatementRequest): Promise<OrderStatementResponse> {
    try {
      // Validate request
      if (!request.userId) {
        return {
          success: false,
          error: "User ID is required"
        };
      }

      if (!request.startDate) {
        return {
          success: false,
          error: "Start date is required"
        };
      }

      const actualEndDate = request.endDate || new Date();

      if (request.startDate >= actualEndDate) {
        return {
          success: false,
          error: "Start date must be before end date"
        };
      }

      // Fetch order data
      const orderData = await this.fetchOrderData(
        request.userId,
        request.startDate,
        actualEndDate
      );

      // Handle edge case for periods with no orders (Requirement 3.4)
      if (orderData.orders.length === 0 && !request.includeZeroActivity) {
        return {
          success: false,
          error: "No orders found for the selected period"
        };
      }

      // Generate filename
      const filename = this.generateFilename(request.userId, request.startDate, actualEndDate);

      return {
        success: true,
        data: orderData,
        filename
      };

    } catch (error) {
      console.error("Error generating order statement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Validate financial calculations for accuracy (Requirement 3.3)
   */
  validateFinancialCalculations(statementData: OrderStatementData): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    try {
      let calculatedTotalAmount = 0;
      let calculatedTotalPaid = 0;
      let calculatedTotalPending = 0;

      // Validate individual orders and calculate totals
      statementData.orders.forEach((order, index) => {
        // Check for negative amounts
        if (order.orderAmount < 0) {
          errors.push(`Order ${order.orderNumber}: negative order amount ${order.orderAmount}`);
        }
        if (order.paidAmount < 0) {
          errors.push(`Order ${order.orderNumber}: negative paid amount ${order.paidAmount}`);
        }
        if (order.pendingAmount < 0) {
          warnings.push(`Order ${order.orderNumber}: negative pending amount ${order.pendingAmount}`);
        }

        // Check if paid + pending equals total (with small tolerance for rounding)
        const calculatedTotal = order.paidAmount + order.pendingAmount;
        const difference = Math.abs(order.orderAmount - calculatedTotal);
        if (difference > 0.01) {
          warnings.push(
            `Order ${order.orderNumber}: amount mismatch - ` +
            `total: ${order.orderAmount}, paid + pending: ${calculatedTotal}`
          );
        }

        // Accumulate totals
        calculatedTotalAmount += order.orderAmount;
        calculatedTotalPaid += order.paidAmount;
        calculatedTotalPending += order.pendingAmount;
      });

      // Round calculated totals to match summary rounding
      calculatedTotalAmount = Math.round(calculatedTotalAmount * 100) / 100;
      calculatedTotalPaid = Math.round(calculatedTotalPaid * 100) / 100;
      calculatedTotalPending = Math.round(calculatedTotalPending * 100) / 100;

      // Validate summary totals
      if (Math.abs(statementData.summary.totalAmount - calculatedTotalAmount) > 0.01) {
        errors.push(
          `Summary total amount mismatch: calculated ${calculatedTotalAmount}, ` +
          `summary shows ${statementData.summary.totalAmount}`
        );
      }

      if (Math.abs(statementData.summary.totalPaid - calculatedTotalPaid) > 0.01) {
        errors.push(
          `Summary total paid mismatch: calculated ${calculatedTotalPaid}, ` +
          `summary shows ${statementData.summary.totalPaid}`
        );
      }

      if (Math.abs(statementData.summary.totalPending - calculatedTotalPending) > 0.01) {
        errors.push(
          `Summary total pending mismatch: calculated ${calculatedTotalPending}, ` +
          `summary shows ${statementData.summary.totalPending}`
        );
      }

      // Validate order count
      if (statementData.summary.totalOrders !== statementData.orders.length) {
        errors.push(
          `Order count mismatch: summary shows ${statementData.summary.totalOrders}, ` +
          `actual orders: ${statementData.orders.length}`
        );
      }

      // Log warnings and errors
      if (warnings.length > 0) {
        console.warn("Order statement validation warnings:", warnings);
      }
      if (errors.length > 0) {
        console.error("Order statement validation errors:", errors);
      }

      return {
        isValid: errors.length === 0,
        warnings,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(`Validation exception: ${errorMessage}`);
      console.error("Error validating order statement calculations:", error);
      
      return {
        isValid: false,
        warnings,
        errors
      };
    }
  }
}

// Export a singleton instance
export const orderStatementService = new OrderStatementGenerationService();