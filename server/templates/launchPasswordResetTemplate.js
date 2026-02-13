/**
 * Website Launch - Password Reset & Terms Acceptance Email Template
 * Sent to all users for the new website launch
 * Single button flow: View T&C first, then reset password
 * Modern, professional design matching current UI/UX
 */

const launchPasswordResetTemplate = (name, email, resetLink, termsLink) => {
  const currentYear = new Date().getFullYear();
  
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Welcome to New 9RX Platform</title>
    <!--[if mso]>
    <style type="text/css">
      body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
    </style>
    <![endif]-->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1f2937;
        background-color: #f9fafb;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      table {
        border-collapse: collapse;
        border-spacing: 0;
      }
      
      img {
        border: 0;
        outline: none;
        text-decoration: none;
        -ms-interpolation-mode: bicubic;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
      }
      
      .header {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        padding: 48px 40px;
        text-align: center;
      }
      
      .logo-image {
        max-width: 180px;
        height: auto;
        margin: 0 0 16px 0;
        display: inline-block;
      }
      
      .logo {
        font-size: 42px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 12px 0;
        letter-spacing: -1px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .logo-subtitle {
        color: #dbeafe;
        font-size: 15px;
        font-weight: 500;
        margin: 0;
      }
      
      .content {
        padding: 40px;
      }
      
      .title {
        font-size: 28px;
        font-weight: 700;
        color: #111827;
        margin: 0 0 16px 0;
        letter-spacing: -0.5px;
        line-height: 1.3;
      }
      
      .subtitle {
        font-size: 16px;
        color: #6b7280;
        margin: 0 0 32px 0;
        line-height: 1.6;
      }
      
      .alert-box {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border-left: 4px solid #f59e0b;
        padding: 20px 24px;
        margin: 0 0 32px 0;
        border-radius: 12px;
      }
      
      .alert-title {
        font-weight: 700;
        color: #92400e;
        margin: 0 0 8px 0;
        font-size: 16px;
      }
      
      .alert-text {
        color: #92400e;
        margin: 0;
        font-size: 14px;
      }
      
      .user-info {
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px 24px;
        margin: 0 0 32px 0;
      }
      
      .user-info-label {
        font-size: 13px;
        color: #6b7280;
        margin: 0 0 4px 0;
        font-weight: 500;
      }
      
      .user-info-value {
        font-size: 16px;
        color: #111827;
        font-weight: 600;
        margin: 0;
      }
      
      .steps-container {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border-radius: 16px;
        padding: 32px 28px;
        margin: 0 0 32px 0;
      }
      
      .steps-title {
        font-size: 20px;
        font-weight: 700;
        color: #1e40af;
        margin: 0 0 24px 0;
      }
      
      .step {
        display: flex;
        align-items: flex-start;
        margin-bottom: 20px;
        background-color: #ffffff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      
      .step:last-child {
        margin-bottom: 0;
      }
      
      .step-number {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
        margin-right: 16px;
        box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
        text-align: center;
        line-height: 36px;
        vertical-align: middle;
      }
      
      .step-content {
        flex: 1;
      }
      
      .step-title {
        font-weight: 700;
        color: #111827;
        margin: 0 0 4px 0;
        font-size: 16px;
      }
      
      .step-description {
        color: #6b7280;
        font-size: 14px;
        margin: 0;
        line-height: 1.5;
      }
      
      .button-container {
        text-align: center;
        margin: 32px 0;
      }
      
      .button {
        display: inline-block;
        padding: 18px 48px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: 16px;
        box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -2px rgba(37, 99, 235, 0.2);
        transition: all 0.2s ease;
      }
      
      .button:hover {
        background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.3), 0 10px 10px -5px rgba(37, 99, 235, 0.2);
      }
      
      .info-text {
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        margin: 24px 0;
        line-height: 1.6;
      }
      
      .features-box {
        background-color: #f0f9ff;
        border: 2px solid #bfdbfe;
        border-radius: 12px;
        padding: 28px;
        margin: 32px 0;
      }
      
      .features-title {
        font-size: 18px;
        font-weight: 700;
        color: #1e40af;
        margin: 0 0 16px 0;
      }
      
      .features-list {
        margin: 0;
        padding: 0 0 0 24px;
      }
      
      .features-list li {
        color: #374151;
        font-size: 14px;
        margin: 10px 0;
        line-height: 1.6;
      }
      
      .section {
        margin: 32px 0;
      }
      
      .section-title {
        font-size: 18px;
        font-weight: 700;
        color: #1e40af;
        margin: 0 0 12px 0;
      }
      
      .section-text {
        color: #374151;
        font-size: 14px;
        margin: 0 0 12px 0;
        line-height: 1.6;
      }
      
      .section-list {
        margin: 12px 0;
        padding: 0 0 0 24px;
      }
      
      .section-list li {
        color: #374151;
        font-size: 14px;
        margin: 8px 0;
        line-height: 1.6;
      }
      
      .deadline-box {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border-left: 4px solid #f59e0b;
        padding: 20px 24px;
        margin: 32px 0;
        border-radius: 12px;
        text-align: center;
      }
      
      .deadline-title {
        font-weight: 700;
        color: #92400e;
        margin: 0 0 8px 0;
        font-size: 16px;
      }
      
      .deadline-text {
        color: #92400e;
        margin: 0;
        font-size: 14px;
      }
      
      .deadline-days {
        color: #dc2626;
        font-weight: 700;
        font-size: 20px;
      }
      
      .footer {
        background-color: #f9fafb;
        padding: 32px 40px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
      }
      
      .footer-text {
        color: #6b7280;
        font-size: 13px;
        margin: 8px 0;
        line-height: 1.6;
      }
      
      .footer-brand {
        color: #1d4ed8;
        font-weight: 700;
        font-size: 16px;
      }
      
      .footer-disclaimer {
        color: #9ca3af;
        font-size: 12px;
        margin: 20px 0 0 0;
        line-height: 1.5;
      }
      
      @media only screen and (max-width: 600px) {
        .content {
          padding: 24px !important;
        }
        .header {
          padding: 32px 24px !important;
        }
        .logo {
          font-size: 32px !important;
        }
        .title {
          font-size: 22px !important;
        }
        .button {
          padding: 16px 32px !important;
          font-size: 15px !important;
        }
        .steps-container {
          padding: 24px 20px !important;
        }
        .step {
          padding: 16px !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f9fafb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            
            <!-- Header -->
            <tr>
              <td class="header">
                <img src="https://asnhfgfhidhzswqkhpzz.supabase.co/storage/v1/object/public/product-images/9rx_logo.png" alt="9RX Logo" class="logo-image">
                <p class="logo-subtitle">Your Trusted Pharmacy Partner</p>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td class="content">
                
                <!-- Title -->
                <h2 class="title">🚀 Welcome to Our New Platform!</h2>
                <p class="subtitle">We're excited to introduce you to our completely redesigned website with enhanced features and better security.</p>
                
                <!-- Alert Box -->
                <div class="alert-box">
                  <p class="alert-title">⚠️ ACTION REQUIRED</p>
                  <p class="alert-text">To continue using your account, please complete the steps below.</p>
                </div>
                
                <!-- User Info -->
                <div class="user-info">
                  <p class="user-info-label">Account Holder</p>
                  <p class="user-info-value">${name || 'Valued Customer'}</p>
                  <p class="user-info-label" style="margin-top: 12px;">Email Address</p>
                  <p class="user-info-value">${email}</p>
                </div>
                
                <!-- Steps -->
                <div class="steps-container">
                  <h3 class="steps-title">📋 Complete These Steps:</h3>
                  
                  <div class="step">
                    <div class="step-content">
                      <p class="step-title">Review Terms & Conditions</p>
                      <p class="step-description">Read and accept our updated Terms & Conditions to continue</p>
                    </div>
                  </div>
                  
                  <div class="step">
                    <div class="step-content">
                      <p class="step-title">Reset Your Password</p>
                      <p class="step-description">Create a new secure password for enhanced account security</p>
                    </div>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <div class="button-container">
                  <a href="${resetLink}" class="button">
                    🔐 Get Started Now
                  </a>
                </div>
                
                <!-- Info Text -->
                <p class="info-text">
                  Click the button above to begin the process.<br>
                  You'll first review our Terms & Conditions, then create your new password.
                </p>
                
                <!-- Features -->
                <div class="features-box">
                  <h4 class="features-title">🎉 What's New in Our Platform:</h4>
                  <ul class="features-list">
                    <li>Modern, intuitive interface with improved navigation</li>
                    <li>Lightning-fast page loading and enhanced performance</li>
                    <li>Advanced security features and data encryption</li>
                    <li>Fully optimized mobile experience</li>
                    <li>Enhanced order tracking and history</li>
                    <li>Streamlined checkout process</li>
                  </ul>
                </div>
                
                <!-- Security Section -->
                <div class="section">
                  <h4 class="section-title">🔒 Your Security is Our Priority</h4>
                  <p class="section-text">We've implemented industry-leading security measures:</p>
                  <ul class="section-list">
                    <li>All passwords have been securely reset for your protection</li>
                    <li>Enhanced encryption for all your personal data</li>
                    <li>Two-factor authentication now available</li>
                    <li>Regular security audits and monitoring</li>
                  </ul>
                </div>
                
                <!-- Help Section -->
                <div class="section">
                  <h4 class="section-title">❓ Need Assistance?</h4>
                  <p class="section-text">Our support team is here to help:</p>
                  <ul class="section-list">
                    <li>📧 Email: <a href="mailto:support@9rx.com" style="color: #1d4ed8; text-decoration: none; font-weight: 600;">support@9rx.com</a></li>
                    <li>📞 Phone: <strong>1-800-9RX-HELP</strong></li>
                    <li>💬 Live chat available on our website</li>
                  </ul>
                </div>
                
                <!-- Deadline -->
                <div class="deadline-box">
                  <p class="deadline-title">⏰ Important Deadline</p>
                  <p class="deadline-text">
                    Please complete these steps within <span class="deadline-days">7 days</span> to avoid account suspension.
                  </p>
                </div>
                
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td class="footer">
                <p class="footer-text" style="font-weight: 600; color: #374151; font-size: 14px;">
                  Thank you for being a valued customer!
                </p>
                <p class="footer-text">
                  We're committed to providing you with the best possible experience.
                </p>
                <p class="footer-text" style="margin-top: 20px;">
                  <span class="footer-brand">9RX</span><br>
                  Your Trusted Pharmacy Partner<br>
                  © ${currentYear} 9RX. All rights reserved.
                </p>
                <p class="footer-disclaimer">
                  This is an automated message. Please do not reply to this email.<br>
                  If you did not create an account with us, please ignore this email.
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
};

module.exports = launchPasswordResetTemplate;
