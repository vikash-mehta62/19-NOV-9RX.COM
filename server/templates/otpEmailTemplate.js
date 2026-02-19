/**
 * OTP Email Template
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's first name
 * @returns {string} HTML email template
 */
const otpEmailTemplate = (otp, userName = "User") => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your 9RX Login OTP</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 48px 40px;
      text-align: center;
      border-bottom: 3px solid #2563eb;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #555555;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .otp-container {
      background-color: #f8f9fa;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-label {
      font-size: 14px;
      color: #666666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .expiry-notice {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .expiry-notice p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }
    .security-tips {
      background-color: #e7f3ff;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .security-tips h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #1976D2;
    }
    .security-tips ul {
      margin: 0;
      padding-left: 20px;
      font-size: 14px;
      color: #0d47a1;
    }
    .security-tips li {
      margin-bottom: 5px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
      font-size: 14px;
      color: #6c757d;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 10px;
    }
    .logo-image {
      max-width: 150px;
      height: auto;
      margin-bottom: 15px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/9RX%20LOGO/9rx_logo.png" alt="9RX Logo" class="logo-image">
      <h1>Login Verification</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${userName},</p>
      
      <p class="message">
        We received a request to log in to your 9RX account. To complete your login, 
        please use the One-Time Password (OTP) below:
      </p>
      
      <div class="otp-container">
        <div class="otp-label">Your OTP Code</div>
        <div class="otp-code">${otp}</div>
      </div>
      
      <div class="expiry-notice">
        <p><strong>⏰ Important:</strong> This OTP will expire in 10 minutes. Please use it promptly.</p>
      </div>
      
      <p class="message">
        If you didn't request this OTP, please ignore this email and ensure your account is secure.
      </p>
      
      <div class="security-tips">
        <h3>🔒 Security Tips</h3>
        <ul>
          <li>Never share your OTP with anyone</li>
          <li>9RX will never ask for your OTP via phone or email</li>
          <li>Always verify you're on the official 9RX website</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>9RX - Your Trusted B2B Pharmacy Partner</strong></p>
      <p>Need help? Contact us at <a href="mailto:info@9rx.com">info@9rx.com</a></p>
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        This is an automated email. Please do not reply to this message.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = otpEmailTemplate;
