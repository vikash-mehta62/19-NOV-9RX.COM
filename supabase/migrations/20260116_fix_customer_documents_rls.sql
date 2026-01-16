    -- Fix RLS policies for customer_documents table
    -- Allow users to manage their own documents

    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Users can view their own documents" ON customer_documents;
    DROP POLICY IF EXISTS "Users can insert their own documents" ON customer_documents;
    DROP POLICY IF EXISTS "Users can delete their own documents" ON customer_documents;
    DROP POLICY IF EXISTS "Admins can view all documents" ON customer_documents;
    DROP POLICY IF EXISTS "Admins can insert documents" ON customer_documents;
    DROP POLICY IF EXISTS "Admins can delete documents" ON customer_documents;

    -- Enable RLS on the table (if not already enabled)
    ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can view their own documents
    CREATE POLICY "Users can view their own documents"
    ON customer_documents
    FOR SELECT
    USING (
    customer_id = auth.uid()
    OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'superadmin')
    )
    );

    -- Policy: Users can insert their own documents
    CREATE POLICY "Users can insert their own documents"
    ON customer_documents
    FOR INSERT
    WITH CHECK (
    customer_id = auth.uid()
    OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'superadmin')
    )
    );

    -- Policy: Users can update their own documents
    CREATE POLICY "Users can update their own documents"
    ON customer_documents
    FOR UPDATE
    USING (
    customer_id = auth.uid()
    OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'superadmin')
    )
    );

    -- Policy: Users can delete their own documents
    CREATE POLICY "Users can delete their own documents"
    ON customer_documents
    FOR DELETE
    USING (
    customer_id = auth.uid()
    OR  
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'superadmin')
    )
    );
