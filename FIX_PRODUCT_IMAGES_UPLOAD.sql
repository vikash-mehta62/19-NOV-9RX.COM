-- =====================================================
-- FIX PRODUCT IMAGES UPLOAD ISSUE
-- Database: https://asnhfgfhidhzswqkhpzz.supabase.co
-- =====================================================
-- 
-- PROBLEM: product-images bucket has NO RLS policies
-- SOLUTION: Add policies to allow authenticated users to upload/manage images
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/asnhfgfhidhzswqkhpzz/sql/new
-- =====================================================

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to INSERT (upload) images to product-images bucket
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Policy 2: Allow authenticated users to UPDATE their uploaded images
CREATE POLICY "Allow authenticated users to update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Policy 3: Allow authenticated users to DELETE images
CREATE POLICY "Allow authenticated users to delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Policy 4: Allow public read access (since bucket is public)
CREATE POLICY "Allow public read access to product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- =====================================================
-- VERIFICATION QUERIES (Run after creating policies)
-- =====================================================

-- Check if policies were created successfully
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (qual LIKE '%product-images%' OR with_check LIKE '%product-images%')
ORDER BY policyname;

-- Check bucket configuration
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'product-images';
