const accountActiveTemplate = (name, email, admin) => {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Account Activated</title>
        <style>
            body { 
                font-family: 'Arial', sans-serif; 
                background-color: #f4f4f4; 
                color: #333; 
                margin: 0; 
                padding: 0; 
            }
            .container { 
                max-width: 600px; 
                margin: 30px auto; 
                padding: 25px; 
                background: #ffffff; 
                border-radius: 8px; 
                box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); 
                text-align: center; 
            }
            .logo { 
                width: 120px; 
                margin-bottom: 15px; 
            }
            .header { 
                font-size: 24px; 
                font-weight: bold; 
                color: #2d8f4e; 
                margin-bottom: 10px; 
            }
            .message { 
                font-size: 18px; 
                color: #555; 
                margin-bottom: 20px; 
            }
            .user-info { 
                font-size: 16px; 
                background: #f3f3f3; 
                padding: 12px; 
                border-radius: 5px; 
                display: inline-block; 
                margin-bottom: 20px; 
            }
            .login-button { 
                display: inline-block; 
                padding: 12px 20px; 
                font-size: 16px; 
                font-weight: bold; 
                color: #ffffff; 
                background-color: #27ae60; 
                text-decoration: none; 
                border-radius: 5px; 
                transition: 0.3s ease; 
            }
         
            .footer { 
                font-size: 14px; 
                color: #777; 
                margin-top: 25px; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/download.png" alt="Company Logo" class="logo">
            
            <div class="header">
                ${admin ? "✅ Your Account is Now Active!" : "⏳ Your Account is Not Active Yet"}
            </div>
            
            <p class="message">
                ${admin ? "Congratulations, your account has been successfully verified." 
                : "Our team will review your information and contact you for further details. Once verified, we will confirm your account activation."}
            </p>
            
            <div class="user-info">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
            </div>
            <br>
            
            <a href="${admin ? 'https://www.9rx.com/login' : `https://www.9rx.com/update-profile?email=${email}`}" class="login-button">
                ${admin ? "Login Account" : "Update Profile"}
            </a>

            <div class="footer">If you have any questions, feel free to contact our support team.</div>
        </div>
    </body>
    </html>`;
};

module.exports = accountActiveTemplate;
