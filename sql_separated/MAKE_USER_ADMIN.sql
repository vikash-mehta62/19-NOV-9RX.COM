-- Make current user an admin
-- Replace the user_id with your actual user ID

UPDATE profiles 
SET role = 'admin'
WHERE id = '9f263b37-1820-4a47-bc46-e619b197e4db';

-- Verify the change
SELECT id, email, role, display_name 
FROM profiles 
WHERE id = '9f263b37-1820-4a47-bc46-e619b197e4db';
