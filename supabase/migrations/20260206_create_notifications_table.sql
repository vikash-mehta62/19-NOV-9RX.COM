-- Create notifications table for user notifications
-- This table stores system notifications, order updates, and other alerts

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error, order, payment, automation
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500), -- Optional link to related resource
    metadata JSONB, -- Additional data (order_id, payment_id, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can insert notifications for any user
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
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
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (true); -- Allow inserts from backend/triggers

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Enable real-time for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Insert some sample notifications for testing (optional)
-- Uncomment to add sample data
/*
INSERT INTO notifications (user_id, title, message, type, read) 
SELECT 
    id,
    'Welcome to 9RX!',
    'Thank you for joining us. Start exploring our products and place your first order.',
    'info',
    false
FROM profiles
WHERE role IN ('pharmacy', 'group', 'hospital')
LIMIT 5;
*/

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
