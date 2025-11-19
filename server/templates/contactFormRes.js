const contactUsEmail = (name ,email, contact, message, role) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Business Query Notification</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            body {
                background: linear-gradient(109.6deg, rgba(223,234,247,1) 11.2%, rgba(244,248,252,1) 91.1%);
                font-family: 'Inter', Arial, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                margin: 0;
                padding: 40px 20px;
            }

            .container {
                max-width: 600px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 40px;
                transition: all 0.3s ease;
            }

            .container:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            }

            .logo-container {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(to right, rgba(255,255,255,0.8), rgba(255,255,255,0.4));
                border-radius: 12px;
            }

            .logo {
                max-width: 180px;
                height: auto;
                transition: transform 0.3s ease;
            }

            .logo:hover {
                transform: scale(1.05);
            }

            .message {
                font-size: 28px;
                font-weight: 700;
                color: #0EA5E9;
                margin-bottom: 30px;
                text-align: center;
                background: linear-gradient(90deg, #0EA5E9, #38BDF8);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .body {
                font-size: 16px;
                color: #374151;
                background: white;
                padding: 24px;
                border-radius: 12px;
                border: 1px solid #E5E7EB;
            }

            .info {
                margin: 20px 0;
                padding: 20px;
                background: linear-gradient(to right, #F8FAFC, #F1F5F9);
                border-radius: 8px;
            }

            .info p {
                margin: 12px 0;
                padding: 8px 0;
                border-bottom: 1px solid rgba(203, 213, 225, 0.4);
            }

            .info p:last-child {
                border-bottom: none;
            }

            .highlight {
                color: #0EA5E9;
                font-weight: 600;
                padding: 2px 0;
            }

            .cta {
                display: inline-block;
                padding: 12px 24px;
                background: linear-gradient(90deg, #0EA5E9, #38BDF8);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin-top: 24px;
                transition: all 0.3s ease;
                text-align: center;
            }

            .cta:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
            }

            .support {
                text-align: center;
                font-size: 14px;
                color: #64748B;
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid #E2E8F0;
            }

            @media (max-width: 600px) {
                body {
                    padding: 20px 10px;
                }

                .container {
                    padding: 20px;
                }

                .message {
                    font-size: 24px;
                }

                .body {
                    padding: 16px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo-container">
                <a href="https://9rx.com">
                    <img class="logo" src="https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/download.png" alt="9RX.com">
                </a>
            </div>
            <div class="message">New Business Inquiry Received</div>
            <div class="body">
                <p>Dear <span class="highlight">Admin</span>,</p>
                <div class="info">
                    <p>A new business inquiry has been submitted with the following details:</p>
                    ${name ? `<p><span class="highlight">Name:</span> ${name}</p>` : ''}
                    ${email ? `<p><span class="highlight">Email:</span> ${email}</p>` : ''}
                    ${contact ? `<p><span class="highlight">Contact:</span> ${contact}</p>` : ''}
                    ${message ? `<p><span class="highlight">Message:</span> ${message}</p>` : ''}
                </div>
                <a href="https://9rx.com/admin" class="cta">View in Dashboard</a>
                <div class="support">
                    This is an automated notification. Please do not reply to this email.
                </div>
            </div>
        </div>
    </body>
    </html>`;
};

export { contactUsEmail };
