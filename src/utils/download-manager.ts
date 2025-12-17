/**
 * Enhanced Download Manager for PDF files with retry mechanism and error handling
 * Requirements: 2.5, 4.3
 */

export interface DownloadOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onProgress?: (attempt: number, maxAttempts: number) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface DownloadResult {
  success: boolean;
  filename?: string;
  error?: string;
  attempts: number;
}

/**
 * Enhanced download manager with retry mechanism and comprehensive error handling
 */
export class DownloadManager {
  private static readonly DEFAULT_OPTIONS: Required<DownloadOptions> = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    onProgress: () => {},
    onRetry: () => {}
  };

  /**
   * Download a blob with retry mechanism and error handling
   * Requirements: 2.5, 4.3
   */
  static async downloadBlob(
    blob: Blob,
    filename: string,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        opts.onProgress(attempt, opts.maxRetries);
        
        // Validate blob before download
        if (!blob || blob.size === 0) {
          throw new Error("File is empty or invalid");
        }
        
        // Trigger download
        await this.triggerBrowserDownload(blob, filename, opts.timeout);
        
        // Success
        return {
          success: true,
          filename,
          attempts: attempt
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown download error');
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(lastError)) {
          return {
            success: false,
            error: lastError.message,
            attempts: attempt
          };
        }
        
        // Notify about retry
        if (attempt < opts.maxRetries) {
          opts.onRetry(attempt, lastError);
          await this.delay(opts.retryDelay);
          // Exponential backoff
          opts.retryDelay = Math.floor(opts.retryDelay * 1.5);
        }
      }
    }
    
    // All retries failed
    return {
      success: false,
      error: `Failed to download after ${opts.maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
      attempts: opts.maxRetries
    };
  }

  /**
   * Trigger browser download with timeout and error handling
   * Requirements: 2.5, 4.3
   */
  private static async triggerBrowserDownload(
    blob: Blob,
    filename: string,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check browser support
        if (!window.URL || !window.URL.createObjectURL) {
          throw new Error("Browser does not support file downloads");
        }
        
        // Sanitize filename
        const sanitizedFilename = this.sanitizeFilename(filename);
        
        // Create object URL
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = sanitizedFilename;
        link.style.display = 'none';
        
        // Cleanup function
        const cleanup = () => {
          try {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
          } catch (cleanupError) {
            console.warn("Error during cleanup:", cleanupError);
          }
        };
        
        // Set up timeout
        const downloadTimeout = setTimeout(() => {
          cleanup();
          reject(new Error(`Download timeout after ${timeout}ms - file may not have been saved`));
        }, timeout);
        
        // Handle successful download
        link.addEventListener('click', () => {
          // Small delay to ensure download starts
          setTimeout(() => {
            clearTimeout(downloadTimeout);
            cleanup();
            resolve();
          }, 100);
        });
        
        // Handle download errors
        link.addEventListener('error', () => {
          clearTimeout(downloadTimeout);
          cleanup();
          reject(new Error("Download failed - browser rejected the file"));
        });
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
      } catch (error) {
        reject(new Error(`Failed to trigger download: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  /**
   * Generate descriptive filename with date range and user identifier
   * Requirements: 2.5
   */
  static generateStatementFilename(
    userId: string,
    startDate: Date,
    endDate: Date,
    userProfile?: { company_name?: string; first_name?: string; last_name?: string }
  ): string {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Generate user identifier
    let userIdentifier = userId;
    if (userProfile?.company_name) {
      userIdentifier = this.sanitizeForFilename(userProfile.company_name, 20);
    } else if (userProfile?.first_name && userProfile?.last_name) {
      userIdentifier = this.sanitizeForFilename(
        `${userProfile.first_name}_${userProfile.last_name}`,
        20
      );
    }
    
    // Add timestamp for uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    return `statement_${userIdentifier}_${startDateStr}_to_${endDateStr}_${timestamp}.pdf`;
  }

  /**
   * Sanitize text for use in filenames
   */
  private static sanitizeForFilename(text: string, maxLength: number = 50): string {
    return text
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, maxLength)
      .replace(/^_|_$/g, '');
  }

  /**
   * Sanitize complete filename
   */
  private static sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters for filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 255); // Max filename length
  }

  /**
   * Check if an error should not be retried
   * Requirements: 4.3
   */
  private static isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      'browser does not support file downloads',
      'file is empty or invalid',
      'user id is required',
      'invalid date range',
      'browser rejected the file'
    ];
    
    return nonRetryableMessages.some(message => 
      error.message.toLowerCase().includes(message.toLowerCase())
    );
  }

  /**
   * Utility function for retry delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if browser supports downloads
   */
  static isBrowserSupported(): boolean {
    return !!(window.URL && window.URL.createObjectURL && document.createElement);
  }

  /**
   * Get download capability information
   */
  static getDownloadCapabilities(): {
    supported: boolean;
    features: string[];
    limitations: string[];
  } {
    const features: string[] = [];
    const limitations: string[] = [];
    
    if (window.URL && window.URL.createObjectURL) {
      features.push('Blob URL creation');
    } else {
      limitations.push('No Blob URL support');
    }
    
    if (document.createElement) {
      features.push('Dynamic link creation');
    } else {
      limitations.push('No dynamic link support');
    }
    
    // Check for mobile limitations
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      limitations.push('Mobile browser may have download restrictions');
    }
    
    return {
      supported: this.isBrowserSupported(),
      features,
      limitations
    };
  }
}

/**
 * Convenience function for downloading statement PDFs
 * Requirements: 2.5, 4.3
 */
export async function downloadStatementPDF(
  pdfBlob: Blob,
  userId: string,
  startDate: Date,
  endDate: Date,
  userProfile?: { company_name?: string; first_name?: string; last_name?: string },
  options?: DownloadOptions
): Promise<DownloadResult> {
  const filename = DownloadManager.generateStatementFilename(
    userId,
    startDate,
    endDate,
    userProfile
  );
  
  return DownloadManager.downloadBlob(pdfBlob, filename, options);
}

/**
 * Error types for download operations
 */
export class DownloadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

export class NetworkDownloadError extends DownloadError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', true);
  }
}

export class BrowserDownloadError extends DownloadError {
  constructor(message: string) {
    super(message, 'BROWSER_ERROR', false);
  }
}

export class ValidationDownloadError extends DownloadError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', false);
  }
}