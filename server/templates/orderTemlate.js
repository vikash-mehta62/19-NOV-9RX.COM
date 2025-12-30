const orderStatusTemplate = (order) => { 
    const { 
        customerInfo = {}, 
        shippingAddress = {}, 
        order_number = '', 
        status = 'pending', 
        items = [], 
        estimated_delivery, 
        payment_status = 'pending', 
        shipping_method = '', 
        total_amount = 0, 
        tracking_number = '', 
        paid_amount = 0 
    } = order;
  
    const paidAmt = parseFloat(paid_amount) || 0;
    const totalAmt = parseFloat(total_amount) || 0;
    const balanceDue = Math.max(0, totalAmt - paidAmt);
    const isPartialPaid = payment_status === 'partial_paid' || (paidAmt > 0 && balanceDue > 0);

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return `$${num.toFixed(2)}`;
    };

    const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
            case 'shipped': return '#059669';
            case 'delivered': return '#059669';
            case 'processing': return '#7c3aed';
            case 'pending': return '#f59e0b';
            case 'cancelled': return '#dc2626';
            default: return '#3b82f6';
        }
    };

    const getStatusEmoji = (status) => {
        switch(status?.toLowerCase()) {
            case 'shipped': return '🚚';
            case 'delivered': return '✅';
            case 'processing': return '⚙️';
            case 'pending': return '⏳';
            case 'cancelled': return '❌';
            default: return '📦';
        }
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
        if (!items || items.length === 0) return '';
        
        return items.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">${item.name || 'Product'}</p>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #4b5563; font-size: 14px;">${item.quantity || 1}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937; font-size: 14px;">${formatCurrency(item.price || 0)}</td>
            </tr>
        `).join('');
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Update - #${order_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: ${getStatusColor(status)}; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="background-color: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 35px; text-align: center; vertical-align: middle;">
                                                    <span style="font-size: 32px; line-height: 70px;">${getStatusEmoji(status)}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Order Status Update</h1>
                                        <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 15px;">Your order status has been updated</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Status Badge -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 25px 30px 0; text-align: center;">
                            <span style="display: inline-block; padding: 10px 24px; background-color: ${getStatusColor(status)}; color: #ffffff; border-radius: 25px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                                ${status?.toUpperCase() || 'PENDING'}
                            </span>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 0;">
                            
                            <!-- Order Info Card -->
                            <div style="margin: 25px 30px; background-color: #f0fdf4; border-radius: 12px; padding: 20px; border: 1px solid #d1fae5;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding-bottom: 10px;">
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Customer Name</p>
                                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${customerInfo?.name || 'Customer'}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding-bottom: 10px;">
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Order Number</p>
                                            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">${order_number}</p>
                                        </td>
                                    </tr>
                                    ${shipping_method && status?.toLowerCase() === 'shipped' ? `
                                    <tr>
                                        <td>
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase;">Shipping Method</p>
                                            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">${shipping_method}</p>
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>

                            <!-- Payment Summary -->
                            <div style="margin: 0 30px 25px; background-color: ${payment_status === 'paid' ? '#f0fdf4' : (isPartialPaid ? '#fffbeb' : '#fef2f2')}; border: 1px solid ${payment_status === 'paid' ? '#bbf7d0' : (isPartialPaid ? '#fde68a' : '#fecaca')}; border-radius: 12px; padding: 20px;">
                                <h4 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #374151;">💰 Payment Summary</h4>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Total Amount:</td>
                                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1f2937; text-align: right;">${formatCurrency(totalAmt)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Paid Amount:</td>
                                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #059669; text-align: right;">${formatCurrency(paidAmt)}</td>
                                    </tr>
                                    ${balanceDue > 0 ? `
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Balance Due:</td>
                                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #dc2626; text-align: right;">${formatCurrency(balanceDue)}</td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Payment Status:</td>
                                        <td style="padding: 8px 0; text-align: right;">${getPaymentStatusBadge()}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Products Table -->
                            <div style="padding: 0 30px 25px;">
                                <h3 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1f2937;">📦 Ordered Products</h3>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                                    <thead>
                                        <tr style="background-color: #f9fafb;">
                                            <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Product</th>
                                            <th style="padding: 12px; text-align: center; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Quantity</th>
                                            <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${generateItemsHtml()}
                                    </tbody>
                                </table>
                            </div>

                            ${tracking_number ? `
                            <!-- Tracking Info -->
                            <div style="margin: 0 30px 25px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px;">
                                <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Tracking Number</p>
                                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1d4ed8;">${tracking_number}</p>
                            </div>
                            ` : ''}

                            <!-- Shipping Address -->
                            <div style="margin: 0 30px 25px; background-color: #f9fafb; border-radius: 12px; padding: 20px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">📍 Shipping Address</h3>
                                <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                                    ${shippingAddress?.address?.street || ''}<br>
                                    ${shippingAddress?.address?.city || ''}${shippingAddress?.address?.state ? `, ${shippingAddress.address.state}` : ''}<br>
                                    ${shippingAddress?.address?.zip_code || ''}
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <div style="padding: 0 30px 35px; text-align: center;">
                                <a href="https://9rx.com" 
                                   style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                                    🌐 Visit Website
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
  
module.exports = orderStatusTemplate;
