import jsPDF from "jspdf";
import "jspdf-autotable";
import { StatementData, StatementTransaction } from "@/services/statementService";
import { DownloadManager, DownloadOptions, DownloadResult } from "./download-manager";

// Extend the jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => void;
  lastAutoTable: {
    finalY: number;
  };
}

// PDF Configuration interface from design document
interface PDFConfig {
  orientation: 'landscape';
  unit: 'mm';
  format: 'a4';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header: {
    logoPath: string;
    companyName: string;
    contactInfo: string;
  };
}

// User profile interface for header information
interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  billing_address?: any;
  shipping_address?: any;
}

/**
 * StatementPDFGenerator class for creating formatted PDF documents from statement data
 * Implements requirements 2.1, 2.2, 2.3, 2.4
 */
export class StatementPDFGenerator {
  private config: PDFConfig;

  constructor() {
    // Initialize PDF configuration (Requirement 2.1, 2.2)
    this.config = {
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      margins: {
        top: 20,
        right: 15,
        bottom: 20,
        left: 15,
      },
      header: {
        logoPath: '/final.png',
        companyName: '9RX LLC',
        contactInfo: 'Tax ID: 99-0540972 | 936 Broad River Ln, Charlotte, NC 28211 | info@9rx.com | www.9rx.com',
      },
    };
  }

  /**
   * Create PDF document from statement data
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async createPDF(statementData: StatementData, userProfile?: UserProfile): Promise<Blob> {
    try {
      // Initialize PDF document (Requirement 2.1)
      const doc = new jsPDF({
        orientation: this.config.orientation,
        unit: this.config.unit,
        format: this.config.format,
      }) as jsPDFWithAutoTable;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const { margins } = this.config;

      // Add professional header (Requirements 2.1, 2.2)
      await this.addHeader(doc, statementData, pageWidth, margins);

      // Add customer information
      this.addCustomerInfo(doc, userProfile, margins);

      // Add statement summary
      this.addStatementSummary(doc, statementData, pageWidth, margins);

      // Add transaction table (Requirements 2.3, 2.4)
      this.addTransactionTable(doc, statementData, pageWidth, margins);

      // Add footer
      this.addFooter(doc, pageWidth, pageHeight, margins);

      // Convert to blob and return
      const pdfBlob = doc.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error("Error creating PDF:", error);
      throw new Error(`Failed to create PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add professional header with company logo, contact info, and statement period
   * Requirements: 2.1, 2.2
   */
  private async addHeader(
    doc: jsPDFWithAutoTable, 
    statementData: StatementData, 
    pageWidth: number, 
    margins: { top: number; right: number; bottom: number; left: number }
  ): Promise<void> {
    try {
      // Add top contact info (Requirement 2.2)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(this.config.header.contactInfo, pageWidth / 2, margins.top, { align: "center" });

      // Add company name (Requirement 2.2)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text(this.config.header.companyName, margins.left, margins.top + 10);

      // Add company phone number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("+1 800 969 6295", margins.left, margins.top + 18);

      // Add company logo (Requirement 2.2)
      try {
        const logo = new Image();
        logo.src = this.config.header.logoPath;
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
        });
        
        const logoHeight = 20;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, margins.top + 5, logoWidth, logoHeight);
      } catch (logoError) {
        console.warn("Could not load logo:", logoError);
        // Continue without logo if it fails to load
      }

      // Add statement title and period (Requirement 2.2)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.text("ACCOUNT STATEMENT", pageWidth - margins.right, margins.top + 8, { align: "right" });

      // Format statement period
      const startDateStr = statementData.startDate.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      });
      const endDateStr = statementData.endDate.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(52, 73, 94);
      doc.text(`Statement Period: ${startDateStr} - ${endDateStr}`, pageWidth - margins.right, margins.top + 16, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleDateString("en-US")}`, pageWidth - margins.right, margins.top + 22, { align: "right" });

      // Add separator line
      doc.setDrawColor(180);
      doc.line(margins.left, margins.top + 30, pageWidth - margins.right, margins.top + 30);

    } catch (error) {
      console.error("Error adding header:", error);
      throw error;
    }
  }

  /**
   * Add customer information section
   */
  private addCustomerInfo(
    doc: jsPDFWithAutoTable, 
    userProfile: UserProfile | undefined, 
    margins: { top: number; right: number; bottom: number; left: number }
  ): void {
    const customerY = margins.top + 38;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185);
    doc.text("Account Holder:", margins.left, customerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);

    if (userProfile) {
      let infoY = customerY + 6;
      
      // Company name or full name
      const displayName = userProfile.company_name || 
        `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 
        'N/A';
      doc.text(displayName, margins.left, infoY);
      infoY += 5;

      // Email
      if (userProfile.email) {
        doc.text(userProfile.email, margins.left, infoY);
        infoY += 5;
      }

      // Billing address if available
      if (userProfile.billing_address) {
        const address = typeof userProfile.billing_address === 'string' 
          ? JSON.parse(userProfile.billing_address) 
          : userProfile.billing_address;
        
        if (address.street) {
          doc.text(address.street, margins.left, infoY);
          infoY += 5;
        }
        
        const cityStateZip = `${address.city || ''}, ${address.state || ''} ${address.zip_code || ''}`.trim();
        if (cityStateZip !== ',') {
          doc.text(cityStateZip, margins.left, infoY);
        }
      }
    } else {
      doc.text("Account information not available", margins.left, customerY + 6);
    }
  }

  /**
   * Add statement summary with opening balance, closing balance, totals
   */
  private addStatementSummary(
    doc: jsPDFWithAutoTable, 
    statementData: StatementData, 
    pageWidth: number, 
    margins: { top: number; right: number; bottom: number; left: number }
  ): void {
    const summaryY = margins.top + 75;

    // Add separator line
    doc.setDrawColor(180);
    doc.line(margins.left, summaryY - 5, pageWidth - margins.right, summaryY - 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185);
    doc.text("Statement Summary", margins.left, summaryY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);

    const leftCol = margins.left;
    const rightCol = pageWidth / 2 + 10;
    let currentY = summaryY + 8;

    // Left column
    doc.setFont("helvetica", "bold");
    doc.text("Opening Balance:", leftCol, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(this.formatCurrency(statementData.openingBalance), leftCol + 35, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Total Purchases:", leftCol, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(this.formatCurrency(statementData.totalPurchases), leftCol + 35, currentY + 6);

    // Right column
    doc.setFont("helvetica", "bold");
    doc.text("Total Payments:", rightCol, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(this.formatCurrency(statementData.totalPayments), rightCol + 35, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Closing Balance:", rightCol, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(this.formatCurrency(statementData.closingBalance), rightCol + 35, currentY + 6);

    // Add separator line
    doc.setDrawColor(180);
    doc.line(margins.left, currentY + 15, pageWidth - margins.right, currentY + 15);
  }

  /**
   * Add transaction table with proper formatting and column headers
   * Requirements: 2.3, 2.4
   */
  private addTransactionTable(
    doc: jsPDFWithAutoTable, 
    statementData: StatementData, 
    pageWidth: number, 
    margins: { top: number; right: number; bottom: number; left: number }
  ): void {
    const tableStartY = margins.top + 105;

    // Table headers (Requirement 2.4)
    const tableHead = [
      ["Date", "Description", "Debit", "Credit", "Balance"]
    ];

    // Prepare table data with consistent currency formatting (Requirement 2.3)
    const tableBody: string[][] = [];

    if (statementData.transactions.length === 0) {
      // Handle edge case for periods with no transactions
      tableBody.push([
        "No transactions found for this period",
        "",
        "",
        "",
        ""
      ]);
    } else {
      statementData.transactions.forEach((transaction: StatementTransaction) => {
        const formattedDate = new Date(transaction.transaction_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });

        // Format amounts with consistent currency formatting (Requirement 2.3)
        const debitAmount = transaction.debit_amount > 0 ? this.formatCurrency(transaction.debit_amount) : "";
        const creditAmount = transaction.credit_amount > 0 ? this.formatCurrency(transaction.credit_amount) : "";
        const balance = this.formatCurrency(transaction.balance);

        tableBody.push([
          formattedDate,
          transaction.description || "N/A",
          debitAmount,
          creditAmount,
          balance
        ]);
      });
    }

    // Create table with proper formatting (Requirements 2.3, 2.4)
    doc.autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY,
      styles: { 
        fontSize: 9, 
        cellPadding: 3,
        textColor: 50
      },
      theme: "grid",
      headStyles: { 
        fillColor: [41, 128, 185], 
        textColor: 255,
        fontStyle: "bold",
        halign: "center"
      },
      bodyStyles: { 
        textColor: 50 
      },
      columnStyles: {
        0: { cellWidth: 25, halign: "center" }, // Date
        1: { cellWidth: "*", minCellWidth: 60 }, // Description - expands to fill space
        2: { cellWidth: 25, halign: "right" },   // Debit
        3: { cellWidth: 25, halign: "right" },   // Credit
        4: { cellWidth: 30, halign: "right" }    // Balance
      },
      tableWidth: pageWidth - margins.left - margins.right,
      margin: { left: margins.left, right: margins.right },
      // Handle page breaks for large transaction lists (Requirement 2.4)
      showHead: 'everyPage',
      didDrawPage: (data: any) => {
        // Add page numbers for multi-page statements
        if (data.pageNumber > 1) {
          doc.setFontSize(8);
          doc.setTextColor(127, 140, 141);
          doc.text(
            `Page ${data.pageNumber}`, 
            pageWidth - margins.right, 
            pageWidth - 10, 
            { align: "right" }
          );
        }
      }
    });
  }

  /**
   * Add footer with company information
   */
  private addFooter(
    doc: jsPDFWithAutoTable, 
    pageWidth: number, 
    pageHeight: number, 
    margins: { top: number; right: number; bottom: number; left: number }
  ): void {
    doc.setFontSize(8);
    doc.setTextColor(127, 140, 141);
    doc.setFont("helvetica", "normal");
    
    const footerText = "This statement was generated by 9RX LLC. Please contact us if you have any questions about your account.";
    doc.text(footerText, pageWidth / 2, pageHeight - margins.bottom + 5, { align: "center" });
    
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`,
      pageWidth / 2,
      pageHeight - margins.bottom + 10,
      { align: "center" }
    );
  }

  /**
   * Format currency amounts consistently with proper decimal places
   * Requirement: 2.3
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Generate filename with date range and user identifier
   * Requirements: 2.5, 4.3
   */
  generateFilename(statementData: StatementData, userProfile?: UserProfile): string {
    const startDateStr = statementData.startDate.toISOString().split('T')[0];
    const endDateStr = statementData.endDate.toISOString().split('T')[0];
    
    // Include user identifier in filename for better organization
    let userIdentifier = statementData.userId;
    if (userProfile?.company_name) {
      // Sanitize company name for filename
      userIdentifier = userProfile.company_name
        .replace(/[^a-zA-Z0-9\-_]/g, '_')
        .substring(0, 20);
    } else if (userProfile?.first_name && userProfile?.last_name) {
      userIdentifier = `${userProfile.first_name}_${userProfile.last_name}`
        .replace(/[^a-zA-Z0-9\-_]/g, '_')
        .substring(0, 20);
    }
    
    // Generate timestamp for uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    return `statement_${userIdentifier}_${startDateStr}_to_${endDateStr}_${timestamp}.pdf`;
  }

  /**
   * Enhanced download mechanism with retry functionality and comprehensive error handling
   * Requirements: 2.5, 4.3
   */
  async downloadPDF(
    statementData: StatementData, 
    userProfile?: UserProfile,
    options?: DownloadOptions
  ): Promise<DownloadResult> {
    try {
      // Create PDF blob
      const pdfBlob = await this.createPDF(statementData, userProfile);
      
      // Generate descriptive filename with user identifier
      const filename = this.generateFilename(statementData, userProfile);
      
      // Use enhanced download manager with retry mechanism
      const result = await DownloadManager.downloadBlob(pdfBlob, filename, {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        onProgress: (attempt, maxAttempts) => {
          console.log(`Download attempt ${attempt}/${maxAttempts}`);
        },
        onRetry: (attempt, error) => {
          console.warn(`Download attempt ${attempt} failed, retrying:`, error.message);
        },
        ...options
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Download failed');
      }
      
      console.log(`PDF downloaded successfully after ${result.attempts} attempt(s)`);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
      console.error("Error downloading PDF:", errorMessage);
      
      return {
        success: false,
        error: `Failed to download PDF: ${errorMessage}`,
        attempts: 1
      };
    }
  }

  /**
   * Legacy download method for backward compatibility
   * Requirements: 2.5, 4.3
   */
  async downloadPDFLegacy(
    statementData: StatementData, 
    userProfile?: UserProfile
  ): Promise<void> {
    const result = await this.downloadPDF(statementData, userProfile);
    
    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }
  }
}

// Export a singleton instance
export const statementPDFGenerator = new StatementPDFGenerator();