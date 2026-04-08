-- Add secure public access token for patient consultation links
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
