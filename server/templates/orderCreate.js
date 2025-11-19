const orderConfirmationTemplate = (order) => { 
    const { customerInfo, shippingAddress, order_number, items, estimated_delivery, payment_status, shipping_method, total_amount } = order;

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
        </style>
    </head>
    
    <body>
        <div class="container">
            <div class="header">🎉 Your Order is Confirmed!</div>
            <p>Thank you for shopping with us. Your order has been successfully placed.</p>
          <div class="order-info">
  <p><span class="highlight">Order Number:</span> ${order_number}</p>
  
  <p><span class="highlight">Payment Status:</span> ${payment_status}</p>
  <p><span class="highlight">Total Amount:</span> $${total_amount.toFixed(2)}</p>

  <h3>🛍 Ordered Items:</h3>
  <table class="product-table">
    <tr>
      <th>Product</th>
      <th>Sizes</th>
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

    
            <div class="address-box">
                <h3>📦 Shipping Address:</h3>
                <p><span class="highlight">Name:</span> ${shippingAddress?.fullName}</p>
                <p><span class="highlight">Street:</span> ${shippingAddress?.address?.street}</p>
                <p><span class="highlight">City:</span> ${shippingAddress?.address?.city}</p>
                <p><span class="highlight">State:</span> ${shippingAddress?.address?.state}</p>
                <p><span class="highlight">Zip Code:</span> ${shippingAddress?.address?.zip_code}</p>
            </div>
    
            <a href="https://9rx.com/orders/${order_number}" class="cta">🔍 Visit Website</a>
    
            <div class="footer">
                <p>Need help? Contact our support team at <a href="mailto:info@9rx.com">info@9rx.com</a></p>
                <p>We appreciate your business! 💖</p>
            </div>
        </div>
    </body>
    
    </html>`;
};





module.exports = orderConfirmationTemplate;
