/**
 * Simple test utilities for debugging download issues
 * Requirements: 4.3
 */

import { DownloadManager } from './download-manager';

/**
 * Test basic browser download functionality
 */
export async function testBasicDownload(): Promise<void> {
  try {
    console.log("Testing basic download functionality...");
    
    // Check browser support
    const capabilities = DownloadManager.getDownloadCapabilities();
    console.log("Browser capabilities:", capabilities);
    
    if (!capabilities.supported) {
      throw new Error("Browser does not support downloads");
    }
    
    // Create a simple test file
    const testContent = `Test download file
Generated at: ${new Date().toISOString()}
Browser: ${navigator.userAgent}
`;
    
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    console.log("Created test blob:", testBlob);
    
    // Try to download it
    const result = await DownloadManager.downloadBlob(
      testBlob, 
      'test-download.txt',
      {
        maxRetries: 1,
        retryDelay: 500,
        onProgress: (attempt, max) => console.log(`Download attempt ${attempt}/${max}`),
        onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error.message)
      }
    );
    
    console.log("Download result:", result);
    
    if (result.success) {
      console.log("✅ Basic download test PASSED");
    } else {
      console.error("❌ Basic download test FAILED:", result.error);
    }
    
  } catch (error) {
    console.error("❌ Basic download test ERROR:", error);
  }
}

/**
 * Test PDF blob creation (without actual PDF library)
 */
export async function testPDFBlobDownload(): Promise<void> {
  try {
    console.log("Testing PDF-like blob download...");
    
    // Create a fake PDF-like blob
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
173
%%EOF`;
    
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    console.log("Created PDF-like blob:", pdfBlob);
    
    const result = await DownloadManager.downloadBlob(
      pdfBlob, 
      'test-statement.pdf',
      {
        maxRetries: 1,
        retryDelay: 500
      }
    );
    
    console.log("PDF download result:", result);
    
    if (result.success) {
      console.log("✅ PDF blob download test PASSED");
    } else {
      console.error("❌ PDF blob download test FAILED:", result.error);
    }
    
  } catch (error) {
    console.error("❌ PDF blob download test ERROR:", error);
  }
}

/**
 * Test filename generation
 */
export function testFilenameGeneration(): void {
  console.log("Testing filename generation...");
  
  const userId = "test-user-123";
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2023-01-31');
  
  // Test with no profile
  const filename1 = DownloadManager.generateStatementFilename(userId, startDate, endDate);
  console.log("Filename (no profile):", filename1);
  
  // Test with company name
  const filename2 = DownloadManager.generateStatementFilename(userId, startDate, endDate, {
    company_name: "Test Company & Co."
  });
  console.log("Filename (company):", filename2);
  
  // Test with user name
  const filename3 = DownloadManager.generateStatementFilename(userId, startDate, endDate, {
    first_name: "John",
    last_name: "Doe"
  });
  console.log("Filename (user name):", filename3);
  
  console.log("✅ Filename generation test completed");
}

/**
 * Run all download tests
 */
export async function runAllDownloadTests(): Promise<void> {
  console.log("🧪 Running all download tests...");
  
  testFilenameGeneration();
  await testBasicDownload();
  await testPDFBlobDownload();
  
  console.log("🏁 All download tests completed");
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).downloadTests = {
    testBasicDownload,
    testPDFBlobDownload,
    testFilenameGeneration,
    runAllDownloadTests
  };
  
  console.log("Download test functions available at window.downloadTests");
}