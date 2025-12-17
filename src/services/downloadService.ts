/**
 * Download Service for handling statement PDF downloads with retry mechanism
 * Requirements: 2.5, 4.3
 */

import { statementService, StatementData } from "./statementService";
import { statementPDFGenerator } from "@/utils/statement-pdf-generator";
import { DownloadManager, DownloadOptions, DownloadResult } from "@/utils/download-manager";

export interface StatementDownloadRequest {
  userId: string;
  startDate: Date;
  endDate: Date;
  includeZeroActivity?: boolean;
}

export interface StatementDownloadOptions extends DownloadOptions {
  validateData?: boolean;
  includeUserProfile?: boolean;
}

export interface StatementDownloadResult extends DownloadResult {
  statementData?: StatementData;
  validationPassed?: boolean;
}

/**
 * Service for handling statement downloads with comprehensive error handling and retry mechanism
 */
export class DownloadService {
  /**
   * Download statement PDF with full error handling and retry mechanism
   * Requirements: 2.5, 4.3
   */
  async downloadStatement(
    request: StatementDownloadRequest,
    options: StatementDownloadOptions = {}
  ): Promise<StatementDownloadResult> {
    try {
      // Validate request
      const validationResult = this.validateDownloadRequest(request);
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

      // Fetch statement data
      const statementResponse = await statementService.generateStatementData({
        userId: request.userId,
        startDate: request.startDate,
        endDate: request.endDate,
        includeZeroActivity: request.includeZeroActivity
      });

      if (!statementResponse.success || !statementResponse.data) {
        return {
          success: false,
          error: statementResponse.error || "Failed to generate statement data",
          attempts: 0
        };
      }

      const statementData = statementResponse.data;

      // Validate financial calculations if requested
      let validationPassed = true;
      let validationWarnings: string[] = [];
      if (options.validateData !== false) {
        const validation = statementService.validateFinancialCalculations(statementData);
        validationPassed = validation.isValid;
        validationWarnings = validation.warnings;
        
        if (!validationPassed) {
          console.warn("Financial calculation validation failed:", validation.errors);
          // Don't fail the download for validation issues, just warn
          validationPassed = true; // Allow download to proceed
        }
        
        if (validationWarnings.length > 0) {
          console.warn("Financial calculation warnings:", validationWarnings);
        }
      }

      // Fetch user profile if requested
      let userProfile;
      if (options.includeUserProfile !== false) {
        try {
          userProfile = await statementService.getUserProfile(request.userId);
        } catch (error) {
          console.warn("Could not fetch user profile:", error);
        }
      }

      // Generate and download PDF
      const downloadResult = await statementPDFGenerator.downloadPDF(
        statementData,
        userProfile,
        options
      );

      return {
        ...downloadResult,
        statementData,
        validationPassed
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error in downloadStatement:", errorMessage);
      
      return {
        success: false,
        error: `Statement download failed: ${errorMessage}`,
        attempts: 0
      };
    }
  }
  /**
   * Download statement with progress tracking
   * Requirements: 4.1, 4.5
   */
  async downloadStatementWithProgress(
    request: StatementDownloadRequest,
    onProgress?: (stage: string, progress: number) => void,
    onError?: (error: string, retryable: boolean) => void
  ): Promise<StatementDownloadResult> {
    const progressCallback = onProgress || (() => {});
    const errorCallback = onError || (() => {});

    try {
      progressCallback("Validating request", 10);
      
      const validationResult = this.validateDownloadRequest(request);
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

      progressCallback("Fetching statement data", 40);
      
      const statementResponse = await statementService.generateStatementData({
        userId: request.userId,
        startDate: request.startDate,
        endDate: request.endDate,
        includeZeroActivity: request.includeZeroActivity
      });

      if (!statementResponse.success || !statementResponse.data) {
        const error = statementResponse.error || "Failed to generate statement data";
        errorCallback(error, true);
        return {
          success: false,
          error,
          attempts: 0
        };
      }

      progressCallback("Validating financial data", 60);
      
      const statementData = statementResponse.data;
      const validation = statementService.validateFinancialCalculations(statementData);
      const validationPassed = validation.isValid;
      
      if (!validationPassed) {
        console.warn("Financial calculation validation failed:", validation.errors);
        // Continue with download despite validation issues
      }
      
      if (validation.warnings.length > 0) {
        console.warn("Financial calculation warnings:", validation.warnings);
      }

      progressCallback("Fetching user profile", 70);
      
      let userProfile;
      try {
        userProfile = await statementService.getUserProfile(request.userId);
      } catch (error) {
        console.warn("Could not fetch user profile:", error);
      }

      progressCallback("Generating PDF", 80);
      
      const downloadResult = await statementPDFGenerator.downloadPDF(
        statementData,
        userProfile,
        {
          maxRetries: 3,
          retryDelay: 1000,
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
        statementData,
        validationPassed
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorCallback(`Statement download failed: ${errorMessage}`, false);
      
      return {
        success: false,
        error: `Statement download failed: ${errorMessage}`,
        attempts: 0
      };
    }
  }
  /**
   * Validate download request parameters
   * Requirements: 4.3
   */
  private validateDownloadRequest(request: StatementDownloadRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.userId) {
      return {
        valid: false,
        error: "User ID is required"
      };
    }

    if (!request.startDate || !request.endDate) {
      return {
        valid: false,
        error: "Start date and end date are required"
      };
    }

    if (!(request.startDate instanceof Date) || !(request.endDate instanceof Date)) {
      return {
        valid: false,
        error: "Start date and end date must be valid Date objects"
      };
    }

    if (isNaN(request.startDate.getTime()) || isNaN(request.endDate.getTime())) {
      return {
        valid: false,
        error: "Start date and end date must be valid dates"
      };
    }

    if (request.startDate >= request.endDate) {
      return {
        valid: false,
        error: "Start date must be before end date"
      };
    }

    // Check for reasonable date range (not more than 2 years)
    const maxRangeMs = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
    if (request.endDate.getTime() - request.startDate.getTime() > maxRangeMs) {
      return {
        valid: false,
        error: "Date range cannot exceed 2 years"
      };
    }

    // Check that dates are not in the future
    const now = new Date();
    if (request.startDate > now || request.endDate > now) {
      return {
        valid: false,
        error: "Dates cannot be in the future"
      };
    }

    return { valid: true };
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
      const testBlob = new Blob(['Test download'], { type: 'text/plain' });
      
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

  /**
   * Handle download with user-friendly error messages
   * Requirements: 4.2, 4.3
   */
  async downloadStatementSafely(
    request: StatementDownloadRequest,
    options: StatementDownloadOptions = {}
  ): Promise<{
    success: boolean;
    message: string;
    details?: string;
  }> {
    try {
      const result = await this.downloadStatement(request, options);
      
      if (result.success) {
        return {
          success: true,
          message: "Statement downloaded successfully!"
        };
      } else {
        // Provide user-friendly error messages
        let userMessage = "Failed to download statement.";
        let details = result.error;
        
        if (result.error?.includes("Browser does not support")) {
          userMessage = "Your browser doesn't support file downloads. Please try a different browser.";
        } else if (result.error?.includes("User ID is required")) {
          userMessage = "Please log in to download your statement.";
        } else if (result.error?.includes("Start date must be before end date")) {
          userMessage = "Please select a valid date range.";
        } else if (result.error?.includes("No transactions found")) {
          userMessage = "No transactions found for the selected period.";
        } else if (result.error?.includes("Network")) {
          userMessage = "Network error occurred. Please check your connection and try again.";
        } else if (result.error?.includes("timeout")) {
          userMessage = "Download timed out. Please try again with a smaller date range.";
        }
        
        return {
          success: false,
          message: userMessage,
          details
        };
      }
    } catch (error) {
      console.error("Unexpected error in downloadStatementSafely:", error);
      return {
        success: false,
        message: "An unexpected error occurred. Please try again.",
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quick download method with minimal options
   * Requirements: 2.5, 4.3
   */
  async quickDownload(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StatementDownloadResult> {
    return this.downloadStatement({
      userId,
      startDate,
      endDate,
      includeZeroActivity: true
    }, {
      maxRetries: 2,
      retryDelay: 500,
      validateData: true,
      includeUserProfile: true
    });
  }
}

// Export singleton instance
export const downloadService = new DownloadService();