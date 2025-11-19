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
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Profile Updated</title>
        <style>
            body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; padding: 25px; background: #ffffff; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); text-align: center; }
            .icon { font-size: 50px; color: #2d8f4e; margin-bottom: 10px; }
            .header { font-size: 24px; font-weight: bold; color: #2d8f4e; margin-bottom: 10px; }
            .message { font-size: 18px; color: #555; margin-bottom: 20px; }
            .footer { font-size: 14px; color: #777; margin-top: 25px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">✅</div>
            <div class="header">Thank You for Updating Your Profile</div>
            <p class="message">Hello ${name}, your profile has been successfully updated.</p>
            <p>If you did not make this update, please contact us at <a href="mailto:info@9rx.com">info@9rx.com</a> immediately.</p>
            <div class="footer">For any assistance, reach out to <a href="mailto:info@9rx.com">info@9rx.com</a></div>
        </div>
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