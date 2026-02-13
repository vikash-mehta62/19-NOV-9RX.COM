-- =====================================================
-- ENSURE NOTIFICATIONS TABLE HAS ALL REQUIRED COLUMNS
-- This migration ensures backward compatibility
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add title column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'title'
    ) THEN
        ALTER TABLE notifications ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Notification';
        RAISE NOTICE 'Added title column to notifications table';
    END IF;

    -- Add metadata column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Added metadata column to notifications table';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to notifications table';
    END IF;

    -- Ensure user_id can be NULL (for system-wide notifications)
    ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;
    RAISE NOTICE 'Made user_id nullable for system notifications';

    -- Ensure title can be NULL (for backward compatibility)
    ALTER TABLE notifications ALTER COLUMN title DROP NOT NULL;
    RAISE NOTICE 'Made title nullable';

END $$;

-- =====================================================
-- ADD INDEXES IF MISSING
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- =====================================================
-- ENSURE RLS POLICIES EXIST
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON notifications;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can update any notification
CREATE POLICY "Admins can update notifications" ON notifications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can insert notifications for any user
CREATE POLICY "Admins can insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- System can insert notifications (for automated notifications)
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- ENSURE UPDATED_AT TRIGGER EXISTS
-- =====================================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- =====================================================
-- ENABLE REAL-TIME FOR NOTIFICATIONS
-- =====================================================

-- Enable real-time updates (ignore if already enabled)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'notifications table already in supabase_realtime publication';
END $$;

-- =====================================================
-- VERIFY TABLE STRUCTURE
-- =====================================================

-- Display current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- =====================================================
-- COMPLETE
-- =====================================================

COMMENT ON TABLE notifications IS 'System notifications for users and admins - supports automation alerts, order updates, and system events';
COMMENT ON COLUMN notifications.user_id IS 'User who receives the notification. NULL for system-wide admin notifications';
COMMENT ON COLUMN notifications.title IS 'Notification title/heading';
COMMENT ON COLUMN notifications.message IS 'Notification message body';
COMMENT ON COLUMN notifications.type IS 'Notification type: info, success, warning, error, order, payment, system, alert';
COMMENT ON COLUMN notifications.metadata IS 'Additional JSON data for the notification';

