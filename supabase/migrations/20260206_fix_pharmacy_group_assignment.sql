-- =====================================================
-- FIX PHARMACY GROUP ASSIGNMENT RLS POLICY
-- Date: February 6, 2026
-- Description: Fix RLS policies to allow admin to assign pharmacies to groups
-- =====================================================

-- Drop existing UPDATE policy that might have recursion issues
DROP POLICY IF EXISTS "Allow profile update" ON public.profiles;

-- CREATE SEPARATE POLICIES FOR BETTER CONTROL

-- 1. Users can update their own basic profile fields
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Admins can update ANY profile (including group_id assignment)
-- Using auth.jwt() to avoid recursion in subquery
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE
    USING (
        (auth.jwt()->>'role')::text = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    )
    WITH CHECK (
        (auth.jwt()->>'role')::text = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- 3. Service role can update any profile (for system operations)
CREATE POLICY "Service role can update profiles" ON public.profiles
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- VERIFY GROUP_ID COLUMN EXISTS IN PROFILES
-- =====================================================

-- Ensure group_id column exists (should already exist from previous migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN group_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON public.profiles(group_id);
        COMMENT ON COLUMN public.profiles.group_id IS 'The group this pharmacy belongs to (for group management)';
    END IF;
END $$;

-- =====================================================
-- CREATE HELPER FUNCTION FOR GROUP ASSIGNMENT
-- =====================================================

-- Function to safely assign pharmacy to group (with validation)
CREATE OR REPLACE FUNCTION assign_pharmacy_to_group(
    p_pharmacy_id UUID,
    p_group_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_pharmacy_type TEXT;
    v_group_type TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if caller is admin
    SELECT role = 'admin' INTO v_is_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Only admins can assign pharmacies to groups';
    END IF;
    
    -- Validate pharmacy exists and is of type 'pharmacy'
    SELECT type INTO v_pharmacy_type
    FROM profiles
    WHERE id = p_pharmacy_id;
    
    IF v_pharmacy_type IS NULL THEN
        RAISE EXCEPTION 'Pharmacy not found';
    END IF;
    
    IF v_pharmacy_type != 'pharmacy' THEN
        RAISE EXCEPTION 'Profile is not a pharmacy (type: %)', v_pharmacy_type;
    END IF;
    
    -- Validate group exists and is of type 'group' (if not NULL)
    IF p_group_id IS NOT NULL THEN
        SELECT type INTO v_group_type
        FROM profiles
        WHERE id = p_group_id;
        
        IF v_group_type IS NULL THEN
            RAISE EXCEPTION 'Group not found';
        END IF;
        
        IF v_group_type != 'group' THEN
            RAISE EXCEPTION 'Profile is not a group (type: %)', v_group_type;
        END IF;
    END IF;
    
    -- Perform the assignment
    UPDATE profiles
    SET group_id = p_group_id,
        updated_at = NOW()
    WHERE id = p_pharmacy_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_pharmacy_to_group(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION assign_pharmacy_to_group IS 'Safely assign a pharmacy to a group with validation (admin only)';

-- =====================================================
-- CREATE FUNCTION TO GET PHARMACIES BY GROUP
-- =====================================================

CREATE OR REPLACE FUNCTION get_group_pharmacies(p_group_id UUID)
RETURNS TABLE (
    id UUID,
    display_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    total_orders BIGINT,
    total_spent NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.display_name,
        p.email,
        p.phone,
        p.address,
        p.city,
        p.state,
        p.zip_code,
        p.status,
        p.created_at,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
    FROM profiles p
    LEFT JOIN orders o ON o.profile_id = p.id AND o.void IS NOT TRUE
    WHERE p.group_id = p_group_id
        AND p.type = 'pharmacy'
    GROUP BY p.id, p.display_name, p.email, p.phone, p.address, 
             p.city, p.state, p.zip_code, p.status, p.created_at
    ORDER BY p.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_group_pharmacies(UUID) TO authenticated;

COMMENT ON FUNCTION get_group_pharmacies IS 'Get all pharmacies belonging to a specific group with order statistics';

-- =====================================================
-- ADD INDEX FOR BETTER PERFORMANCE
-- =====================================================

-- Index for faster group pharmacy lookups
CREATE INDEX IF NOT EXISTS idx_profiles_group_id_type ON public.profiles(group_id, type) 
WHERE group_id IS NOT NULL;

-- Index for group analytics
CREATE INDEX IF NOT EXISTS idx_profiles_type_status ON public.profiles(type, status);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Run this to verify the fix:
-- SELECT 
--     schemaname, 
--     tablename, 
--     policyname, 
--     permissive, 
--     roles, 
--     cmd, 
--     qual, 
--     with_check
-- FROM pg_policies 
-- WHERE tablename = 'profiles' 
-- AND schemaname = 'public'
-- ORDER BY policyname;

