/**
 * Order Statement Download Service
 * Handles PDF download mechanism with retry and error handling
 * Requirements: 2.5, 4.3
 */

import { OrderStatementData } from "@/types/orderStatement";
import { orderPDFGenerator } from "@/utils/order-statement-pdf-generator";
import { DownloadManager, DownloadOptions, DownloadResult } from "@/utils/download-manager";

export interface OrderStatementDownloadOptions extends DownloadOptions {
  validateData?: boolean;
}

export interface OrderStatementDownloadResult extends DownloadResult {
  statementData?: OrderStatementData;
}

/**
 * Service for handling order statement PDF downloads with comprehensive error handling and retry mechanism
 * Requirements: 2.5, 4.3
 */
export class OrderStatementDownloadService {
  /**
   * Download order statement PDF with filename generation and retry mechanism
   * Requirements: 2.5, 4.3
   */
  async downloadOrderPDF(
    statementData: OrderStatementData,
    options: OrderStatementDownloadOptions = {}
  ): Promise<OrderStatementDownloadResult> {
    try {
      // Validate statement data
      const validationResult = this.validateStatementData(statementData);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          attempts: 0
        };
      }

      // Check browser capabilities
      if (!DownloadManager.isBrowserSupported()) {
        return {
          success: false,
          error: "Browser does not support file downloads",
          attempts: 0
        };
      }

      // Generate PDF blob
      const pdfBlob = await orderPDFGenerator.createPDF(statementData);

      // Validate PDF blob
      if (!pdfBlob || pdfBlob.size === 0) {
        return {
          success: false,
          error: "Generated PDF is empty or invalid",
          attempts: 0
        };
      }

      // Generate filename with date range and user identifier
      // Requirements: 2.5
      const filename = this.generateOrderStatementFilename(
        statementData.userId,
        statementData.startDate,
        statementData.endDate || new Date(),
        statementData.userInfo
      );

      // Download PDF with retry mechanism
      // Requirements: 4.3
      const downloadResult = await DownloadManager.downloadBlob(
        pdfBlob,
        filename,
        {
          maxRetries: options.maxRetries || 3,
          retryDelay: options.retryDelay || 1000,
          timeout: options.timeout || 30000,
          onProgress: options.onProgress,
          onRetry: options.onRetry
        }
      );

      return {
        ...downloadResult,
        statementData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error in downloadOrderPDF:", errorMessage);
      
      return {
        success: false,
        error: `Order statement download failed: ${errorMessage}`,
        attempts: 0
      };
    }
  }

  /**
   * Download order statement with progress tracking
   * Requirements: 4.1, 4.5
   */
  async downloadOrderPDFWithProgress(
    statementData: OrderStatementData,
    onProgress?: (stage: string, progress: number) => void,
    onError?: (error: string, retryable: boolean) => void
  ): Promise<OrderStatementDownloadResult> {
    const progressCallback = onProgress || (() => {});
    const errorCallback = onError || (() => {});

    try {
      progressCallback("Validating statement data", 10);
      
      const validationResult = this.validateStatementData(statementData);
      if (!validationResult.valid) {
        errorCallback(validationResult.error!, false);
        return {
          success: false,
          error: validationResult.error,
          attempts: 0
        };
      }

      progressCallback("Checking browser compatibility", 20);
      
      if (!DownloadManager.isBrowserSupported()) {
        const error = "Browser does not support file downloads";
        errorCallback(error, false);
        return {
          success: false,
          error,
          attempts: 0
        };
      }

      progressCallback("Generating PDF document", 50);
      
      const pdfBlob = await orderPDFGenerator.createPDF(statementData);

      if (!pdfBlob || pdfBlob.size === 0) {
        const error = "Generated PDF is empty or invalid";
        errorCallback(error, false);
        return {
          success: false,
          error,
          attempts: 0
        };
      }

      progressCallback("Preparing download", 70);
      
      const filename = this.generateOrderStatementFilename(
        statementData.userId,
        statementData.startDate,
        statementData.endDate || new Date(),
        statementData.userInfo
      );

      progressCallback("Downloading PDF", 80);
      
      const downloadResult = await DownloadManager.downloadBlob(
        pdfBlob,
        filename,
        {
          maxRetries: 3,
          retryDelay: 1000,
          timeout: 30000,
          onProgress: (attempt, maxAttempts) => {
            const progress = 80 + (attempt / maxAttempts) * 20;
            progressCallback(`Downloading (attempt ${attempt}/${maxAttempts})`, progress);
          },
          onRetry: (attempt, error) => {
            errorCallback(`Download attempt ${attempt} failed: ${error.message}`, true);
          }
        }
      );

      if (downloadResult.success) {
        progressCallback("Download completed", 100);
      } else {
        errorCallback(downloadResult.error || "Download failed", false);
      }

      return {
        ...downloadResult,
        statementData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorCallback(`Order statement download failed: ${errorMessage}`, false);
      
      return {
        success: false,
        error: `Order statement download failed: ${errorMessage}`,
        attempts: 0
      };
    }
  }

  /**
   * Generate descriptive filename with "order-statement", date range, and user identifier
   * Requirements: 2.5
   */
  private generateOrderStatementFilename(
    userId: string,
    startDate: Date,
    endDate: Date,
    userInfo?: { company_name?: string; first_name?: string; last_name?: string }
  ): string {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Generate user identifier from profile info or use userId
    let userIdentifier = userId.substring(0, 8); // Use first 8 chars of userId as fallback
    
    if (userInfo?.company_name) {
      userIdentifier = this.sanitizeForFilename(userInfo.company_name, 20);
    } else if (userInfo?.first_name && userInfo?.last_name) {
      userIdentifier = this.sanitizeForFilename(
        `${userInfo.first_name}_${userInfo.last_name}`,
        20
      );
    }
    
    // Generate filename with "order-statement" prefix as per requirements
    // Requirements: 2.5
    return `order-statement_${userIdentifier}_${startDateStr}_to_${endDateStr}.pdf`;
  }

  /**
   * Sanitize text for use in filenames
   */
  private sanitizeForFilename(text: string, maxLength: number = 50): string {
    return text
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, maxLength)
      .replace(/^_|_$/g, '');
  }

  /**
   * Validate statement data before download
   * Requirements: 4.3
   */
  private validateStatementData(statementData: OrderStatementData): {
    valid: boolean;
    error?: string;
  } {
    if (!statementData) {
      return {
        valid: false,
        error: "Statement data is required"
      };
    }

    if (!statementData.userId) {
      return {
        valid: false,
        error: "User ID is required"
      };
    }

    if (!statementData.startDate) {
      return {
        valid: false,
        error: "Start date is required"
      };
    }

    if (!(statementData.startDate instanceof Date)) {
      return {
        valid: false,
        error: "Start date must be a valid Date object"
      };
    }

    if (isNaN(statementData.startDate.getTime())) {
      return {
        valid: false,
        error: "Start date must be a valid date"
      };
    }

    if (!statementData.orders) {
      return {
        valid: false,
        error: "Orders data is required"
      };
    }

    if (!Array.isArray(statementData.orders)) {
      return {
        valid: false,
        error: "Orders must be an array"
      };
    }

    if (!statementData.summary) {
      return {
        valid: false,
        error: "Summary data is required"
      };
    }

    return { valid: true };
  }

  /**
   * Handle download with user-friendly error messages
   * Requirements: 4.2, 4.3
   */
  async downloadOrderPDFSafely(
    statementData: OrderStatementData,
    options: OrderStatementDownloadOptions = {}
  ): Promise<{
    success: boolean;
    message: string;
    details?: string;
  }> {
    try {
      const result = await this.downloadOrderPDF(statementData, options);
      
      if (result.success) {
        return {
          success: true,
          message: "Order statement downloaded successfully!"
        };
      } else {
        // Provide user-friendly error messages
        // Requirements: 4.2
        let userMessage = "Failed to download order statement.";
        let details = result.error;
        
        if (result.error?.includes("Browser does not support")) {
          userMessage = "Your browser doesn't support file downloads. Please try a different browser.";
        } else if (result.error?.includes("User ID is required")) {
          userMessage = "Please log in to download your order statement.";
        } else if (result.error?.includes("Statement data is required")) {
          userMessage = "No order data available to download.";
        } else if (result.error?.includes("empty or invalid")) {
          userMessage = "Failed to generate PDF document. Please try again.";
        } else if (result.error?.includes("Network")) {
          userMessage = "Network error occurred. Please check your connection and try again.";
        } else if (result.error?.includes("timeout")) {
          userMessage = "Download timed out. Please try again.";
        } else if (result.error?.includes("Failed to download after")) {
          userMessage = "Download failed after multiple attempts. Please try again later.";
        }
        
        return {
          success: false,
          message: userMessage,
          details
        };
      }
    } catch (error) {
      console.error("Unexpected error in downloadOrderPDFSafely:", error);
      return {
        success: false,
        message: "An unexpected error occurred. Please try again.",
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quick download method with default options - simplified without retry
   * Requirements: 2.5, 4.3
   */
  async quickDownload(
    statementData: OrderStatementData
  ): Promise<OrderStatementDownloadResult> {
    try {
      // Validate statement data
      const validationResult = this.validateStatementData(statementData);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          attempts: 0
        };
      }

      // Generate PDF blob
      const pdfBlob = await orderPDFGenerator.createPDF(statementData);

      // Validate PDF blob
      if (!pdfBlob || pdfBlob.size === 0) {
        return {
          success: false,
          error: "Generated PDF is empty or invalid",
          attempts: 0
        };
      }

      // Generate filename
      const filename = this.generateOrderStatementFilename(
        statementData.userId,
        statementData.startDate,
        statementData.endDate || new Date(),
        statementData.userInfo
      );

      // Simple download without retry
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        attempts: 1,
        statementData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error in quickDownload:", errorMessage);
      
      return {
        success: false,
        error: `Order statement download failed: ${errorMessage}`,
        attempts: 0
      };
    }
  }

  /**
   * Get download capabilities and limitations
   * Requirements: 4.3
   */
  getDownloadCapabilities() {
    return DownloadManager.getDownloadCapabilities();
  }

  /**
   * Test download functionality
   * Requirements: 4.3
   */
  async testDownload(): Promise<{
    supported: boolean;
    error?: string;
  }> {
    try {
      if (!DownloadManager.isBrowserSupported()) {
        return {
          supported: false,
          error: "Browser does not support downloads"
        };
      }

      return {
        supported: true
      };

    } catch (error) {
      return {
        supported: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const orderStatementDownloadService = new OrderStatementDownloadService();
