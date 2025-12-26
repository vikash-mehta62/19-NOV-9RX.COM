import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

// Updated Size interface with required fields
interface Size {
  size_value: string;
  size_unit: string;
  price: number;
  sku?: string;
  pricePerCase?: any;
  price_per_case?: number;
  stock: number;
  quantity_per_case: number;
  rolls_per_case?: number;
  sizeSquanence?: number;
  shipping_cost?: number;
  lotNumber?: string;
  ndcCode?: string;
  exipry?: string;
  upcCode?: string;
  isUnit?: boolean;
}

// Generate barcode as base64 image
const generateBarcode = (text: string): string => {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, text, {
    format: "CODE128",
    width: 2,
    height: 30,
    displayValue: false,
    fontSize: 8,
    textMargin: 2,
  });
  return canvas.toDataURL("image/png");
};

/**
 * Generates a single PDF label (4x2 inches) matching the exact format shown in the image
 * @param productName The product name
 * @param size A single size object for which to generate the label
 */
export const generateSingleProductLabelPDF = async (
  productName: string,
  size: Size,
  isUnit: boolean
) => {
  // Label dimensions in mm (4 inches = 101.6 mm, 2 inches = 50.8 mm)
  const labelWidth = 101.6; // 4 inches
  const labelHeight = 50.8; // 2 inches

  // Create a new jsPDF instance with custom page size for the label
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [labelWidth, labelHeight],
  });

  // Create rounded rectangle border with increased margin
  const margin = 4; // Margin increased from 2mm to 4mm

  // Header section - smaller font
  let yPos = margin + 3; // Adjusted starting position based on new margin
  const headerFontSize = 9;
  const websiteFontSize = 8;
  const contentMargin = 8; // New, increased content margin for left/right

  // Left side: 9RX LLC
  doc.setFontSize(headerFontSize);
  doc.setFont("helvetica", "bold");
  doc.text("9RX LLC", contentMargin, yPos);

  // Right side: Phone number
  doc.setFontSize(headerFontSize);
  doc.setFont("helvetica", "bold");
  doc.text("1 800 969 6295", labelWidth - contentMargin, yPos, {
    align: "right",
  });
  yPos += 3.5;

  // Website
  doc.setFontSize(websiteFontSize);
  doc.setFont("helvetica", "normal");
  doc.text("WWW.9RX.COM", contentMargin, yPos);
  yPos += 2.5;

  // Horizontal line separator
  doc.setLineWidth(0.3);
  doc.line(contentMargin, yPos, labelWidth - contentMargin, yPos);
  yPos += 6;

  // Left column content - show only values, not labels
  const leftX = contentMargin; // Set to 8mm to align with left margin
  const rightX = labelWidth / 2 + 5; // Start of right column content

  // Product name (value only, no label)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const productNameLines = doc.splitTextToSize(
    productName || "PRODUCT NAME",
    labelWidth / 2 - leftX - 2 // Max width for product name
  );
  doc.text(productNameLines, leftX, yPos);
  yPos += productNameLines.length * 3.5 + 2;

  // Size (value only, no label)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const sizeText = `${size.size_value || "N/A"}${
    isUnit ? ` ${size.size_unit || ""}` : ""
  }`;
  const sizeLines = doc.splitTextToSize(sizeText, labelWidth / 2 - leftX - 2);
  doc.text(sizeLines, leftX, yPos);
  yPos += sizeLines.length * 3.5 + 3.5;

  // Quantity per case (value only, no label)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${
      size.quantity_per_case !== undefined && size.quantity_per_case !== null
        ? size.quantity_per_case
        : "N/A"
    }/case`,
    leftX,
    yPos
  );

  // Right column content
  let rightYPos = 18; // Adjusted starting Y position for right column

  // LOT# (bold label)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LOT#", rightX, rightYPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(size.lotNumber || "", rightX + 12, rightYPos);
  rightYPos += 4.5;

  // NDC# (bold label)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("NDC#", rightX, rightYPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(size.ndcCode || "", rightX + 12, rightYPos);
  rightYPos += 4.5;

  // EXPIRY: (bold label)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("EXPIRY:", rightX, rightYPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(size.exipry || "", rightX + 18, rightYPos);
  rightYPos += 6;

  // Generate and add barcode
  if (size.upcCode) {
    try {
      const barcodeData = generateBarcode(String(size.upcCode));
      const barcodeWidth = 35;
      const barcodeHeight = 8;
      // Align barcode to the right with new content margin
      const barcodeX = labelWidth - contentMargin - barcodeWidth;
      // Add barcode image
      doc.addImage(
        barcodeData,
        "PNG",
        barcodeX,
        rightYPos,
        barcodeWidth,
        barcodeHeight
      );
      rightYPos += barcodeHeight + 1.5;

      // Add SKU text below barcode
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(String(size.upcCode), barcodeX + barcodeWidth / 2, rightYPos, {
        align: "center",
      });
    } catch (error) {
      console.error(
        `Error generating barcode for SKU ${size.sku}:`,
        error
      );
      doc.setFontSize(7);
      doc.text(`${size.sku}`, rightX, rightYPos);
    }
  }

  // Clean product and SKU names for filename
  const fileNameProductName = productName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 30);
  const fileNameSku = size.sku
    ? size.sku.replace(/[^a-zA-Z0-9]/g, "_")
    : "UnknownSKU";
  doc.save(`Label_${fileNameProductName}_${fileNameSku}.pdf`);
};
