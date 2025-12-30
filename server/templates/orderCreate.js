const orderConfirmationTemplate = (order) => {
  const {
    customerInfo = {},
    shippingAddress = {},
    order_number = "",
    items = [],
    payment_status = "pending",
    payment_method = "card",
    total_amount = 0,
    tax_amount = 0,
    shipping_cost = 0,
    status = "new"
  } = order;

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr || new Date());
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const subtotal = items.reduce((s, i) => s + ((i.price || i.unit_price || 0) * (i.quantity || 1)), 0);

  const generateItemsHtml = () => {
    if (!items.length) {
      return `
        <tr>
          <td colspan="4" style="padding: 20px; text-align: center; color: #6b7280;">No items in this order</td>
        </tr>`;
    }

    return items.map(item => {
      const name = item.name || item.product_name || "Product";
      const qty = item.quantity || 1;
      const price = item.price || item.unit_price || 0;
      const size = item.sizes?.map(s => `${s.size_value} ${s.size_unit}`).join(", ") || item.size || "";

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">${name}</p>
            ${size ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Size: ${size}</p>` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #4b5563; font-size: 14px;">${qty}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1f2937; font-size: 14px;">${formatCurrency(price)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937; font-size: 14px;">${formatCurrency(price * qty)}</td>
        </tr>`;
    }).join("");
  };

  const getPaymentStatusBadge = () => {
    const statusLower = payment_status?.toLowerCase() || 'pending';
    let bgColor = '#fef3c7';
    let textColor = '#92400e';
    let label = 'Pending';
    
    if (statusLower === 'paid') {
      bgColor = '#d1fae5';
      textColor = '#065f46';
      label = 'Paid';
    } else if (statusLower === 'partial_paid') {
      bgColor = '#fef3c7';
      textColor = '#92400e';
      label = 'Partial';
    } else if (statusLower === 'unpaid') {
      bgColor = '#fee2e2';
      textColor = '#991b1b';
      label = 'Unpaid';
    }
    
    return `<span style="display: inline-block; padding: 4px 12px; background-color: ${bgColor}; color: ${textColor}; border-radius: 20px; font-size: 12px; font-weight: 600;">${label}</span>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed - #${order_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #059669; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="background-color: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 35px; text-align: center; vertical-align: middle;">
                                                    <span style="font-size: 32px; line-height: 70px;">🎉</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Order Confirmed!</h1>
                                        <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 15px;">Thank you for your order</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 0;">
                            
                            <!-- Greeting -->
                            <div style="padding: 30px 30px 20px;">
                                <p style="margin: 0; font-size: 16px; color: #374151;">Hello <strong>${customerInfo.name || 'Valued Customer'}</strong>,</p>
                                <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                    Your order has been successfully placed. We'll notify you when it ships.
                                </p>
                            </div>

                            <!-- Order Info Card -->
                            <div style="margin: 0 30px 25px; background-color: #f0fdf4; border-radius: 12px; padding: 20px; border: 1px solid #d1fae5;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="vertical-align: top; padding-bottom: 12px;">
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Order Number</p>
                                            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">#${order_number}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td width="50%" style="vertical-align: top;">
                                                        <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Status</p>
                                                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">${status.toUpperCase()}</p>
                                                    </td>
                                                    <td width="50%" style="vertical-align: top;">
                                                        <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Payment</p>
                                                        ${getPaymentStatusBadge()}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Products Table -->
                            <div style="padding: 0 30px 25px;">
                                <h3 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2937;">📦 Order Items</h3>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                                    <thead>
                                        <tr style="background-color: #f9fafb;">
                                            <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Product</th>
                                            <th style="padding: 12px; text-align: center; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Qty</th>
                                            <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Price</th>
                                            <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${generateItemsHtml()}
                                    </tbody>
                                </table>
                            </div>

                            <!-- Order Summary -->
                            <div style="margin: 0 30px 25px; background-color: #f9fafb; border-radius: 12px; padding: 20px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Subtotal</td>
                                        <td style="padding: 6px 0; font-size: 14px; color: #374151; text-align: right;">${formatCurrency(subtotal)}</td>
                                    </tr>
                                    ${tax_amount ? `
                                    <tr>
                                        <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Tax</td>
                                        <td style="padding: 6px 0; font-size: 14px; color: #374151; text-align: right;">${formatCurrency(tax_amount)}</td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Shipping</td>
                                        <td style="padding: 6px 0; font-size: 14px; color: #374151; text-align: right;">${shipping_cost ? formatCurrency(shipping_cost) : 'FREE'}</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding-top: 12px;">
                                            <div style="border-top: 2px solid #e5e7eb; padding-top: 12px;">
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                    <tr>
                                                        <td style="font-size: 16px; font-weight: 700; color: #1f2937;">Total</td>
                                                        <td style="font-size: 20px; font-weight: 700; color: #059669; text-align: right;">${formatCurrency(total_amount)}</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Shipping Address -->
                            <div style="margin: 0 30px 25px; background-color: #f9fafb; border-radius: 12px; padding: 20px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">📍 Shipping Address</h3>
                                <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                                    ${shippingAddress.fullName || customerInfo.name || ''}<br>
                                    ${shippingAddress.address?.street || ''}<br>
                                    ${shippingAddress.address?.city || ''}${shippingAddress.address?.state ? `, ${shippingAddress.address.state}` : ''} ${shippingAddress.address?.zip_code || ''}
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <div style="padding: 0 30px 35px; text-align: center;">
                                <a href="https://9rx.com/pharmacy/orders" 
                                   style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                                    📋 View My Orders
                                </a>
                            </div>

                        </td>
                    </tr>

                    <!-- Help Section -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">Need Help?</p>
                                        <p style="margin: 0; font-size: 13px; color: #6b7280;">
                                            Contact us at <a href="mailto:info@9rx.com" style="color: #059669; text-decoration: none; font-weight: 500;">info@9rx.com</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1f2937; padding: 30px; border-radius: 0 0 16px 16px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #ffffff;">9RX</p>
                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #9ca3af;">Your Trusted Pharmacy Partner</p>
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                © ${new Date().getFullYear()} 9RX. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

module.exports = orderConfirmationTemplate;
