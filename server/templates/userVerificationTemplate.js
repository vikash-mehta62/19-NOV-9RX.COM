const userVerificationTemplate = (groupname, name, email) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>User Verification</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 16px; color: #333; }
            .container { max-width: 600px; margin: 30px auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; text-align: center; }
            .header { font-size: 24px; font-weight: bold; color: #27ae60; margin-bottom: 15px; }
            .message { font-size: 18px; margin-bottom: 20px; }
            .footer { font-size: 14px; color: #666; margin-top: 20px; }
            .logo { width: 100px; margin-bottom: 20px; }
            .login-button { display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #27ae60; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/download.png" alt="Logo" class="logo">
            <div class="header">🔹 User Verification Request</div>
            <p class="message">A new user has registered for verification.</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${groupname ? `<p><strong>Group:</strong> This user registered through the group '${groupname}'.</p>` : ''}
            <a href="https://www.9rx.com/login" class="login-button">Visit To Website</a>
            <div class="footer">If you have any concerns, please contact support.</div>
        </div>
    </body>
    </html>`;
};

module.exports = userVerificationTemplate;