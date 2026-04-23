-- Add missing email settings keys
-- Run this in Supabase SQL Editor to ensure all required settings exist

INSERT INTO email_settings (setting_key, setting_value, setting_type, description) VALUES
('smtp_host', '', 'string', 'SMTP server hostname'),
('smtp_port', '587', 'string', 'SMTP server port'),
('smtp_user', '', 'string', 'SMTP username'),
('smtp_pass', '', 'secret', 'SMTP password'),
('rate_limit', '100', 'number', 'Maximum emails per hour'),
('retry_attempts', '3', 'number', 'Maximum retry attempts for failed emails'),
('retry_delay', '5', 'number', 'Delay in minutes between retries')
ON CONFLICT (setting_key) DO NOTHING;

-- Verify all settings exist
SELECT setting_key, setting_value, setting_type, description FROM email_settings ORDER BY setting_key;
