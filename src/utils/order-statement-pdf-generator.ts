import jsPDF from "jspdf";
import "jspdf-autotable";
import { OrderStatementData, OrderStatementRecord } from "@/types/orderStatement";
import { ORDER_PDF_CONFIG, formatCurrency, PDF_COLORS, PDF_FONTS, TABLE_STYLES } from "./orderPDFConfig";

// Extend the jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => void;
  lastAutoTable: {
    finalY: number;
  };
}

/**
 * OrderPDFGenerator class for creating landscape-oriented PDF documents from order statement data
 * Requirements: 2.1, 2.2, 2.4, 6.1, 6.2, 6.3, 6.4
 */
export class OrderPDFGenerator {
  /**
   * Create PDF document from order statement data in landscape orientation
   * Requirements: 2.1, 2.2, 2.4, 6.1, 6.2, 6.3, 6.4
   */
  async createPDF(statementData: OrderStatementData): Promise<Blob> {
    try {
      // Initialize PDF document in landscape orientation (Requirement 2.1, 6.3)
      const doc = new jsPDF({
        orientation: ORDER_PDF_CONFIG.orientation,
        unit: ORDER_PDF_CONFIG.unit,
        format: ORDER_PDF_CONFIG.format,
      }) as jsPDFWithAutoTable;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const { margins } = ORDER_PDF_CONFIG;

      // Add professional header with company logo, business name, and contact information
      // Requirements: 2.1, 2.2, 6.1, 6.2
      await this.addHeader(doc, statementData, pageWidth, margins);

      // Add "ORDER STATEMENT" title with date range display
      // Requirements: 2.2, 6.2
      this.addStatementTitle(doc, statementData, pageWidth, margins);

      // Add order table with proper formatting and alternating row colors
      // Requirements: 2.4, 6.3, 6.4
      this.addOrderTable(doc, statementData, pageWidth, margins);

      // Add summary section with totals
      // Requirements: 6.5
      this.addSummarySection(doc, statementData, pageWidth, margins);

      // Convert to blob and return
      const pdfBlob = doc.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error("Error creating order statement PDF:", error);
      throw new Error(`Failed to create order statement PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add professional header with company logo, business name, and contact information
   * Requirements: 2.1, 2.2, 6.1, 6.2
   */
  private async addHeader(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number,
    margins: { top: number; right: number; bottom: number; left: number }
  ): Promise<void> {
    try {
      // Add company logo on the left (Requirement 2.2, 6.1)
      try {
        const logo = new Image();
        logo.src = ORDER_PDF_CONFIG.header.logoPath;
        
        // Add timeout to prevent hanging in test environments
        await Promise.race([
          new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Logo load timeout')), 2000)
          )
        ]);

        const logoHeight = 15;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        doc.addImage(
          logo,
          "PNG",
          margins.left,
          margins.top,
          logoWidth,
          logoHeight
        );
      } catch (logoError) {
        console.warn("Could not load logo:", logoError);
        // Continue without logo if it fails to load
      }

      // Add "CUSTOMER STATEMENT" title on the right (Requirement 2.2, 6.2)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("CUSTOMER STATEMENT", pageWidth - margins.right, margins.top + 5, {
        align: "right",
      });

      // Add company address below title on the right
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80);
      const addressLines = [
        "4300 Pleasantdale Rd, Atlanta, GA 30340, USA",
        "Chamblee, GA 30341",
        "Phone: +1 410 659 0123"
      ];
      
      let yPos = margins.top + 10;
      addressLines.forEach(line => {
        doc.text(line, pageWidth - margins.right, yPos, { align: "right" });
        yPos += 4;
      });

      // Add Contact info below address
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(
        `Contact: ${ORDER_PDF_CONFIG.header.companyName}`,
        pageWidth - margins.right,
        yPos,
        { align: "right" }
      );

    } catch (error) {
      console.error("Error adding header:", error);
      throw error;
    }
  }

  /**
   * Add "ORDER STATEMENT" title with date range display
   * Requirements: 2.2, 6.2
   */
  private addStatementTitle(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number,
    margins: { top: number; right: number; bottom: number; left: number }
  ): void {
    // Add "Aging Date:" label and date on the left
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(40);
    
    const agingDate = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    
    doc.text(`Aging Date:`, margins.left, margins.top + 30);
    doc.setFont("helvetica", "normal");
    doc.text(agingDate, margins.left + 22, margins.top + 30);

    // Add "Contact:" label on the left below aging date
    doc.setFont("helvetica", "bold");
    doc.text(`Contact:`, margins.left, margins.top + 36);
    doc.setFont("helvetica", "normal");
    doc.text(ORDER_PDF_CONFIG.header.companyName, margins.left + 22, margins.top + 36);

    // Add user/pharmacy info on the right if available
    if (statementData.userInfo) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(
        `Phone: +1 410 659 0123`,
        pageWidth - margins.right,
        margins.top + 30,
        { align: "right" }
      );
    }
  }

  /**
   * Add order table with aging columns matching reference image
   * Columns: Posting Date, Due Date, Document, Days Past Due, Original Amount, Applied Amount, 
   * Balance Due, Cum Bal, 0, 1-7, 8-14, 15-21, 22-28, 29+
   * Requirements: 2.4, 6.3, 6.4
   */
  private addOrderTable(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number,
    margins: { top: number; right: number; bottom: number; left: number }
  ): void {
    const tableStartY = ORDER_PDF_CONFIG.table.startY;

    // Table headers matching reference image (Requirement 2.4, 6.3)
    const tableHead = [[
      "Posting Date",
      "Due Date", 
      "Document",
      "Days Past Due",
      "Original Amount",
      "Applied Amount",
      "Balance Due",
      "Cum Bal",
      "0",
      "1 - 7",
      "8 - 14",
      "15 - 21",
      "22 - 28",
      "29+"
    ]];

    // Prepare table data with aging buckets (Requirement 2.3, 2.4)
    const tableBody: string[][] = [];
    let totalOriginal = 0;
    let totalApplied = 0;
    let totalBalance = 0;
    let totalCumBal = 0;
    let aging0 = 0;
    let aging1_7 = 0;
    let aging8_14 = 0;
    let aging15_21 = 0;
    let aging22_28 = 0;
    let aging29Plus = 0;

    if (statementData.orders.length === 0) {
      // Handle edge case for periods with no orders (Requirement 3.4)
      tableBody.push([
        "No orders found for this period",
        "", "", "", "", "", "", "", "", "", "", "", "", ""
      ]);
    } else {
      statementData.orders.forEach((order: OrderStatementRecord) => {
        const postingDate = new Date(order.orderDate).toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        });

        // Calculate due date (assuming 30 days from order date)
        const dueDate = new Date(order.orderDate);
        dueDate.setDate(dueDate.getDate() + 30);
        const formattedDueDate = dueDate.toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        });

        // Calculate days past due
        const today = new Date();
        const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        // Format amounts
        const originalAmount = order.orderAmount;
        const appliedAmount = order.paidAmount;
        const balanceDue = order.pendingAmount;

        // Accumulate totals
        totalOriginal += originalAmount;
        totalApplied += appliedAmount;
        totalBalance += balanceDue;
        totalCumBal += balanceDue;

        // Determine aging bucket for balance due
        let age0 = "$0.00", age1_7 = "$0.00", age8_14 = "$0.00";
        let age15_21 = "$0.00", age22_28 = "$0.00", age29Plus = "$0.00";

        if (balanceDue > 0) {
          if (daysPastDue === 0) {
            age0 = formatCurrency(balanceDue);
            aging0 += balanceDue;
          } else if (daysPastDue <= 7) {
            age1_7 = formatCurrency(balanceDue);
            aging1_7 += balanceDue;
          } else if (daysPastDue <= 14) {
            age8_14 = formatCurrency(balanceDue);
            aging8_14 += balanceDue;
          } else if (daysPastDue <= 21) {
            age15_21 = formatCurrency(balanceDue);
            aging15_21 += balanceDue;
          } else if (daysPastDue <= 28) {
            age22_28 = formatCurrency(balanceDue);
            aging22_28 += balanceDue;
          } else {
            age29Plus = formatCurrency(balanceDue);
            aging29Plus += balanceDue;
          }
        }

        tableBody.push([
          postingDate,
          formattedDueDate,
          order.orderNumber,
          daysPastDue.toString(),
          formatCurrency(originalAmount),
          formatCurrency(appliedAmount),
          formatCurrency(balanceDue),
          formatCurrency(totalCumBal),
          age0,
          age1_7,
          age8_14,
          age15_21,
          age22_28,
          age29Plus
        ]);
      });

      // Add Total row
      tableBody.push([
        "Total:",
        "",
        "",
        "",
        formatCurrency(totalOriginal),
        formatCurrency(totalApplied),
        formatCurrency(totalBalance),
        formatCurrency(totalCumBal),
        formatCurrency(aging0),
        formatCurrency(aging1_7),
        formatCurrency(aging8_14),
        formatCurrency(aging15_21),
        formatCurrency(aging22_28),
        formatCurrency(aging29Plus)
      ]);

      // Add Aging % row
      const total = totalBalance || 1; // Avoid division by zero
      tableBody.push([
        "Aging %",
        "",
        "",
        "",
        "100%",
        "",
        "100%",
        "100.00%",
        `${((aging0 / total) * 100).toFixed(2)}%`,
        `${((aging1_7 / total) * 100).toFixed(2)}%`,
        `${((aging8_14 / total) * 100).toFixed(2)}%`,
        `${((aging15_21 / total) * 100).toFixed(2)}%`,
        `${((aging22_28 / total) * 100).toFixed(2)}%`,
        `${((aging29Plus / total) * 100).toFixed(2)}%`
      ]);
    }

    // Create table with proper formatting (Requirements: 2.4, 6.3, 6.4)
    doc.autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: TABLE_STYLES.textColor,
        lineWidth: TABLE_STYLES.lineWidth,
        lineColor: TABLE_STYLES.borderColor,
      },
      theme: "grid",
      headStyles: {
        fillColor: [65, 105, 225], // Blue header
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: 7,
      },
      bodyStyles: {
        textColor: this.hexToRgb(TABLE_STYLES.textColor),
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 18 },  // Posting Date
        1: { halign: "center", cellWidth: 18 },  // Due Date
        2: { halign: "left", cellWidth: 20 },    // Document
        3: { halign: "center", cellWidth: 12 },  // Days Past Due
        4: { halign: "right", cellWidth: 20 },   // Original Amount
        5: { halign: "right", cellWidth: 20 },   // Applied Amount
        6: { halign: "right", cellWidth: 18 },   // Balance Due
        7: { halign: "right", cellWidth: 18 },   // Cum Bal
        8: { halign: "right", cellWidth: 15 },   // 0
        9: { halign: "right", cellWidth: 15 },   // 1-7
        10: { halign: "right", cellWidth: 15 },  // 8-14
        11: { halign: "right", cellWidth: 15 },  // 15-21
        12: { halign: "right", cellWidth: 15 },  // 22-28
        13: { halign: "right", cellWidth: 15 },  // 29+
      },
      tableWidth: pageWidth - margins.left - margins.right,
      margin: { left: margins.left, right: margins.right },
      showHead: "everyPage",
      didDrawPage: (data: any) => {
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
      },
    });
  }

  /**
   * Add summary section with total orders, amounts, and payment status breakdown
   * Requirements: 2.3, 3.2, 6.5
   */
  private addSummarySection(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number,
    margins: { top: number; right: number; bottom: number; left: number }
  ): void {
    const summaryY = doc.lastAutoTable.finalY + 10;

    // Add separator line
    doc.setDrawColor(180);
    doc.line(margins.left, summaryY, pageWidth - margins.right, summaryY);

    // Add summary title (Requirement 6.5)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_FONTS.subheader.size);
    doc.setTextColor(41, 128, 185);
    doc.text("Summary", margins.left, summaryY + 8);

    // Add summary data with consistent currency formatting (Requirements 2.3, 3.2, 6.5)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FONTS.body.size);
    doc.setTextColor(52, 73, 94);

    const summaryStartY = summaryY + 15;
    const rightColX = pageWidth - margins.right - 60;

    // Total Orders (Requirement 3.2, 6.5)
    doc.setFont("helvetica", "bold");
    doc.text("Total Orders:", margins.left, summaryStartY);
    doc.setFont("helvetica", "normal");
    doc.text(
      statementData.summary.totalOrders.toString(),
      margins.left + 40,
      summaryStartY
    );

    // Total Amount with consistent currency formatting (Requirements 2.3, 3.2, 6.5)
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount:", rightColX, summaryStartY);
    doc.setFont("helvetica", "normal");
    doc.text(
      formatCurrency(statementData.summary.totalAmount),
      rightColX + 40,
      summaryStartY,
      { align: "right" }
    );

    // Total Paid with consistent currency formatting (Requirements 2.3, 3.2, 6.5)
    doc.setFont("helvetica", "bold");
    doc.text("Total Paid:", rightColX, summaryStartY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(
      formatCurrency(statementData.summary.totalPaid),
      rightColX + 40,
      summaryStartY + 6,
      { align: "right" }
    );

    // Total Pending with consistent currency formatting (Requirements 2.3, 3.2, 6.5)
    doc.setFont("helvetica", "bold");
    doc.text("Total Pending:", rightColX, summaryStartY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(
      formatCurrency(statementData.summary.totalPending),
      rightColX + 40,
      summaryStartY + 12,
      { align: "right" }
    );
  }

  /**
   * Format order status for display
   */
  private formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Format payment status for display
   */
  private formatPaymentStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Convert hex color to RGB array for jsPDF
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  }
}

// Export a singleton instance
export const orderPDFGenerator = new OrderPDFGenerator();
