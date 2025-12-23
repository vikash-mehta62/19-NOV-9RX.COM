-- Update default email provider to nodejs (uses existing nodemailer setup)
UPDATE email_settings 
SET setting_value = 'nodejs' 
WHERE setting_key = 'provider';
-- Add description for nodejs provider
UPDATE email_settings 
SET description = 'Email provider: nodejs (uses server SMTP), resend, sendgrid, ses, smtp' 
WHERE setting_key = 'provider';
