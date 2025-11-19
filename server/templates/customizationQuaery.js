const customizationQueryEmail = (name, email, phone, selectedProducts) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Customization Inquiry</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            body {
                background: linear-gradient(to right, #E3F2E3, #D4EDDA);
                font-family: 'Inter', Arial, sans-serif;
                color: #2F5D3F;
                margin: 0;
                padding: 40px 20px;
            }

            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #FFFFFF;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                padding: 30px;
                text-align: center;
            }

            .logo-container {
                margin-bottom: 20px;
            }

            .logo {
                max-width: 150px;
            }

            .message {
                font-size: 22px;
                font-weight: 700;
                color: #227D48;
                margin-bottom: 15px;
            }

            .info {
                text-align: left;
                font-size: 16px;
                background: #E8F5E9;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }

            .info p {
                margin: 6px 0;
                font-weight: 500;
            }

            .highlight {
                color: #1B5E20;
                font-weight: 600;
            }

            .product-list {
                margin-top: 20px;
                text-align: left;
            }

            .product-item {
                background: #E9F7EF;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                border-left: 5px solid #2E7D32;
            }

            .product-details {
                flex: 1;
                font-size: 16px;
                font-weight: 600;
            }

            .cta {
                display: inline-block;
                padding: 12px 24px;
                background: #2E7D32;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin-top: 20px;
                transition: background 0.3s ease;
            }

            .cta:hover {
                background: #1B5E20;
            }

            .support {
                font-size: 12px;
                color: #4E6B5B;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #C8E6C9;
            }

            @media (max-width: 600px) {
                .container {
                    padding: 20px;
                }

                .product-item {
                    flex-direction: column;
                    text-align: center;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo-container">
                <img class="logo" src="https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/download.png" alt="9RX.com">
            </div>
            <div class="message">New Customization Inquiry</div>
            <div class="info">
                <p><span class="highlight">Name:</span> ${name}</p>
                <p><span class="highlight">Email:</span> ${email}</p>
                <p><span class="highlight">Phone:</span> ${phone}</p>
            </div>

            <div class="product-list">
                <h3>Selected Products:</h3>
                ${selectedProducts
                    .map(
                        (product) => `
                        <div class="product-item">
                            <div class="product-details">${product.value}</div>
                        </div>`
                    )
                    .join('')}
            </div>

       

            <div class="support">
                This is an automated message. Please do not reply.
            </div>
        </div>
    </body>
    </html>`;
};

export { customizationQueryEmail };
