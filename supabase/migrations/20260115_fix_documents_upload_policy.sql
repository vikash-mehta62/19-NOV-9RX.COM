-- Fix documents storage policies to allow both admins and customers to upload
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can upload customer documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Customers can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;

-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND (
    -- Users can upload to their own folder (both path formats)
    name LIKE 'user-documents/' || auth.uid()::text || '/%'
    OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
    OR
    -- Admins can upload anywhere
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
);

-- Allow admins to view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Allow users to view their own documents (both path formats)
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND (
    name LIKE 'user-documents/' || auth.uid()::text || '/%'
    OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
  )
);

-- Allow users to update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND (
    name LIKE 'user-documents/' || auth.uid()::text || '/%'
    OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
);

-- Allow admins to delete any documents, users can delete their own
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND (
    name LIKE 'user-documents/' || auth.uid()::text || '/%'
    OR name LIKE 'customer-documents/' || auth.uid()::text || '/%'
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
);
