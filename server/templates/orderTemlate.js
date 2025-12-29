const orderStatusTemplate = (order) => { 
    const { customerInfo, shippingAddress, order_number, status, items, estimated_delivery, payment_status, shipping_method, total_amount, tracking_number, paid_amount } = order;
  
    // Calculate balance due
    const paidAmt = paid_amount || 0;
    const balanceDue = Math.max(0, total_amount - paidAmt);
    const isPartialPaid = payment_status === 'partial_paid' || (paidAmt > 0 && balanceDue > 0);

    // Get status badge color
    const getStatusColor = (status) => {
      switch(status?.toLowerCase()) {
        case 'shipped': return '#2ecc71';
        case 'delivered': return '#27ae60';
        case 'processing': return '#9b59b6';
        case 'pending': return '#f39c12';
        case 'cancelled': return '#e74c3c';
        default: return '#3498db';
      }
    };

    // Get payment status badge color
    const getPaymentStatusColor = (paymentStatus) => {
      switch(paymentStatus?.toLowerCase()) {
        case 'paid': return '#27ae60';
        case 'partial_paid': return '#f39c12';
        case 'unpaid': return '#e74c3c';
        case 'refunded': return '#9b59b6';
        default: return '#95a5a6';
      }
    };

    // Format payment status display
    const formatPaymentStatus = (paymentStatus) => {
      switch(paymentStatus?.toLowerCase()) {
        case 'paid': return 'Paid';
        case 'partial_paid': return 'Partially Paid';
        case 'unpaid': return 'Unpaid';
        case 'refunded': return 'Refunded';
        default: return paymentStatus || 'Unknown';
      }
    };

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
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
    
            .header {
                font-size: 24px;
                font-weight: bold;
                color: #3498db;
                margin-bottom: 15px;
            }
    
            .status-badge {
                display: inline-block;
                padding: 8px 15px;
                background-color: ${getStatusColor(status)};
                color: #ffffff;
                border-radius: 5px;
                font-size: 14px;
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

            .payment-section {
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                padding: 12px;
                border-radius: 8px;
                margin: 15px 0;
                text-align: left;
            }

            .payment-section.paid {
                background-color: #d4edda;
                border-color: #28a745;
            }

            .payment-section.partial {
                background-color: #fff3cd;
                border-color: #ffc107;
            }

            .payment-section.unpaid {
                background-color: #f8d7da;
                border-color: #dc3545;
            }

            .payment-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px dashed #ddd;
            }

            .payment-row:last-child {
                border-bottom: none;
            }

            .payment-label {
                font-weight: bold;
                color: #2c3e50;
            }

            .payment-value {
                font-weight: bold;
            }

            .payment-value.green {
                color: #27ae60;
            }

            .payment-value.orange {
                color: #f39c12;
            }

            .payment-value.red {
                color: #e74c3c;
            }

            .payment-status-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                color: #fff;
            }
    
            .cta {
                display: inline-block;
                padding: 12px 30px;
                background-color: #3498db;
                color: #ffffff;
                text-decoration: none;
                border-radius: 5px;
                font-size: 16px;
                font-weight: bold;
                margin-top: 20px;
            }
    
            .cta:hover {
                background-color: #2980b9;
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
            <div class="header">Order Status Update</div>
            <div class="status-badge">${status.toUpperCase()}</div>
            <div class="order-info">
                <p><span class="highlight">Customer Name:</span> ${customerInfo.name}</p>
                <p><span class="highlight">Order Number:</span> ${order_number}</p>
          ${status.toUpperCase() === "SHIPPED" ? `<p><span class="highlight">Shipping Method:</span> ${shipping_method}</p>` : ""}

                <!-- Payment Summary Section -->
                <div class="payment-section ${payment_status === 'paid' ? 'paid' : (isPartialPaid ? 'partial' : 'unpaid')}">
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">💰 Payment Summary</h4>
                    <div class="payment-row">
                        <span class="payment-label">Total Amount:</span>
                        <span class="payment-value">$${total_amount.toFixed(2)}</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Paid Amount:</span>
                        <span class="payment-value green">$${paidAmt.toFixed(2)}</span>
                    </div>
                    ${balanceDue > 0 ? `
                    <div class="payment-row">
                        <span class="payment-label">Balance Due:</span>
                        <span class="payment-value red">$${balanceDue.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="payment-row">
                        <span class="payment-label">Payment Status:</span>
                        <span class="payment-status-badge" style="background-color: ${getPaymentStatusColor(payment_status)}">
                            ${formatPaymentStatus(payment_status)}
                        </span>
                    </div>
                </div>
    
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
    
                ${tracking_number ? `<p><span class="highlight">Tracking Number:</span> ${tracking_number}</p>` : ""}
            </div>
    
            <div class="address-box">
                <h3>Shipping Address:</h3>
                <p><span class="highlight">Street:</span> ${shippingAddress.address.street}</p>
                <p><span class="highlight">City:</span> ${shippingAddress.address.city}</p>
                <p><span class="highlight">State:</span> ${shippingAddress.address.state}</p>
                <p><span class="highlight">Zip Code:</span> ${shippingAddress.address.zip_code}</p>
            </div>
    
            <a href="https://9rx.com" class="cta">Visit Website</a>
    
            <div class="footer">
                <p>If you have any questions, contact our support team at <a href="mailto:info@9rx.com">info@9rx.com</a>.</p>
                <p>Thank you for shopping with us!</p>
            </div>
        </div>
    </body>
    
    </html>`;
  };
  
module.exports = orderStatusTemplate;
