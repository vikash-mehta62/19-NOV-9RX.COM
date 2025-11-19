const adminOrderNotificationTemplate = (order) => {
    const { customerInfo, order_number, items, estimated_delivery, payment_status, shipping_method, total_amount } = order;

    return `<!DOCTYPE html>
    <html>
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>New Order Notification</title>
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
                color: #e74c3c;
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
                background-color: #e74c3c;
                color: #ffffff;
                text-decoration: none;
                border-radius: 5px;
                font-size: 16px;
                font-weight: bold;
                margin-top: 20px;
            }
    
            .cta:hover {
                background-color: #c0392b;
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
    
        </style>
    </head>
    
    <body>
        <div class="container">
            <div class="header">🛒 New Order Received!</div>
            <p>A new order has been placed by <span class="highlight">${customerInfo.name}</span>.</p>
            <div class="order-info">
                <p><span class="highlight">Order Number:</span> #${order_number}</p>
                
                <p><span class="highlight">Payment Status:</span> ${payment_status}</p>
                        <p><span class="highlight">Total Amount:</span> $${total_amount.toFixed(2)}</p>
    
                <h3>🛍 Ordered Items:</h3>
                <table class="product-table">
                    <tr>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Quantity</th>
                        <th>Price</th>
                    </tr>
                       ${items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>
          ${item.sizes.map(size => `${size.size_value} ${size.size_unit}`).join(", ")}
        </td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
      </tr>
    `).join("")}
                </table>
            </div>
    
            <a href="https://9rx.com/admin/orders" class="cta">📋 View Order</a>
    
          
        </div>
    </body>
    
    </html>`;
};

module.exports = adminOrderNotificationTemplate;
