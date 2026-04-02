import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Logo from "../assests/home/9rx_logo.png";
import {
  fetchAdminDocumentSettings,
} from "@/lib/documentSettings";

interface InvoiceData {
  id?: string;
  profile_id?: string;
  invoice_number: string;
  order_number: string;
  order_id?: string;
  customerInfo?: {
    name: string;
    phone: string;
    email: string;
    company_name?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip_code: string;
    };
  };
  shippingInfo?: {
    fullName: string;
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip_code: string;
    };
  };
  items?: Array<{
    name: string;
    description?: string;
    quantity: number;
    price: number;
    sizes: any[];
    amount: number;
    productId?: string;
  }>;
  subtotal?: number;
  shippin_cost?: string | number;
  tax?: number;
  total?: number;
  total_amount?: number;
  processing_fee_amount?: number;
  payment_status: string;
  payment_method: string;
  payment_transication?: string;
  payment_notes?: string;
  notes?: string;
  created_at: string;
  discount_amount?: number;
  discount_details?: any[];
  paid_amount?: number;
  company_name?: string;
}

const buildDiscountSummaryRows = (
  discountAmount: number,
  discountDetails: Array<{ name?: string; amount?: number }>
): string[][] => {
  if (discountAmount <= 0) {
    return [];
  }

  if (!Array.isArray(discountDetails) || discountDetails.length === 0) {
    return [["Discount", `-${discountAmount.toFixed(2)}`]];
  }

  const rows = discountDetails.map((discount) => {
    const amount = Number(discount?.amount || 0);
    return [discount?.name || "Discount", `-${amount.toFixed(2)}`];
  });

  const detailedTotal = discountDetails.reduce((sum, discount) => sum + Number(discount?.amount || 0), 0);
  const remainder = Number((discountAmount - detailedTotal).toFixed(2));

  if (Math.abs(remainder) >= 0.01) {
    rows.push(["Discount", `-${Math.abs(remainder).toFixed(2)}`]);
  }

  return rows;
};

const SUMMARY_BOTTOM_RESERVE = 58;

/**
 * Generate invoice PDF blob using frontend styling (jsPDF)
 * This matches the exact format from InvoicePreview.tsx
 */
export async function generateInvoicePdfBlob(
  invoice: InvoiceData,
  companyName: string = ""
): Promise<Blob> {
  const documentSettings = await fetchAdminDocumentSettings();
  const invoiceCompany = documentSettings.invoice;
  const invoiceCompanyName = invoiceCompany.name || "9RX LLC";
  const supportEmail = invoiceCompany.email || "info@9rx.com";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as any;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  const brandColor: [number, number, number] = [40, 56, 136];
  const darkGray: [number, number, number] = [60, 60, 60];
  const lightGray: [number, number, number] = [245, 245, 245];

  const isPaid = invoice?.payment_status === "paid";
  const isPartialPaid = invoice?.payment_status === "partial_paid";
  const showTransactionId = (isPaid || isPartialPaid) && invoice.payment_method === "card" && invoice?.payment_transication;

  // Calculate totals
  const subtotalAmount = invoice?.subtotal || 0;
  const taxAmount = Number(invoice?.tax || 0);
  const shippingCost = Number(invoice?.shippin_cost || 0);
  const discountAmount = Number(invoice?.discount_amount || 0);
  const processingFeeAmount = Number(invoice?.processing_fee_amount || 0);
  const storedTotal = Number(invoice?.total || invoice?.total_amount || 0);
  const calculatedTotal = subtotalAmount + taxAmount + shippingCost - discountAmount;
  const baseTotal = storedTotal > 0 ? storedTotal : calculatedTotal;
  // Include processing fee in the displayed total since the customer was charged for it
  const totalAmount = baseTotal + processingFeeAmount;
  const paidAmount = Number(invoice?.paid_amount || (isPaid ? totalAmount : 0));

  const formattedDate = new Date(invoice.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });

  const headerTopY = 8;
  const headerContentY = headerTopY + 4;
  const leftColumnX = margin;
  const leftColumnWidth = 50;
  const rightColumnX = pageWidth - margin;
  const rightColumnWidth = 60;
  const invoiceAddressLines = [
    invoiceCompany.street,
    invoiceCompany.suite,
    [invoiceCompany.city, invoiceCompany.state, invoiceCompany.zipCode].filter(Boolean).join(", "),
    invoiceCompany.country,
  ].filter(Boolean) as string[];
  let headerBottomY = 66;

  // ===== HEADER BAND =====
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageWidth, 5, "F");

  // ===== LEFT ADDRESS =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  let addressY = headerContentY + 3;
  invoiceAddressLines.forEach((line) => {
    const wrappedLines = doc.splitTextToSize(line, leftColumnWidth);
    doc.text(wrappedLines, leftColumnX, addressY);
    addressY += wrappedLines.length * 4;
  });

  // ===== CENTER LOGO =====
  let logoLoaded = false;
  let logoBottomY = headerContentY;
  try {
    const logo = new Image();
    logo.src = Logo;
    await new Promise<void>((resolve) => {
      logo.onload = () => {
        logoLoaded = true;
        resolve();
      };
      logo.onerror = () => resolve();
      setTimeout(() => resolve(), 3000);
    });
    if (logoLoaded && logo.width > 0) {
      const logoHeight = 18;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", pageWidth / 2 - logoWidth / 2, headerContentY, logoWidth, logoHeight);
      logoBottomY = headerContentY + logoHeight;
    }
  } catch {
    /* Continue without logo */
  }
  if (!logoLoaded) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...darkGray);
    doc.text(invoiceCompanyName, pageWidth / 2, headerContentY + 10, { align: "center" });
    logoBottomY = headerContentY + 10;
  }

  // ===== DOCUMENT TITLE & NUMBER (Right) =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...brandColor);
  doc.text("INVOICE", rightColumnX, headerContentY + 4, { align: "right", maxWidth: rightColumnWidth });
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  let detailsY = headerContentY + 12;
  doc.text(`# ${invoice.invoice_number}`, rightColumnX, detailsY, { align: "right", maxWidth: rightColumnWidth });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  detailsY += 5;
  doc.text(`Date: ${formattedDate}`, rightColumnX, detailsY, { align: "right", maxWidth: rightColumnWidth });

  // Payment status badge
  const badgeY = detailsY + 5;
  let rightBottomY = badgeY;
  if (isPaid) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(pageWidth - margin - 25, badgeY, 25, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth - margin - 12.5, badgeY + 5.5, { align: "center" });
    rightBottomY = badgeY + 8;
  } else {
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(pageWidth - margin - 30, badgeY, 30, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("UNPAID", pageWidth - margin - 15, badgeY + 5.5, { align: "center" });
    rightBottomY = badgeY + 8;
  }

  headerBottomY = Math.max(addressY, logoBottomY, rightBottomY) + 8;

  // ===== DIVIDER LINE =====
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);

  // ===== BILL TO / SHIP TO SECTION =====
  const infoStartY = headerBottomY + 5;
  const boxWidth = (pageWidth - margin * 3) / 2;
  const drawInfoBox = (title: string, x: number, lines: string[]) => {
    doc.setFillColor(...lightGray);
    doc.roundedRect(x, infoStartY, boxWidth, 35, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...brandColor);
    doc.text(title, x + 5, infoStartY + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    let y = infoStartY + 14;
    lines.filter(Boolean).forEach((line, idx) => {
      if (idx < 5) {
        doc.text(line, x + 5, y, { maxWidth: boxWidth - 10 });
        y += 5;
      }
    });
  };

  const billToLines = [
    companyName || invoice.customerInfo?.company_name,
    invoice.customerInfo?.name,
    invoice.customerInfo?.phone,
    invoice.customerInfo?.email,
    [
      invoice.customerInfo?.address?.street,
      invoice.customerInfo?.address?.city,
      invoice.customerInfo?.address?.state,
      invoice.customerInfo?.address?.zip_code,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean) as string[];

  const shipToLines = [
    companyName || invoice.customerInfo?.company_name,
    invoice.shippingInfo?.fullName,
    invoice.shippingInfo?.phone,
    [
      invoice.shippingInfo?.address?.street,
      invoice.shippingInfo?.address?.city,
      invoice.shippingInfo?.address?.state,
      invoice.shippingInfo?.address?.zip_code,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean) as string[];

  drawInfoBox("BILL TO", margin, billToLines);
  drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLines);

  // ===== ITEMS TABLE =====
  const tableStartY = infoStartY + 42;
  const tableHead = [["#", "Description", "Size", "Qty", "Unit Price", "Total"]];
  const tableBody: any[] = [];
  let itemIndex = 1;

  if (invoice?.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item: any) => {
      if (Array.isArray(item.sizes)) {
        item.sizes.forEach((size: any, sizeIndex: number) => {
          tableBody.push([
            itemIndex.toString(),
            item.name,
            `${size.size_value} ${item.unitToggle ? size.size_unit : ""}`,
            size.quantity?.toString() || "0",
            `${Number(size.price).toFixed(2)}`,
            `${Number(size.price * size.quantity).toFixed(2)}`,
          ]);
          itemIndex++;
          if (false && sizeIndex === 0 && item.description && item.description.trim()) {
            tableBody.push([
              "",
              {
                content: `↳ ${item.description.trim()}`,
                styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 },
              },
              "",
              "",
              "",
              "",
            ]);
          }
        });
      }
    });
  }

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: tableStartY,
    styles: { fontSize: 9, cellPadding: 3 },
    theme: "striped",
    headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: "auto" },
      2: { halign: "center", cellWidth: 25 },
      3: { halign: "center", cellWidth: 15 },
      4: { halign: "right", cellWidth: 25 },
      5: { halign: "right", cellWidth: 25 },
    },
    margin: { left: margin, right: margin, bottom: 45 },
    tableWidth: "auto",
    showHead: "everyPage",
    didDrawPage: (data: any) => {
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 5, "F");
      doc.setFillColor(...brandColor);
      doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
    },
  });

  let finalY = doc.lastAutoTable.finalY + 8;

  // ===== SUMMARY SECTION =====
  const invoiceDiscountDetails = invoice?.discount_details || [];
  const invoiceSummaryBody: any[] = [
    ["Subtotal", `${subtotalAmount.toFixed(2)}`],
    ["Shipping", `${shippingCost.toFixed(2)}`],
    ["Tax", `${taxAmount.toFixed(2)}`],
  ];
  let firstDiscountRowIndex: number | null = null;

  if (processingFeeAmount > 0) {
    invoiceSummaryBody.push(["Credit Card Processing Fee", `${processingFeeAmount.toFixed(2)}`]);
  }

  if (discountAmount > 0) {
    firstDiscountRowIndex = invoiceSummaryBody.length;
    invoiceSummaryBody.push(...buildDiscountSummaryRows(discountAmount, invoiceDiscountDetails));
  }

  const balanceDue = Math.max(0, totalAmount - paidAmount);

  autoTable(doc, {
    body: invoiceSummaryBody,
    startY: finalY,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { halign: "right", cellWidth: 45 },
      1: { halign: "right", cellWidth: 35, fontStyle: "normal" },
    },
    margin: { left: pageWidth - margin - 85, bottom: SUMMARY_BOTTOM_RESERVE },
    tableWidth: 80,
    didDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 0 && data.row.index === firstDiscountRowIndex) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(data.cell.x, data.cell.y, data.cell.x + 80, data.cell.y);
      }
    },
  });

  let summaryFinalY = doc.lastAutoTable.finalY;
  if (summaryFinalY + 38 > pageHeight - 30) {
    doc.addPage();
    doc.setFillColor(...brandColor);
    doc.rect(0, 0, pageWidth, 5, "F");
    doc.setFillColor(...brandColor);
    doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
    summaryFinalY = 20;
  }
  doc.setFillColor(...brandColor);
  doc.roundedRect(pageWidth - margin - 85, summaryFinalY + 2, 80, 10, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", pageWidth - margin - 80, summaryFinalY + 9);
  doc.text(`${totalAmount.toFixed(2)}`, pageWidth - margin - 7, summaryFinalY + 9, { align: "right" });

  // Add Paid Amount and Balance Due
  let paidAmountY = summaryFinalY + 14;
  if (paidAmount > 0) {
    doc.setFillColor(34, 197, 94); // Green
    doc.roundedRect(pageWidth - margin - 85, paidAmountY, 80, 10, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("PAID AMOUNT", pageWidth - margin - 80, paidAmountY + 7);
    doc.text(`${paidAmount.toFixed(2)}`, pageWidth - margin - 7, paidAmountY + 7, { align: "right" });
    paidAmountY += 12;
  }

  if (balanceDue > 0) {
    doc.setFillColor(239, 68, 68); // Red
    doc.roundedRect(pageWidth - margin - 85, paidAmountY, 80, 10, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("BALANCE DUE", pageWidth - margin - 80, paidAmountY + 7);
    doc.text(`${balanceDue.toFixed(2)}`, pageWidth - margin - 7, paidAmountY + 7, { align: "right" });
  } else if (paidAmount > 0) {
    doc.setFillColor(34, 197, 94); // Green
    doc.roundedRect(pageWidth - margin - 85, paidAmountY, 80, 10, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("FULLY PAID", pageWidth - margin - 45, paidAmountY + 7, { align: "center" });
  }

  // ===== FOOTER =====
  const footerY = pageHeight - 30;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...brandColor);
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);

  const invoiceNote = invoice?.notes?.trim();

  if (showTransactionId) {
      doc.text(
      `Transaction ID: ${invoice.payment_transication}  |  Questions? Contact us at ${supportEmail}`,
      pageWidth / 2,
      footerY + 6,
      { align: "center" }
    );
  } else if (invoiceNote) {
    doc.text(`Invoice Notes: ${invoiceNote}  |  Questions? Contact us at ${supportEmail}`, pageWidth / 2, footerY + 6, {
      align: "center",
    });
  } else if (isPaid || isPartialPaid) {
    if (invoice?.payment_notes) {
      doc.text(
        `Payment Notes: ${invoice.payment_notes}  |  Questions? Contact us at ${supportEmail}`,
        pageWidth / 2,
        footerY + 6,
        { align: "center" }
      );
    } else {
      doc.text(`Payment Received  |  Questions? Contact us at ${supportEmail}`, pageWidth / 2, footerY + 6, {
        align: "center",
      });
    }
  } else {
    doc.text(`Payment Terms: Net 30  |  Questions? Contact us at ${supportEmail}`, pageWidth / 2, footerY + 6, {
      align: "center",
    });
  }

  // Add page numbers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" });
  }

  return doc.output("blob");
}
