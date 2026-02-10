import jsPDF from "jspdf";
import "jspdf-autotable";
import { StatementData, StatementTransaction } from "@/services/statementService";
import { DownloadManager, DownloadOptions, DownloadResult } from "./download-manager";
import Logo from "../assests/home/9rx_logo.png"

// Extend the jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => void;
  lastAutoTable: {
    finalY: number;
  };
}

// User profile interface for header information
interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  billing_address?: any;
  shipping_address?: any;
}

// Professional color scheme - Blue theme
const COLORS = {
  primary: [59, 130, 246] as [number, number, number],      // Blue-500
  primaryDark: [37, 99, 235] as [number, number, number],   // Blue-600
  secondary: [96, 165, 250] as [number, number, number],    // Blue-400
  accent: [245, 158, 11] as [number, number, number],       // Amber-500
  danger: [239, 68, 68] as [number, number, number],        // Red-500
  success: [34, 197, 94] as [number, number, number],       // Green-500
  dark: [31, 41, 55] as [number, number, number],           // Gray-800
  medium: [107, 114, 128] as [number, number, number],      // Gray-500
  light: [243, 244, 246] as [number, number, number],       // Gray-100
  white: [255, 255, 255] as [number, number, number],
};

/**
 * StatementPDFGenerator class for creating professional PDF statements
 */
export class StatementPDFGenerator {
  private margin = 15;

  constructor() {}

  /**
   * Create professional PDF document from statement data
   */
  async createPDF(statementData: StatementData, userProfile?: UserProfile): Promise<Blob> {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      }) as jsPDFWithAutoTable;

      const pageWidth = doc.internal.pageSize.getWidth();

      // Add header with gradient effect
      this.addHeaderGradient(doc, pageWidth);

      // Add logo and company info
      await this.addCompanyHeader(doc, pageWidth);

      // Add statement title and info
      this.addStatementInfo(doc, statementData, userProfile, pageWidth);

      // Add separator line after heading
      this.addHeaderSeparator(doc, pageWidth);

      // Add customer info section
      this.addCustomerSection(doc, userProfile, pageWidth);

      // Add account summary cards
      this.addAccountSummaryCards(doc, statementData, pageWidth);

      // Add transaction table
      this.addTransactionTable(doc, statementData, pageWidth);

      // Add totals section
      this.addTotalsSection(doc, statementData, pageWidth);

      // Add footer and page numbers to all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();

        // Footer line
        const footerY = pdfHeight - 30;
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setLineWidth(0.5);
        doc.line(this.margin, footerY, pdfWidth - this.margin, footerY);

        // Company info
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
        doc.text("9RX LLC | 936 Broad River Ln, Charlotte, NC 28211 | +1 (800) 969-6295 | info@9rx.com", pdfWidth / 2, footerY + 5, { align: "center" });

        // Generated timestamp
        doc.setFontSize(7);
        doc.text(
          `Generated on ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`,
          pdfWidth / 2,
          footerY + 10,
          { align: "center" }
        );

        // Thank you message
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text("Thank you for your business!", pdfWidth / 2, pdfHeight - 12, { align: "center" });

        // Page number text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
        doc.text(`Page ${i} of ${totalPages}`, pdfWidth / 2, pdfHeight - 6, { align: "center" });

        // Footer band
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(0, pdfHeight - 2, pdfWidth, 2, "F");
      }

      // Convert to blob and return
      const pdfBlob = doc.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error("Error creating PDF:", error);
      throw new Error(`Failed to create PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add small blue line at top instead of full header background
   */
  private addHeaderGradient(doc: jsPDFWithAutoTable, pageWidth: number): void {
    // Small blue line at the very top (3mm height)
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');
  }

  /**
   * Add company logo and header info
   */
  private async addCompanyHeader(doc: jsPDFWithAutoTable, pageWidth: number): Promise<void> {
    // Try to add logo
    try {
      const logo = new Image();
      logo.src = Logo;
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
        setTimeout(reject, 3000);
      });
      
      const logoHeight = 18;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", this.margin, 8, logoWidth, logoHeight);
    } catch (logoError) {
      // Fallback: Add company name as text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
      doc.text("9RX", this.margin, 22);
    }

    // Company tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
    doc.text("Your Trusted Pharmacy Partner", this.margin, 30);
  }

  /**
   * Add statement title and reference info
   */
  private addStatementInfo(
    doc: jsPDFWithAutoTable,
    statementData: StatementData,
    userProfile: UserProfile | undefined,
    pageWidth: number
  ): void {
    // Statement title on right side of header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("ACCOUNT STATEMENT", pageWidth - this.margin, 18, { align: "right" });

    // Statement reference
    const statementRef = `STMT-${userProfile?.id?.substring(0, 6).toUpperCase() || 'XXX'}-${Date.now().toString().slice(-6)}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
    doc.text(`Ref: ${statementRef}`, pageWidth - this.margin, 25, { align: "right" });

    // Date range
    const startDateStr = statementData.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const endDateStr = statementData.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    doc.text(`${startDateStr} - ${endDateStr}`, pageWidth - this.margin, 31, { align: "right" });
  }

  /**
   * Add separator line after header section
   */
  private addHeaderSeparator(doc: jsPDFWithAutoTable, pageWidth: number): void {
    const separatorY = 38;
    doc.setDrawColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setLineWidth(0.5);
    doc.line(this.margin, separatorY, pageWidth - this.margin, separatorY);
  }

  /**
   * Add customer information section
   */
  private addCustomerSection(
    doc: jsPDFWithAutoTable,
    userProfile: UserProfile | undefined,
    pageWidth: number
  ): void {
    const sectionY = 45;
    const boxWidth = (pageWidth - this.margin * 3) / 2;

    // Bill To Box
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.roundedRect(this.margin, sectionY, boxWidth, 32, 3, 3, 'F');

    // Bill To Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("BILL TO", this.margin + 5, sectionY + 8);

    // Customer details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    const displayName = userProfile?.company_name || 
      `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 
      'Customer';
    doc.text(displayName, this.margin + 5, sectionY + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
    doc.text(userProfile?.email || "N/A", this.margin + 5, sectionY + 22);
    doc.text(userProfile?.phone || "N/A", this.margin + 5, sectionY + 27);

    // Statement Details Box
    const rightBoxX = this.margin * 2 + boxWidth;
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.roundedRect(rightBoxX, sectionY, boxWidth, 32, 3, 3, 'F');

    // Statement Details Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("STATEMENT DETAILS", rightBoxX + 5, sectionY + 8);

    // Details content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    
    doc.text("Statement Date:", rightBoxX + 5, sectionY + 16);
    doc.text(new Date().toLocaleDateString("en-US"), rightBoxX + 40, sectionY + 16);
    
    doc.text("Account ID:", rightBoxX + 5, sectionY + 22);
    doc.text(userProfile?.id?.substring(0, 12) || 'N/A', rightBoxX + 40, sectionY + 22);
    
    doc.text("Currency:", rightBoxX + 5, sectionY + 27);
    doc.text("USD", rightBoxX + 40, sectionY + 27);
  }

  /**
   * Add account summary cards
   */
  private addAccountSummaryCards(
    doc: jsPDFWithAutoTable,
    statementData: StatementData,
    pageWidth: number
  ): void {
    const cardY = 82;
    const cardWidth = (pageWidth - this.margin * 2 - 15) / 4;
    const cardHeight = 22;

    const summaryData = [
      { label: "Opening Balance", value: statementData.openingBalance, color: COLORS.medium },
      { label: "Total Purchases", value: statementData.totalPurchases, color: COLORS.danger },
      { label: "Total Payments", value: statementData.totalPayments, color: COLORS.success },
      { label: "Closing Balance", value: statementData.closingBalance, color: statementData.closingBalance > 0 ? COLORS.danger : COLORS.success },
    ];

    summaryData.forEach((item, index) => {
      const cardX = this.margin + (cardWidth + 5) * index;

      // Card background
      doc.setFillColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      // Top accent line
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(cardX, cardY, cardWidth, 2, 'F');

      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
      doc.text(item.label, cardX + cardWidth / 2, cardY + 9, { align: "center" });

      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.text(this.formatCurrency(item.value), cardX + cardWidth / 2, cardY + 17, { align: "center" });
    });
  }

  /**
   * Add transaction table
   */
  private addTransactionTable(
    doc: jsPDFWithAutoTable,
    statementData: StatementData,
    pageWidth: number
  ): void {
    const tableStartY = 110;

    // Section title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.text("TRANSACTION HISTORY", this.margin, tableStartY);

    // Table headers
    const tableHead = [["#", "Date", "Description", "Reference", "Debit", "Credit", "Balance"]];

    // Prepare table data
    const tableBody: (string | number)[][] = [];

    if (statementData.transactions.length === 0) {
      tableBody.push([
        "-",
        "-",
        "No transactions found for this period",
        "-",
        "-",
        "-",
        this.formatCurrency(statementData.openingBalance)
      ]);
    } else {
      statementData.transactions.forEach((transaction: StatementTransaction, index: number) => {
        const formattedDate = new Date(transaction.transaction_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });

        const debitAmount = transaction.debit_amount > 0 ? this.formatCurrency(transaction.debit_amount) : "-";
        const creditAmount = transaction.credit_amount > 0 ? this.formatCurrency(transaction.credit_amount) : "-";
        const balance = this.formatCurrency(transaction.balance);

        tableBody.push([
          (index + 1).toString(),
          formattedDate,
          transaction.description || "Transaction",
          transaction.id?.substring(0, 8).toUpperCase() || "-",
          debitAmount,
          creditAmount,
          balance
        ]);
      });
    }

    // Create table
    doc.autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY + 5,
      styles: { 
        fontSize: 8,
        cellPadding: 4,
        textColor: [60, 60, 60],
        lineWidth: 0.1,
        lineColor: [220, 220, 220]
      },
      theme: "plain",
      headStyles: { 
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
        halign: "center",
        cellPadding: 5
      },
      bodyStyles: {
        fillColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },   // #
        1: { cellWidth: 28, halign: "center" },   // Date
        2: { cellWidth: "*", minCellWidth: 50 },  // Description
        3: { cellWidth: 22, halign: "center" },   // Reference
        4: { cellWidth: 25, halign: "right", textColor: COLORS.danger },   // Debit
        5: { cellWidth: 25, halign: "right", textColor: COLORS.success },  // Credit
        6: { cellWidth: 28, halign: "right", fontStyle: "bold" }           // Balance
      },
      margin: { top: 20, bottom: 35, left: this.margin, right: this.margin },
      showHead: 'everyPage',
      didDrawPage: (data: any) => {
        if (data.pageNumber > 1) {
          // Add small blue line at top of continuation pages
          doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
          doc.rect(0, 0, pageWidth, 3, 'F');

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
          doc.text("ACCOUNT STATEMENT (Continued)", this.margin, 12);
        }
      }
    });
  }

  /**
   * Add totals section
   */
  private addTotalsSection(
    doc: jsPDFWithAutoTable,
    statementData: StatementData,
    pageWidth: number
  ): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    let finalY = doc.lastAutoTable.finalY + 10;
    const totalsWidth = 90;
    const totalsX = pageWidth - this.margin - totalsWidth;
    const totalsHeight = 55; // Total height needed for the totals section + badge

    // Check if there's enough space on the current page for the totals section
    if (finalY + totalsHeight > pageHeight - 35) {
      doc.addPage();
      // Add blue header line on new page
      doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.rect(0, 0, pageWidth, 3, 'F');
      finalY = 20;
    }

    // Totals box
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.roundedRect(totalsX, finalY, totalsWidth, 45, 3, 3, 'F');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);

    let rowY = finalY + 10;
    const labelX = totalsX + 5;
    const valueX = totalsX + totalsWidth - 5;

    // Opening Balance
    doc.text("Opening Balance:", labelX, rowY);
    doc.text(this.formatCurrency(statementData.openingBalance), valueX, rowY, { align: "right" });
    rowY += 7;

    // Total Debits
    doc.text("Total Debits:", labelX, rowY);
    doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2]);
    doc.text(this.formatCurrency(statementData.totalPurchases), valueX, rowY, { align: "right" });
    rowY += 7;

    // Total Credits
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.text("Total Credits:", labelX, rowY);
    doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
    doc.text(this.formatCurrency(statementData.totalPayments), valueX, rowY, { align: "right" });
    rowY += 10;

    // Closing Balance (highlighted)
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.roundedRect(totalsX, rowY - 3, totalsWidth, 12, 2, 2, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.text("CLOSING BALANCE:", labelX, rowY + 5);
    doc.text(this.formatCurrency(statementData.closingBalance), valueX, rowY + 5, { align: "right" });

    // Payment status badge
    if (statementData.closingBalance > 0) {
      const badgeY = finalY + 50;
      doc.setFillColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2]);
      doc.roundedRect(totalsX + totalsWidth - 35, badgeY, 35, 8, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("BALANCE DUE", totalsX + totalsWidth - 17.5, badgeY + 5.5, { align: "center" });
    }
  }

  /**
   * Format currency amounts
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
   * Generate filename
   */
  generateFilename(statementData: StatementData, userProfile?: UserProfile): string {
    const startDateStr = statementData.startDate.toISOString().split('T')[0];
    const endDateStr = statementData.endDate.toISOString().split('T')[0];
    
    let userIdentifier = statementData.userId;
    if (userProfile?.company_name) {
      userIdentifier = userProfile.company_name
        .replace(/[^a-zA-Z0-9\-_]/g, '_')
        .substring(0, 20);
    } else if (userProfile?.first_name && userProfile?.last_name) {
      userIdentifier = `${userProfile.first_name}_${userProfile.last_name}`
        .replace(/[^a-zA-Z0-9\-_]/g, '_')
        .substring(0, 20);
    }
    
    return `Statement_${userIdentifier}_${startDateStr}_to_${endDateStr}.pdf`;
  }

  /**
   * Download PDF with retry functionality
   */
  async downloadPDF(
    statementData: StatementData, 
    userProfile?: UserProfile,
    options?: DownloadOptions
  ): Promise<DownloadResult> {
    try {
      const pdfBlob = await this.createPDF(statementData, userProfile);
      const filename = this.generateFilename(statementData, userProfile);
      
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
