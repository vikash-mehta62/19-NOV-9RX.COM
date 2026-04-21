import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";
import Logo from "../assests/home/9rx_logo.png"
import {
  fetchAdminDocumentSettings,
  formatDocumentContactLine,
} from "@/lib/documentSettings";

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
    const documentSettings = await fetchAdminDocumentSettings();
    const invoiceCompany = documentSettings.invoice;
    const shippingCompanyName = invoiceCompany.name || "9RX";
    const shippingContactLine = formatDocumentContactLine(invoiceCompany);
    const shippingPhoneLine = invoiceCompany?.phone ? `Phone: ${invoiceCompany.phone}` : "";
    const shippingEmailLine = invoiceCompany?.email ? `Email: ${invoiceCompany.email}` : "";

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    const packingDetails = packingData?.packingDetails || {};
    const packedItems = packingData?.packedItems || [];
    const totals = packingData?.totals || {};
    const customerInfo = packingData?.customerInfo || {};
    const shipTo = packingData?.shippingAddress || {};

    // Professional blue color scheme
    const COLORS = {
      primary: [40, 56, 136] as [number, number, number],
      success: [40, 56, 136] as [number, number, number],
      dark: [60, 60, 60] as [number, number, number],
      medium: [100, 100, 100] as [number, number, number],
      light: [245, 245, 245] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
      black: [0, 0, 0] as [number, number, number],
    };

    // ==========================================
    // SECTION 1: THIN BLUE LINE AT TOP
    // ==========================================
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // ==========================================
    // SECTION 2: HEADER
    // ==========================================
    let yPos = 10;
    const headerLeftWidth = 64;
    const headerRightWidth = 62;
    const headerRightX = pageWidth - margin - headerRightWidth;
    const headerTopY = yPos;
    let logoBottomY = headerTopY;

    // Logo in center
    try {
      const logo = new Image();
      logo.src = Logo
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
        setTimeout(reject, 2000);
      });
      const logoHeight = 26;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", pageWidth / 2 - logoWidth / 2, headerTopY, logoWidth, logoHeight);
      logoBottomY = headerTopY + logoHeight;
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...COLORS.dark);
      doc.text(shippingCompanyName, pageWidth / 2, headerTopY + 10, { align: "center" });
      logoBottomY = headerTopY + 10;
    }

    let addressY = headerTopY + 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.dark);
    doc.text(shippingCompanyName, margin, addressY, { maxWidth: headerLeftWidth });
    addressY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.medium);
    const contactLines = [shippingPhoneLine, shippingEmailLine].filter(Boolean);
    const linesToRender =
      contactLines.length > 0
        ? contactLines
        : shippingContactLine
          ? shippingContactLine.split("|").map((part: string) => part.trim()).filter(Boolean)
          : [];

    linesToRender.forEach((line) => {
      const wrappedLine = doc.splitTextToSize(line, headerLeftWidth);
      doc.text(wrappedLine, margin, addressY);
      addressY += wrappedLine.length * 4.2;
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.primary);
    doc.text("PACKING SLIP", pageWidth - margin, headerTopY + 6, { align: "right", maxWidth: headerRightWidth });

    const orderNumber = workOrderData?.order_number || "9RX001193";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text(`# ${orderNumber}`, pageWidth - margin, headerTopY + 14, { align: "right", maxWidth: headerRightWidth });

    // ==========================================
    // SECTION 3: RIGHT HEADER INFO
    // ==========================================
    const formattedDate = new Date(workOrderData?.created_at || packingData?.created_at || Date.now()).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.medium);
    doc.text(`Date: ${formattedDate}`, pageWidth - margin, headerTopY + 22, { align: "right", maxWidth: headerRightWidth });

    const badgeW = 26;
    const badgeH = 8;
    const badgeX = pageWidth - margin - badgeW;
    const badgeY = headerTopY + 26;
    doc.setFillColor(...COLORS.success);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.text("PACKED", badgeX + badgeW / 2, badgeY + 5.5, { align: "center" });

    const barcodeY = badgeY + 13;
    try {
      const barcodeUrl = generateBarcode(orderNumber);
      doc.addImage(barcodeUrl, "PNG", pageWidth - margin - 50, barcodeY, 50, 12);
    } catch (e) {
      console.warn("Barcode generation failed:", e);
    }

    const dividerY = Math.max(addressY, logoBottomY, barcodeY + 12) + 2;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, dividerY, pageWidth - margin, dividerY);

    // ==========================================
    // SECTION 3: BILL TO & SHIP TO (Equal Boxes)
    // ==========================================
    yPos = dividerY + 5;
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

    const tableHead = [["SKU", "DESCRIPTION", "SIZE", "QTY/CS", "CASES", "LOT/BATCH"]];
    const tableBody: string[][] = [];

    if (packedItems && packedItems.length > 0) {
      packedItems.forEach((item: any) => {
        // Get batch information
        const batches = item.batches || [];
        let batchInfo = "-";
        
        if (batches.length > 0) {
          // Show lot numbers with expiry dates
          batchInfo = batches.map((b: any) => {
            let info = b.lot_number;
            if (b.expiry_date) {
              const expDate = new Date(b.expiry_date);
              info += ` (${expDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;
            }
            return info;
          }).join('\n');
        }
        
        tableBody.push([
          item.sku || "-",
          item.size_name || item.name || "-",
          item.size || "-",
          item.qtyPerCase?.toString() || "1",
          item.casesOrdered?.toString() || item.masterCases?.toString() || "0",
          batchInfo
        ]);
      });
    } else {
      tableBody.push(["-", "RX VIALS", "9 dram", "1", "0", "-"]);
      tableBody.push(["-", "RX VIALS", "40 dram", "1", "0", "-"]);
      tableBody.push(["-", "RX VIALS", "60 dram", "1", "0", "-"]);
    }

    const totalCases = tableBody.reduce((sum, row) => sum + parseInt(row[4] || "0"), 0);
    tableBody.push(["", "", "", "TOTAL:", totalCases.toString(), ""]);

    autoTable(doc as any, {
      head: tableHead,
      body: tableBody,
      startY: tableY,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },
      theme: "grid",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 40, halign: "left", fontSize: 7 },
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

    // Footer reserved space (footer text + page number + margin)
    const footerReservedSpace = 25;
    const maxContentY = pageHeight - footerReservedSpace;

    // Helper function to check and add new page if needed
    const checkPageBreak = (requiredSpace: number) => {
      if (currentY + requiredSpace > maxContentY) {
        doc.addPage();
        currentY = margin + 10;
        return true;
      }
      return false;
    };

    // Check if we have space for shipping details section (~35mm needed)
    checkPageBreak(35);

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

    // Check if we have space for warehouse QC section (~30mm needed)
    checkPageBreak(30);

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

    // Check space for special instructions
    const notes = packingDetails.notes || "N/A";
    const splitNotes = doc.splitTextToSize(notes, contentWidth);
    const notesHeight = splitNotes.length * 4 + 15;
    checkPageBreak(notesHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text("Special Instructions:", margin, currentY);

    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(splitNotes, margin, currentY);

    // ==========================================
    // FOOTER WITH PAGE NUMBERS
    // ==========================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.medium);
      doc.setFont("helvetica", "normal");
      doc.text(
        "This packing slip was generated by 9RX. Please inspect all items upon delivery and note any discrepancies.",
        pageWidth / 2,
        pageHeight - 14,
        { align: "center" }
      );
      
      // Page number
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    }

    // Save PDF
    doc.save(`Packing_Slip_${orderNumber}.pdf`);

  } catch (error) {
    console.error("Packing Slip PDF Error:", error);
    throw error;
  }
};
