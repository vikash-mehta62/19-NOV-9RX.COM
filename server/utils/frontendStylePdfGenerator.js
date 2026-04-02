const PDFDocument = require("pdfkit");
const https = require("https");
const bwipjs = require('bwip-js');
const { createClient } = require("@supabase/supabase-js");

// Professional blue and green color scheme matching frontend EXACTLY
const COLORS = {
  primary: [59, 130, 246],      // Blue-500 (#3B82F6)
  primaryDark: [37, 99, 235],   // Blue-600 (#2563EB)
  success: [16, 185, 129],      // Green-500 (#10B981)
  successDark: [5, 150, 105],   // Green-600 (#059669)
  dark: [31, 41, 55],           // Gray-800
  medium: [107, 114, 128],      // Gray-500
  light: [243, 244, 246],       // Gray-100
  lightBlue: [239, 246, 255],   // Blue-50
  white: [255, 255, 255],
  black: [0, 0, 0],
};

const PAGE_MARGIN = 12; // 12mm margin (matching frontend)
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const TOP_BAND_HEIGHT = 3;
const FOOTER_Y = PAGE_HEIGHT - 42;
const FOOTER_SAFE_TOP_Y = FOOTER_Y - 6;
const CONTINUATION_TOP_Y = 15;
const SUMMARY_ROW_HEIGHT = 8;
const SUMMARY_BOX_HEIGHT = 10;
const SUMMARY_BOX_GAP = 12;
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
  doc.rect(0, 0, mm(PAGE_WIDTH), mm(TOP_BAND_HEIGHT)).fill('#3B82F6');
};

const drawItemsTableHeader = (doc, mm, tableStartY, includePricingInPdf, colX) => {
  const tableHeaderHeight = 9;

  doc.roundedRect(mm(PAGE_MARGIN), mm(tableStartY), mm(PAGE_WIDTH - PAGE_MARGIN * 2), mm(tableHeaderHeight), mm(1))
     .fillColor('#3B82F6')
     .fill();

  doc.fontSize(9)
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
      const headerAddressLine = formatAddressLine(headerInfo);
      const headerContactLine = formatContactLine(headerInfo);
      const headerMetaLine = formatMetaLine(headerInfo);
      
      const orderNumber = order?.order_number || order?.orderNumber || "N/A";
      const invoiceNumber = order?.invoice_number || `INV-${Date.now()}`;
      const documentNumber = isInvoice ? invoiceNumber : orderNumber;
      
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
        margin: PAGE_MARGIN * 2.83465, // Convert mm to points
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
      
      // Add blue header band (3mm height - matching frontend)
      drawTopBand(doc, mm);
      
      // Add company logo
      try {
        const logoBuffer = await fetchLogo();
        if (logoBuffer) {
          const logoHeight = 18;
          const logoWidth = logoHeight * 1.5; // Approximate aspect ratio
          doc.image(logoBuffer, mm(PAGE_MARGIN), mm(8), { width: mm(logoWidth), height: mm(logoHeight) });
        }
      } catch (err) {
        console.log('Logo fetch failed');
      }
      
      // Company details (left side)
      doc.fontSize(14)
         .fillColor('#1F2937')
         .font('Helvetica-Bold')
         .text(headerInfo.name || DEFAULT_DOCUMENT_HEADER.name, mm(PAGE_MARGIN), mm(30));
      
      doc.fontSize(8)
         .fillColor('#6B7280')
         .font('Helvetica');
      if (headerAddressLine) {
        doc.text(headerAddressLine, mm(PAGE_MARGIN), mm(36));
      }
      if (headerContactLine) {
        doc.text(headerContactLine, mm(PAGE_MARGIN), mm(40));
      }
      if (headerMetaLine) {
        doc.text(headerMetaLine, mm(PAGE_MARGIN), mm(44));
      }
      
      // Document title (right side)
      const titleText = isInvoice ? 'INVOICE' : (isPurchaseOrder ? 'PURCHASE ORDER' : 'SALES ORDER');
      let titleFontSize = 26;
      while (titleFontSize > 18) {
        doc.fontSize(titleFontSize).font('Helvetica-Bold');
        if (doc.widthOfString(titleText) <= mm(65)) break;
        titleFontSize -= 1;
      }
      doc.fontSize(titleFontSize)
         .fillColor('#3B82F6')
         .font('Helvetica-Bold')
         .text(titleText, mm(PAGE_WIDTH - PAGE_MARGIN - 65), mm(14), { width: mm(65), align: 'right', lineBreak: false });
      
      // Order/Invoice number and date
      const currentDate = new Date().toLocaleDateString('en-US', { 
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      
      doc.fontSize(9)
         .fillColor('#1F2937')
         .font('Helvetica')
         .text(`# ${documentNumber}`, mm(PAGE_WIDTH - PAGE_MARGIN - 65), mm(24), { width: mm(65), align: 'right', lineBreak: false })
         .text(`Date: ${currentDate}`, mm(PAGE_WIDTH - PAGE_MARGIN - 65), mm(29), { width: mm(65), align: 'right', lineBreak: false });
      
      if (!isPurchaseOrder) {
        // Payment status badge
        const badgeLabel = isPaid ? 'PAID' : (isPartialPaid ? 'PARTIAL PAID' : 'UNPAID');
        const badgeColor = isPaid ? '#10B981' : (isPartialPaid ? '#F59E0B' : '#EF4444');
        const badgeWidth = isPartialPaid ? 40 : 30;
        const badgeX = mm(PAGE_WIDTH - PAGE_MARGIN - badgeWidth);
        const badgeY = mm(36);
        doc.roundedRect(badgeX, badgeY, mm(badgeWidth), mm(9), mm(2))
           .fill(badgeColor);

        doc.fontSize(isPartialPaid ? 8 : 9)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text(badgeLabel, badgeX, badgeY + mm(3), { width: mm(badgeWidth), align: 'center', lineBreak: false });
      }
      
      // Add barcode
      try {
        const barcodeBuffer = await generateBarcode(orderNumber);
        if (barcodeBuffer) {
          doc.image(barcodeBuffer, mm(PAGE_WIDTH - PAGE_MARGIN - 45), mm(50), { width: mm(45), height: mm(10) });
        }
      } catch (err) {
        console.log('Barcode generation failed');
      }
      
      // Separator line
      doc.moveTo(mm(PAGE_MARGIN), mm(62))
         .lineTo(mm(PAGE_WIDTH - PAGE_MARGIN), mm(62))
         .strokeColor('#F3F4F6')
         .lineWidth(0.5)
         .stroke();
      
      // Bill To and Ship To sections
      const sectionY = 68;
      const boxWidth = (PAGE_WIDTH - PAGE_MARGIN * 3) / 2;
      const boxHeight = 32;
      
      // Bill To box
      doc.roundedRect(mm(PAGE_MARGIN), mm(sectionY), mm(boxWidth), mm(boxHeight), mm(2))
         .fill('#EFF6FF');
      
      doc.fontSize(9)
         .fillColor('#3B82F6')
         .font('Helvetica-Bold')
         .text(isPurchaseOrder ? 'VENDOR' : 'BILL TO', mm(PAGE_MARGIN + 4), mm(sectionY + 5));
      
      doc.fontSize(8)
         .fillColor('#1F2937')
         .font('Helvetica');
      
      let billY = sectionY + 11;
      const customerName = order?.customerInfo?.name || order?.customer_name || "Customer";
      const customerPhone = order?.customerInfo?.phone || order?.customer_phone || "";
      const customerEmail = order?.customerInfo?.email || order?.customer_email || "";
      
      doc.text(customerName, mm(PAGE_MARGIN + 4), mm(billY));
      billY += 4.5;
      if (customerPhone) {
        doc.text(customerPhone, mm(PAGE_MARGIN + 4), mm(billY));
        billY += 4.5;
      }
      if (customerEmail) {
        doc.text(customerEmail, mm(PAGE_MARGIN + 4), mm(billY), { width: mm(boxWidth - 8) });
      }
      
      // Ship To box
      const shipToX = PAGE_MARGIN + boxWidth + PAGE_MARGIN;
      doc.roundedRect(mm(shipToX), mm(sectionY), mm(boxWidth), mm(boxHeight), mm(2))
         .fill('#EFF6FF');
      
      doc.fontSize(9)
         .fillColor('#3B82F6')
         .font('Helvetica-Bold')
         .text(isPurchaseOrder ? 'DELIVER TO' : 'SHIP TO', mm(shipToX + 4), mm(sectionY + 5));
      
      doc.fontSize(8)
         .fillColor('#1F2937')
         .font('Helvetica');
      
      let shipY = sectionY + 11;
      const shipName = order?.shippingInfo?.fullName || order?.shippingAddress?.fullName || customerName;
      const shipPhone = order?.shippingInfo?.phone || order?.shippingAddress?.phone || customerPhone;
      const shipAddress = order?.shippingInfo?.address || order?.shippingAddress?.address || {};
      
      doc.text(shipName, mm(shipToX + 4), mm(shipY));
      shipY += 4.5;
      if (shipPhone) {
        doc.text(shipPhone, mm(shipToX + 4), mm(shipY));
        shipY += 4.5;
      }
      if (shipAddress.street) {
        doc.text(shipAddress.street, mm(shipToX + 4), mm(shipY), { width: mm(boxWidth - 8) });
        shipY += 4.5;
      }
      const cityStateZip = `${shipAddress.city || ""}, ${shipAddress.state || ""} ${shipAddress.zip_code || ""}`.trim();
      if (cityStateZip !== ",") {
        doc.text(cityStateZip, mm(shipToX + 4), mm(shipY));
      }
      
      // Items table header
      const tableStartY = 108;
      const tableHeaderHeight = 9;
      const colX = {
        num: PAGE_MARGIN + 2,
        desc: PAGE_MARGIN + 20,
        size: PAGE_MARGIN + 85,
        qty: PAGE_MARGIN + 125,
        price: PAGE_MARGIN + 145,
        total: PAGE_MARGIN + 168,
      };
      drawItemsTableHeader(doc, mm, tableStartY, includePricingInPdf, colX);
      
      // Table rows
      let rowY = tableStartY + tableHeaderHeight;
      const rowHeight = 8;
      let itemIndex = 1;
      const ensureTableRowSpace = () => {
        if (rowY + rowHeight <= FOOTER_SAFE_TOP_Y) return;
        rowY = addContinuationPage(doc, mm);
        drawItemsTableHeader(doc, mm, rowY, includePricingInPdf, colX);
        rowY += tableHeaderHeight;
        doc.fontSize(8)
           .fillColor('#1F2937')
           .font('Helvetica');
      };
      
      doc.fontSize(8)
         .fillColor('#1F2937')
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
            ensureTableRowSpace();
            
            // Alternate row background
            if (itemIndex % 2 === 0) {
              doc.rect(mm(PAGE_MARGIN), mm(rowY), mm(PAGE_WIDTH - PAGE_MARGIN * 2), mm(rowHeight))
                 .fill('#EFF6FF');
            }
            
            doc.fillColor('#1F2937');
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
          ensureTableRowSpace();

          if (itemIndex % 2 === 0) {
            doc.rect(mm(PAGE_MARGIN), mm(rowY), mm(PAGE_WIDTH - PAGE_MARGIN * 2), mm(rowHeight))
               .fill('#EFF6FF');
          }

          doc.fillColor('#1F2937');
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
      // Totals section
      const totalsStartY = rowY + 15;
      const totalsX = PAGE_WIDTH - PAGE_MARGIN - 75;
      const valueX = PAGE_WIDTH - PAGE_MARGIN - 50;
      
      doc.fontSize(9)
         .font('Helvetica');
      
      let totalY = totalsStartY;
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

      const moveSummaryToNextPage = () => {
        totalY = addContinuationPage(doc, mm);
        doc.fontSize(9)
           .fillColor('#1F2937')
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
        doc.fillColor('#1F2937');
        doc.text(summaryRow.label, mm(totalsX), mm(totalY));
        doc.text(`$${formatCurrency(summaryRow.value)}`, mm(valueX), mm(totalY), { width: mm(45), align: 'right', continued: false });
        totalY += SUMMARY_ROW_HEIGHT;
      });
      
      // Discounts (if any)
      if (discountRows.length > 0) {
        ensureSummarySpace(SUMMARY_ROW_HEIGHT);
        doc.moveTo(mm(totalsX), mm(totalY - 3))
           .lineTo(mm(valueX + 45), mm(totalY - 3))
           .strokeColor('#DCDCDC')
           .lineWidth(0.3)
           .stroke();

        discountRows.forEach((discount) => {
          ensureSummarySpace(SUMMARY_ROW_HEIGHT);
          doc.fillColor('#10B981');
          doc.text(discount.name, mm(totalsX), mm(totalY));
          doc.text(`-${formatCurrency(discount.amount)}`, mm(valueX), mm(totalY), { width: mm(45), align: 'right' });
          totalY += SUMMARY_ROW_HEIGHT;
        });
        doc.fillColor('#1F2937');
      }
      
      totalY += 4;
      
      // Total box (blue background)
      const totalBoxWidth = 80;
      const totalBoxHeight = SUMMARY_BOX_HEIGHT;
      const totalBoxX = PAGE_WIDTH - PAGE_MARGIN - totalBoxWidth;
      const finalBlockHeight = totalBoxHeight
        + (actualPaid > 0 ? SUMMARY_BOX_GAP + totalBoxHeight : 0)
        + (actualPaid > 0 && balanceDue === 0 ? SUMMARY_BOX_GAP + totalBoxHeight : 0);
      ensureSummarySpace(finalBlockHeight);
      const totalBoxY = totalY - 5;
      doc.roundedRect(mm(totalBoxX), mm(totalBoxY), mm(totalBoxWidth), mm(totalBoxHeight), mm(1))
         .fill('#3B82F6');
      
      doc.fontSize(10)
         .fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .text('TOTAL', mm(totalBoxX + 10), mm(totalBoxY + 3.5))
         .text(`$${formatCurrency(total)}`, mm(totalBoxX + totalBoxWidth - 30), mm(totalBoxY + 3.5), { width: mm(25), align: 'right' });
      
      // Add "PAID AMOUNT" and "FULLY PAID" badges if paid
      if (actualPaid > 0) {
        totalY += SUMMARY_BOX_GAP;
        doc.roundedRect(mm(totalBoxX), mm(totalY), mm(totalBoxWidth), mm(totalBoxHeight), mm(2))
           .fillColor('#10B981')
           .fill();
        
        doc.fontSize(10)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text('PAID AMOUNT', mm(totalBoxX + 10), mm(totalY + 3.5))
           .text(`$${formatCurrency(actualPaid)}`, mm(totalBoxX + totalBoxWidth - 30), mm(totalY + 3.5), { width: mm(25), align: 'right' });
        
        if (balanceDue === 0) {
          totalY += SUMMARY_BOX_GAP;
          doc.roundedRect(mm(totalBoxX), mm(totalY), mm(totalBoxWidth), mm(totalBoxHeight), mm(2))
             .fillColor('#10B981')
             .fill();
          
          doc.fontSize(11)
             .fillColor('#FFFFFF')
             .font('Helvetica-Bold')
             .text('FULLY PAID', mm(totalBoxX), mm(totalY + 3.5), { width: mm(totalBoxWidth), align: 'center' });
        }
      }
      
      } else if (isPurchaseOrder) {
        doc.roundedRect(mm(PAGE_MARGIN), mm(rowY + 10), mm(PAGE_WIDTH - PAGE_MARGIN * 2), mm(12), mm(2))
           .fill('#EFF6FF');

        doc.fontSize(9)
           .fillColor('#2563EB')
           .font('Helvetica-Bold')
           .text('Vendor copy: pricing hidden', mm(PAGE_MARGIN + 4), mm(rowY + 14));

        doc.fontSize(8)
           .fillColor('#1F2937')
           .font('Helvetica')
           .text('This purchase order includes quantities and delivery details only.', mm(PAGE_MARGIN + 4), mm(rowY + 18), {
             width: mm(PAGE_WIDTH - PAGE_MARGIN * 2 - 8),
           });
      }

      const pageRange = doc.bufferedPageRange();
      for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
        doc.switchToPage(i);

        // Keep all footer text above PDFKit's bottom margin safe area.
        // Writing inside the bottom margin causes PDFKit to push text to a new page.
        const footerY = FOOTER_Y;
        const contactY = footerY + 7;
        const pageNumberY = PAGE_HEIGHT - 19;
        doc.fontSize(10)
           .fillColor('#3B82F6')
           .font('Helvetica')
           .text('Thank you for your business!', mm(PAGE_MARGIN), mm(footerY), {
             width: mm(PAGE_WIDTH - PAGE_MARGIN * 2),
             align: 'center',
             lineBreak: false
           });
        
        doc.fontSize(8)
           .fillColor('#6B7280')
           .text('Questions? Contact us at info@9rx.com', mm(PAGE_MARGIN), mm(contactY), {
             width: mm(PAGE_WIDTH - PAGE_MARGIN * 2),
             align: 'center',
             lineBreak: false
           });

        doc.fontSize(8)
           .fillColor('#6B7280')
           .text(`Page ${i - pageRange.start + 1} of ${pageRange.count}`, mm(PAGE_MARGIN), mm(pageNumberY), {
             width: mm(PAGE_WIDTH - PAGE_MARGIN * 2),
             align: 'center',
             lineBreak: false
           });
        
        // Add footer band (2mm green bar at bottom)
        doc.rect(0, mm(PAGE_HEIGHT - 2), mm(PAGE_WIDTH), mm(2))
           .fill('#3B82F6');
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
