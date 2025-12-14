import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateWorkOrderPDF = async (workOrderData: any, packingData: any) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    const packingDetails = packingData?.packingDetails || {};
    const packedItems = packingData?.packedItems || [];
    const cartons = packingData?.cartons || [];
    const totals = packingData?.totals || {};

    // ===== HEADER =====
  // Top info (center)
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(100);
const topInfo =
  "Tax ID : 99-0540972   |   936 Broad River Ln, Charlotte, NC 28211   |   info@9rx.com   |   www.9rx.com";
doc.text(topInfo, pageWidth / 2, margin, { align: "center" });

// ADD COMPANY NAME ABOVE PHONE (LEFT SIDE)
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.setTextColor(40);
doc.text("9RX LLC", margin, margin + 10);   // <-- THIS IS WHAT YOU WANT

// PHONE NUMBER LEFT SIDE BELOW IT
doc.setFont("helvetica", "bold");
doc.setFontSize(14);
doc.text("+1 800 969 6295", margin, margin + 18);


    // Logo
    const logo = new Image();
    logo.src = "/final.png";
    await new Promise((resolve) => (logo.onload = resolve));
    const logoHeight = 20;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, margin + 5, logoWidth, logoHeight);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PACKING SLIP", pageWidth - margin, margin + 8, { align: "right" });

    const orderNumber = workOrderData?.order_number || "N/A";
    const poNumber = workOrderData?.purchase_number_external || "";
    const formattedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`ORDER #: ${orderNumber}`, pageWidth - margin, margin + 14, { align: "right" });
    if (poNumber) doc.text(`PO #: ${poNumber}`, pageWidth - margin, margin + 19, { align: "right" });
    doc.text(`Date: ${formattedDate}`, pageWidth - margin, poNumber ? margin + 24 : margin + 19, { align: "right" });

    doc.setDrawColor(180);
    doc.line(margin, margin + 28, pageWidth - margin, margin + 28);

    // ===== BILL TO & SHIP TO =====
    const addressY = margin + 36;
    const customerInfo = packingData?.customerInfo || {};
    const shipTo = packingData?.shippingAddress || {};

    // Bill To
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text("Bill To", margin, addressY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (!customerInfo.name && !customerInfo.company_name) {
      doc.setTextColor(150);
      doc.text("Billing information not provided", margin, addressY + 6);
      doc.setTextColor(40);
    } else {
      let billY = addressY + 6;
      if (customerInfo.company_name) { doc.text(customerInfo.company_name, margin, billY); billY += 5; }
      if (customerInfo.name) { doc.text(customerInfo.name, margin, billY); billY += 5; }
      if (customerInfo.phone) { doc.text(customerInfo.phone, margin, billY); billY += 5; }
      if (customerInfo.email) { doc.text(customerInfo.email, margin, billY); billY += 5; }
    }

    // Ship To
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Ship To", pageWidth / 2 + 5, addressY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    let shipY = addressY + 6;
    doc.text(shipTo.fullName || customerInfo.name || "N/A", pageWidth / 2 + 5, shipY); shipY += 5;
    if (shipTo.phone) { doc.text(shipTo.phone, pageWidth / 2 + 5, shipY); shipY += 5; }
    if (shipTo.address?.street) { doc.text(shipTo.address.street, pageWidth / 2 + 5, shipY); shipY += 5; }
    const cityStateZip = `${shipTo.address?.city || ""}, ${shipTo.address?.state || ""} ${shipTo.address?.zip_code || ""}`.trim();
    if (cityStateZip !== ",") doc.text(cityStateZip, pageWidth / 2 + 5, shipY);

    // ===== ITEMS TABLE =====
    // ===== ITEMS TABLE =====
const tableStartY = addressY + 40;
doc.line(margin, tableStartY - 5, pageWidth - margin, tableStartY - 5);

// FIXED TABLE HEAD (5 COLUMNS ONLY)
const tableHead = [
  ["SKU", "DESCRIPTION", "SIZE", "QTY/CS", "CASES"]
];

// FIXED BODY (5 COLUMNS)
const tableBody: any[] = packedItems.map((item: any) => [
  item.sku || "-",
  item.name || "-",
  item.size || "-",
  item.qtyPerCase?.toString() || "-",
  item.masterCases?.toString() || "0",
]);

// FIXED TOTALS ROW (still 5 columns)
tableBody.push([
  "",
  "",
  "",
  "TOTAL:",
  totals.totalMasterCases?.toString() || "0",
]);

(doc as any).autoTable({
  head: tableHead,
  body: tableBody,
  startY: tableStartY,
  styles: { fontSize: 8, cellPadding: 2 },
  theme: "grid",

  headStyles: {
    fillColor: [34, 139, 34],
    textColor: 255,
    fontStyle: "bold",
    halign: "center",
  },

  // FULL WIDTH FIX — spread columns across page
  tableWidth: pageWidth - margin * 2,

  columnStyles: {
    0: { cellWidth: 22 },              // SKU
    1: { cellWidth: "*", minCellWidth: 60 }, // DESCRIPTION expands full width
    2: { cellWidth: 20, halign: "center" },
    3: { cellWidth: 18, halign: "center" },
    4: { cellWidth: 18, halign: "center" },
  },

  didParseCell: (data: any) => {
    // BOLD TOTAL ROW
    if (data.row.index === tableBody.length - 1) {
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fillColor = [245, 245, 245];
    }
  },
});

    // ===== CARTON SUMMARY =====
    let currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text("CARTON SUMMARY", margin, currentY);
    currentY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    cartons.forEach((carton: any, idx: number) => {
      const cartonItems = carton.items?.filter((i: any) => i.masterCases > 0).map((i: any) => 
        `${i.masterCases}× ${i.name}`
      ).join(", ") || "Items assigned";
      
      doc.text(`Carton ${idx + 1}: ${cartonItems}`, margin, currentY);
      doc.text(`${carton.totalWeight?.toFixed(1) || "0"} lbs`, pageWidth - margin, currentY, { align: "right" });
      currentY += 5;
    });

    // ===== SHIPPING DETAILS =====
    currentY += 8;
    doc.setDrawColor(180);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SHIPPING DETAILS", margin, currentY);
    currentY += 8;

    doc.setFontSize(9);
    const leftCol = margin;
    const rightCol = pageWidth / 2;

    // Left column
    doc.setFont("helvetica", "bold");
    doc.text("Ship Via:", leftCol, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.shipVia || "N/A", leftCol + 25, currentY);

    // doc.setFont("helvetica", "bold");
    // doc.text("Cartons:", leftCol, currentY + 6);
    // doc.setFont("helvetica", "normal");
    // doc.text(cartons.length.toString(), leftCol + 25, currentY + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Total Weight:", leftCol, currentY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(`${totals.totalWeight?.toFixed(1) || "0"} lbs`, leftCol + 25, currentY + 12);

    // Right column
    doc.setFont("helvetica", "bold");
    doc.text("Tracking #:", rightCol, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.trackingNumber || "N/A", rightCol + 25, currentY);

    // doc.setFont("helvetica", "bold");
    // doc.text("Master Cases:", rightCol, currentY + 6);
    // doc.setFont("helvetica", "normal");
    // doc.text(totals.totalMasterCases?.toString() || "0", rightCol + 25, currentY + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Shipping Class:", rightCol, currentY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.shippingClass || "N/A", rightCol + 25, currentY + 12);

    // ===== WAREHOUSE QC =====
    currentY += 25;
    doc.setDrawColor(180);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("WAREHOUSE QC", margin, currentY);
    currentY += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Packed By:", leftCol, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.packedBy || "_____________", leftCol + 25, currentY);
    if (packingDetails.packedAt) {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`(${packingDetails.packedAt})`, leftCol + 60, currentY);
      doc.setTextColor(40);
      doc.setFontSize(9);
    }

    doc.setFont("helvetica", "bold");
    doc.text("Checked By:", rightCol, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.checkedBy || "_____________", rightCol + 25, currentY);
    if (packingDetails.checkedAt) {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`(${packingDetails.checkedAt})`, rightCol + 60, currentY);
      doc.setTextColor(40);
      doc.setFontSize(9);
    }

    // ===== SPECIAL INSTRUCTIONS =====
    if (packingDetails.notes) {
      currentY += 12;
      doc.setFont("helvetica", "bold");
      doc.text("Special Instructions:", margin, currentY);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(packingDetails.notes, contentWidth);
      doc.text(splitNotes, margin, currentY + 5);
      currentY += 5 + (splitNotes.length * 4);
    }

    // ===== DELIVERY CONFIRMATION =====
    currentY += 15;
    doc.setDrawColor(180);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DELIVERY CONFIRMATION", margin, currentY);
    currentY += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Received By:", margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.line(margin + 28, currentY, margin + 90, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", rightCol, currentY);
    doc.line(rightCol + 15, currentY, rightCol + 55, currentY);

    // currentY += 10;
    // doc.setFont("helvetica", "bold");
    // doc.text("Condition:", margin, currentY);
    // doc.setFont("helvetica", "normal");
    
    // // Checkboxes
    // doc.rect(margin + 25, currentY - 3.5, 4, 4);
    // doc.text("Good", margin + 31, currentY);
    // doc.rect(margin + 50, currentY - 3.5, 4, 4);
    // doc.text("Damaged", margin + 56, currentY);
    // doc.rect(margin + 82, currentY - 3.5, 4, 4);
    // doc.text("Partial", margin + 88, currentY);

    // currentY += 10;
    // doc.setFont("helvetica", "bold");
    // doc.text("Notes:", margin, currentY);
    // doc.line(margin + 15, currentY, pageWidth - margin, currentY);
    // doc.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

    // ===== FOOTER =====
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This packing slip was generated by 9RX. Please inspect all items upon delivery and note any discrepancies.",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Save PDF
    doc.save(`Packing_Slip_${orderNumber}.pdf`);

  } catch (error) {
    console.error("Packing Slip PDF Error:", error);
    throw error;
  }
};
