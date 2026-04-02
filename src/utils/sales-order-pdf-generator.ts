import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Logo from "../assests/home/9rx_logo.png";
import {
  DocumentAddressSettings,
  fetchAdminDocumentSettings,
} from "@/lib/documentSettings";

// Extend the jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => void;
  lastAutoTable: {
    finalY: number;
  };
}

// Professional blue color scheme matching your design
const COLORS = {
  primary: [40, 56, 136] as [number, number, number],     // 9RX logo blue
  primaryDark: [32, 48, 120] as [number, number, number], // darker logo blue accent
  success: [34, 197, 94] as [number, number, number],     // Green-500 (PAID badge)
  dark: [31, 41, 55] as [number, number, number],         // Gray-800 (text)
  medium: [107, 114, 128] as [number, number, number],    // Gray-500 (secondary text)
  light: [243, 244, 246] as [number, number, number],     // Gray-100 (backgrounds)
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
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

export interface SalesOrderData {
  orderNumber: string;
  date: string;
  status: "paid" | "unpaid" | "pending";
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    company_name?: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    email?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip_code: string;
    };
  };
  items: Array<{
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  shippingHandling: number;
  tax: number;
  total: number;
}

/**
 * SalesOrderPDFGenerator class for creating professional Sales Order PDFs
 */
export class SalesOrderPDFGenerator {
  private margin = 15;
  private headerBottomY = 55;

  /**
   * Create professional Sales Order PDF document
   */
  async createPDF(orderData: SalesOrderData): Promise<Blob> {
    try {
      const documentSettings = await fetchAdminDocumentSettings();

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      }) as jsPDFWithAutoTable;

      const pageWidth = doc.internal.pageSize.getWidth();
      // Add teal header
      this.addHeader(doc, pageWidth);

      // Add company info and sales order title
      await this.addCompanySection(doc, orderData, pageWidth, documentSettings.invoice);

      // Add separator line after heading
      this.addHeaderSeparator(doc, pageWidth);

      // Add Bill To and Ship To sections
      this.addAddressSections(doc, orderData, pageWidth);

      // Add items table
      this.addItemsTable(doc, orderData, pageWidth);

      // Add totals section
      this.addTotalsSection(doc, orderData, pageWidth);

      // Convert to blob and return
      const pdfBlob = doc.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error("Error creating sales order PDF:", error);
      throw new Error(`Failed to create sales order PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add small blue line at top instead of full header background
   */
  private addHeader(doc: jsPDFWithAutoTable, pageWidth: number): void {
    // Small blue line at the very top (3mm height)
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');
  }

  /**
   * Add company info and sales order title
   */
  private async addCompanySection(
    doc: jsPDFWithAutoTable,
    orderData: SalesOrderData,
    pageWidth: number,
    companySettings: DocumentAddressSettings
  ): Promise<void> {
    const headerTopY = 8;
    const contentTopY = headerTopY + 6;
    const leftColumnX = this.margin;
    const leftColumnWidth = 52;
    const rightColumnX = pageWidth - this.margin;
    const rightColumnWidth = 56;

    const addressLines = [
      companySettings.street,
      companySettings.suite,
      [companySettings.city, companySettings.state, companySettings.zipCode].filter(Boolean).join(", "),
      companySettings.country,
    ].filter(Boolean) as string[];

    let logoBottomY = contentTopY;

    // Company logo (center column)
    try {
      const logo = new Image();
      logo.src = Logo;
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
        setTimeout(reject, 2000);
      });
      
      const logoHeight = 18;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      const logoX = pageWidth / 2 - logoWidth / 2;
      doc.addImage(logo, "PNG", logoX, contentTopY, logoWidth, logoHeight);
      logoBottomY = contentTopY + logoHeight;
    } catch (logoError) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
      doc.text(companySettings.name || "9RX", pageWidth / 2, contentTopY + 10, { align: "center" });
      logoBottomY = contentTopY + 10;
    }

    // Address only (left column)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.medium[0], COLORS.medium[1], COLORS.medium[2]);
    let addressY = contentTopY + 3;
    addressLines.forEach((line) => {
      const wrappedLines = doc.splitTextToSize(line, leftColumnWidth);
      doc.text(wrappedLines, leftColumnX, addressY);
      addressY += wrappedLines.length * 4;
    });

    // Sales Order details (right column)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("SALES ORDER", rightColumnX, contentTopY + 3, { align: "right", maxWidth: rightColumnWidth });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    let detailsY = contentTopY + 12;
    doc.text(`# ${orderData.orderNumber}`, rightColumnX, detailsY, { align: "right", maxWidth: rightColumnWidth });
    detailsY += 7;
    doc.text(`Date: ${orderData.date}`, rightColumnX, detailsY, { align: "right", maxWidth: rightColumnWidth });
    detailsY += 3;

    // Status badge (right side)
    const badgeWidth = 25;
    const badgeHeight = 8;
    const badgeX = rightColumnX - badgeWidth;
    const badgeY = detailsY + 3;
    let rightBottomY = detailsY;

    if (orderData.status === "paid") {
      doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
      doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      doc.text("PAID", badgeX + badgeWidth / 2, badgeY + 5.5, { align: "center" });
      rightBottomY = badgeY + badgeHeight;
    }

    const addressBottomY = addressY;
    this.headerBottomY = Math.max(addressBottomY, logoBottomY, rightBottomY) + 8;
  }

  /**
   * Add separator line after header section
   */
  private addHeaderSeparator(doc: jsPDFWithAutoTable, pageWidth: number): void {
    doc.setDrawColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setLineWidth(0.5);
    doc.line(this.margin, this.headerBottomY, pageWidth - this.margin, this.headerBottomY);
  }

  /**
   * Add Bill To and Ship To sections
   */
  private addAddressSections(doc: jsPDFWithAutoTable, orderData: SalesOrderData, pageWidth: number): void {
    const sectionY = this.headerBottomY + 15;
    const boxWidth = (pageWidth - this.margin * 3) / 2;
    const boxHeight = 25;

    // Bill To section
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.roundedRect(this.margin, sectionY, boxWidth, boxHeight, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("BILL TO", this.margin + 5, sectionY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    
    let billY = sectionY + 14;
    if (orderData.customerInfo.company_name) {
      doc.text(orderData.customerInfo.company_name, this.margin + 5, billY);
      billY += 4;
    }
    doc.text(orderData.customerInfo.name || "dummy dummy", this.margin + 5, billY);
    billY += 4;
    doc.text(orderData.customerInfo.phone || "1234567890", this.margin + 5, billY);
    billY += 4;
    doc.text(orderData.customerInfo.email || "dummy@yopmail.com", this.margin + 5, billY);

    // Ship To section
    const shipToX = this.margin + boxWidth + this.margin;
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.roundedRect(shipToX, sectionY, boxWidth, boxHeight, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("SHIP TO", shipToX + 5, sectionY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    
    let shipY = sectionY + 14;
    doc.text(orderData.shippingAddress.fullName || "dummy dummy", shipToX + 5, shipY);
    shipY += 4;
    doc.text(orderData.shippingAddress.phone || "1234567890", shipToX + 5, shipY);
    shipY += 4;
    if (orderData.shippingAddress.address) {
      const address = orderData.shippingAddress.address;
      if (address.street) {
        doc.text(address.street, shipToX + 5, shipY);
        shipY += 4;
      }
      const cityStateZip = `${address.city || ""}, ${address.state || ""} ${address.zip_code || ""}`.trim();
      if (cityStateZip !== ",") {
        doc.text(cityStateZip, shipToX + 5, shipY);
      }
    }
  }

  /**
   * Add items table
   */
  private addItemsTable(doc: jsPDFWithAutoTable, orderData: SalesOrderData, pageWidth: number): void {
    const tableStartY = this.headerBottomY + 50;

    // Table headers
    const tableHead = [
      ["#", "Description", "Size", "Qty", "Unit Price", "Total"]
    ];

    // Table body
    const tableBody: string[][] = [];
    
    if (orderData.items && orderData.items.length > 0) {
      orderData.items.forEach((item, index) => {
        tableBody.push([
          (index + 1).toString(),
          item.name,
          item.size,
          item.quantity.toString(),
          formatCurrency(item.unitPrice),
          formatCurrency(item.total)
        ]);
      });
    } else {
      // Sample data matching your image
      tableBody.push([
        "1",
        "PUSH DOWN & TURN",
        "9 dram",
        "1",
        "$35.99",
        "$35.99"
      ]);
      tableBody.push([
        "2",
        "INSULATED SHIPPING KIT - Insulated foam box & carton 8\" x 6\" x 9\"inch",
        "Insulated foam box & carton 8\" x 6\" x 9\" inch",
        "1",
        "$55.96",
        "$55.96"
      ]);
      tableBody.push([
        "3",
        "OINTMENT JARS - 0.5OZ",
        "0.5 OZ",
        "1",
        "$37.99",
        "$37.99"
      ]);
    }

    doc.autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY,
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      theme: "grid",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },     // #
        1: { cellWidth: "*", minCellWidth: 60 },    // Description
        2: { cellWidth: 40, halign: "center" },     // Size
        3: { cellWidth: 20, halign: "center" },     // Qty
        4: { cellWidth: 25, halign: "right" },      // Unit Price
        5: { cellWidth: 25, halign: "right" },      // Total
      },
      margin: { left: this.margin, right: this.margin },
      tableWidth: pageWidth - this.margin * 2,
    });
  }

  /**
   * Add totals section
   */
  private addTotalsSection(doc: jsPDFWithAutoTable, orderData: SalesOrderData, pageWidth: number): void {
    const startY = doc.lastAutoTable.finalY + 15;
    const totalsWidth = 75;
    const totalsX = pageWidth - this.margin - totalsWidth;
    const valueX = pageWidth - this.margin - 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);

    let currentY = startY;

    // Subtotal
    doc.text("Subtotal", totalsX, currentY);
    doc.text(formatCurrency(orderData.subtotal || 129.94), valueX, currentY, { align: "right" });
    currentY += 8;

    // Shipping & Handling
    doc.text("Shipping & Handling", totalsX, currentY);
    doc.text(formatCurrency(orderData.shippingHandling || 15.00), valueX, currentY, { align: "right" });
    currentY += 8;

    // Tax
    doc.text("Tax", totalsX, currentY);
    doc.text(formatCurrency(orderData.tax || 0.00), valueX, currentY, { align: "right" });
    currentY += 12;

    // Total (highlighted box - wider to fit content)
    const totalBoxWidth = totalsWidth + 5;
    const totalBoxHeight = 14;
    const totalBoxX = pageWidth - this.margin - totalBoxWidth;
    const totalBoxY = currentY - 5;

    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.roundedRect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.text("TOTAL", totalBoxX + 10, currentY + 3);
    doc.text(formatCurrency(orderData.total || 144.94), totalBoxX + totalBoxWidth - 10, currentY + 3, { align: "right" });
  }
}

// Export a singleton instance
export const salesOrderPDFGenerator = new SalesOrderPDFGenerator();
