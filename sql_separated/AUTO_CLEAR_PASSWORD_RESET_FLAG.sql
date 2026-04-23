-- =====================================================
-- AUTO-CLEAR PASSWORD RESET FLAG
-- =====================================================
-- Purpose: Automatically clear requires_password_reset flag when user resets password
-- This makes it a TRUE one-time process
-- =====================================================

-- Create a function to automatically clear the flag when password is updated
CREATE OR REPLACE FUNCTION auto_clear_password_reset_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- When password is updated (encrypted_password changes), clear the flag
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    -- Update the profiles table to clear the flag
    UPDATE public.profiles
    SET requires_password_reset = false
    WHERE id = NEW.id;
    
    RAISE NOTICE 'Password reset flag cleared for user: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table to detect password changes
DROP TRIGGER IF EXISTS trigger_auto_clear_password_reset_flag ON auth.users;

CREATE TRIGGER trigger_auto_clear_password_reset_flag
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
  EXECUTE FUNCTION auto_clear_password_reset_flag();

-- Add comment
COMMENT ON FUNCTION auto_clear_password_reset_flag() IS 
'Automatically clears requires_password_reset flag when user changes their password. This ensures the password reset popup is truly a one-time process.';

-- Verification query
SELECT 
  'Trigger Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trigger_auto_clear_password_reset_flag'
    ) THEN '✅ Active'
    ELSE '❌ Not Found'
  END as status;
