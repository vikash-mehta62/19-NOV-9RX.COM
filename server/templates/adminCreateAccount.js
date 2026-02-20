const adminAccountActiveTemplate = (name, email, admin = false, password = "12345678", termsAcceptanceLink = null) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Welcome to 9RX - Account Created Successfully</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background-color: #f4f7fa;
                color: #333; 
                margin: 0; 
                padding: 20px;
                line-height: 1.6;
            }
            .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .header-section {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                padding: 40px 30px;
                text-align: center;
                border-bottom: 3px solid #2563eb;
            }
            .logo { 
                width: 100px; 
                height: auto;
                margin-bottom: 20px;
            }
            .header-title { 
                font-size: 26px; 
                font-weight: 700; 
                color: #1e40af;
                margin-bottom: 8px;
            }
            .header-subtitle {
                font-size: 15px;
                color: #3b82f6;
                font-weight: 500;
            }
            .content-section {
                padding: 40px 30px;
                text-align: center;
            }
            .welcome-message { 
                font-size: 16px; 
                color: #4b5563; 
                margin-bottom: 30px;
                line-height: 1.7;
                text-align: left;
            }
            .user-info-card { 
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-left: 4px solid #3b82f6;
                border-radius: 8px;
                padding: 20px 24px;
                margin: 24px 0;
                text-align: left;
            }
            .user-info-card p {
                margin: 8px 0;
                font-size: 15px;
                color: #374151;
            }
            .user-info-card strong {
                color: #1e293b;
                font-weight: 600;
            }
            .password-card {
                background: #fffbeb;
                border: 1px solid #fbbf24;
                border-left: 4px solid #f59e0b;
                border-radius: 8px;
                padding: 24px;
                margin: 24px 0;
            }
            .password-label {
                font-size: 15px;
                color: #92400e;
                font-weight: 600;
                margin-bottom: 12px;
                text-align: left;
            }
            .password-value {
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                font-size: 22px;
                font-weight: 700;
                color: #1e40af;
                background: #ffffff;
                padding: 12px 20px;
                border-radius: 8px;
                border: 2px dashed #3b82f6;
                letter-spacing: 2px;
                margin: 12px 0;
                text-align: center;
                word-break: break-all;
            }
            .security-warning {
                font-size: 13px;
                color: #dc2626;
                margin-top: 12px;
                font-weight: 500;
                text-align: left;
            }
            .button-container {
                margin: 32px 0;
                text-align: center;
            }
            .btn {
                display: inline-block;
                padding: 14px 32px;
                font-size: 15px;
                font-weight: 600;
                text-decoration: none;
                border-radius: 8px;
                min-width: 200px;
                text-align: center;
                margin: 6px;
            }
            .btn-primary {
                background: #2563eb;
                color: #ffffff !important;
            }
            .btn-secondary {
                background: #f8fafc;
                color: #2563eb !important;
                border: 2px solid #2563eb;
            }
            .footer-section {
                background: #f8fafc;
                padding: 24px 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-text {
                font-size: 13px;
                color: #64748b;
                margin-bottom: 12px;
                line-height: 1.6;
            }
            .support-info {
                font-size: 12px;
                color: #94a3b8;
            }
            @media (max-width: 600px) {
                .email-wrapper {
                    margin: 10px;
                    border-radius: 12px;
                }
                .header-section, .content-section {
                    padding: 28px 20px;
                }
                .header-title {
                    font-size: 22px;
                }
                .password-value {
                    font-size: 18px;
                    padding: 10px 16px;
                }
                .btn {
                    min-width: 180px;
                    padding: 12px 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <!-- Header Section -->
            <div class="header-section">
                <img src="https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/9RX%20LOGO/9rx_logo.png" alt="9RX Logo" class="logo">
                <div class="header-title">🎉 Welcome to 9RX!</div>
                <div class="header-subtitle">Your account has been successfully created</div>
            </div>

            <!-- Content Section -->
            <div class="content-section">
                <p class="welcome-message">
                    Hello <strong>${name}</strong>! We're excited to have you join the 9RX family. Your account is now ready to use. Please use the temporary credentials below to access your account.
                </p>
                
                <div class="user-info-card">
                    <p>👤 <strong>Name:</strong> ${name}</p>
                    <p>📧 <strong>Email:</strong> ${email}</p>
                </div>
                
                <div class="password-card">
                    <div class="password-label">
                        🔐 Your Temporary Password
                    </div>
                    <div class="password-value">${password}</div>
                    <div class="security-warning">
                        ⚠️ Please change this password immediately after your first login for security
                    </div>
                </div>

                <div class="button-container">
                    <a href="https://www.9rx.com/login" class="btn btn-primary">
                        🚀 Login to Your Account
                    </a>
                    ${termsAcceptanceLink ? `
                    <a href="${termsAcceptanceLink}" class="btn btn-secondary">
                        📋 Accept Terms & Privacy Policy
                    </a>
                    ` : ''}
                </div>
            </div>

            <!-- Footer Section -->
            <div class="footer-section">
                <p class="footer-text">
                    <strong>Important:</strong> ${termsAcceptanceLink ? 'Please click the "Accept Terms & Privacy Policy" button above to complete your account setup. ' : ''}Please change your temporary password after your first login for security.
                </p>
                <p class="footer-text">
                    Need help? Our support team is here to assist you.
                </p>
                <p class="support-info">
                    📞 +1 (800) 969-6295 &nbsp;|&nbsp; 📧 support@9rx.com &nbsp;|&nbsp; 🌐 www.9rx.com
                </p>
            </div>
        </div>
    </body>
    </html>`;
};

module.exports = adminAccountActiveTemplate;
