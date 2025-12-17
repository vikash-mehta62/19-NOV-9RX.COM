/**
 * Debug version of download functionality for troubleshooting
 * Requirements: 4.3
 */

import { statementService } from "@/services/statementService";
import { statementPDFGenerator } from "./statement-pdf-generator";

/**
 * Debug version of statement download with detailed logging
 */
export async function debugStatementDownload(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  console.log("🐛 DEBUG: Starting statement download");
  console.log("Parameters:", { userId, startDate, endDate });
  
  try {
    // Step 1: Generate statement data
    console.log("🐛 Step 1: Generating statement data...");
    const statementResponse = await statementService.generateStatementData({
      userId,
      startDate,
      endDate,
      includeZeroActivity: true
    });
    
    console.log("🐛 Statement response:", statementResponse);
    
    if (!statementResponse.success || !statementResponse.data) {
      throw new Error(`Statement generation failed: ${statementResponse.error}`);
    }
    
    const statementData = statementResponse.data;
    console.log("🐛 Statement data:", statementData);
    
    // Step 2: Validate financial calculations
    console.log("🐛 Step 2: Validating financial calculations...");
    const validation = statementService.validateFinancialCalculations(statementData);
    console.log("🐛 Validation result:", validation);
    
    // Step 3: Get user profile
    console.log("🐛 Step 3: Fetching user profile...");
    let userProfile;
    try {
      userProfile = await statementService.getUserProfile(userId);
      console.log("🐛 User profile:", userProfile);
    } catch (profileError) {
      console.warn("🐛 Could not fetch user profile:", profileError);
    }
    
    // Step 4: Create PDF
    console.log("🐛 Step 4: Creating PDF...");
    const pdfBlob = await statementPDFGenerator.createPDF(statementData, userProfile);
    console.log("🐛 PDF blob created:", pdfBlob);
    console.log("🐛 PDF blob size:", pdfBlob.size, "bytes");
    console.log("🐛 PDF blob type:", pdfBlob.type);
    
    if (pdfBlob.size === 0) {
      throw new Error("Generated PDF is empty");
    }
    
    // Step 5: Generate filename
    console.log("🐛 Step 5: Generating filename...");
    const filename = statementPDFGenerator.generateFilename(statementData, userProfile);
    console.log("🐛 Generated filename:", filename);
    
    // Step 6: Trigger download
    console.log("🐛 Step 6: Triggering download...");
    
    // Check browser support
    if (!window.URL || !window.URL.createObjectURL) {
      throw new Error("Browser does not support file downloads");
    }
    
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    console.log("🐛 Created blob URL:", url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    console.log("🐛 Created download link:", link);
    
    // Add to DOM and click
    document.body.appendChild(link);
    console.log("🐛 Added link to DOM");
    
    link.click();
    console.log("🐛 Clicked download link");
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log("🐛 Cleaned up download link and URL");
    }, 100);
    
    console.log("✅ DEBUG: Statement download completed successfully");
    
  } catch (error) {
    console.error("❌ DEBUG: Statement download failed:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

/**
 * Simple test to verify PDF generation works
 */
export async function testPDFGeneration(): Promise<void> {
  console.log("🧪 Testing PDF generation...");
  
  try {
    // Create minimal test data
    const testData = {
      userId: 'test-user',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-31'),
      openingBalance: 100,
      closingBalance: 150,
      totalPurchases: 50,
      totalPayments: 100,
      transactions: [
        {
          id: 'test-tx-1',
          transaction_date: '2023-01-15',
          description: 'Test Transaction',
          debit_amount: 50,
          credit_amount: 0,
          balance: 50,
          transaction_type: 'purchase'
        }
      ]
    };
    
    console.log("🧪 Test data:", testData);
    
    const pdfBlob = await statementPDFGenerator.createPDF(testData);
    console.log("🧪 Generated PDF blob:", pdfBlob);
    
    if (pdfBlob.size > 0) {
      console.log("✅ PDF generation test PASSED");
      
      // Try to download it
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-statement.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log("✅ Test PDF download triggered");
    } else {
      console.error("❌ PDF generation test FAILED: Empty blob");
    }
    
  } catch (error) {
    console.error("❌ PDF generation test ERROR:", error);
  }
}

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).debugDownload = {
    debugStatementDownload,
    testPDFGeneration
  };
  
  console.log("Debug download functions available at window.debugDownload");
}