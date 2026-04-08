-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Adds structured credential fields for the provider verification system

-- Provider credentials (JSONB for structured data)
ALTER TABLE providers ADD COLUMN IF NOT EXISTS credentials jsonb DEFAULT '{}';

-- Verification workflow
ALTER TABLE providers ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS verification_notes text DEFAULT '';

-- Review structured data
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS worth_it boolean;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS would_choose_again boolean;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS would_recommend boolean;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS structured_answers jsonb DEFAULT '{}';

-- Procedure taxonomy
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS techniques jsonb DEFAULT '[]';
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS body_area text;

-- Update RLS: allow authenticated users to read credentials
-- (credentials are part of the provider row, so existing SELECT policies should cover it)

-- Seed body_area and techniques for V1 procedures
UPDATE procedures SET body_area = 'face', techniques = '["Deep Plane", "SMAS", "Mini"]'::jsonb WHERE id = 'facelift';
UPDATE procedures SET body_area = 'face', techniques = '["Upper", "Lower", "Combination"]'::jsonb WHERE id = 'blepharoplasty';
UPDATE procedures SET body_area = 'face', techniques = '["Open", "Closed", "Preservation"]'::jsonb WHERE id = 'rhinoplasty';
UPDATE procedures SET body_area = 'body', techniques = '["Traditional", "VASER", "Laser"]'::jsonb WHERE id = 'liposuction';
