-- Table to track credit terms sent to users by admin
CREATE TABLE IF NOT EXISTS sent_credit_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES profiles(id), -- Admin who sent it
  
  -- Terms details
  credit_limit DECIMAL(12,2) NOT NULL,
  net_terms INTEGER NOT NULL DEFAULT 30,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  terms_version VARCHAR(20) NOT NULL,
  custom_message TEXT,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'expired')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- User response
  user_signature TEXT,
  user_signed_name VARCHAR(255),
  user_signed_title VARCHAR(255),
  user_signed_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Indexes
CREATE INDEX idx_sent_credit_terms_user ON sent_credit_terms(user_id);
CREATE INDEX idx_sent_credit_terms_status ON sent_credit_terms(status);
-- RLS
ALTER TABLE sent_credit_terms ENABLE ROW LEVEL SECURITY;
-- Users can view terms sent to them
CREATE POLICY "Users view own sent terms" ON sent_credit_terms
  FOR SELECT USING (auth.uid() = user_id);
-- Users can update their response
CREATE POLICY "Users respond to sent terms" ON sent_credit_terms
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Admins full access
CREATE POLICY "Admins full access sent_credit_terms" ON sent_credit_terms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'admin')
  );
