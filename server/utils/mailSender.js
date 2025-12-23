const nodemailer = require("nodemailer");

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate email format
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

const mailSender = async (email, title, body) => {
  try {
    // Validate email before sending
    if (!isValidEmail(email)) {
      console.error(`Invalid email format: ${email}`);
      return { success: false, error: "Invalid email format" };
    }

    // Determine port and security based on MAIL_SECURE env
    const isSecure = process.env.MAIL_SECURE === 'true';
    const port = process.env.MAIL_PORT || (isSecure ? 465 : 587);

    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(port),
      secure: isSecure, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      // TLS options for port 587
      ...(!isSecure && {
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        }
      })
    });

    let info = await transporter.sendMail({
      from: `"9RX.COM" <${process.env.MAIL_USER}>`,
      to: email.trim(),
      subject: title,
      html: body,
    });
    
    console.log(`Email sent successfully to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = mailSender;
