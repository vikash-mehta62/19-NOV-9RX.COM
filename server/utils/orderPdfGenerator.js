const PDFDocument = require("pdfkit");

const DEFAULT_FRONTEND_URL = "https://9rx.com";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => `$${toNumber(value).toFixed(2)}`;

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
  if (String(order?.payment_status || "").toLowerCase() === "paid") return "INVOICE";
  return "SALES ORDER";
};

const inferDocumentNumber = (order) =>
  order?.invoice_number || order?.order_number || order?.orderNumber || order?.id || "N/A";

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

const addPageWithHeader = (doc, headerMeta) => {
  doc.addPage();
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor("#111827")
    .text("9RX", 50, 45);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#111827")
    .text(headerMeta.documentType, 50, 74);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#4b5563")
    .text(`Document #: ${headerMeta.documentNumber}`, 50, 94)
    .text(`Order #: ${headerMeta.orderNumber}`, 50, 108)
    .text(`Date: ${headerMeta.dateText}`, 50, 122);
};

const generateOrderDocumentPdf = async (order = {}, options = {}) =>
  new Promise((resolve, reject) => {
    try {
      const documentType = inferDocumentType(order, options.documentType);
      const documentNumber = inferDocumentNumber(order);
      const orderNumber = order?.order_number || order?.orderNumber || "N/A";
      const paymentUrl = options.paymentUrl || buildPayNowUrl(order?.id);

      const rows = extractItemRows(order?.items || []);
      const computedSubtotal = rows.reduce((sum, row) => sum + toNumber(row.lineTotal), 0);

      const subtotal = toNumber(order?.subtotal || computedSubtotal);
      const shipping = toNumber(order?.shipping_cost || order?.shippin_cost || 0);
      const tax = toNumber(order?.tax_amount || 0);
      const discount = toNumber(order?.discount_amount || 0);
      const total = toNumber(order?.total_amount || order?.total || subtotal + shipping + tax - discount);
      const paid = toNumber(order?.paid_amount || 0);
      const adjustmentAmount = toNumber(order?.adjustment_amount || 0);
      const balanceDue = adjustmentAmount > 0 ? adjustmentAmount : Math.max(0, total - paid);

      const doc = new PDFDocument({ size: "A4", margin: 50 });
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

      const dateText = new Date(order?.date || order?.created_at || Date.now()).toLocaleDateString("en-US");
      const headerMeta = { documentType, documentNumber, orderNumber, dateText };
      addPageWithHeader(doc, headerMeta);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#111827")
        .text("Bill To", 50, 150);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#374151")
        .text(order?.customerInfo?.name || "Customer", 50, 166)
        .text(order?.customerInfo?.email || "", 50, 180)
        .text(order?.customerInfo?.phone || "", 50, 194);

      const shippingLines = getShippingAddressLines(order);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#111827")
        .text("Ship To", 320, 150);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#374151");
      let shipY = 166;
      for (const line of shippingLines) {
        doc.text(line, 320, shipY, { width: 220 });
        shipY += 14;
      }

      let y = Math.max(230, shipY + 18);
      drawTableHeader(doc, y);
      y += 22;

      for (const row of rows) {
        const itemLabel = row.detail ? `${row.name} (${row.detail})` : row.name;
        const itemHeight = Math.max(
          doc.heightOfString(itemLabel, { width: 250 }),
          12
        );
        const rowHeight = itemHeight + 6;

        if (y + rowHeight > 740) {
          addPageWithHeader(doc, headerMeta);
          y = 150;
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

      if (y > 660) {
        addPageWithHeader(doc, headerMeta);
        y = 150;
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
      if (discount > 0) writeSummaryRow("Discount", `-${formatCurrency(discount)}`);
      writeSummaryRow("Shipping", formatCurrency(shipping));
      writeSummaryRow("Tax", formatCurrency(tax));
      writeSummaryRow("Total", formatCurrency(total), true);
      writeSummaryRow("Paid", formatCurrency(paid), false, "#047857");
      writeSummaryRow("Balance Due", formatCurrency(balanceDue), true, balanceDue > 0 ? "#b91c1c" : "#047857");

      if (paymentUrl && balanceDue > 0) {
        y += 10;
        if (y > 730) {
          addPageWithHeader(doc, headerMeta);
          y = 150;
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

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

module.exports = {
  buildPayNowUrl,
  generateOrderDocumentPdf,
};

