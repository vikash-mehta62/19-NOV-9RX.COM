-- Create carts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own cart" 
    ON public.carts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart" 
    ON public.carts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart" 
    ON public.carts FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_updated_at ON public.carts(updated_at);

-- Create abandoned_carts table if it doesn't exist (ensuring it matches code expectations)
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cart_data JSONB DEFAULT '{}'::jsonb,
    cart_value NUMERIC DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    reminder_sent_count INTEGER DEFAULT 0,
    recovered BOOLEAN DEFAULT FALSE,
    recovered_at TIMESTAMP WITH TIME ZONE,
    last_reminder_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for abandoned_carts
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own abandoned carts" 
    ON public.abandoned_carts FOR SELECT 
    USING (auth.uid() = user_id);

-- Admin policies (assuming admin role or similar check, but for now allow read if user is admin)
-- You might need to adjust this based on your admin auth implementation
-- CREATE POLICY "Admins can view all abandoned carts" ...
