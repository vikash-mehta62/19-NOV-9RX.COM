-- Create wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    size_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of user_id, product_id, and size_id
    UNIQUE(user_id, product_id, size_id)
);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_created_at ON wishlist(created_at DESC);
-- Enable RLS (Row Level Security)
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
-- Create RLS policies
CREATE POLICY "Users can view their own wishlist items" ON wishlist
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wishlist items" ON wishlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wishlist items" ON wishlist
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wishlist items" ON wishlist
    FOR DELETE USING (auth.uid() = user_id);
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wishlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wishlist_updated_at_trigger
    BEFORE UPDATE ON wishlist
    FOR EACH ROW
    EXECUTE FUNCTION update_wishlist_updated_at();
