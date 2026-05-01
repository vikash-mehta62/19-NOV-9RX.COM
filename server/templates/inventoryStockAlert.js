const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatQuantity = (value) => {
  const quantity = Number(value || 0);
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
};

const STATUS_STYLES = {
  out_of_stock: { label: "Out of Stock", color: "#9f1239", background: "#ffe4e6", border: "#fecdd3" },
  critical: { label: "Critical", color: "#9a3412", background: "#ffedd5", border: "#fed7aa" },
  very_low: { label: "Very Low", color: "#854d0e", background: "#fef3c7", border: "#fde68a" },
};

const normalizeStatus = (status) => STATUS_STYLES[status] ? status : "very_low";

const buildProductDetailCell = (item) => {
  const metadata = item.metadata || {};
  const sizeName = escapeHtml(item.size_name || metadata.size_name || "");
  const sizeValue = escapeHtml(item.size_value || metadata.size_value || "");
  const sizeUnit = escapeHtml(item.size_unit || metadata.size_unit || "");
  const hasUnitToggle = item.unitToggle === true || metadata.unitToggle === true;
  const valueLine = [sizeValue, hasUnitToggle ? sizeUnit : ""].filter(Boolean).join(" ");

  if (sizeName || valueLine) {
    return `
      <div style="font-size:13px;line-height:1.35;color:#334155;">
        ${sizeName ? `<div style="font-weight:800;color:#0f172a;text-transform:uppercase;">${sizeName}</div>` : ""}
        ${valueLine ? `<div style="margin-top:4px;color:#475569;">${valueLine}</div>` : ""}
      </div>
    `;
  }

  return escapeHtml(item.size_label || "Default");
};

const getDefaultLogoUrl = () => {
  if (process.env.INVENTORY_ALERT_LOGO_URL) {
    return process.env.INVENTORY_ALERT_LOGO_URL;
  }

  return "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/9RX%20LOGO/9rx_logo.png";
};

const inventoryStockAlertTemplate = ({ items = [], generatedAt = new Date(), logoUrl = getDefaultLogoUrl() } = {}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safeLogoUrl = escapeHtml(logoUrl);
  const rows = safeItems.map((item) => {
    const statusKey = normalizeStatus(item.status);
    const status = STATUS_STYLES[statusKey];
    const productName = escapeHtml(item.product_name || "Unknown product");
    const productDetail = buildProductDetailCell(item);
    const sku = escapeHtml(item.sku || "N/A");
    const stock = formatQuantity(item.current_stock);
    const previousStock = item.previous_stock === null || item.previous_stock === undefined
      ? "N/A"
      : formatQuantity(item.previous_stock);
    const threshold = item.threshold === null || item.threshold === undefined
      ? "N/A"
      : formatQuantity(item.threshold);

    return `
      <tr>
        <td style="padding:16px 18px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;line-height:1.35;font-weight:800;text-transform:uppercase;word-break:break-word;">${productName}</td>
        <td style="padding:16px 14px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px;line-height:1.35;">${productDetail}</td>
        <td style="padding:16px 14px;border-bottom:1px solid #e5e7eb;color:#334155;font-size:13px;line-height:1.35;">${sku}</td>
        <td style="padding:16px 14px;border-bottom:1px solid #e5e7eb;color:#0f172a;text-align:right;font-size:13px;font-weight:900;">${stock}</td>
        <td style="padding:16px 14px;border-bottom:1px solid #e5e7eb;color:#64748b;text-align:right;font-size:13px;">${previousStock}</td>
        <td style="padding:16px 14px;border-bottom:1px solid #e5e7eb;color:#475569;text-align:right;font-size:13px;">${threshold}</td>
        <td style="padding:16px 18px;border-bottom:1px solid #e5e7eb;text-align:right;">
          <span style="display:inline-block;min-width:82px;padding:7px 12px;border-radius:999px;background:${status.background};border:1px solid ${status.border};color:${status.color};font-size:11px;line-height:1.1;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:.04em;">${status.label}</span>
        </td>
      </tr>
    `;
  }).join("");

  const summary = safeItems.reduce((acc, item) => {
    const status = normalizeStatus(item.status);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const generatedLabel = new Date(generatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const totalCount = safeItems.length;
  const outOfStockCount = summary.out_of_stock || 0;
  const criticalCount = summary.critical || 0;
  const veryLowCount = summary.very_low || 0;

  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:820px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dbe3ec;box-shadow:0 10px 28px rgba(15,23,42,.08);">
                <tr>
                  <td align="center" style="background:#eef9ff;padding:44px 32px 38px;border-bottom:1px solid #dbeafe;">
                    <img src="${safeLogoUrl}" width="198" alt="9rx.com" style="display:block;width:198px;max-width:72%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 34px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h1 style="margin:0 0 8px;font-size:25px;line-height:1.25;color:#0f172a;font-weight:900;">Inventory needs attention</h1>
                          <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
                      The products below have reached low-stock thresholds or are out of stock. Please review and restock as needed.
                          </p>
                        </td>
                        <td align="right" width="110" style="vertical-align:top;">
                          <div style="display:inline-block;background:#0f172a;color:#ffffff;border-radius:10px;padding:10px 12px;text-align:center;">
                            <div style="font-size:22px;line-height:1;font-weight:900;">${totalCount}</div>
                            <div style="font-size:10px;line-height:1.2;text-transform:uppercase;letter-spacing:.08em;color:#cbd5e1;margin-top:4px;">Affected</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-collapse:separate;border-spacing:0;">
                      <tr>
                        <td width="33.33%" style="padding:13px 14px;background:#fff1f2;border:1px solid #fecdd3;border-right:0;border-radius:10px 0 0 10px;">
                          <span style="display:block;color:#9f1239;font-size:20px;line-height:1;font-weight:900;">${outOfStockCount}</span>
                          <span style="display:block;margin-top:4px;color:#881337;font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;">Out of stock</span>
                        </td>
                        <td width="33.33%" style="padding:13px 14px;background:#fff7ed;border:1px solid #fed7aa;border-right:0;">
                          <span style="display:block;color:#9a3412;font-size:20px;line-height:1;font-weight:900;">${criticalCount}</span>
                          <span style="display:block;margin-top:4px;color:#9a3412;font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;">Critical</span>
                        </td>
                        <td width="33.33%" style="padding:13px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:0 10px 10px 0;">
                          <span style="display:block;color:#854d0e;font-size:20px;line-height:1;font-weight:900;">${veryLowCount}</span>
                          <span style="display:block;margin-top:4px;color:#854d0e;font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;">Very low</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                      <tr>
                        <td style="padding:0;background:#f8fafc;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="4" style="background:#1d4ed8;font-size:0;line-height:0;">&nbsp;</td>
                              <td style="padding:12px 14px;color:#475569;font-size:12px;line-height:1.55;">
                                <strong style="color:#0f172a;">Status criteria</strong>
                                <span style="color:#cbd5e1;padding:0 8px;">|</span>
                                <span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;border-radius:999px;background:#ffe4e6;color:#9f1239;font-weight:800;">Out of Stock</span>
                                <span style="color:#475569;">stock is 0</span>
                                <span style="color:#cbd5e1;padding:0 7px;">/</span>
                                <span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;border-radius:999px;background:#fef3c7;color:#854d0e;font-weight:800;">Very Low</span>
                                <span style="color:#475569;">stock is below 20</span>
                                <span style="color:#cbd5e1;padding:0 7px;">/</span>
                                <span style="display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;border-radius:999px;background:#ffedd5;color:#9a3412;font-weight:800;">Critical</span>
                                <span style="color:#475569;">stock is 20 to 50</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 34px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden;">
                      <thead>
                        <tr style="background:#f8fafc;">
                          <th align="left" style="padding:13px 18px;border-bottom:1px solid #dbe3ec;color:#334155;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Subcategory</th>
                          <th align="left" style="padding:13px 14px;border-bottom:1px solid #dbe3ec;color:#334155;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Product</th>
                          <th align="left" style="padding:13px 14px;border-bottom:1px solid #dbe3ec;color:#334155;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">SKU</th>
                          <th align="right" style="padding:13px 14px;border-bottom:1px solid #dbe3ec;color:#334155;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Stock</th>
                          <th align="right" style="padding:13px 14px;border-bottom:1px solid #dbe3ec;color:#334155;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Previous</th>
                          <th align="right" style="padding:13px 14px;border-bottom:1px solid #dbe3ec;color:#334155;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Alert At</th>
                          <th align="right" style="padding:13px 18px;border-bottom:1px solid #dbe3ec;color:#334155;font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Status</th>
                        </tr>
                      </thead>
                      <tbody>${rows}</tbody>
                    </table>
                    <p style="margin:18px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
                      Generated ${escapeHtml(generatedLabel)}. This automated alert is queued separately from stock updates so inventory workflows stay responsive.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

module.exports = { inventoryStockAlertTemplate, STATUS_STYLES };
