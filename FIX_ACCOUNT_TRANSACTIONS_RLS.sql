-- Fix RLS for account_transactions table
-- Allow users to insert transactions for themselves (for payments)

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Admins can insert transactions" ON account_transactions;

-- Create new policy that allows users to insert their own transactions
CREATE POLICY "Users can insert own transactions" ON account_transactions
  FOR INSERT 
  WITH CHECK (
    customer_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Also ensure admins can still insert any transactions
CREATE POLICY "Admins can insert any transactions" ON account_transactions
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );