-- Add reward_points column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_points integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_reward_points integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_tier text DEFAULT 'Bronze';
-- Create rewards_config table for storing program settings
CREATE TABLE IF NOT EXISTS rewards_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_enabled boolean DEFAULT true,
  points_per_dollar integer DEFAULT 1,
  referral_bonus integer DEFAULT 200,
  review_bonus integer DEFAULT 50,
  birthday_bonus integer DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
-- Create reward_tiers table
CREATE TABLE IF NOT EXISTS reward_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_points integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT 'bg-amber-600',
  benefits text[] DEFAULT '{}',
  multiplier numeric(3,2) DEFAULT 1.0,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
-- Create reward_items table for redeemable rewards
CREATE TABLE IF NOT EXISTS reward_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_required integer NOT NULL,
  type text NOT NULL CHECK (type IN ('discount', 'shipping', 'credit', 'support')),
  value numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
-- Create reward_redemptions table to track user redemptions
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reward_item_id uuid REFERENCES reward_items(id) ON DELETE SET NULL,
  points_spent integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired', 'cancelled')),
  applied_to_order_id uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
-- Create reward_transactions table to track points history
CREATE TABLE IF NOT EXISTS reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  points integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjust', 'expire', 'bonus')),
  description text,
  reference_type text,
  reference_id uuid,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);
-- Insert default tiers
INSERT INTO reward_tiers (name, min_points, color, benefits, multiplier, display_order) VALUES
  ('Bronze', 0, 'bg-amber-600', ARRAY['1 point per $1'], 1.0, 1),
  ('Silver', 1000, 'bg-gray-400', ARRAY['1.25x points', 'Free shipping over $50'], 1.25, 2),
  ('Gold', 5000, 'bg-yellow-500', ARRAY['1.5x points', 'Free shipping', 'Priority support'], 1.5, 3),
  ('Platinum', 10000, 'bg-purple-600', ARRAY['2x points', 'Free shipping', 'Priority support', 'Exclusive deals'], 2.0, 4)
ON CONFLICT DO NOTHING;
-- Insert default reward items
INSERT INTO reward_items (name, description, points_required, type, value, is_active) VALUES
  ('5% Off Next Order', 'Get 5% discount on your next purchase', 500, 'discount', 5, true),
  ('Free Shipping', 'Free shipping on any order', 750, 'shipping', 0, true),
  ('10% Off Next Order', 'Get 10% discount on your next purchase', 1000, 'discount', 10, true),
  ('$25 Store Credit', 'Add $25 credit to your account', 2000, 'credit', 25, true),
  ('Priority Support', 'Get priority customer support for 30 days', 3000, 'support', 30, true),
  ('$50 Store Credit', 'Add $50 credit to your account', 4000, 'credit', 50, true)
ON CONFLICT DO NOTHING;
-- Insert default config (only if empty)
INSERT INTO rewards_config (program_enabled, points_per_dollar, referral_bonus, review_bonus, birthday_bonus)
SELECT true, 1, 200, 50, 100
WHERE NOT EXISTS (SELECT 1 FROM rewards_config);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_reward_points ON profiles(reward_points);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
