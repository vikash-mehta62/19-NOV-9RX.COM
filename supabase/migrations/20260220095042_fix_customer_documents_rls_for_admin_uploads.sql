-- Fix RLS policy for customer_documents to allow admins to upload documents for any customer

-- Drop the existing "Admins can manage customer documents" policy
DROP POLICY IF EXISTS "Admins can manage customer documents" ON customer_documents;

-- Recreate with explicit with_check for INSERT operations
CREATE POLICY "Admins can manage customer documents" 
ON customer_documents
FOR ALL
TO public
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Also update the "Users can upload own documents" policy to be more explicit
DROP POLICY IF EXISTS "Users can upload own documents" ON customer_documents;

CREATE POLICY "Users can upload own documents" 
ON customer_documents
FOR INSERT
TO public
WITH CHECK (auth.uid() = customer_id);;
