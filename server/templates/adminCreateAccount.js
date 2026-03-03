/**
 * ============================================================================
 * ADMIN ACCOUNT CREATION EMAIL TEMPLATE - MULTI-PURPOSE DESIGN
 * ============================================================================
 * 
 * This template is designed to handle MULTIPLE scenarios with a single template:
 * 
 * SCENARIO 1: NEW ACCOUNT CREATION (Admin creates customer)
 * - Shows: Welcome message, temporary password, login button, terms button
 * - Triggered when: password !== null
 * - Purpose: Give new user their credentials and guide them to accept terms
 * - NOTE: Profile completion is NOT included - admin provides all info upfront
 * 
 * SCENARIO 2: TERMS REMINDER/RESEND (User hasn't accepted terms)
 * - Shows: Warning message, pending terms list, accept terms button
 * - Triggered when: password === null (isResend = true)
 * - Purpose: Remind user to accept pending terms and conditions
 * 
 * ============================================================================
 * PARAMETERS:
 * ============================================================================
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} email - User's email address
 * @param {string|null} password - Temporary password (null = resend scenario)
 * @param {string|null} termsAcceptanceLink - Secure link to accept terms
 * @param {object|null} pendingAcceptances - Object with {terms, privacy, ach} flags
 * 
 * ============================================================================
 * CONDITIONAL RENDERING LOGIC:
 * ============================================================================
 * - isResend = !password (determines if this is a reminder email)
 * - Password card: Shows only when password exists (!isResend)
 * - Pending terms card: Shows only when isResend && pendingTermsList.length > 0
 * - Login button: Shows only when !isResend (new account)
 * - Terms button: Shows only when termsAcceptanceLink exists
 * 
 * ============================================================================
 * USAGE EXAMPLES:
 * ============================================================================
 * 
 * // New account creation (admin creates customer):
 * adminAccountActiveTemplate('John', 'Doe', 'john@example.com', 'TempPass123', 
 *   'https://9rx.com/accept-terms#token=xxx', null)
 * 
 * // Terms reminder (user hasn't accepted):
 * adminAccountActiveTemplate('John', 'Doe', 'john@example.com', null, 
 *   'https://9rx.com/accept-terms#token=xxx', {terms: true, privacy: true})
 * 
 * ============================================================================
 */

const adminAccountActiveTemplate = (firstName, lastName, email, password = null, termsAcceptanceLink = null, pendingAcceptances = null) => {
    const name = `${firstName} ${lastName}`;
    const isResend = !password; // If no password, this is a resend/reminder email
    
    // Determine which terms are pending (for resend scenario)
    let pendingTermsList = [];
    if (pendingAcceptances) {
        if (pendingAcceptances.terms) pendingTermsList.push('Terms of Service');
        if (pendingAcceptances.privacy) pendingTermsList.push('Privacy Policy');
        if (pendingAcceptances.ach) pendingTermsList.push('ACH Authorization');
    }
    
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${isResend ? 'Action Required: Accept Terms & Conditions' : 'Welcome to 9RX - Account Created Successfully'}</title>
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
                <div class="header-title">${isResend ? '⚠️ Action Required' : '🎉 Welcome to 9RX!'}</div>
                <div class="header-subtitle">${isResend ? 'Please accept our Terms & Conditions' : 'Your account has been successfully created'}</div>
            </div>

            <!-- Content Section -->
            <div class="content-section">
                <p class="welcome-message">
                    Hello <strong>${name}</strong>! ${isResend 
                        ? 'We noticed that you haven\'t accepted all required terms and conditions yet. Please review and accept the following to continue using your account:' 
                        : 'We\'re excited to have you join the 9RX family. Your account is now ready to use. Please use the temporary credentials below to access your account.'}
                </p>
                
                <div class="user-info-card">
                    <p>👤 <strong>Name:</strong> ${name}</p>
                    <p>📧 <strong>Email:</strong> ${email}</p>
                </div>
                
                ${isResend && pendingTermsList.length > 0 ? `
                <div class="password-card" style="background: #fef2f2; border-color: #fca5a5; border-left-color: #ef4444;">
                    <div class="password-label" style="color: #991b1b;">
                        📋 Pending Acceptances
                    </div>
                    <div style="text-align: left; margin-top: 12px;">
                        ${pendingTermsList.map(term => `
                            <p style="margin: 8px 0; color: #7f1d1d; font-size: 14px;">
                                ❌ <strong>${term}</strong>
                            </p>
                        `).join('')}
                    </div>
                    <div class="security-warning">
                        ⚠️ You must accept all required terms to continue using your account
                    </div>
                </div>
                ` : ''}
                
                ${!isResend && password ? `
                <div class="password-card">
                    <div class="password-label">
                        🔐 Your Temporary Password
                    </div>
                    <div class="password-value">${password}</div>
                    <div class="security-warning">
                        ⚠️ Please change this password immediately after your first login for security
                    </div>
                </div>
                ` : ''}

                <div class="button-container">
                    ${!isResend ? `
                    <a href="https://www.9rx.com/login" class="btn btn-primary">
                        🚀 Login to Your Account
                    </a>
                    ` : ''}
                    ${termsAcceptanceLink ? `
                    <a href="${termsAcceptanceLink}" class="btn ${isResend ? 'btn-primary' : 'btn-secondary'}">
                        📋 ${isResend ? 'Accept Terms Now' : 'Accept Terms & Privacy Policy'}
                    </a>
                    ` : ''}
                </div>
            </div>

            <!-- Footer Section -->
            <div class="footer-section">
                <p class="footer-text">
                    <strong>Important:</strong> ${termsAcceptanceLink 
                        ? (isResend 
                            ? 'Please click the "Accept Terms Now" button above to review and accept the required terms and conditions.' 
                            : 'Please click the "Accept Terms & Privacy Policy" button above to complete your account setup. ') 
                        : ''}${!isResend && password ? 'Please change your temporary password after your first login for security.' : ''}
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
