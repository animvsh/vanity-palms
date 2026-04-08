-- Add Instagram profile support for providers
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '';
