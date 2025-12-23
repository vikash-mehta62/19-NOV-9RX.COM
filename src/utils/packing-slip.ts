import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";

// Generate barcode as base64 image
const generateBarcode = (text: string): string => {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, text, {
    format: "CODE128",
    width: 2,
    height: 35,
    displayValue: false,
    margin: 0,
  });
  return canvas.toDataURL("image/png");
};

export const generateWorkOrderPDF = async (workOrderData: any, packingData: any) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    const packingDetails = packingData?.packingDetails || {};
    const packedItems = packingData?.packedItems || [];
    const totals = packingData?.totals || {};
    const customerInfo = packingData?.customerInfo || {};
    const shipTo = packingData?.shippingAddress || {};

    // Professional teal color scheme
    const COLORS = {
      primary: [20, 184, 166] as [number, number, number],
      success: [34, 197, 94] as [number, number, number],
      dark: [31, 41, 55] as [number, number, number],
      medium: [107, 114, 128] as [number, number, number],
      light: [243, 244, 246] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
      black: [0, 0, 0] as [number, number, number],
    };

    // ==========================================
    // SECTION 1: TEAL HEADER BAR
    // ==========================================
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Logo in header
    try {
      const logo = new Image();
      logo.src = "/final.png";
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
        setTimeout(reject, 2000);
      });
      const logoHeight = 12;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", margin, 5, logoWidth, logoHeight);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.white);
      doc.text("9RX.com", margin, 14);
    }

    // ==========================================
    // SECTION 2: COMPANY INFO (Left) + ORDER INFO (Right)
    // ==========================================
    let yPos = 30;

    // Left side - Company Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.black);
    doc.text("9RX LLC", margin, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.medium);
    doc.text("936 Broad River Ln, Charlotte, NC 28211", margin, yPos + 6);
    doc.text("Phone: +1 800 969 6295  |  Email: info@9rx.com", margin, yPos + 11);
    doc.text("Tax ID: 99-0540972  |  www.9rx.com", margin, yPos + 16);

    // Right side - Order Info
    const orderNumber = workOrderData?.order_number || "9RX001193";
    const formattedDate = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    });

    // Order number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary);
    doc.text(`# ${orderNumber}`, pageWidth - margin, yPos, { align: "right" });

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text(`Date: ${formattedDate}`, pageWidth - margin, yPos + 7, { align: "right" });

    // PACKED Badge
    const badgeW = 26;
    const badgeH = 8;
    const badgeX = pageWidth - margin - badgeW;
    const badgeY = yPos + 11;
    doc.setFillColor(...COLORS.success);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.text("PACKED", badgeX + badgeW / 2, badgeY + 5.5, { align: "center" });

    // Barcode
    try {
      const barcodeUrl = generateBarcode(orderNumber);
      doc.addImage(barcodeUrl, "PNG", pageWidth - margin - 50, yPos + 22, 50, 12);
    } catch (e) {
      console.warn("Barcode generation failed:", e);
    }

    // ==========================================
    // SECTION 3: BILL TO & SHIP TO (Equal Boxes)
    // ==========================================
    yPos = 68;
    const boxGap = 10;
    const boxW = (contentWidth - boxGap) / 2;
    const boxH = 32;

    // BILL TO Box
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, yPos, boxW, boxH, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text("BILL TO", margin + 6, yPos + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    const billName = customerInfo.name || "Jaydeep Patel";
    const billPhone = customerInfo.phone || "7043096277";
    const billEmail = customerInfo.email || "daviedrugs@gmail.com";
    doc.text(billName, margin + 6, yPos + 14);
    doc.text(billPhone, margin + 6, yPos + 19);
    doc.text(billEmail, margin + 6, yPos + 24);

    // SHIP TO Box
    const shipBoxX = margin + boxW + boxGap;
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(shipBoxX, yPos, boxW, boxH, 3, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text("SHIP TO", shipBoxX + 6, yPos + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    const shipName = shipTo.fullName || customerInfo.name || "Jaydeep Patel";
    const shipPhone = shipTo.phone || customerInfo.phone || "7043096277";
    const shipStreet = shipTo.address?.street || "141 Marginal St";
    const shipCity = shipTo.address?.city || "Cooleemee";
    const shipState = shipTo.address?.state || "NC";
    const shipZip = shipTo.address?.zip_code || "27014";
    doc.text(shipName, shipBoxX + 6, yPos + 14);
    doc.text(shipPhone, shipBoxX + 6, yPos + 19);
    doc.text(shipStreet, shipBoxX + 6, yPos + 24);
    doc.text(`${shipCity}, ${shipState} ${shipZip}`, shipBoxX + 6, yPos + 29);

    // ==========================================
    // SECTION 4: ITEMS TABLE
    // ==========================================
    const tableY = yPos + boxH + 10;

    const tableHead = [["SKU", "DESCRIPTION", "SIZE", "QTY/CS", "CASES"]];
    const tableBody: string[][] = [];

    if (packedItems && packedItems.length > 0) {
      packedItems.forEach((item: any) => {
        tableBody.push([
          item.sku || "-",
          item.name || "-",
          item.size || "-",
          item.qtyPerCase?.toString() || "1",
          item.masterCases?.toString() || "0",
        ]);
      });
    } else {
      tableBody.push(["-", "RX VIALS", "9 dram", "1", "0"]);
      tableBody.push(["-", "RX VIALS", "40 dram", "1", "0"]);
      tableBody.push(["-", "RX VIALS", "60 dram", "1", "0"]);
    }

    const totalCases = tableBody.reduce((sum, row) => sum + parseInt(row[4] || "0"), 0);
    tableBody.push(["", "", "", "TOTAL:", totalCases.toString()]);

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableY,
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },
      theme: "grid",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 22, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
      },
      didParseCell: (data: any) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [248, 248, 248];
        }
      },
      margin: { left: margin, right: margin },
    });

    // ==========================================
    // SECTION 5: SHIPPING DETAILS
    // ==========================================
    let currentY = (doc as any).lastAutoTable.finalY + 12;

    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // Section Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.dark);
    doc.text("SHIPPING DETAILS", margin, currentY);
    currentY += 10;

    // Two column layout
    const col1X = margin;
    const col2X = pageWidth / 2 + 5;
    const labelW = 32;

    doc.setFontSize(9);

    // Row 1
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text("Ship Via:", col1X, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.shipVia || "FedEx Express", col1X + labelW, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Tracking #:", col2X, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.trackingNumber || "N/A", col2X + labelW, currentY);

    currentY += 7;

    // Row 2
    doc.setFont("helvetica", "bold");
    doc.text("Total Weight:", col1X, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${totals.totalWeight?.toFixed(1) || "7.5"} lbs`, col1X + labelW, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Shipping Class:", col2X, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.shippingClass || "N/A", col2X + labelW + 3, currentY);

    // ==========================================
    // SECTION 6: WAREHOUSE QC
    // ==========================================
    currentY += 15;

    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // Section Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.dark);
    doc.text("WAREHOUSE QC", margin, currentY);
    currentY += 10;

    doc.setFontSize(9);

    // Packed By
    doc.setFont("helvetica", "bold");
    doc.text("Packed By:", col1X, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.packedBy || "a", col1X + labelW, currentY);

    // Timestamp
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.medium);
    const packedTime = packingDetails.packedAt || new Date().toLocaleString("en-US");
    doc.text(`(${packedTime})`, col1X + labelW + 12, currentY);

    // Checked By
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "bold");
    doc.text("Checked By:", col2X, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(packingDetails.checkedBy || "z", col2X + labelW, currentY);

    // ==========================================
    // SECTION 7: SPECIAL INSTRUCTIONS
    // ==========================================
    currentY += 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text("Special Instructions:", margin, currentY);

    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const notes = packingDetails.notes || "N/A";
    const splitNotes = doc.splitTextToSize(notes, contentWidth);
    doc.text(splitNotes, margin, currentY);

    // ==========================================
    // FOOTER
    // ==========================================
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.medium);
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
