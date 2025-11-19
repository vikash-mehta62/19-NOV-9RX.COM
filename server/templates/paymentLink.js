const paymentLink = (order) => {
    const { id, customerInfo, order_number, status, items, total, date } = order;

    return `<!DOCTYPE html>
    <html>
    
    <head>
        <meta charset="UTF-8">
        <title>Order Status Update</title>
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
                padding: 25px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                text-align: center;
            }

            .header {
                font-size: 24px;
                font-weight: bold;
                color: #3498db;
                margin-bottom: 20px;
            }

            .status-badge {
                display: inline-block;
                padding: 10px 18px;
                background-color: ${status === 'shipped' ? '#2ecc71' : '#e74c3c'};
                color: #ffffff;
                border-radius: 5px;
                font-size: 14px;
                margin-bottom: 15px;
                font-weight: bold;
            }

            .order-info {
                background-color: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                text-align: left;
                margin-bottom: 20px;
            }

            .order-info p {
                margin: 8px 0;
                font-size: 15px;
            }

            .highlight {
                font-weight: bold;
                color: #2c3e50;
            }

            .cta, .pay-now {
                display: inline-block;
                padding: 14px 35px;
                text-decoration: none;
                border-radius: 5px;
                font-size: 16px;
                font-weight: bold;
                margin-top: 20px;
            }

            .pay-now {
                background-color: #28a745;
                color: #white;
                transition: background 0.3s ease-in-out;
            }

            .pay-now:hover {
                background-color: #218838;
            }

            .cta {
                background-color: #3498db;
                color: ##fcfcfc;
                margin-left: 10px;
            }

            .cta:hover {
                background-color: #2980b9;
            }

            .footer {
                font-size: 14px;
                color: #666;
                margin-top: 25px;
            }

            .product-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }

            .product-table th, .product-table td {
                padding: 10px;
                border-bottom: 1px solid #ddd;
                text-align: left;
                font-size: 14px;
            }

            .product-table th {
                background-color: #f1f1f1;
                font-weight: bold;
            }
        </style>
    </head>
    
    <body>
        <div class="container">
            <div class="header">Order Status Update</div>
         
            <div class="order-info">
                <p><span class="highlight">Customer Name:</span> ${customerInfo.name}</p>
                <p><span class="highlight">Order Number:</span> ${order_number}</p>
                <p><span class="highlight">Total Amount:</span> $${total}</p>
                <p><span class="highlight">Date:</span> ${new Date(date).toLocaleDateString()}</p>

                <h3>Ordered Products:</h3>
                <table class="product-table">
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                    </tr>
                    ${items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>$${item.price.toFixed(2)}</td>
                        </tr>
                    `).join("")}
                </table>
            </div>

            <a href="https://9rx.com/pay-now?orderid=${id}" class="pay-now">Pay Now</a>
            <a href="https://9rx.com" class="cta">Visit Website</a>

            <div class="footer">
                <p>If you have any questions, contact our support team at <a href="mailto:info@9rx.com">info@9rx.com</a>.</p>
                <p>Thank you for shopping with us!</p>
            </div>
        </div>
    </body>
    
    </html>`;
};

module.exports = paymentLink;
