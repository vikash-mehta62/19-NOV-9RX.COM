import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

// आवश्यक फ़ील्ड के साथ अद्यतनित Size इंटरफ़ेस
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

// बारकोड को base64 इमेज के रूप में जनरेट करें
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
 * एक ही PDF लेबल (4x2 इंच) को जनरेट करता है जो इमेज में दिखाए गए सटीक प्रारूप से मेल खाता है
 * @param productName उत्पाद का नाम
 * @param size एक ही आकार ऑब्जेक्ट जिसके लिए लेबल जनरेट करना है
 */
export const generateSingleProductLabelPDF = async (
  productName: string,
  size: Size,
  isUnit: boolean
) => {
  // लेबल के आयाम mm में (4 इंच = 101.6 mm, 2 इंच = 50.8 mm)
  const labelWidth = 101.6; // 4 इंच
  const labelHeight = 50.8; // 2 इंच

  // लेबल के लिए कस्टम पेज आकार के साथ एक नया jsPDF इंस्टेंस बनाएँ
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [labelWidth, labelHeight],
  });

  // बढ़े हुए मार्जिन के साथ गोल आयत की बॉर्डर बनाएँ
  const margin = 4; // मार्जिन 2mm से बढ़ाकर 4mm किया गया

  // हेडर अनुभाग - छोटे फ़ॉन्ट
  let yPos = margin + 3; // नए मार्जिन के आधार पर शुरुआती स्थिति को समायोजित किया गया
  const headerFontSize = 9;
  const websiteFontSize = 8;
  const contentMargin = 8; // बाएं/दाएं के लिए नया, बढ़ा हुआ सामग्री मार्जिन

  // बाईं ओर: 9RX LLC
  doc.setFontSize(headerFontSize);
  doc.setFont("helvetica", "bold");
  doc.text("9RX LLC", contentMargin, yPos);

  // दाईं ओर: फ़ोन नंबर
  doc.setFontSize(headerFontSize);
  doc.setFont("helvetica", "bold");
  doc.text("1 800 969 6295", labelWidth - contentMargin, yPos, {
    align: "right",
  });
  yPos += 3.5;

  // वेबसाइट
  doc.setFontSize(websiteFontSize);
  doc.setFont("helvetica", "normal");
  doc.text("WWW.9RX.COM", contentMargin, yPos);
  yPos += 2.5;

  // क्षैतिज रेखा विभाजक
  doc.setLineWidth(0.3);
  doc.line(contentMargin, yPos, labelWidth - contentMargin, yPos);
  yPos += 6;

  // बाएं कॉलम की सामग्री - केवल मान दिखाएँ, लेबल नहीं
  const leftX = contentMargin; // बाएं मार्जिन के साथ संरेखित करने के लिए 8mm पर सेट किया गया
  const rightX = labelWidth / 2 + 5; // दाएं कॉलम की सामग्री की शुरुआत

  // उत्पाद का नाम (केवल मान, कोई लेबल नहीं)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const productNameLines = doc.splitTextToSize(
    productName || "PRODUCT NAME",
    labelWidth / 2 - leftX - 2 // उत्पाद के नाम के लिए अधिकतम चौड़ाई
  );
  doc.text(productNameLines, leftX, yPos);
  yPos += productNameLines.length * 3.5 + 2;

  // आकार (केवल मान, कोई लेबल नहीं)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const sizeText = `${size.size_value || "N/A"}${
    isUnit ? ` ${size.size_unit || ""}` : ""
  }`;
  const sizeLines = doc.splitTextToSize(sizeText, labelWidth / 2 - leftX - 2);
  doc.text(sizeLines, leftX, yPos);
  yPos += sizeLines.length * 3.5 + 3.5;

  // प्रति केस मात्रा (केवल मान, कोई लेबल नहीं)
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

  // दाएं कॉलम की सामग्री
  let rightYPos = 18; // दाएं कॉलम के लिए शुरुआती Y स्थिति को समायोजित किया गया

  // LOT# (बोल्ड लेबल)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LOT#", rightX, rightYPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(size.lotNumber || "", rightX + 12, rightYPos);
  rightYPos += 4.5;

  // NDC# (बोल्ड लेबल)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("NDC#", rightX, rightYPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(size.ndcCode || "", rightX + 12, rightYPos);
  rightYPos += 4.5;

  // EXPIRY: (बोल्ड लेबल)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("EXPIRY:", rightX, rightYPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(size.exipry || "", rightX + 18, rightYPos);
  rightYPos += 6;

  // बारकोड जनरेट करें और जोड़ें
  if (size.upcCode) {
    try {
      const barcodeData = generateBarcode(String(size.upcCode));
      const barcodeWidth = 35;
      const barcodeHeight = 8;
      // नए सामग्री मार्जिन के साथ बारकोड को दाईं ओर संरेखित करें
      const barcodeX = labelWidth - contentMargin - barcodeWidth;
      // बारकोड इमेज जोड़ें
      doc.addImage(
        barcodeData,
        "PNG",
        barcodeX,
        rightYPos,
        barcodeWidth,
        barcodeHeight
      );
      rightYPos += barcodeHeight + 1.5;

      // बारकोड के नीचे SKU टेक्स्ट जोड़ें
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(String(size.upcCode), barcodeX + barcodeWidth / 2, rightYPos, {
        align: "center",
      });
    } catch (error) {
      console.error(
        `SKU ${size.sku} के लिए बारकोड जनरेट करने में त्रुटि:`,
        error
      );
      doc.setFontSize(7);
      doc.text(`${size.sku}`, rightX, rightYPos);
    }
  }

  // फ़ाइल नाम के लिए उत्पाद और SKU नामों को साफ़ करें
  const fileNameProductName = productName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 30);
  const fileNameSku = size.sku
    ? size.sku.replace(/[^a-zA-Z0-9]/g, "_")
    : "UnknownSKU";
  doc.save(`Label_${fileNameProductName}_${fileNameSku}.pdf`);
};
