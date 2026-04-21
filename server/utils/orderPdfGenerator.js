const fs = require("fs");
const https = require("https");
const path = require("path");
const PDFDocument = require("pdfkit");

const DEFAULT_FRONTEND_URL = "https://9rx.com";
const PAGE_MARGIN = 50;
const FOOTER_TOP_OFFSET = 104;
const TABLE_BREAK_Y = 705;
const HEADER_SEPARATOR_Y = 168;
const BODY_SECTION_START_Y = 184;
const BODY_TABLE_START_Y = 264;
const REMOTE_HEADER_LOGO_URL = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/9RX%20LOGO/9rx_logo.png";
const HEADER_LOGO_PATHS = [
  path.resolve(__dirname, "../../public/logo.png"),
  path.resolve(__dirname, "../../public/logolook.png"),
  path.resolve(__dirname, "../../public/logoFul.png"),
];
let cachedHeaderLogoBuffer = null;
let pendingHeaderLogoFetch = null;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => `$${toNumber(value).toFixed(2)}`;

const getDiscountRows = (discountAmount, discountDetails = []) => {
  if (discountAmount <= 0) return [];

  if (!Array.isArray(discountDetails) || discountDetails.length === 0) {
    return [{ name: "Discount", amount: discountAmount }];
  }

  const rows = discountDetails.map((discount) => ({
    name: discount?.name || "Discount",
    amount: toNumber(discount?.amount || 0),
  }));

  const detailedTotal = rows.reduce((sum, discount) => sum + toNumber(discount.amount), 0);
  const remainder = Number((discountAmount - detailedTotal).toFixed(2));

  if (Math.abs(remainder) >= 0.01) {
    rows.push({ name: "Discount", amount: Math.abs(remainder) });
  }

  return rows;
};

const getFrontendBaseUrl = () =>
  (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, "");

const buildPayNowUrl = (orderId) => {
  if (!orderId) return null;
  return `${getFrontendBaseUrl()}/pay-now?orderid=${encodeURIComponent(orderId)}`;
};

const extractItemRows = (items = []) => {
  const rows = [];

  for (const item of items) {
    const baseName = item?.name || item?.product_name || item?.title || "Item";

    if (Array.isArray(item?.sizes) && item.sizes.length > 0) {
      for (const size of item.sizes) {
        const qty = toNumber(size?.quantity || 0);
        const unitPrice = toNumber(size?.price || item?.price || 0);
        rows.push({
          name: baseName,
          detail: size?.size || size?.name || size?.size_value || "",
          quantity: qty || 1,
          unitPrice,
          lineTotal: unitPrice * (qty || 1),
        });
      }
      continue;
    }

    const qty = toNumber(item?.quantity || 0) || 1;
    const unitPrice = toNumber(item?.unit_price || item?.price || 0);
    rows.push({
      name: baseName,
      detail: item?.ndc ? `NDC: ${item.ndc}` : "",
      quantity: qty,
      unitPrice,
      lineTotal: unitPrice * qty,
    });
  }

  return rows;
};

const inferDocumentType = (order, explicitType) => {
  if (explicitType === "INVOICE" || explicitType === "SALES ORDER") {
    return explicitType;
  }

  if (order?.invoice_number) return "INVOICE";
  return "SALES ORDER";
};

const inferDocumentNumber = (order, documentType) =>
  documentType === "SALES ORDER"
    ? (order?.order_number || order?.orderNumber || order?.id || "N/A")
    : (order?.invoice_number || order?.order_number || order?.orderNumber || order?.id || "N/A");

const getShippingAddressLines = (order) => {
  const shipping = order?.shippingAddress || {};
  const address = shipping?.address || {};

  const name = shipping?.fullName || order?.customerInfo?.name || "Customer";
  const line1 = address?.street || address?.street1 || "";
  const cityStateZip = [address?.city, address?.state, address?.zip_code]
    .filter(Boolean)
    .join(", ")
    .replace(", ,", ",");

  return [name, line1, cityStateZip].filter(Boolean);
};

const fetchBufferFromUrl = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Logo fetch failed: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });

const resolveLocalLogoBuffer = () => {
  const logoPath = HEADER_LOGO_PATHS.find((candidate) => fs.existsSync(candidate)) || null;
  if (!logoPath) return null;
  try {
    return fs.readFileSync(logoPath);
  } catch (_error) {
    return null;
  }
};

const getHeaderLogoBuffer = async () => {
  if (cachedHeaderLogoBuffer) return cachedHeaderLogoBuffer;
  if (pendingHeaderLogoFetch) return pendingHeaderLogoFetch;

  pendingHeaderLogoFetch = (async () => {
    try {
      const remoteBuffer = await fetchBufferFromUrl(REMOTE_HEADER_LOGO_URL);
      cachedHeaderLogoBuffer = remoteBuffer;
      return remoteBuffer;
    } catch (_error) {
      const localBuffer = resolveLocalLogoBuffer();
      cachedHeaderLogoBuffer = localBuffer;
      return localBuffer;
    } finally {
      pendingHeaderLogoFetch = null;
    }
  })();

  return pendingHeaderLogoFetch;
};

const drawTableHeader = (doc, y) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111827")
    .text("Item", 50, y, { width: 250 })
    .text("Qty", 320, y, { width: 50, align: "right" })
    .text("Unit", 390, y, { width: 70, align: "right" })
    .text("Total", 470, y, { width: 75, align: "right" });

  doc
    .moveTo(50, y + 14)
    .lineTo(545, y + 14)
    .lineWidth(1)
    .strokeColor("#d1d5db")
    .stroke();
};

const drawPageFooter = (doc, meta) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const footerY = pageHeight - FOOTER_TOP_OFFSET;
  const margin = PAGE_MARGIN;
  const primaryBlue = "#3B82F6";
  const mediumText = "#6B7280";

  doc
    .strokeColor(primaryBlue)
    .lineWidth(0.5)
    .moveTo(margin, footerY)
    .lineTo(pageWidth - margin, footerY)
    .stroke();

  const centerText = (value, y, fontName, size, color) => {
    doc.font(fontName).fontSize(size).fillColor(color);
    const text = String(value || "");
    const textWidth = doc.widthOfString(text);
    const x = Math.max(margin, (pageWidth - textWidth) / 2);
    doc.text(text, x, y, { lineBreak: false });
  };

  centerText(
    "9RX LLC | 936 Broad River Ln, Charlotte, NC 28211 | +1 (800) 940-9619 | info@9rx.com",
    footerY + 6,
    "Helvetica",
    7,
    mediumText
  );
  centerText(meta.generatedAtText, footerY + 17, "Helvetica", 6, mediumText);
  centerText("Thank you for your business!", footerY + 30, "Helvetica-Oblique", 8, primaryBlue);
  centerText(`Page ${meta.pageNumber} of ${meta.totalPages}`, footerY + 42, "Helvetica", 7, mediumText);

  doc.rect(0, pageHeight - 6, pageWidth, 6).fill(primaryBlue);
};

const addPageWithHeader = (doc, headerMeta) => {
  doc.addPage();
  const pageWidth = doc.page.width;
  const margin = PAGE_MARGIN;
  const rightEdge = pageWidth - margin;
  const primaryBlue = "#3B82F6";
  const mediumText = "#6b7280";
  const badgeGreen = "#22c55e";
  const badgeRed = "#ef4444";
  const titleText = headerMeta.documentType === "SALES ORDER" ? "SALES ORDER" : "INVOICE";
  const tRight = (value, y, font, size, color) => {
    const text = String(value || "");
    doc.font(font).fontSize(size).fillColor(color);
    const x = rightEdge - doc.widthOfString(text);
    doc.text(text, x, y, { lineBreak: false });
  };

  doc.rect(0, 0, pageWidth, 9).fill(primaryBlue);

  if (headerMeta.logoBuffer) {
    doc.image(headerMeta.logoBuffer, 50, 20, { fit: [92, 74] });
  } else {
    doc
      .font("Helvetica-Bold")
      .fontSize(30)
      .fillColor("#3349a6")
      .text("9rx", 50, 35)
      .text(".com", 50, 63);
  }

  tRight(titleText, 22, "Helvetica-Bold", 20, primaryBlue);
  tRight(`# ${headerMeta.referenceNumber}`, 60, "Helvetica-Bold", 10, "#374151");
  tRight(`Date: ${headerMeta.dateText}`, 78, "Helvetica", 8, mediumText);

  doc
    .roundedRect(rightEdge - 90, 104, 90, 24, 8)
    .fill(headerMeta.isPaid ? badgeGreen : badgeRed);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#ffffff")
    .text(headerMeta.isPaid ? "PAID" : "UNPAID", rightEdge - 90, 112, {
      align: "center",
      width: 90,
      lineBreak: false,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("#374151")
    .text("9RX LLC", 50, 95);

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(mediumText)
    .text("936 Broad River Ln, Charlotte, NC 28211", 50, 116);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(mediumText)
    .text("Phone: +1 (800) 940-9619", 50, 133)
    .text("|", 188, 133)
    .text("Email: info@9rx.com", 198, 133)
    .text("Tax ID: 99-0540972", 50, 149)
    .text("|", 156, 149)
    .text("www.9rx.com", 166, 149);

  doc
    .strokeColor("#d1d5db")
    .lineWidth(1)
    .moveTo(PAGE_MARGIN, HEADER_SEPARATOR_Y)
    .lineTo(pageWidth - PAGE_MARGIN, HEADER_SEPARATOR_Y)
    .stroke();
};

const generateOrderDocumentPdf = async (order = {}, options = {}) =>
  new Promise((resolve, reject) => {
    (async () => {
      const documentType = inferDocumentType(order, options.documentType);
      const documentNumber = inferDocumentNumber(order, documentType);
      const orderNumber = order?.order_number || order?.orderNumber || "N/A";
      const referenceNumber = documentType === "SALES ORDER"
        ? orderNumber
        : (order?.invoice_number || documentNumber);
      const paymentUrl = options.paymentUrl || buildPayNowUrl(order?.id);
      const logoBuffer = await getHeaderLogoBuffer();

      const rows = extractItemRows(order?.items || []);
      const computedSubtotal = rows.reduce((sum, row) => sum + toNumber(row.lineTotal), 0);

      const subtotal = toNumber(order?.subtotal || computedSubtotal);
      const shipping = toNumber(order?.shipping_cost || order?.shippin_cost || 0);
      const tax = toNumber(order?.tax_amount || 0);
      const discount = toNumber(order?.discount_amount || 0);
      const discountDetails = order?.discount_details || [];
      const total = toNumber(order?.total_amount || order?.total || subtotal + shipping + tax - discount);
      const paymentStatus = String(order?.payment_status || "").toLowerCase();
      const paidAmountRaw = toNumber(order?.paid_amount || 0);
      // Credit/manual paid flows can have payment_status=paid with paid_amount left as 0.
      // In those cases, display as fully paid to avoid incorrect "Balance Due" in PDF.
      const paid = paidAmountRaw > 0 ? paidAmountRaw : (paymentStatus === "paid" ? total : 0);
      const adjustmentAmount = toNumber(order?.adjustment_amount || 0);
      const balanceDue = adjustmentAmount > 0 ? adjustmentAmount : Math.max(0, total - paid);

      const doc = new PDFDocument({
        size: "LETTER",
        margin: PAGE_MARGIN,
        autoFirstPage: false,
        bufferPages: true,
      });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const filePrefix = documentType === "INVOICE" ? "Invoice" : "SalesOrder";
        const safeDocNumber = String(documentNumber).replace(/[^a-zA-Z0-9-_]/g, "_");
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `${filePrefix}_${safeDocNumber}.pdf`,
          documentType,
          balanceDue,
          paymentUrl,
        });
      });
      doc.on("error", reject);

      const dateText = new Date(order?.date || order?.created_at || Date.now()).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      const headerMeta = {
        documentType,
        documentNumber,
        orderNumber,
        referenceNumber,
        dateText,
        isPaid: paymentStatus === "paid",
        logoBuffer,
      };
      addPageWithHeader(doc, headerMeta);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#111827")
        .text("Bill To", 50, BODY_SECTION_START_Y);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#374151")
        .text(order?.customerInfo?.name || "Customer", 50, BODY_SECTION_START_Y + 16)
        .text(order?.customerInfo?.email || "", 50, BODY_SECTION_START_Y + 30)
        .text(order?.customerInfo?.phone || "", 50, BODY_SECTION_START_Y + 44);

      const shippingLines = getShippingAddressLines(order);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#111827")
        .text("Ship To", 320, BODY_SECTION_START_Y);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#374151");
      let shipY = BODY_SECTION_START_Y + 16;
      for (const line of shippingLines) {
        doc.text(line, 320, shipY, { width: 220 });
        shipY += 14;
      }

      let y = Math.max(BODY_TABLE_START_Y, shipY + 18);
      drawTableHeader(doc, y);
      y += 22;

      for (const row of rows) {
        const itemLabel = row.detail ? `${row.name} (${row.detail})` : row.name;
        const itemHeight = Math.max(
          doc.heightOfString(itemLabel, { width: 250 }),
          12
        );
        const rowHeight = itemHeight + 6;

        if (y + rowHeight > TABLE_BREAK_Y) {
          addPageWithHeader(doc, headerMeta);
          y = BODY_SECTION_START_Y;
          drawTableHeader(doc, y);
          y += 22;
        }

        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#111827")
          .text(itemLabel, 50, y, { width: 250 })
          .text(String(row.quantity), 320, y, { width: 50, align: "right" })
          .text(formatCurrency(row.unitPrice), 390, y, { width: 70, align: "right" })
          .text(formatCurrency(row.lineTotal), 470, y, { width: 75, align: "right" });

        y += rowHeight;
      }

      const discountRows = getDiscountRows(discount, discountDetails);
      const summaryRows = 5 + discountRows.length + (discountRows.length > 0 ? 1 : 0);
      const paymentBlockHeight = paymentUrl && balanceDue > 0 ? 56 : 0;
      const requiredPostTableHeight = 12 + summaryRows * 16 + paymentBlockHeight + 20;
      if (y + requiredPostTableHeight > 730) {
        addPageWithHeader(doc, headerMeta);
        y = BODY_SECTION_START_Y;
      }

      const summaryX = 330;
      doc
        .moveTo(summaryX, y + 4)
        .lineTo(545, y + 4)
        .lineWidth(1)
        .strokeColor("#d1d5db")
        .stroke();
      y += 12;

      const writeSummaryRow = (label, value, bold = false, color = "#111827") => {
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(bold ? 11 : 10)
          .fillColor(color)
          .text(label, summaryX, y, { width: 100 })
          .text(value, 470, y, { width: 75, align: "right" });
        y += 16;
      };

      writeSummaryRow("Subtotal", formatCurrency(subtotal));
      writeSummaryRow("Shipping", formatCurrency(shipping));
      writeSummaryRow("Tax", formatCurrency(tax));
      if (discountRows.length > 0) {
        doc
          .moveTo(summaryX, y + 4)
          .lineTo(545, y + 4)
          .lineWidth(1)
          .strokeColor("#d1d5db")
          .stroke();
        y += 12;

        discountRows.forEach((discountRow) => {
          writeSummaryRow(discountRow.name, `-${formatCurrency(discountRow.amount)}`, false, "#047857");
        });
      }
      writeSummaryRow("Total", formatCurrency(total), true);
      writeSummaryRow("Paid", formatCurrency(paid), false, "#047857");
      writeSummaryRow("Balance Due", formatCurrency(balanceDue), true, balanceDue > 0 ? "#b91c1c" : "#047857");

      if (paymentUrl && balanceDue > 0) {
        y += 10;
        if (y > TABLE_BREAK_Y) {
          addPageWithHeader(doc, headerMeta);
          y = BODY_SECTION_START_Y;
        }

        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor("#111827")
          .text("Online Payment Link", 50, y);
        y += 16;
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#0b63ce")
          .text(paymentUrl, 50, y, {
            link: paymentUrl,
            underline: true,
            width: 500,
          });
      }

      const pageRange = doc.bufferedPageRange();
      const generatedAtText = `Generated on ${new Date().toLocaleDateString("en-US")} at ${new Date().toLocaleTimeString("en-US")}`;
      for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
        doc.switchToPage(pageIndex);
        drawPageFooter(doc, {
          pageNumber: pageIndex - pageRange.start + 1,
          totalPages: pageRange.count,
          generatedAtText,
        });
      }

      doc.end();
    })().catch(reject);
  });

module.exports = {
  buildPayNowUrl,
  generateOrderDocumentPdf,
};
