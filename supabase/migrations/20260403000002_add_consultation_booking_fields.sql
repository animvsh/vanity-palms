-- Add in-app booking fields to consultations
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS meeting_mode TEXT DEFAULT '' CHECK (meeting_mode IN ('', 'virtual', 'in_person', 'phone')),
ADD COLUMN IF NOT EXISTS meeting_location TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS booking_notes TEXT DEFAULT '';
