-- =====================================================
-- Manually Confirm Email in Database
-- =====================================================
-- Yeh queries Supabase SQL Editor mein run karein

-- Method 1: Specific email confirm karein
-- Replace 'jaydeepya2004@gmail.com' with your actual email
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'jayvekariya2003@gmail.com';

-- Method 2: Sabhi unconfirmed emails ko confirm karein (Testing ke liye)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Method 3: Last 10 users ko confirm karein
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users 
  ORDER BY created_at DESC 
  LIMIT 10
);

-- =====================================================
-- Verify: Check if email is confirmed
-- =====================================================
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- BONUS: Disable Email Confirmation Requirement
-- =====================================================
-- Agar aap testing kar rahe ho aur email confirmation nahi chahiye,
-- to Supabase Dashboard mein jaake yeh setting change karein:
-- 
-- 1. Dashboard → Authentication → Settings
-- 2. "Enable email confirmations" ko DISABLE kar dein
-- 3. Save karein
--
-- Iske baad naye users automatically confirmed honge

-- =====================================================
-- IMPORTANT NOTE
-- =====================================================
-- 'confirmed_at' column ko directly update NAHI kar sakte
-- Yeh generated column hai jo automatically set hota hai
-- Sirf 'email_confirmed_at' update karna hai
