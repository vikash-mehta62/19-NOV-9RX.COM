-- =====================================================
-- ADMIN PASSWORD RESET - Using Supabase Functions
-- =====================================================
-- You CANNOT directly update password in auth.users table
-- But you can use Supabase's built-in functions
-- =====================================================

-- =====================================================
-- OPTION 1: Send Password Reset Email (RECOMMENDED)
-- =====================================================
-- This is the SAFEST way - user resets their own password

-- For specific user
SELECT auth.send_password_reset_email('jaydeepya2008@gmail.com');

-- This will:
-- 1. Send password reset email to user
-- 2. User clicks link
-- 3. User sets new password
-- 4. Done!

-- =====================================================
-- OPTION 2: Check if Function Exists
-- =====================================================
-- Check if password reset function is available

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
AND routine_name LIKE '%password%';

-- =====================================================
-- OPTION 3: Admin Dashboard Method (Manual)
-- =====================================================
-- You cannot do this via SQL, but here's the process:
-- 
-- 1. Go to Supabase Dashboard
-- 2. Authentication → Users
-- 3. Find the user
-- 4. Click on user
-- 5. Click "Send password recovery email"
-- 6. User receives email and resets password

-- =====================================================
-- OPTION 4: Set Temporary Password (NOT RECOMMENDED)
-- =====================================================
-- This requires Supabase Admin API, not SQL
-- You would need to use JavaScript/Node.js:

/*
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY' // Service role key, not anon key!
);

// Update user password as admin
const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
  'USER_ID_HERE',
  { password: 'new_password_123' }
);
*/

-- =====================================================
-- WHY YOU CAN'T UPDATE PASSWORD DIRECTLY
-- =====================================================

-- ❌ THIS WILL NOT WORK:
-- UPDATE auth.users SET encrypted_password = 'newpassword' WHERE email = 'user@example.com';

-- Why?
-- 1. Password is hashed using bcrypt
-- 2. Hash includes salt
-- 3. Direct update will break authentication
-- 4. Supabase won't be able to verify password

-- =====================================================
-- WHAT YOU CAN UPDATE DIRECTLY
-- =====================================================

-- ✅ Email confirmation (we already did this)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'jaydeepya2008@gmail.com';

-- ✅ User metadata
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"custom_field": "value"}'::jsonb
WHERE email = 'jaydeepya2008@gmail.com';

-- ✅ Email address (with caution)
UPDATE auth.users 
SET email = 'newemail@example.com'
WHERE email = 'oldemail@example.com';

-- ❌ Password - CANNOT update directly

-- =====================================================
-- RECOMMENDED APPROACH FOR YOUR USE CASE
-- =====================================================

-- If you want to reset password for jaydeepya2008@gmail.com:

-- Step 1: Send reset email
SELECT auth.send_password_reset_email('jaydeepya2008@gmail.com');

-- Step 2: User receives email and clicks link

-- Step 3: User sets new password on your reset page

-- Alternative: Use Supabase Dashboard
-- 1. Dashboard → Authentication → Users
-- 2. Find user: jaydeepya2008@gmail.com
-- 3. Click "Send password recovery"
-- 4. Done!

-- =====================================================
-- FOR DEVELOPMENT: Auto-Login Without Password
-- =====================================================
-- If you're testing and want to bypass password:

-- Option A: Use magic link (passwordless login)
-- This is done via frontend:
-- supabase.auth.signInWithOtp({ email: 'user@example.com' })

-- Option B: Create test user with known password
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('test123', gen_salt('bf')), -- This creates proper hash
    NOW(),
    NOW(),
    NOW()
);

-- But even this is NOT recommended!
-- Better to use Supabase's signup function

-- =====================================================
-- SUMMARY
-- =====================================================

-- ❌ Cannot update password directly via SQL
-- ✅ Can send password reset email via SQL function
-- ✅ Can use Supabase Dashboard to send reset email
-- ✅ Can use Admin API (JavaScript) to update password
-- ✅ User can reset password via forgot password flow

-- BEST PRACTICE:
-- Always use Supabase's built-in password reset flow!
