/**
 * Examples of how to use the enhanced download mechanism
 * Requirements: 2.5, 4.3
 */

import { downloadService } from '@/services/downloadService';
import { DownloadManager } from './download-manager';

/**
 * Example: Basic statement download
 */
export async function downloadUserStatement(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    const result = await downloadService.downloadStatementSafely({
      userId,
      startDate,
      endDate,
      includeZeroActivity: true
    });

    if (result.success) {
      console.log(result.message);
      // Show success toast/notification
    } else {
      console.error(result.message);
      // Show error toast/notification
      if (result.details) {
        console.error('Details:', result.details);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Example: Download with progress tracking
 */
export async function downloadStatementWithProgress(
  userId: string,
  startDate: Date,
  endDate: Date,
  onProgress?: (stage: string, progress: number) => void,
  onError?: (message: string) => void
): Promise<void> {
  try {
    const result = await downloadService.downloadStatementWithProgress(
      { userId, startDate, endDate },
      onProgress,
      (error, retryable) => {
        if (onError) {
          onError(`${error} ${retryable ? '(retrying...)' : ''}`);
        }
      }
    );

    if (!result.success) {
      if (onError) {
        onError(result.error || 'Download failed');
      }
    }
  } catch (error) {
    if (onError) {
      onError('Unexpected error occurred');
    }
  }
}

/**
 * Example: Quick download for current month
 */
export async function downloadCurrentMonthStatement(userId: string): Promise<void> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await downloadService.quickDownload(userId, startDate, endDate);
  
  if (!result.success) {
    throw new Error(result.error || 'Download failed');
  }
}

/**
 * Example: Check download capabilities before attempting download
 */
export function checkDownloadSupport(): {
  canDownload: boolean;
  message: string;
} {
  const capabilities = downloadService.getDownloadCapabilities();
  
  if (!capabilities.supported) {
    return {
      canDownload: false,
      message: 'Your browser does not support file downloads. Please try a different browser.'
    };
  }

  if (capabilities.limitations.length > 0) {
    return {
      canDownload: true,
      message: `Download supported with limitations: ${capabilities.limitations.join(', ')}`
    };
  }

  return {
    canDownload: true,
    message: 'Full download support available'
  };
}

/**
 * Example: Generate filename preview
 */
export function previewFilename(
  userId: string,
  startDate: Date,
  endDate: Date,
  userProfile?: { company_name?: string; first_name?: string; last_name?: string }
): string {
  return DownloadManager.generateStatementFilename(userId, startDate, endDate, userProfile);
}

/**
 * Example: Retry configuration for different scenarios
 */
export const downloadConfigs = {
  // Fast download for small date ranges
  quick: {
    maxRetries: 2,
    retryDelay: 500,
    timeout: 15000
  },
  
  // Standard download for normal use
  standard: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000
  },
  
  // Patient download for large date ranges
  patient: {
    maxRetries: 5,
    retryDelay: 2000,
    timeout: 60000
  }
};

/**
 * Example: Download with custom retry configuration
 */
export async function downloadWithCustomRetry(
  userId: string,
  startDate: Date,
  endDate: Date,
  config: 'quick' | 'standard' | 'patient' = 'standard'
): Promise<void> {
  const options = downloadConfigs[config];
  
  const result = await downloadService.downloadStatement({
    userId,
    startDate,
    endDate
  }, options);

  if (!result.success) {
    throw new Error(result.error || 'Download failed');
  }
}