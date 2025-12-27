const paymentLink = (order) => {
    const { id, customerInfo, order_number, status, items, total, date, tax_amount, shipping_cost, paid_amount, adjustment_amount } = order;
    console.log(order)
    // Calculate subtotal
    const subtotal = items?.reduce((sum, item) => {
        if (item.sizes && item.sizes.length > 0) {
            return sum + item.sizes.reduce((sizeSum, size) => sizeSum + (size.price * size.quantity), 0);
        }
        return sum + (item.price * item.quantity);
    }, 0) || 0;

    // Calculate balance due
    const paidAmountNum = parseFloat(paid_amount) || 0;
    const totalNum = parseFloat(total) || 0;
    const balanceDue = adjustment_amount ? parseFloat(adjustment_amount) : Math.max(0, totalNum - paidAmountNum);
    const isPartialPayment = paidAmountNum > 0 && balanceDue > 0;
    const amountToPay = isPartialPayment ? balanceDue : totalNum;

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return `$${num.toFixed(2)}`;
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    // Generate items HTML
    const generateItemsHtml = () => {
        if (!items || items.length === 0) return '';
        
        return items.map(item => {
            if (item.sizes && item.sizes.length > 0) {
                return item.sizes.map(size => `
                    <tr>
                        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
                            <div style="display: flex; align-items: center;">
                                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; margin-right: 12px;">` : ''}
                                <div>
                                    <p style="margin: 0; font-weight: 600; color: #1f2937;">${item.name}</p>
                                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">Size: ${size.size || size.name || 'N/A'}</p>
                                    ${item.ndc ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #9ca3af;">NDC: ${item.ndc}</p>` : ''}
                                </div>
                            </div>
                        </td>
                        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #4b5563;">${size.quantity}</td>
                        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937;">${formatCurrency(size.price)}</td>
                        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937;">${formatCurrency(size.price * size.quantity)}</td>
                    </tr>
                `).join('');
            }
            return `
                <tr>
                    <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
                        <div style="display: flex; align-items: center;">
                            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; margin-right: 12px;">` : ''}
                            <div>
                                <p style="margin: 0; font-weight: 600; color: #1f2937;">${item.name}</p>
                                ${item.ndc ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af;">NDC: ${item.ndc}</p>` : ''}
                            </div>
                        </div>
                    </td>
                    <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #4b5563;">${item.quantity}</td>
                    <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937;">${formatCurrency(item.price)}</td>
                    <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937;">${formatCurrency(item.price * item.quantity)}</td>
                </tr>
            `;
        }).join('');
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Required - Order #${order_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 650px; margin: 0 auto;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <div style="background-color: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 32px;">💳</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Payment Required</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Complete your payment to process your order</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 0;">
                            
                            <!-- Greeting -->
                            <div style="padding: 30px 30px 20px;">
                                <p style="margin: 0; font-size: 16px; color: #374151;">Hello <strong>${customerInfo?.name || 'Valued Customer'}</strong>,</p>
                                <p style="margin: 12px 0 0 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                                    Your order is ready and waiting for payment. Please complete your payment to proceed with processing and shipping.
                                </p>
                            </div>

                            <!-- Order Info Card -->
                            <div style="margin: 0 30px 25px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 12px; padding: 24px; border: 1px solid #d1fae5;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td width="50%" style="vertical-align: top;">
                                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Order Number</p>
                                            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">#${order_number}</p>
                                        </td>
                                        <td width="50%" style="vertical-align: top; text-align: right;">
                                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Order Date</p>
                                            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">${formatDate(date || new Date())}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding-top: 16px;">
                                            <div style="background-color: #fef3c7; border-radius: 8px; padding: 12px 16px; display: inline-block;">
                                                <span style="font-size: 14px; color: #92400e; font-weight: 600;">⏳ Payment Pending</span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Products Table -->
                            <div style="padding: 0 30px 25px;">
                                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Order Items</h3>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                                    <thead>
                                        <tr style="background-color: #f9fafb;">
                                            <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                                            <th style="padding: 14px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                                            <th style="padding: 14px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                                            <th style="padding: 14px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${generateItemsHtml()}
                                    </tbody>
                                </table>
                            </div>

                            <!-- Order Summary -->
                            <div style="margin: 0 30px 30px; background-color: #f9fafb; border-radius: 12px; padding: 20px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Subtotal</td>
                                        <td style="padding: 8px 0; font-size: 14px; color: #374151; text-align: right;">${formatCurrency(subtotal)}</td>
                                    </tr>
                                    ${shipping_cost ? `
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Shipping</td>
                                        <td style="padding: 8px 0; font-size: 14px; color: #374151; text-align: right;">${formatCurrency(shipping_cost)}</td>
                                    </tr>
                                    ` : ''}
                                    ${tax_amount ? `
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Tax</td>
                                        <td style="padding: 8px 0; font-size: 14px; color: #374151; text-align: right;">${formatCurrency(tax_amount)}</td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td colspan="2" style="padding: 12px 0 0 0;">
                                            <div style="border-top: 2px solid #e5e7eb; padding-top: 12px;">
                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                    <tr>
                                                        <td style="font-size: 16px; font-weight: 600; color: #1f2937;">Total Amount</td>
                                                        <td style="font-size: 18px; font-weight: 600; color: #374151; text-align: right;">${formatCurrency(total)}</td>
                                                    </tr>
                                                    ${isPartialPayment ? `
                                                    <tr>
                                                        <td style="font-size: 14px; color: #059669; padding-top: 8px;">✓ Already Paid</td>
                                                        <td style="font-size: 14px; font-weight: 600; color: #059669; text-align: right; padding-top: 8px;">${formatCurrency(paidAmountNum)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td colspan="2" style="padding-top: 12px;">
                                                            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px;">
                                                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                                    <tr>
                                                                        <td style="font-size: 16px; font-weight: 700; color: #dc2626;">Balance Due</td>
                                                                        <td style="font-size: 22px; font-weight: 700; color: #dc2626; text-align: right;">${formatCurrency(balanceDue)}</td>
                                                                    </tr>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    ` : `
                                                    <tr>
                                                        <td colspan="2" style="padding-top: 8px;">
                                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                                <tr>
                                                                    <td style="font-size: 14px; font-weight: 600; color: #dc2626;">Amount Due</td>
                                                                    <td style="font-size: 22px; font-weight: 700; color: #059669; text-align: right;">${formatCurrency(total)}</td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                    `}
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- CTA Button -->
                            <div style="padding: 0 30px 35px; text-align: center;">
                                <a href="https://9rx.com/pay-now?orderid=${id}" 
                                   style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
                                    💳 ${isPartialPayment ? `Pay Balance - ${formatCurrency(balanceDue)}` : `Pay Now - ${formatCurrency(total)}`}
                                </a>
                                <p style="margin: 16px 0 0 0; font-size: 13px; color: #9ca3af;">
                                    🔒 Secure payment powered by Authorize.net
                                </p>
                            </div>

                            <!-- Customer Info -->
                            <div style="margin: 0 30px 30px; border-top: 1px solid #e5e7eb; padding-top: 25px;">
                                <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Billing Information</h3>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Name:</td>
                                        <td style="padding: 6px 0; font-size: 14px; color: #374151; font-weight: 500;">${customerInfo?.name || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Email:</td>
                                        <td style="padding: 6px 0; font-size: 14px; color: #374151; font-weight: 500;">${customerInfo?.email || 'N/A'}</td>
                                    </tr>
                                    ${customerInfo?.phone ? `
                                    <tr>
                                        <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Phone:</td>
                                        <td style="padding: 6px 0; font-size: 14px; color: #374151; font-weight: 500;">${customerInfo.phone}</td>
                                    </tr>
                                    ` : ''}
                                </table>
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
                                            or call <a href="tel:+1234567890" style="color: #059669; text-decoration: none; font-weight: 500;">(123) 456-7890</a>
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
                            <div style="margin-bottom: 16px;">
                                <a href="https://9rx.com" style="display: inline-block; margin: 0 8px; color: #10b981; text-decoration: none; font-size: 13px;">Website</a>
                                <span style="color: #4b5563;">|</span>
                                <a href="https://9rx.com/orders" style="display: inline-block; margin: 0 8px; color: #10b981; text-decoration: none; font-size: 13px;">My Orders</a>
                                <span style="color: #4b5563;">|</span>
                                <a href="https://9rx.com/contact" style="display: inline-block; margin: 0 8px; color: #10b981; text-decoration: none; font-size: 13px;">Contact</a>
                            </div>
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

module.exports = paymentLink;
