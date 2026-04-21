const PDFDocument = require("pdfkit");
const https = require("https");
const bwipjs = require('bwip-js');
const { createClient } = require("@supabase/supabase-js");

const BRAND_BLUE = '#283888';
const SUCCESS_GREEN = '#22C55E';
const ALERT_RED = '#EF4444';
const TEXT_DARK = '#3C3C3C';
const TEXT_MUTED = '#646464';
const BOX_LIGHT = '#F5F5F5';
const GRID_LINE = '#E2E8F0';
const DIVIDER_LINE = '#DCDCDC';
const BODY_TEXT_SOFT = '#4B5563';

const PAGE_MARGIN = 12; // 12mm margin (matching frontend)
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const TOP_BAND_HEIGHT = 5;
const FOOTER_Y = PAGE_HEIGHT - 30;
const FOOTER_SAFE_TOP_Y = PAGE_HEIGHT - 58;
const FOOTER_MIN_Y = PAGE_HEIGHT - 72;
const FOOTER_GAP_AFTER_CONTENT = 14;
const CONTINUATION_TOP_Y = 15;
const SUMMARY_ROW_HEIGHT = 8;
const SUMMARY_BOX_HEIGHT = 10;
const SUMMARY_BOX_GAP = 12;
const ADDRESS_LINE_GAP = 1.1;
const ADDRESS_MIN_LINE_HEIGHT = 4.2;
const DEFAULT_DOCUMENT_HEADER = {
  name: "9RX LLC",
  email: "info@9rx.com",
  phone: "+1 (800) 940-9619",
  taxId: "99-0540972",
  website: "www.9rx.com",
  street: "936 Broad River Ln",
  suite: "",
  city: "Charlotte",
  state: "NC",
  zipCode: "28211",
  country: "USA",
};
let cachedDocumentHeader = null;

// Helper functions
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => `${toNumber(value).toFixed(2)}`;

const formatAddressLine = (address) =>
  [address.street, address.suite, [address.city, address.state, address.zipCode].filter(Boolean).join(", "), address.country]
    .filter(Boolean)
    .join(", ");

const formatContactLine = (address) =>
  [
    address.phone ? `Phone: ${address.phone}` : "",
    address.email ? `Email: ${address.email}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");

const formatMetaLine = (address) =>
  [
    address.taxId ? `Tax ID: ${address.taxId}` : "",
    address.website || "",
  ]
    .filter(Boolean)
    .join("  |  ");

const getDocumentHeaderInfo = async () => {
  if (cachedDocumentHeader) return cachedDocumentHeader;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    cachedDocumentHeader = DEFAULT_DOCUMENT_HEADER;
    return cachedDocumentHeader;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("is_global", true)
      .maybeSingle();

    if (error) throw error;

    cachedDocumentHeader = {
      name: String(data?.invoice_company_name || data?.business_name || DEFAULT_DOCUMENT_HEADER.name),
      email: String(data?.invoice_email || data?.email || DEFAULT_DOCUMENT_HEADER.email),
      phone: String(data?.invoice_phone || data?.phone || DEFAULT_DOCUMENT_HEADER.phone),
      taxId: String(data?.invoice_tax_id || data?.tax_id_display || DEFAULT_DOCUMENT_HEADER.taxId),
      website: String(data?.invoice_website || DEFAULT_DOCUMENT_HEADER.website),
      street: String(data?.invoice_street || data?.address || DEFAULT_DOCUMENT_HEADER.street),
      suite: String(data?.invoice_suite || data?.suite || ""),
      city: String(data?.invoice_city || data?.city || DEFAULT_DOCUMENT_HEADER.city),
      state: String(data?.invoice_state || data?.state || DEFAULT_DOCUMENT_HEADER.state),
      zipCode: String(data?.invoice_zip_code || data?.zip_code || DEFAULT_DOCUMENT_HEADER.zipCode),
      country: String(data?.invoice_country || DEFAULT_DOCUMENT_HEADER.country),
    };

    return cachedDocumentHeader;
  } catch (error) {
    console.error("Failed to fetch document header settings:", error.message);
    cachedDocumentHeader = DEFAULT_DOCUMENT_HEADER;
    return cachedDocumentHeader;
  }
};

const drawTopBand = (doc, mm) => {
  doc.rect(0, 0, mm(PAGE_WIDTH), mm(TOP_BAND_HEIGHT)).fill(BRAND_BLUE);
};

const drawBottomBand = (doc, mm) => {
  doc.rect(0, mm(PAGE_HEIGHT - 2), mm(PAGE_WIDTH), mm(2)).fill(BRAND_BLUE);
};

const drawItemsTableHeader = (doc, mm, tableStartY, includePricingInPdf, colX) => {
  const tableHeaderHeight = 9;
  const tableX = PAGE_MARGIN;
  const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const headerTopY = tableStartY;
  const headerBottomY = tableStartY + tableHeaderHeight;

    doc.rect(mm(tableX), mm(tableStartY), mm(tableWidth), mm(tableHeaderHeight))
      .fillColor(BRAND_BLUE)
     .fill();

  doc.fontSize(8.5)
     .fillColor('#FFFFFF')
     .font('Helvetica-Bold');

  doc.text('SKU', mm(colX.num), mm(tableStartY + 3));
  doc.text('Description', mm(colX.desc), mm(tableStartY + 3));
  doc.text('Size', mm(colX.size), mm(tableStartY + 3));
  doc.text('Qty', mm(colX.qty), mm(tableStartY + 3));
  if (includePricingInPdf) {
    doc.text('Unit Price', mm(colX.price), mm(tableStartY + 3));
    doc.text('Total', mm(colX.total), mm(tableStartY + 3));
  }

  // Frontend jsPDF autoTable shows subtle header cell borders; emulate with light vertical separators.
  const dividerXs = [
    colX.desc - 2,
    colX.size - 2,
    colX.qty - 2,
    ...(includePricingInPdf ? [colX.price - 2, colX.total - 2] : []),
  ];
  dividerXs.forEach((x) => {
    doc.moveTo(mm(x), mm(headerTopY + 0.8))
       .lineTo(mm(x), mm(headerBottomY - 0.8))
       .strokeColor('#FFFFFF')
       .lineWidth(0.2)
       .strokeOpacity(0.55)
       .stroke();
  });

  doc.strokeOpacity(1);
};

const addContinuationPage = (doc, mm) => {
  doc.addPage();
  drawTopBand(doc, mm);
  return CONTINUATION_TOP_Y;
};

const getDiscountRows = (discountAmount, discountDetails = []) => {
  if (discountAmount <= 0) return [];

  if (!Array.isArray(discountDetails) || discountDetails.length === 0) {
    return [{ name: "Credit Memo", amount: discountAmount }];
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

// Generate barcode using bwip-js
const generateBarcode = async (text) => {
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: 2,
      height: 10,
      includetext: false,
      textxalign: 'center',
    });
    return png;
  } catch (err) {
    console.error('Barcode generation error:', err);
    return null;
  }
};

// Fetch logo
const fetchLogo = () => {
  return new Promise((resolve) => {
    const logoUrl = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/9RX%20LOGO/9rx_logo.png";
    
    https.get(logoUrl, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
};

/**
 * Generate frontend-style PDF - EXACT match with InvoicePreview.tsx
 */
const generateFrontendStylePdf = async (order = {}, options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const documentType = options.documentType || 'SALES ORDER';
      const rawPaymentStatus = String(order.payment_status || '').toLowerCase();
      const isPaid = rawPaymentStatus === 'paid';
      const isInvoice = documentType === 'INVOICE';
      const isPurchaseOrder = documentType === 'PURCHASE ORDER';
      const includePricingInPdf = !isPurchaseOrder || options.includePricingInPdf !== false;
      const headerInfo = await getDocumentHeaderInfo();
      const supportEmail = headerInfo.email || DEFAULT_DOCUMENT_HEADER.email;
      
      const orderNumber = order?.order_number || order?.orderNumber || "N/A";
      const invoiceNumber = order?.invoice_number || `INV-${Date.now()}`;
      const documentNumber = isInvoice ? invoiceNumber : orderNumber;
      const documentTitle = isInvoice ? 'INVOICE' : (isPurchaseOrder ? 'PURCHASE ORDER' : 'SALES ORDER');
      
      console.log("🎨 Generating PDF with frontend logic:", {
        documentType,
        isPaid,
        orderNumber,
        invoiceNumber
      });
      
      // Extract order data - EXACT frontend logic
      const items = order?.items || [];
      
      console.log("🔍 Items structure check:", {
        items_count: items.length,
        first_item: items[0],
        has_sizes: items[0]?.sizes ? true : false,
        sizes_count: items[0]?.sizes?.length
      });
      
      // Calculate subtotal from items if not provided
      let subtotal = toNumber(order?.subtotal || 0);
      if (subtotal === 0 && items.length > 0) {
        subtotal = items.reduce((sum, item) => {
          if (Array.isArray(item.sizes) && item.sizes.length > 0) {
            return sum + item.sizes.reduce((sizeSum, size) => {
              const price = toNumber(size.price || 0);
              const qty = toNumber(size.quantity || 0);
              console.log(`  Item: ${item.name}, Size: ${size.size_value} ${size.size_unit}, Price: ${price}, Qty: ${qty}, Total: ${price * qty}`);
              return sizeSum + (price * qty);
            }, 0);
          } else {
            const price = toNumber(item.price || item.unit_price || 0);
            const qty = toNumber(item.quantity || 1);
            console.log(`  Item: ${item.name}, Price: ${price}, Qty: ${qty}, Total: ${price * qty}`);
            return sum + (price * qty);
          }
        }, 0);
      }
      
      console.log("💰 Calculated subtotal:", subtotal);
      
      const shipping = toNumber(order?.shipping_cost || order?.shippin_cost || 0);
      const tax = toNumber(order?.tax_amount || order?.tax || 0);
      const freightCharges = toNumber(order?.po_fred_charges || order?.po_freight_charges || 0);
      const handlingCharges = toNumber(order?.po_handling_charges || 0);
      const discountAmount = toNumber(order?.discount_amount || 0);
      const processingFeeAmount = toNumber(order?.processing_fee_amount || 0);
      const discountDetails = order?.discount_details || [];
      
      // Calculate total: subtotal + shipping + tax - discount, plus PO charge fields when present.
      const calculatedTotal = isPurchaseOrder
        ? subtotal + shipping + tax + freightCharges + handlingCharges - discountAmount
        : subtotal + shipping + tax - discountAmount;
      const storedTotal = toNumber(order?.total_amount || order?.total || 0);
      const total = isPurchaseOrder ? calculatedTotal : (storedTotal > 0 ? storedTotal : calculatedTotal);
      
      const paidAmount = toNumber(order?.paid_amount || 0);
      const actualPaid = (isPaid && paidAmount === 0) ? total : paidAmount;
      const balanceDue = Math.max(0, total - actualPaid);
      const isPartialPaid = rawPaymentStatus === 'partial_paid' || (actualPaid > 0 && balanceDue > 0);
      
      console.log("📊 PDF Calculation Details:", {
        subtotal,
        shipping,
        tax,
        discountAmount,
        processingFeeAmount,
        calculatedTotal,
        storedTotal,
        finalTotal: total,
        paidAmount,
        actualPaid,
        balanceDue,
        discountDetails,
        formattedSubtotal: formatCurrency(subtotal),
        formattedShipping: formatCurrency(shipping),
        formattedTax: formatCurrency(tax)
      });
      
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        bufferPages: true,
      });
      
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const filePrefix = isInvoice ? "Invoice" : (isPurchaseOrder ? "PurchaseOrder" : "SalesOrder");
        const safeDocNumber = String(documentNumber).replace(/[^a-zA-Z0-9-_]/g, "_");
        
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `${filePrefix}_${safeDocNumber}.pdf`,
          documentType,
          balanceDue,
          paymentUrl: options.paymentUrl,
        });
      });
      
      // Convert mm to points for PDFKit (1mm = 2.83465 points)
      const mm = (value) => value * 2.83465;
      
      drawTopBand(doc, mm);

      const currentDate = new Date(order?.created_at || Date.now()).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });

      const headerContentY = 10;
      const leftColumnWidth = 64;
      const rightColumnWidth = 62;
      const rightColumnX = PAGE_WIDTH - PAGE_MARGIN;
      const leftInfoLines = [
        { text: headerInfo.name || DEFAULT_DOCUMENT_HEADER.name, bold: true, fontSize: 11, color: TEXT_DARK },
        { text: headerInfo.street || '', bold: false, fontSize: 8.5, color: TEXT_MUTED },
        { text: headerInfo.suite || '', bold: false, fontSize: 8.5, color: TEXT_MUTED },
        {
          text: [
            [headerInfo.city, headerInfo.state, headerInfo.zipCode].filter(Boolean).join(', '),
            headerInfo.country,
          ].filter(Boolean).join(', '),
          bold: false,
          fontSize: 8.5,
          color: TEXT_MUTED,
        },
        { text: headerInfo.phone ? `Phone: ${headerInfo.phone}` : '', bold: false, fontSize: 8.5, color: TEXT_MUTED },
        { text: headerInfo.email ? `Email: ${headerInfo.email}` : '', bold: false, fontSize: 8.5, color: TEXT_MUTED },
        { text: headerInfo.taxId ? `Tax ID: ${headerInfo.taxId}` : '', bold: false, fontSize: 8.5, color: TEXT_MUTED },
        { text: headerInfo.website || '', bold: false, fontSize: 8.5, color: TEXT_MUTED },
      ].filter((line) => line.text);

      let addressY = headerContentY + 3;
      leftInfoLines.forEach((line, index) => {
        doc.fontSize(line.fontSize)
           .font(line.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fillColor(line.color)
           .text(line.text, mm(PAGE_MARGIN), mm(addressY), {
             width: mm(leftColumnWidth),
             lineGap: 0,
           });
        const measuredHeight = doc.heightOfString(line.text, { width: mm(leftColumnWidth), lineGap: 0 }) / 2.83465;
        addressY += measuredHeight + (index === 0 ? 0.8 : 0.6);
      });

      let logoBottomY = headerContentY;
      try {
        const logoBuffer = await fetchLogo();
        if (logoBuffer) {
          const logoHeight = 26;
          const logoWidth = logoHeight * 1.5;
          doc.image(logoBuffer, mm(PAGE_WIDTH / 2 - logoWidth / 2), mm(headerContentY), {
            width: mm(logoWidth),
            height: mm(logoHeight),
          });
          logoBottomY = headerContentY + logoHeight;
        } else {
          doc.fontSize(18)
             .font('Helvetica-Bold')
             .fillColor(TEXT_DARK)
             .text(headerInfo.name || DEFAULT_DOCUMENT_HEADER.name, mm(PAGE_WIDTH / 2 - 30), mm(headerContentY + 10), {
               width: mm(60),
               align: 'center',
               lineBreak: false,
             });
          logoBottomY = headerContentY + 10;
        }
      } catch (err) {
        console.log('Logo fetch failed');
      }

      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(BRAND_BLUE)
         .text(documentTitle, mm(rightColumnX - rightColumnWidth), mm(headerContentY + 4), {
           width: mm(rightColumnWidth),
           align: 'right',
           lineBreak: false,
         });

      let detailsY = headerContentY + 11;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(TEXT_DARK)
         .text(`# ${documentNumber}`, mm(rightColumnX - rightColumnWidth), mm(detailsY), {
           width: mm(rightColumnWidth),
           align: 'right',
           lineBreak: false,
         });

      detailsY += 6;
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(TEXT_MUTED)
         .text(`Date: ${currentDate}`, mm(rightColumnX - rightColumnWidth), mm(detailsY), {
           width: mm(rightColumnWidth),
           align: 'right',
           lineBreak: false,
         });

      if (isInvoice) {
        detailsY += 7;
        doc.text(`SO Ref: ${orderNumber}`, mm(rightColumnX - rightColumnWidth), mm(detailsY), {
          width: mm(rightColumnWidth),
          align: 'right',
          lineBreak: false,
        });
      }

      let rightBottomY = detailsY;
      if (!isPurchaseOrder) {
        const badgeLabel = isPaid ? 'PAID' : 'UNPAID';
        const badgeColor = isPaid ? SUCCESS_GREEN : ALERT_RED;
        const badgeWidth = badgeLabel === 'PAID' ? 25 : 30;
        const badgeY = rightBottomY + 6;
        const badgeX = rightColumnX - badgeWidth;
        doc.roundedRect(mm(badgeX), mm(badgeY), mm(badgeWidth), mm(8), mm(2))
           .fill(badgeColor);

        doc.fontSize(8)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text(badgeLabel, mm(badgeX), mm(badgeY + 2.8), {
             width: mm(badgeWidth),
             align: 'center',
             lineBreak: false,
           });
        rightBottomY = badgeY + 8;
      }

      const dividerY = Math.max(addressY, logoBottomY, rightBottomY) + 1;
      doc.moveTo(mm(PAGE_MARGIN), mm(dividerY))
         .lineTo(mm(PAGE_WIDTH - PAGE_MARGIN), mm(dividerY))
         .strokeColor(DIVIDER_LINE)
         .lineWidth(0.5)
         .stroke();

      const sectionY = dividerY + 5;
      const boxWidth = (PAGE_WIDTH - PAGE_MARGIN * 3) / 2;
      const customerName = order?.customerInfo?.name || order?.customer_name || 'Customer';
      const customerPhone = order?.customerInfo?.phone || order?.customer_phone || '';
      const customerEmail = order?.customerInfo?.email || order?.customer_email || '';
      const customerAddress = order?.customerInfo?.address || {};
      const shipName = order?.shippingInfo?.fullName || order?.shippingAddress?.fullName || customerName;
      const shipPhone = order?.shippingInfo?.phone || order?.shippingAddress?.phone || customerPhone;
      const shipAddress = order?.shippingInfo?.address || order?.shippingAddress?.address || {};

      const billToLines = [
        order?.company_name || order?.companyName || '',
        customerName,
        customerPhone,
        customerEmail,
        [customerAddress.street, customerAddress.city, customerAddress.state, customerAddress.zip_code]
          .filter(Boolean)
          .join(', '),
      ].filter(Boolean);

      const shipToLines = [
        shipName,
        shipPhone,
        shipAddress.street || '',
        [shipAddress.city, shipAddress.state, shipAddress.zip_code].filter(Boolean).join(', '),
      ].filter(Boolean);

      const measureInfoBox = (lines) => {
        const visibleLines = lines.slice(0, 5);
        const wrappedHeight = visibleLines.reduce((sum, line) => {
          const lineHeight = doc.heightOfString(line, { width: mm(boxWidth - 10), lineGap: 0 }) / 2.83465;
          return sum + Math.max(ADDRESS_MIN_LINE_HEIGHT, lineHeight);
        }, 0);
        const spacingHeight = Math.max(0, visibleLines.length - 1) * ADDRESS_LINE_GAP;
        return {
          visibleLines,
          boxHeight: Math.max(29, 12 + wrappedHeight + spacingHeight + 4),
        };
      };

      const drawInfoBox = (title, x, measured, sharedHeight) => {
        doc.roundedRect(mm(x), mm(sectionY), mm(boxWidth), mm(sharedHeight), mm(2))
           .fill(BOX_LIGHT);

        doc.fontSize(9)
           .fillColor(BRAND_BLUE)
           .font('Helvetica-Bold')
           .text(title, mm(x + 5), mm(sectionY + 6), { lineBreak: false });

        let lineY = sectionY + 11.5;
        doc.fontSize(8.2)
          .fillColor(BODY_TEXT_SOFT)
           .font('Helvetica');
        measured.visibleLines.forEach((line) => {
          doc.text(line, mm(x + 5), mm(lineY), {
            width: mm(boxWidth - 10),
          });
          const h = doc.heightOfString(line, { width: mm(boxWidth - 10), lineGap: 0 }) / 2.83465;
          lineY += Math.max(ADDRESS_MIN_LINE_HEIGHT, h) + ADDRESS_LINE_GAP;
        });
      };

      const billToMeasured = measureInfoBox(billToLines);
      const shipToMeasured = measureInfoBox(shipToLines);
      const sharedInfoBoxHeight = Math.max(billToMeasured.boxHeight, shipToMeasured.boxHeight);
      drawInfoBox(isPurchaseOrder ? 'VENDOR' : 'BILL TO', PAGE_MARGIN, billToMeasured, sharedInfoBoxHeight);
      const shipToX = PAGE_MARGIN * 2 + boxWidth;
      drawInfoBox(isPurchaseOrder ? 'SHIP TO' : 'SHIP TO', shipToX, shipToMeasured, sharedInfoBoxHeight);

      // Items table header
      const tableStartY = sectionY + sharedInfoBoxHeight + 7;
      const tableHeaderHeight = 9;
      const colX = {
        num: PAGE_MARGIN + 2,
        desc: PAGE_MARGIN + 20,
        size: PAGE_MARGIN + 85,
        qty: PAGE_MARGIN + 125,
        price: PAGE_MARGIN + 145,
        total: PAGE_MARGIN + 168,
      };
      const unitPriceColWidth = (colX.total - colX.price) - 2;
      const totalColWidth = (PAGE_WIDTH - PAGE_MARGIN - colX.total) - 2;
      const bodyDividerXs = [
        colX.desc - 2,
        colX.size - 2,
        colX.qty - 2,
        ...(includePricingInPdf ? [colX.price - 2, colX.total - 2] : []),
      ];
      drawItemsTableHeader(doc, mm, tableStartY, includePricingInPdf, colX);
      
      // Table rows
      let rowY = tableStartY + tableHeaderHeight;
      const rowHeight = 8;
      let itemIndex = 1;
      let itemsGrandTotal = 0;
      const ensureTableRowSpace = () => {
        if (rowY + rowHeight <= FOOTER_SAFE_TOP_Y) return;
        rowY = addContinuationPage(doc, mm);
        drawItemsTableHeader(doc, mm, rowY, includePricingInPdf, colX);
        rowY += tableHeaderHeight;
        doc.fontSize(8)
          .fillColor(TEXT_DARK)
           .font('Helvetica');
      };
      
      doc.fontSize(8)
        .fillColor(TEXT_DARK)
         .font('Helvetica');
      
      // Process items - handle both flat items and items with sizes array
      items.forEach((item) => {
        if (Array.isArray(item.sizes) && item.sizes.length > 0) {
          // Item has sizes array (frontend format)
          item.sizes.forEach((size) => {
            const itemName = size.size_name || item.size_name || item.sizeName || item.name || item.product_name || "Item";
            const itemSize = `${size.size_value || ""} ${item.unitToggle ? (size.size_unit || "") : ""}`.trim();
            const itemQty = toNumber(size.quantity || 0);
            const itemPrice = toNumber(size.price || 0);
            const itemTotal = itemPrice * itemQty;
            itemsGrandTotal += itemTotal;
            ensureTableRowSpace();
            
            if (itemIndex % 2 === 0) {
              doc.rect(mm(PAGE_MARGIN), mm(rowY), mm(PAGE_WIDTH - PAGE_MARGIN * 2), mm(rowHeight))
                 .fill('#F8FAFC');
            }

            doc.moveTo(mm(PAGE_MARGIN), mm(rowY + rowHeight))
               .lineTo(mm(PAGE_WIDTH - PAGE_MARGIN), mm(rowY + rowHeight))
               .lineWidth(0.2)
               .strokeColor(GRID_LINE)
               .stroke();

            bodyDividerXs.forEach((x) => {
              doc.moveTo(mm(x), mm(rowY))
                .lineTo(mm(x), mm(rowY + rowHeight))
                .lineWidth(0.2)
                .strokeColor(GRID_LINE)
                .stroke();
            });

            doc.fillColor(TEXT_DARK);
            doc.text(size.sku || item.size_sku || item.sizeSku || item.sku || '', mm(colX.num), mm(rowY + 2.5), { width: mm(16) });
            doc.text(itemName, mm(colX.desc), mm(rowY + 2.5), { width: mm(62) });
            doc.text(itemSize, mm(colX.size), mm(rowY + 2.5), { width: mm(35) });
            doc.text(itemQty.toString(), mm(colX.qty), mm(rowY + 2.5));
            if (includePricingInPdf) {
              doc.text(`$${formatCurrency(itemPrice)}`, mm(colX.price), mm(rowY + 2.5));
              doc.text(`$${formatCurrency(itemTotal)}`, mm(colX.total), mm(rowY + 2.5));
            }
            
            rowY += rowHeight;
            itemIndex++;
          });
        } else {
          // Flat item structure (legacy format)
          const itemName = item.size_name || item.sizeName || item.name || item.product_name || "Item";
          const itemSize = item.size || "";
          const itemQty = toNumber(item.quantity || 1);
          const itemPrice = toNumber(item.price || item.unit_price || 0);
          const itemTotal = itemPrice * itemQty;
          itemsGrandTotal += itemTotal;
          ensureTableRowSpace();

          if (itemIndex % 2 === 0) {
            doc.rect(mm(PAGE_MARGIN), mm(rowY), mm(PAGE_WIDTH - PAGE_MARGIN * 2), mm(rowHeight))
               .fill('#F8FAFC');
          }

          doc.moveTo(mm(PAGE_MARGIN), mm(rowY + rowHeight))
             .lineTo(mm(PAGE_WIDTH - PAGE_MARGIN), mm(rowY + rowHeight))
             .lineWidth(0.2)
             .strokeColor(GRID_LINE)
             .stroke();

           bodyDividerXs.forEach((x) => {
            doc.moveTo(mm(x), mm(rowY))
              .lineTo(mm(x), mm(rowY + rowHeight))
              .lineWidth(0.2)
              .strokeColor(GRID_LINE)
              .stroke();
           });

           doc.fillColor(TEXT_DARK);
          doc.text(item.size_sku || item.sizeSku || item.sku || '', mm(colX.num), mm(rowY + 2.5), { width: mm(16) });
          doc.text(itemName, mm(colX.desc), mm(rowY + 2.5), { width: mm(62) });
          doc.text(itemSize, mm(colX.size), mm(rowY + 2.5), { width: mm(35) });
          doc.text(itemQty.toString(), mm(colX.qty), mm(rowY + 2.5));
          if (includePricingInPdf) {
            doc.text(`$${formatCurrency(itemPrice)}`, mm(colX.price), mm(rowY + 2.5));
            doc.text(`$${formatCurrency(itemTotal)}`, mm(colX.total), mm(rowY + 2.5));
          }
          
          rowY += rowHeight;
          itemIndex++;
        }
      });

      if (includePricingInPdf) {
        ensureTableRowSpace();

        doc.rect(mm(PAGE_MARGIN), mm(rowY), mm(PAGE_WIDTH - PAGE_MARGIN * 2), mm(rowHeight))
          .fill('#F8FAFC');

        doc.moveTo(mm(PAGE_MARGIN), mm(rowY + rowHeight))
          .lineTo(mm(PAGE_WIDTH - PAGE_MARGIN), mm(rowY + rowHeight))
          .lineWidth(0.2)
          .strokeColor(GRID_LINE)
          .stroke();

        bodyDividerXs.forEach((x) => {
         doc.moveTo(mm(x), mm(rowY))
           .lineTo(mm(x), mm(rowY + rowHeight))
           .lineWidth(0.2)
           .strokeColor(GRID_LINE)
           .stroke();
        });

        doc.fontSize(8)
          .fillColor(BODY_TEXT_SOFT)
          .font('Helvetica-Bold')
            .text('TOTAL:', mm(colX.price + 1), mm(rowY + 2.5), { width: mm(unitPriceColWidth), align: 'left' })
            .text(`$${formatCurrency(itemsGrandTotal)}`, mm(colX.total + 1), mm(rowY + 2.5), { width: mm(totalColWidth), align: 'left' });

        doc.font('Helvetica').fillColor(TEXT_DARK);
        rowY += rowHeight;
      }
      let contentBottomY = rowY;
      
      if (includePricingInPdf) {
      // Totals section
      const totalsStartY = rowY + 8;
      const totalsX = PAGE_WIDTH - PAGE_MARGIN - 85;
      const valueX = PAGE_WIDTH - PAGE_MARGIN - 40;
      
      doc.fontSize(9)
         .font('Helvetica');
      
      const discountRows = getDiscountRows(discountAmount, discountDetails);
      const summaryRows = [
        { label: 'Subtotal', value: subtotal },
        { label: 'Shipping', value: shipping },
        { label: 'Tax', value: tax },
      ];

      if (isPurchaseOrder && freightCharges > 0) {
        summaryRows.push({ label: 'Freight', value: freightCharges });
      }

      if (isPurchaseOrder && handlingCharges > 0) {
        summaryRows.push({ label: 'Handling', value: handlingCharges });
      }

      if (processingFeeAmount > 0) {
        summaryRows.push({ label: 'Credit Card Processing Fee', value: processingFeeAmount });
      }
      const totalBoxWidth = 80;
      const totalBoxHeight = SUMMARY_BOX_HEIGHT;
      const totalBoxX = PAGE_WIDTH - PAGE_MARGIN - 85;
      const hasPaidBlock = actualPaid > 0;
      const hasBalanceBlock = actualPaid > 0 && balanceDue > 0 && !isPurchaseOrder;
      const hasFullyPaidBlock = actualPaid > 0 && balanceDue === 0;
      const finalBlockHeight = totalBoxHeight
        + (hasPaidBlock ? SUMMARY_BOX_GAP + totalBoxHeight : 0)
        + ((hasBalanceBlock || hasFullyPaidBlock) ? SUMMARY_BOX_GAP + totalBoxHeight : 0);
      const estimatedSummaryHeight =
        (summaryRows.length * SUMMARY_ROW_HEIGHT)
        + (discountRows.length > 0 ? SUMMARY_ROW_HEIGHT + (discountRows.length * SUMMARY_ROW_HEIGHT) : 0)
        + 4
        + 2
        + finalBlockHeight;
      const summaryAnchorY = FOOTER_SAFE_TOP_Y - estimatedSummaryHeight;
      let totalY = Math.max(totalsStartY, summaryAnchorY);

      const moveSummaryToNextPage = () => {
        totalY = addContinuationPage(doc, mm);
        doc.fontSize(9)
           .fillColor(TEXT_DARK)
           .font('Helvetica');
      };

      const ensureSummarySpace = (requiredHeight) => {
        if (totalY + requiredHeight <= FOOTER_SAFE_TOP_Y) return;
        moveSummaryToNextPage();
      };
      
      console.log("🎨 Rendering totals at Y position:", totalsStartY);
      console.log("🎨 Totals X position:", totalsX, "Value X position:", valueX);
      
      summaryRows.forEach((summaryRow) => {
        ensureSummarySpace(SUMMARY_ROW_HEIGHT);
        doc.fillColor(TEXT_DARK);
        doc.text(summaryRow.label, mm(totalsX), mm(totalY));
        doc.text(`$${formatCurrency(summaryRow.value)}`, mm(valueX), mm(totalY), { width: mm(35), align: 'right', continued: false });
        totalY += SUMMARY_ROW_HEIGHT;
      });
      
      // Discounts (if any)
      if (discountRows.length > 0) {
        ensureSummarySpace(SUMMARY_ROW_HEIGHT);
        doc.moveTo(mm(totalsX), mm(totalY - 3))
           .lineTo(mm(valueX + 45), mm(totalY - 3))
           .strokeColor(DIVIDER_LINE)
           .lineWidth(0.3)
           .stroke();

        discountRows.forEach((discount) => {
          ensureSummarySpace(SUMMARY_ROW_HEIGHT);
          doc.fillColor(TEXT_DARK);
          doc.text(discount.name, mm(totalsX), mm(totalY));
          doc.text(`-$${formatCurrency(discount.amount)}`, mm(valueX), mm(totalY), { width: mm(35), align: 'right' });
          totalY += SUMMARY_ROW_HEIGHT;
        });
        doc.fillColor(TEXT_DARK);
      }
      
      totalY += 4;
      
      // Total box (blue background)
      ensureSummarySpace(finalBlockHeight);
      const totalBoxY = totalY + 2;
      doc.roundedRect(mm(totalBoxX), mm(totalBoxY), mm(totalBoxWidth), mm(totalBoxHeight), mm(1))
        .fill(BRAND_BLUE);
      
      doc.fontSize(10)
         .fillColor('#FFFFFF')
         .font('Helvetica-Bold')
        .text('TOTAL', mm(totalBoxX + 10), mm(totalBoxY + 3.5));
      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text(`$${formatCurrency(total)}`, mm(totalBoxX + totalBoxWidth - 30), mm(totalBoxY + 3.5), { width: mm(25), align: 'right' });
      
      // Add "PAID AMOUNT" and "FULLY PAID" badges if paid
      if (actualPaid > 0) {
          totalY = totalBoxY + SUMMARY_BOX_GAP;
        doc.roundedRect(mm(totalBoxX), mm(totalY), mm(totalBoxWidth), mm(totalBoxHeight), mm(2))
            .fillColor(SUCCESS_GREEN)
           .fill();
        
        doc.fontSize(10)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
            .text(isInvoice ? 'PAID AMOUNT' : 'PAID', mm(totalBoxX + 5), mm(totalY + 3.5));
          doc.fillColor('#FFFFFF')
            .font('Helvetica-Bold')
            .text(`$${formatCurrency(actualPaid)}`, mm(totalBoxX + totalBoxWidth - 30), mm(totalY + 3.5), { width: mm(25), align: 'right' });
        
          if (balanceDue > 0 && !isPurchaseOrder) {
           totalY += SUMMARY_BOX_GAP;
           doc.roundedRect(mm(totalBoxX), mm(totalY), mm(totalBoxWidth), mm(totalBoxHeight), mm(2))
             .fillColor(ALERT_RED)
             .fill();

           doc.fontSize(10)
             .fillColor('#FFFFFF')
             .font('Helvetica-Bold')
             .text('BALANCE DUE', mm(totalBoxX + 5), mm(totalY + 3.5));
           doc.fillColor('#FFFFFF')
              .font('Helvetica-Bold')
              .text(`$${formatCurrency(balanceDue)}`, mm(totalBoxX + totalBoxWidth - 30), mm(totalY + 3.5), { width: mm(25), align: 'right' });
          } else if (balanceDue === 0) {
          totalY += SUMMARY_BOX_GAP;
          doc.roundedRect(mm(totalBoxX), mm(totalY), mm(totalBoxWidth), mm(totalBoxHeight), mm(2))
             .fillColor(SUCCESS_GREEN)
             .fill();
          
          doc.fontSize(11)
             .fillColor('#FFFFFF')
             .font('Helvetica-Bold')
             .text('FULLY PAID', mm(totalBoxX), mm(totalY + 3.5), { width: mm(totalBoxWidth), align: 'center' });
        }
      }
      contentBottomY = Math.max(contentBottomY, totalY + totalBoxHeight);
      
      } else if (isPurchaseOrder) {
        doc.roundedRect(mm(PAGE_MARGIN), mm(rowY + 10), mm(PAGE_WIDTH - PAGE_MARGIN * 2), mm(12), mm(2))
           .fill(BOX_LIGHT);

        doc.fontSize(9)
           .fillColor(BRAND_BLUE)
           .font('Helvetica-Bold')
           .text('Vendor copy: pricing hidden', mm(PAGE_MARGIN + 4), mm(rowY + 14));

        doc.fontSize(8)
           .fillColor(TEXT_DARK)
           .font('Helvetica')
           .text('This purchase order includes quantities and delivery details only.', mm(PAGE_MARGIN + 4), mm(rowY + 18), {
             width: mm(PAGE_WIDTH - PAGE_MARGIN * 2 - 8),
           });
        contentBottomY = Math.max(contentBottomY, rowY + 24);
      }

      const pageRange = doc.bufferedPageRange();
      const lastPageFooterY = Math.max(
        FOOTER_MIN_Y,
        Math.min(FOOTER_Y, contentBottomY + FOOTER_GAP_AFTER_CONTENT)
      );
      for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
        doc.switchToPage(i);

        drawTopBand(doc, mm);
        drawBottomBand(doc, mm);

        const isLastPage = i === pageRange.start + pageRange.count - 1;
        const footerY = isLastPage ? lastPageFooterY : FOOTER_Y;
        const contactY = footerY + 6;
          const cautionY = contactY + 4.5;
        const showSalesOrderCaution = documentTitle === 'SALES ORDER';
        const cautionLine = 'Caution: Send your payment with this invoice to 936 Broad river ln, Charlotte, NC 28211 in name of 9RX LLC';
          doc.moveTo(mm(PAGE_MARGIN), mm(footerY - 5))
            .lineTo(mm(PAGE_WIDTH - PAGE_MARGIN), mm(footerY - 5))
            .strokeColor(DIVIDER_LINE)
            .lineWidth(0.3)
            .stroke();

        doc.fontSize(10)
           .fillColor(BRAND_BLUE)
           .font('Helvetica-Bold')
           .text(isPurchaseOrder ? 'Purchase order prepared for vendor fulfillment' : 'Thank you for your business!', mm(PAGE_MARGIN), mm(footerY), {
             width: mm(PAGE_WIDTH - PAGE_MARGIN * 2),
             align: 'center',
             lineBreak: false
           });
        
        doc.fontSize(8)
           .fillColor(TEXT_MUTED)
           .font('Helvetica')
           .text(
             isPurchaseOrder
               ? (includePricingInPdf
                 ? 'Includes cost detail for internal/vendor approval.'
                 : 'Quantity-only vendor copy. Pricing intentionally hidden.')
               : ((isPaid || isPartialPaid)
                 ? `Payment received  |  Questions? Contact us at ${supportEmail}`
                 : `Payment Terms: Net 30  |  Questions? Contact us at ${supportEmail}`),
             mm(PAGE_MARGIN),
             mm(contactY),
             {
               width: mm(PAGE_WIDTH - PAGE_MARGIN * 2),
               align: 'center',
               lineBreak: false,
             }
           );

        if (showSalesOrderCaution) {
          doc.fontSize(9)
             .fillColor(BRAND_BLUE)
             .font('Helvetica-Bold')
             .text(cautionLine, mm(PAGE_MARGIN), mm(cautionY), {
               width: mm(PAGE_WIDTH - PAGE_MARGIN * 2),
               align: 'center',
               lineBreak: false,
             });
        }

        doc.rect(mm(PAGE_WIDTH / 2 - 20), mm(PAGE_HEIGHT - 9), mm(40), mm(6))
           .fill('#FFFFFF');

        doc.fontSize(9)
           .fillColor(TEXT_DARK)
           .font('Helvetica')
           .text(`Page ${i - pageRange.start + 1} of ${pageRange.count}`, mm(PAGE_MARGIN), mm(PAGE_HEIGHT - 5), {
             width: mm(PAGE_WIDTH - PAGE_MARGIN * 2),
             align: 'center',
             lineBreak: false,
             baseline: 'middle'
           });
      }
      
      doc.end();
      
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
};

module.exports = {
  generateFrontendStylePdf,
};
