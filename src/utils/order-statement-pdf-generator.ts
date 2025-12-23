import jsPDF from "jspdf";
import "jspdf-autotable";
import { OrderStatementData, OrderStatementRecord } from "@/types/orderStatement";

// Extend the jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => void;
  lastAutoTable: {
    finalY: number;
  };
}

// Professional color scheme - Emerald/Teal theme (matching statement-pdf-generator)
const COLORS = {
  primary: [16, 185, 129] as [number, number, number],      // Emerald-500
  primaryDark: [5, 150, 105] as [number, number, number],   // Emerald-600
  secondary: [20, 184, 166] as [number, number, number],    // Teal-500
  accent: [245, 158, 11] as [number, number, number],       // Amber-500
  danger: [239, 68, 68] as [number, number, number],        // Red-500
  success: [34, 197, 94] as [number, number, number],       // Green-500
  warning: [251, 191, 36] as [number, number, number],      // Amber-400
  dark: [31, 41, 55] as [number, number, number],           // Gray-800
  medium: [107, 114, 128] as [number, number, number],      // Gray-500
  light: [243, 244, 246] as [number, number, number],       // Gray-100
  white: [255, 255, 255] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],         // Blue-500
};

/**
 * Format currency amounts
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * OrderPDFGenerator class for creating professional PDF documents from order statement data
 */
export class OrderPDFGenerator {
  private margin = 12;

  /**
   * Create professional PDF document from order statement data in landscape orientation
   */
  async createPDF(statementData: OrderStatementData): Promise<Blob> {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      }) as jsPDFWithAutoTable;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Add header with gradient effect
      this.addHeaderGradient(doc, pageWidth);

      // Add logo and company info
      await this.addCompanyHeader(doc, pageWidth);

      // Add statement info
      this.addStatementInfo(doc, statementData, pageWidth);

      // Add customer info section
      this.addCustomerSection(doc, statementData, pageWidth);

      // Add summary cards
      this.addSummaryCards(doc, statementData, pageWidth);

      // Add order table with aging
      this.addOrderTable(doc, statementData, pageWidth);

      // Add totals section
      this.addTotalsSection(doc, statementData, pageWidth);

      // Add footer
      this.addFooter(doc, pageWidth, pageHeight);

      // Convert to blob and return
      const pdfBlob = doc.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error("Error creating order statement PDF:", error);
      throw new Error(`Failed to create order statement PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add gradient header bar
   */
  private addHeaderGradient(doc: jsPDFWithAutoTable, pageWidth: number): void {
    // Main header bar
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');
    
    // Accent stripe
    doc.setFillColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    doc.rect(0, 28, pageWidth, 2, 'F');
  }

  /**
   * Add company logo and header info
   */
  private async addCompanyHeader(doc: jsPDFWithAutoTable, pageWidth: number): Promise<void> {
    // Try to add logo
    try {
      const logo = new Image();
      logo.src = "/logoFul.png";
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
        setTimeout(reject, 2000);
      });
      
      const logoHeight = 14;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", this.margin, 6, logoWidth, logoHeight);
    } catch (logoError) {
      // Fallback: Add company name as text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      doc.text("9RX", this.margin, 16);
    }

    // Company tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("Your Trusted Pharmacy Partner", this.margin, 24);
  }

  /**
   * Add statement title and reference info
   */
  private addStatementInfo(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number
  ): void {
    // Statement title on right side of header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.text("CUSTOMER STATEMENT", pageWidth - this.margin, 12, { align: "right" });

    // Statement reference
    const statementRef = `CS-${Date.now().toString().slice(-8)}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Ref: ${statementRef}`, pageWidth - this.margin, 18, { align: "right" });

    // Aging date
    const agingDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    doc.text(`Aging Date: ${agingDate}`, pageWidth - this.margin, 24, { align: "right" });
  }

  /**
   * Add customer information section
   */
  private addCustomerSection(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number
  ): void {
    const sectionY = 34;
    const boxWidth = 80;

    // Customer Info Box
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.roundedRect(this.margin, sectionY, boxWidth, 22, 2, 2, 'F');

    // Customer Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("CUSTOMER", this.margin + 4, sectionY + 6);

    // Customer details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    const customerName = statementData.userInfo?.company_name || 
      `${statementData.userInfo?.first_name || ''} ${statementData.userInfo?.last_name || ''}`.trim() || 
      'Customer';
    doc.text(customerName, this.margin + 4, sectionY + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
    doc.text(statementData.userInfo?.email || "N/A", this.margin + 4, sectionY + 18);

    // Contact Info Box
    const contactBoxX = this.margin + boxWidth + 8;
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.roundedRect(contactBoxX, sectionY, boxWidth, 22, 2, 2, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("CONTACT", contactBoxX + 4, sectionY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.text("9RX Pharmacy Solutions", contactBoxX + 4, sectionY + 13);
    doc.setFontSize(8);
    doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
    doc.text("Phone: +1 (800) 969-6295", contactBoxX + 4, sectionY + 18);
  }

  /**
   * Add summary cards
   */
  private addSummaryCards(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number
  ): void {
    const cardY = 34;
    const cardWidth = 42;
    const cardHeight = 22;
    const startX = pageWidth - this.margin - (cardWidth * 3 + 10);

    const summaryData = [
      { label: "Total Orders", value: statementData.summary.totalOrders.toString(), isAmount: false, color: COLORS.blue },
      { label: "Total Amount", value: formatCurrency(statementData.summary.totalAmount), isAmount: true, color: COLORS.dark },
      { label: "Total Pending", value: formatCurrency(statementData.summary.totalPending), isAmount: true, color: statementData.summary.totalPending > 0 ? COLORS.danger : COLORS.success },
    ];

    summaryData.forEach((item, index) => {
      const cardX = startX + (cardWidth + 5) * index;

      // Card background
      doc.setFillColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      // Top accent line
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(cardX, cardY, cardWidth, 2, 'F');

      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
      doc.text(item.label, cardX + cardWidth / 2, cardY + 8, { align: "center" });

      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(item.isAmount ? 9 : 12);
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.text(item.value, cardX + cardWidth / 2, cardY + 16, { align: "center" });
    });
  }

  /**
   * Add order table with aging columns
   */
  private addOrderTable(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number
  ): void {
    const tableStartY = 60;

    // Table headers with aging buckets
    const tableHead = [[
      "#",
      "Date",
      "Due Date", 
      "Order #",
      "Days Late",
      "Original",
      "Paid",
      "Balance",
      "Current",
      "1-7",
      "8-14",
      "15-21",
      "22-28",
      "29+"
    ]];

    // Prepare table data with aging buckets
    const tableBody: string[][] = [];
    let totalOriginal = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let aging0 = 0, aging1_7 = 0, aging8_14 = 0, aging15_21 = 0, aging22_28 = 0, aging29Plus = 0;

    if (statementData.orders.length === 0) {
      tableBody.push([
        "-", "-", "-", "No orders found for this period", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"
      ]);
    } else {
      statementData.orders.forEach((order: OrderStatementRecord, index: number) => {
        const orderDate = new Date(order.orderDate).toLocaleDateString("en-US", {
          month: "2-digit", day: "2-digit", year: "2-digit"
        });

        const dueDate = new Date(order.orderDate);
        dueDate.setDate(dueDate.getDate() + 30);
        const formattedDueDate = dueDate.toLocaleDateString("en-US", {
          month: "2-digit", day: "2-digit", year: "2-digit"
        });

        const today = new Date();
        const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        const originalAmount = order.orderAmount;
        const paidAmount = order.paidAmount;
        const balanceDue = order.pendingAmount;

        totalOriginal += originalAmount;
        totalPaid += paidAmount;
        totalBalance += balanceDue;

        // Determine aging bucket
        let age0 = "", age1_7 = "", age8_14 = "", age15_21 = "", age22_28 = "", age29Plus = "";

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
          (index + 1).toString(),
          orderDate,
          formattedDueDate,
          order.orderNumber,
          daysPastDue > 0 ? daysPastDue.toString() : "-",
          formatCurrency(originalAmount),
          formatCurrency(paidAmount),
          formatCurrency(balanceDue),
          age0 || "-",
          age1_7 || "-",
          age8_14 || "-",
          age15_21 || "-",
          age22_28 || "-",
          age29Plus || "-"
        ]);
      });
    }

    // Create table
    doc.autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY,
      styles: {
        fontSize: 7,
        cellPadding: 2,
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
        cellPadding: 3
      },
      bodyStyles: {
        fillColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },    // #
        1: { cellWidth: 18, halign: "center" },   // Date
        2: { cellWidth: 18, halign: "center" },   // Due Date
        3: { cellWidth: 22, halign: "left" },     // Order #
        4: { cellWidth: 14, halign: "center" },   // Days Late
        5: { cellWidth: 22, halign: "right" },    // Original
        6: { cellWidth: 22, halign: "right", textColor: COLORS.success },  // Paid
        7: { cellWidth: 22, halign: "right", fontStyle: "bold" },          // Balance
        8: { cellWidth: 18, halign: "right" },    // Current
        9: { cellWidth: 18, halign: "right" },    // 1-7
        10: { cellWidth: 18, halign: "right" },   // 8-14
        11: { cellWidth: 18, halign: "right" },   // 15-21
        12: { cellWidth: 18, halign: "right" },   // 22-28
        13: { cellWidth: 18, halign: "right", textColor: COLORS.danger },  // 29+
      },
      margin: { left: this.margin, right: this.margin },
      showHead: "everyPage",
      didDrawPage: (data: any) => {
        if (data.pageNumber > 1) {
          doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
          doc.rect(0, 0, pageWidth, 12, 'F');
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text("CUSTOMER STATEMENT (Continued)", this.margin, 8);
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.text(`Page ${data.pageNumber}`, pageWidth - this.margin, 8, { align: "right" });
        }
      }
    });

    // Store totals for summary
    (doc as any)._statementTotals = {
      totalOriginal, totalPaid, totalBalance,
      aging0, aging1_7, aging8_14, aging15_21, aging22_28, aging29Plus
    };
  }

  /**
   * Add totals section
   */
  private addTotalsSection(
    doc: jsPDFWithAutoTable,
    statementData: OrderStatementData,
    pageWidth: number
  ): void {
    const finalY = doc.lastAutoTable.finalY + 8;
    const totals = (doc as any)._statementTotals || {
      totalOriginal: statementData.summary.totalAmount,
      totalPaid: statementData.summary.totalPaid,
      totalBalance: statementData.summary.totalPending
    };

    // Summary section title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("SUMMARY", this.margin, finalY);

    // Summary box
    const summaryBoxWidth = 100;
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.roundedRect(this.margin, finalY + 3, summaryBoxWidth, 28, 2, 2, 'F');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);

    let rowY = finalY + 10;
    doc.text("Total Orders:", this.margin + 5, rowY);
    doc.text(statementData.summary.totalOrders.toString(), this.margin + 45, rowY);

    rowY += 6;
    doc.text("Total Amount:", this.margin + 5, rowY);
    doc.text(formatCurrency(totals.totalOriginal), this.margin + 45, rowY);

    rowY += 6;
    doc.text("Total Paid:", this.margin + 5, rowY);
    doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
    doc.text(formatCurrency(totals.totalPaid), this.margin + 45, rowY);

    rowY += 6;
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.text("Total Pending:", this.margin + 5, rowY);
    doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2]);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(totals.totalBalance), this.margin + 45, rowY);

    // Balance Due highlight box on right
    const balanceBoxWidth = 80;
    const balanceBoxX = pageWidth - this.margin - balanceBoxWidth;
    
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.roundedRect(balanceBoxX, finalY + 3, balanceBoxWidth, 28, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.text("BALANCE DUE", balanceBoxX + balanceBoxWidth / 2, finalY + 14, { align: "center" });

    doc.setFontSize(16);
    doc.text(formatCurrency(totals.totalBalance), balanceBoxX + balanceBoxWidth / 2, finalY + 25, { align: "center" });
  }

  /**
   * Add footer
   */
  private addFooter(
    doc: jsPDFWithAutoTable,
    pageWidth: number,
    pageHeight: number
  ): void {
    const footerY = pageHeight - 12;

    // Footer line
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(this.margin, footerY, pageWidth - this.margin, footerY);

    // Company info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
    doc.text("9RX LLC | 936 Broad River Ln, Charlotte, NC 28211 | +1 (800) 969-6295 | info@9rx.com", pageWidth / 2, footerY + 4, { align: "center" });

    // Generated timestamp
    doc.setFontSize(6);
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`,
      pageWidth / 2,
      footerY + 8,
      { align: "center" }
    );
  }
}

// Export a singleton instance
export const orderPDFGenerator = new OrderPDFGenerator();
