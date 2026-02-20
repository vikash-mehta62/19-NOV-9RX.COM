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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333; 
                margin: 0; 
                padding: 20px;
                line-height: 1.6;
            }
            .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            }
            .header-section {
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .logo { 
                width: 100px; 
                height: auto;
                margin-bottom: 20px;
                filter: brightness(0) invert(1);
            }
            .header-title { 
                font-size: 28px; 
                font-weight: 700; 
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header-subtitle {
                font-size: 16px;
                opacity: 0.9;
                font-weight: 400;
            }
            .content-section {
                padding: 40px 30px;
                text-align: center;
            }
            .welcome-message { 
                font-size: 18px; 
                color: #4b5563; 
                margin-bottom: 30px;
                line-height: 1.7;
            }
            .user-info-card { 
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 24px;
                margin: 30px 0;
                display: inline-block;
                min-width: 280px;
            }
            .user-info-card p {
                margin: 8px 0;
                font-size: 16px;
            }
            .user-info-card strong {
                color: #1e293b;
                font-weight: 600;
            }
            .password-card {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px solid #f59e0b;
                border-radius: 12px;
                padding: 24px;
                margin: 30px 0;
                box-shadow: 0 4px 6px rgba(245, 158, 11, 0.1);
            }
            .password-label {
                font-size: 16px;
                color: #92400e;
                font-weight: 600;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .password-value {
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                font-size: 24px;
                font-weight: 700;
                color: #1e40af;
                background: #ffffff;
                padding: 12px 20px;
                border-radius: 8px;
                border: 2px solid #3b82f6;
                letter-spacing: 2px;
                margin: 12px 0;
                word-break: break-all;
            }
            .security-warning {
                font-size: 14px;
                color: #dc2626;
                margin-top: 12px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            .button-container {
                margin: 40px 0;
                display: flex;
                flex-direction: column;
                gap: 16px;
                align-items: center;
            }
            .btn {
                display: inline-block;
                padding: 16px 32px;
                font-size: 16px;
                font-weight: 600;
                text-decoration: none;
                border-radius: 12px;
                transition: all 0.3s ease;
                min-width: 200px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .btn-primary {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: #ffffff;
                border: 2px solid #3b82f6;
            }
            .btn-primary:hover {
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                transform: translateY(-2px);
                box-shadow: 0 8px 15px rgba(59, 130, 246, 0.3);
            }
            .btn-secondary {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: #ffffff;
                border: 2px solid #6366f1;
            }
            .btn-secondary:hover {
                background: linear-gradient(135deg, #5b21b6 0%, #4c1d95 100%);
                transform: translateY(-2px);
                box-shadow: 0 8px 15px rgba(99, 102, 241, 0.3);
            }
            .footer-section {
                background: #f8fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }
            .footer-text {
                font-size: 14px;
                color: #64748b;
                margin-bottom: 16px;
            }
            .support-info {
                font-size: 13px;
                color: #94a3b8;
            }
            @media (max-width: 600px) {
                .email-wrapper {
                    margin: 10px;
                    border-radius: 12px;
                }
                .header-section, .content-section {
                    padding: 30px 20px;
                }
                .header-title {
                    font-size: 24px;
                }
                .password-value {
                    font-size: 18px;
                    padding: 10px 16px;
                }
                .btn {
                    min-width: 180px;
                    padding: 14px 24px;
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
                    <p><strong>👤 Name:</strong> ${name}</p>
                    <p><strong>📧 Email:</strong> ${email}</p>
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
                    <a href="http://localhost:3000/login" class="btn btn-primary">
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
                    <strong>Need Help?</strong> Our support team is here to assist you with any questions or concerns.
                </p>
                <p class="support-info">
                    📞 Contact Support | 💬 Live Chat Available | 📧 support@9rx.com
                </p>
            </div>
        </div>
    </body>
    </html>`;
};

module.exports = adminAccountActiveTemplate;
