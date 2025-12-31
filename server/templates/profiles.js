const passwordResetTemplate = (name) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Password Reset Successful</title>
        <style>
            body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; padding: 25px; background: #ffffff; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); text-align: center; }
            .icon { font-size: 50px; color: #d9534f; margin-bottom: 10px; }
            .header { font-size: 24px; font-weight: bold; color: #d9534f; margin-bottom: 10px; }
            .message { font-size: 18px; color: #555; margin-bottom: 20px; }
            .footer { font-size: 14px; color: #777; margin-top: 25px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🔑</div>
            <div class="header">Your Password Has Been Reset Successfully</div>
            <p class="message">Hello ${name}, your password has been successfully reset. If you did not request this change, please contact our support team immediately.</p>
            <div class="footer">For any assistance, reach out to <a href="mailto:info@9rx.com">info@9rx.com</a></div>
        </div>
    </body>
    </html>`;
};

const profileUpdateTemplate = (name, email) => {
    const currentYear = new Date().getFullYear();
    const updateDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile Updated Successfully</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <div style="background-color: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 50%; margin: 0 auto 20px; line-height: 70px;">
                                <span style="font-size: 32px;">✅</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Profile Updated Successfully</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Your account information has been saved</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 0;">
                            
                            <!-- Greeting -->
                            <div style="padding: 30px 30px 20px;">
                                <p style="margin: 0; font-size: 16px; color: #374151;">Hello <strong style="color: #059669;">${name}</strong>,</p>
                                <p style="margin: 12px 0 0 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                                    We wanted to let you know that your profile information has been successfully updated on your 9RX account.
                                </p>
                            </div>

                            <!-- Update Info Card -->
                            <div style="margin: 0 30px 25px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 12px; padding: 24px; border: 1px solid #d1fae5;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="vertical-align: top;">
                                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Account Email</p>
                                            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #059669;">${email}</p>
                                            
                                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Updated On</p>
                                            <p style="margin: 0; font-size: 14px; font-weight: 500; color: #374151;">${updateDate}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top: 16px;">
                                            <div style="background-color: #d1fae5; border-radius: 8px; padding: 12px 16px; text-align: center;">
                                                <span style="font-size: 14px; color: #065f46; font-weight: 600;">✓ Changes Saved Successfully</span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- What Changed Section -->
                            <div style="margin: 0 30px 25px; background-color: #f9fafb; border-radius: 12px; padding: 20px;">
                                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">📋 What was updated?</h3>
                                <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                    Your profile information including business details, contact information, and/or address has been updated in our system.
                                </p>
                            </div>

                            <!-- Security Notice -->
                            <div style="margin: 0 30px 30px; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="width: 40px; vertical-align: top;">
                                            <span style="font-size: 24px;">⚠️</span>
                                        </td>
                                        <td style="vertical-align: top;">
                                            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">Didn't make this change?</h4>
                                            <p style="margin: 0; font-size: 13px; color: #a16207; line-height: 1.5;">
                                                If you did not update your profile, please contact us immediately at 
                                                <a href="mailto:info@9rx.com" style="color: #92400e; font-weight: 600; text-decoration: none;">info@9rx.com</a> 
                                                to secure your account.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- CTA Button -->
                            <div style="padding: 0 30px 35px; text-align: center;">
                                <a href="https://9rx.com/update-profile" 
                                   style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);">
                                    👤 View My Profile
                                </a>
                            </div>

                        </td>
                    </tr>

                    <!-- Help Section -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">Need Help?</p>
                                        <p style="margin: 0; font-size: 13px; color: #6b7280;">
                                            Contact us at <a href="mailto:info@9rx.com" style="color: #059669; text-decoration: none; font-weight: 500;">info@9rx.com</a> 
                                            or call <a href="tel:+18005551234" style="color: #059669; text-decoration: none; font-weight: 500;">(800) 555-1234</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1f2937; padding: 30px; border-radius: 0 0 16px 16px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #ffffff;">9RX</p>
                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #9ca3af;">Your Trusted Pharmacy Partner</p>
                            <div style="margin-bottom: 16px;">
                                <a href="https://9rx.com" style="display: inline-block; margin: 0 8px; color: #10b981; text-decoration: none; font-size: 13px;">Website</a>
                                <span style="color: #4b5563;">|</span>
                                <a href="https://9rx.com/orders" style="display: inline-block; margin: 0 8px; color: #10b981; text-decoration: none; font-size: 13px;">My Orders</a>
                                <span style="color: #4b5563;">|</span>
                                <a href="https://9rx.com/contact" style="display: inline-block; margin: 0 8px; color: #10b981; text-decoration: none; font-size: 13px;">Contact</a>
                            </div>
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                © ${currentYear} 9RX. All rights reserved.
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



const paymentSuccessTemplate = (name, orderNumber, transactionId) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Payment Successful</title>
        <style>
            body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; padding: 25px; background: #ffffff; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); text-align: center; }
            .icon { font-size: 50px; color: #28a745; margin-bottom: 10px; }
            .header { font-size: 24px; font-weight: bold; color: #28a745; margin-bottom: 10px; }
            .message { font-size: 18px; color: #555; margin-bottom: 20px; }
            .footer { font-size: 14px; color: #777; margin-top: 25px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">💳</div>
            <div class="header">Payment Successful</div>
            <p class="message">Hello ${name}, your payment has been successfully processed.</p>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p>Thank you for your purchase!</p>
            <div class="footer">For any queries, reach out to <a href="mailto:info@9rx.com">info@9rx.com</a></div>
        </div>
    </body>
    </html>`;
};




module.exports = { passwordResetTemplate, profileUpdateTemplate,paymentSuccessTemplate };