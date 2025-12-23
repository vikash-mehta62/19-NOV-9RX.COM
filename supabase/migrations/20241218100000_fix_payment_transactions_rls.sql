-- Fix RLS policies for payment_transactions table
-- Allow authenticated users to insert their own transactions

-- Drop existing insert policy if exists
DROP POLICY IF EXISTS "Users can insert own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON payment_transactions;
-- Allow authenticated users to insert transactions
CREATE POLICY "Authenticated users can insert transactions"
  ON payment_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
-- Allow users to view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
CREATE POLICY "Users can view own transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = profile_id 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.type = 'admin'
    )
  );
-- Allow admins to view all transactions
DROP POLICY IF EXISTS "Admin can view all transactions" ON payment_transactions;
CREATE POLICY "Admin can view all transactions"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.type = 'admin'
    )
  );
