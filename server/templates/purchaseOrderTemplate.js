const purchaseOrderTemplate = (order = {}, options = {}) => {
  const eventType = options.eventType === "updated" ? "updated" : "created";
  const includePricingInPdf = options.includePricingInPdf !== false;
  const vendorName = order?.customerInfo?.name || "Vendor";
  const vendorEmail = order?.customerInfo?.email || "";
  const poNumber = order?.order_number || "N/A";
  const expectedDelivery = order?.estimated_delivery || order?.shipping?.estimatedDelivery || "";
  const notes = order?.payment_notes || order?.notes || order?.payment?.notes || "";
  const billingAddress = order?.customerInfo?.address || {};
  const deliveryAddress = order?.shippingAddress?.address || {};
  const freightCharges = Number(order?.po_fred_charges || 0);
  const handlingCharges = Number(order?.po_handling_charges || 0);
  const items = Array.isArray(order?.items) ? order.items : [];

  const formatCurrency = (amount) => `$${(Number(amount) || 0).toFixed(2)}`;
  const formatDate = (dateValue) => {
    if (!dateValue) return "Not set";
    const dateOnlyMatch = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsed = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return String(dateValue);
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const subtotal = items.reduce((sum, item) => {
    if (Array.isArray(item?.sizes) && item.sizes.length > 0) {
      return (
        sum +
        item.sizes.reduce((sizeSum, size) => {
          const quantity = Number(size?.quantity || 0);
          const price = Number(size?.price || 0);
          return sizeSum + quantity * price;
        }, 0)
      );
    }

    return sum + Number(item?.quantity || 0) * Number(item?.price || item?.unit_price || 0);
  }, 0);

  const totalAmount =
    subtotal +
    Number(order?.shipping_cost || 0) +
    Number(order?.tax_amount || 0) +
    freightCharges +
    handlingCharges -
    Number(order?.discount_amount || 0);

  const heading = eventType === "updated" ? "Updated Purchase Order" : "New Purchase Order";
  const intro =
    eventType === "updated"
      ? "An existing purchase order has been updated. Please use the attached revised PO for fulfillment."
      : "A new purchase order has been created for your team. Please review the attached PO and fulfill it accordingly.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading} - ${poNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbeafe;">
          <tr>
            <td style="background:#2563eb;padding:32px 28px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">${heading}</h1>
              <p style="margin:10px 0 0 0;color:#dbeafe;font-size:15px;">Purchase Order #${poNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0;font-size:16px;color:#111827;">Hello <strong>${vendorName}</strong>,</p>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.7;color:#4b5563;">${intro}</p>

              <div style="margin-top:22px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom:10px;">
                      <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">PO Number</p>
                      <p style="margin:0;font-size:20px;font-weight:700;color:#1d4ed8;">${poNumber}</p>
                    </td>
                    <td style="padding-bottom:10px;text-align:right;">
                      <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Expected Delivery</p>
                      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${formatDate(expectedDelivery)}</p>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Vendor Email</p>
                      <p style="margin:0;font-size:14px;color:#111827;">${vendorEmail || "Not available"}</p>
                    </td>
                    <td style="text-align:right;">
                      <p style="margin:0 0 4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">${includePricingInPdf ? "PO Total" : "Pricing"}</p>
                      <p style="margin:0;font-size:18px;font-weight:700;color:#059669;">${includePricingInPdf ? formatCurrency(totalAmount) : "Hidden on vendor copy"}</p>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin-top:22px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="50%" style="vertical-align:top;padding-right:8px;">
                      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px;min-height:126px;">
                        <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.08em;">Vendor Address</p>
                        <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
                          ${vendorName}<br/>
                          ${billingAddress?.street || ""}${billingAddress?.street2 ? `<br/>${billingAddress.street2}` : ""}<br/>
                          ${billingAddress?.city || ""}${billingAddress?.state ? `, ${billingAddress.state}` : ""} ${billingAddress?.zip_code || ""}<br/>
                          ${billingAddress?.country || ""}
                        </p>
                      </div>
                    </td>
                    <td width="50%" style="vertical-align:top;padding-left:8px;">
                      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px;min-height:126px;">
                        <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.08em;">Deliver To</p>
                        <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
                          ${order?.shippingAddress?.fullName || ""}<br/>
                          ${deliveryAddress?.street || ""}<br/>
                          ${deliveryAddress?.city || ""}${deliveryAddress?.state ? `, ${deliveryAddress.state}` : ""} ${deliveryAddress?.zip_code || ""}<br/>
                          ${order?.shippingAddress?.phone || ""}
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              ${
                notes
                  ? `<div style="margin-top:22px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px;">
                      <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.08em;">Notes</p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">${String(notes)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/\n/g, "<br/>")}</p>
                    </div>`
                  : ""
              }

              <div style="margin-top:24px;padding:16px;border-radius:14px;background:#ecfdf5;border:1px solid #bbf7d0;">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#166534;">
                  ${
                    includePricingInPdf
                      ? "The attached PDF contains the full purchase order with item quantities, pricing, delivery details, and current charges."
                      : "The attached PDF contains the purchase order with item quantities and delivery details. Pricing is hidden on this vendor copy."
                  }
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b7280;">Questions? Reply to this email or contact 9RX support.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = purchaseOrderTemplate;
