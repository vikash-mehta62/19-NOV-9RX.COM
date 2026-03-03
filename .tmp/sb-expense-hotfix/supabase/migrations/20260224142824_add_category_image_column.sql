-- Add image_url column to category_configs table
ALTER TABLE category_configs 
ADD COLUMN IF NOT EXISTS image_url TEXT;;
