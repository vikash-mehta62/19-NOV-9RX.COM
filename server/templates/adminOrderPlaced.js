const adminOrderNotificationTemplate = (order) => {
    const { 
        customerInfo = {}, 
        order_number = '', 
        items = [], 
        estimated_delivery, 
        payment_status = 'pending', 
        shipping_method = '', 
        total_amount = 0 
    } = order;

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return `$${num.toFixed(2)}`;
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

    const generateItemsHtml = () => {
        if (!items || items.length === 0) {
            return `
                <tr>
                    <td colspan="4" style="padding: 20px; text-align: center; color: #6b7280;">No items</td>
                </tr>`;
        }
        
        return items.map(item => {
            const sizeText = item.sizes?.map(size => `${size.size_value} ${size.size_unit}`).join(", ") || '-';
            return `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">${item.name || 'Product'}</p>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 13px;">${sizeText}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #4b5563; font-size: 14px;">${item.quantity || 1}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937; font-size: 14px;">${formatCurrency(item.price || 0)}</td>
                </tr>`;
        }).join('');
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Order - #${order_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #dc2626; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="background-color: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 35px; text-align: center; vertical-align: middle;">
                                                    <span style="font-size: 32px; line-height: 70px;">🛒</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">New Order Received!</h1>
                                        <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 15px;">A new order has been placed</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 0;">
                            
                            <!-- Customer Info -->
                            <div style="padding: 30px 30px 20px;">
                                <p style="margin: 0; font-size: 16px; color: #374151;">
                                    Order placed by <strong>${customerInfo?.name || 'Customer'}</strong>
                                </p>
                            </div>

                            <!-- Order Info Card -->
                            <div style="margin: 0 30px 25px; background-color: #fef2f2; border-radius: 12px; padding: 20px; border: 1px solid #fecaca;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td width="50%" style="vertical-align: top; padding-bottom: 12px;">
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Order Number</p>
                                            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #dc2626;">#${order_number}</p>
                                        </td>
                                        <td width="50%" style="vertical-align: top; text-align: right; padding-bottom: 12px;">
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Total Amount</p>
                                            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">${formatCurrency(total_amount)}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2">
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Payment Status</p>
                                            ${getPaymentStatusBadge()}
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Products Table -->
                            <div style="padding: 0 30px 25px;">
                                <h3 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2937;">🛍️ Ordered Items</h3>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                                    <thead>
                                        <tr style="background-color: #f9fafb;">
                                            <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Product</th>
                                            <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Size</th>
                                            <th style="padding: 12px; text-align: center; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Qty</th>
                                            <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${generateItemsHtml()}
                                    </tbody>
                                </table>
                            </div>

                            <!-- CTA Button -->
                            <div style="padding: 0 30px 35px; text-align: center;">
                                <a href="https://9rx.com/admin/orders" 
                                   style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                                    📋 View Order
                                </a>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1f2937; padding: 30px; border-radius: 0 0 16px 16px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #ffffff;">9RX Admin</p>
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

module.exports = adminOrderNotificationTemplate;
