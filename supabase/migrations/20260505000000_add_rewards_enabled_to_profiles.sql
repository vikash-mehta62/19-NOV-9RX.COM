ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN DEFAULT true;

UPDATE profiles
SET rewards_enabled = true
WHERE rewards_enabled IS NULL;

COMMENT ON COLUMN profiles.rewards_enabled IS 'Controls whether reward points and redeemed rewards sections are shown for this profile.';
