const orderConfirmationTemplate = (order) => { 
    const { 
        customerInfo, 
        shippingAddress, 
        order_number, 
        items = [], 
        estimated_delivery, 
        payment_status = "pending", 
        payment_method = "card",
        shipping_method, 
        total_amount = 0,
        tax_amount = 0,
        shipping_cost = 0,
        status = "new"
    } = order;

    // Format items for display
    const formatItems = (items) => {
        if (!items || items.length === 0) return '<tr><td colspan="4">No items</td></tr>';
        
        return items.map(item => {
            // Handle different item formats
            const name = item.name || item.product_name || 'Product';
            const quantity = item.quantity || 1;
            const price = item.price || item.unit_price || 0;
            
            // Handle sizes if present
            let sizeText = '-';
            if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
                sizeText = item.sizes.map(size => `${size.size_value || ''} ${size.size_unit || ''}`).join(", ");
            } else if (item.size) {
                sizeText = item.size;
            }
            
            return `
                <tr>
                    <td>${name}</td>
                    <td>${sizeText}</td>
                    <td>${quantity}</td>
                    <td>$${(price * quantity).toFixed(2)}</td>
                </tr>
            `;
        }).join("");
    };

    // Calculate subtotal if not provided
    const subtotal = items.reduce((sum, item) => {
        const price = item.price || item.unit_price || 0;
        const qty = item.quantity || 1;
        return sum + (price * qty);
    }, 0);

    return `<!DOCTYPE html>
    <html>
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Confirmation</title>
        <style>
            body {
                background-color: #f4f4f4;
                font-family: Arial, sans-serif;
                font-size: 16px;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
            }
    
            .container {
                max-width: 600px;
                margin: 30px auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
    
            .header {
                font-size: 24px;
                font-weight: bold;
                color: #27ae60;
                margin-bottom: 15px;
            }
    
            .order-info {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                text-align: left;
                margin-bottom: 20px;
            }
    
            .order-info p {
                margin: 5px 0;
                font-size: 14px;
            }
    
            .highlight {
                font-weight: bold;
                color: #2c3e50;
            }
    
            .cta {
                display: inline-block;
                padding: 12px 30px;
                background-color: #27ae60;
                color: #ffffff;
                text-decoration: none;
                border-radius: 5px;
                font-size: 16px;
                font-weight: bold;
                margin-top: 20px;
            }
    
            .cta:hover {
                background-color: #219150;
            }
    
            .footer {
                font-size: 14px;
                color: #666;
                margin-top: 20px;
            }
    
            .product-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
    
            .product-table th, .product-table td {
                padding: 8px;
                border-bottom: 1px solid #ddd;
                text-align: left;
            }
    
            .product-table th {
                background-color: #f1f1f1;
            }
    
            .address-box {
                background-color: #f1f1f1;
                padding: 10px;
                border-radius: 8px;
                text-align: left;
                font-size: 14px;
                margin-top: 15px;
            }
    
            .address-box p {
                margin: 5px 0;
            }

            .totals {
                text-align: right;
                margin-top: 15px;
                padding-top: 10px;
                border-top: 2px solid #ddd;
            }

            .totals p {
                margin: 5px 0;
            }

            .total-final {
                font-size: 18px;
                font-weight: bold;
                color: #27ae60;
            }

            .status-badge {
                display: inline-block;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }

            .status-new { background-color: #e3f2fd; color: #1976d2; }
            .status-processing { background-color: #fff3e0; color: #f57c00; }
            .status-shipped { background-color: #e8f5e9; color: #388e3c; }
        </style>
    </head>
    
    <body>
        <div class="container">
            <div class="header">🎉 Your Order is Confirmed!</div>
            <p>Thank you for shopping with us, <strong>${customerInfo?.name || 'Valued Customer'}</strong>!</p>
            <p>Your order has been successfully placed and is being processed.</p>

            <div class="order-info">
                <p><span class="highlight">Order Number:</span> #${order_number}</p>
                <p><span class="highlight">Order Status:</span> <span class="status-badge status-${status}">${status}</span></p>
                <p><span class="highlight">Payment Method:</span> ${payment_method === 'credit' ? 'Credit Terms' : payment_method === 'card' ? 'Credit Card' : payment_method}</p>
                <p><span class="highlight">Payment Status:</span> ${payment_status}</p>

                <h3>🛍 Ordered Items:</h3>
                <table class="product-table">
                    <tr>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Qty</th>
                        <th>Price</th>
                    </tr>
                    ${formatItems(items)}
                </table>

                <div class="totals">
                    <p>Subtotal: $${subtotal.toFixed(2)}</p>
                    ${tax_amount > 0 ? `<p>Tax: $${Number(tax_amount).toFixed(2)}</p>` : ''}
                    ${shipping_cost > 0 ? `<p>Shipping: $${Number(shipping_cost).toFixed(2)}</p>` : '<p>Shipping: FREE</p>'}
                    <p class="total-final">Total: $${Number(total_amount).toFixed(2)}</p>
                </div>
            </div>
    
            <div class="address-box">
                <h3>📦 Shipping Address:</h3>
                <p><span class="highlight">Name:</span> ${shippingAddress?.fullName || customerInfo?.name || '-'}</p>
                <p><span class="highlight">Street:</span> ${shippingAddress?.address?.street || '-'}</p>
                <p><span class="highlight">City:</span> ${shippingAddress?.address?.city || '-'}</p>
                <p><span class="highlight">State:</span> ${shippingAddress?.address?.state || '-'}</p>
                <p><span class="highlight">Zip Code:</span> ${shippingAddress?.address?.zip_code || '-'}</p>
            </div>
    
            <a href="https://9rx.com/pharmacy/orders" class="cta">📋 View My Orders</a>
    
            <div class="footer">
                <p>Need help? Contact our support team at <a href="mailto:info@9rx.com">info@9rx.com</a></p>
                <p>We appreciate your business! 💖</p>
                <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} 9RX Pharmacy Supplies. All rights reserved.</p>
            </div>
        </div>
    </body>
    
    </html>`;
};

module.exports = orderConfirmationTemplate;
