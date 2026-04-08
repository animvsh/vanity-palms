-- ============================================================
-- Migration: Messaging system, provider accounts, seed data
-- Date: 2026-04-03
-- ============================================================

-- 1. Whitelist entries for provider signup
INSERT INTO provider_whitelist (email, note) VALUES
  ('aalang@ucsc.edu', 'Invited - founding provider'),
  ('pratham05@gmail.com', 'Invited - founding provider')
ON CONFLICT (email) DO NOTHING;

-- 2. Create consultation_messages table
CREATE TABLE IF NOT EXISTS consultation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'provider')),
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_consultation ON consultation_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_created ON consultation_messages(created_at);

-- 3. RLS policies for consultation_messages
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can send a consultation message"
  ON consultation_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Providers can read own consultation messages"
  ON consultation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      JOIN providers p ON p.id = c.provider_id
      WHERE c.id = consultation_messages.consultation_id
        AND p.user_id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Public can read own consultation messages"
  ON consultation_messages FOR SELECT
  USING (true);

CREATE POLICY "Providers can update own consultation messages"
  ON consultation_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      JOIN providers p ON p.id = c.provider_id
      WHERE c.id = consultation_messages.consultation_id
        AND p.user_id = auth.uid()
    )
  );

-- 4. Unread message count helper
CREATE OR REPLACE FUNCTION get_unread_message_count(target_provider_id TEXT)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM consultation_messages cm
  JOIN consultations c ON c.id = cm.consultation_id
  WHERE c.provider_id = target_provider_id
    AND cm.sender_type = 'patient'
    AND cm.read_at IS NULL;
$$;

-- 5. Seed provider accounts
INSERT INTO providers (id, name, email, practice_name, status, subscription_tier, specialty, certifications, bio, location, consultation_type, languages, years_experience, rating, review_count)
VALUES
  ('dr-aiden-lang', 'Dr. Aiden Lang', 'aalang@ucsc.edu', 'Pacific Aesthetics', 'approved', 'premium',
   ARRAY['Facial Rejuvenation', 'Rhinoplasty'], ARRAY['Board Certified', 'ABPS'],
   'Specializing in natural-looking facial enhancements with over 8 years of experience in aesthetic surgery.',
   'Santa Cruz, CA', ARRAY['In-Person', 'Virtual'], ARRAY['English'], 8, 4.8, 12),
  ('dr-pratham-shah', 'Dr. Pratham Shah', 'pratham05@gmail.com', 'Elite Face & Body', 'approved', 'premium',
   ARRAY['Body Contouring', 'Facial Surgery'], ARRAY['Board Certified', 'ASPS Fellow'],
   'Harvard-trained surgeon focused on precision body contouring and facial harmony procedures.',
   'San Francisco, CA', ARRAY['In-Person', 'Virtual'], ARRAY['English', 'Hindi'], 10, 4.9, 18)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed consultations for demo
INSERT INTO consultations (id, provider_id, patient_name, email, phone, preferred_date, message, status, created_at)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'dr-aiden-lang', 'Sarah Mitchell', 'sarah.m@email.com', '555-0101', '2026-04-15', 'Hi Dr. Lang, I am interested in rhinoplasty. Can we schedule a consultation?', 'replied', now() - interval '3 days'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'dr-aiden-lang', 'James Chen', 'james.c@email.com', '555-0102', '2026-04-20', 'I would like to discuss brow lift options. What is your availability?', 'new', now() - interval '1 day'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'dr-pratham-shah', 'Emily Davis', 'emily.d@email.com', '555-0103', '2026-04-18', 'Interested in a consultation for facial contouring. What are my options?', 'booked', now() - interval '5 days'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'dr-pratham-shah', 'Michael Brown', 'michael.b@email.com', '555-0104', '2026-04-25', 'Looking into body contouring procedures. Would love to learn more.', 'new', now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 7. Seed messages for consultations
INSERT INTO consultation_messages (consultation_id, sender_type, sender_name, body, created_at, read_at)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'patient', 'Sarah Mitchell', 'Hi Dr. Lang, I am interested in rhinoplasty. Can we schedule a consultation?', now() - interval '3 days', now() - interval '2 days'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'provider', 'Dr. Aiden Lang', 'Hi Sarah! I would be happy to discuss rhinoplasty options with you. I have availability next Tuesday at 2pm or Thursday at 10am. Would either work for you?', now() - interval '2 days', null),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'patient', 'Sarah Mitchell', 'Tuesday at 2pm works perfectly! Should I bring anything to the consultation?', now() - interval '1 day', null),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'patient', 'James Chen', 'I would like to discuss brow lift options. What is your availability?', now() - interval '1 day', null),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'patient', 'Emily Davis', 'Interested in a consultation for facial contouring. What are my options?', now() - interval '5 days', now() - interval '4 days'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'provider', 'Dr. Pratham Shah', 'Hi Emily! Great to hear from you. For facial contouring, we have several options including jawline sculpting and cheek augmentation. I have booked you for April 18th. Looking forward to meeting you!', now() - interval '4 days', null),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'patient', 'Michael Brown', 'Looking into body contouring procedures. Would love to learn more.', now() - interval '2 hours', null);

-- 8. Seed analytics events for demo providers
INSERT INTO analytics_events (provider_id, event_type, metadata, created_at)
SELECT
  provider_id,
  event_type,
  '{}'::jsonb,
  now() - (random() * interval '30 days')
FROM (
  SELECT 'dr-aiden-lang' as provider_id, unnest(ARRAY['profile_view','profile_view','profile_view','profile_view','profile_view','procedure_click','procedure_click','procedure_click','consultation_request','consultation_request','compare_view','compare_view','profile_view','profile_view','profile_view','procedure_click','consultation_request','profile_view','profile_view','profile_view']) as event_type
  UNION ALL
  SELECT 'dr-pratham-shah', unnest(ARRAY['profile_view','profile_view','profile_view','profile_view','profile_view','profile_view','procedure_click','procedure_click','procedure_click','procedure_click','consultation_request','consultation_request','consultation_request','compare_view','compare_view','compare_view','profile_view','profile_view','profile_view','profile_view','profile_view','procedure_click','consultation_request','profile_view'])
) sub;

-- 9. Add procedures for the new providers
INSERT INTO provider_procedures (provider_id, procedure_id, price)
SELECT 'dr-aiden-lang', id, CASE
  WHEN id = 'rhinoplasty' THEN 8500
  WHEN id = 'brow-lift' THEN 6000
  WHEN id = 'facelift' THEN 12000
  ELSE 5000
END
FROM procedures WHERE id IN ('rhinoplasty', 'brow-lift', 'facelift')
ON CONFLICT (provider_id, procedure_id) DO NOTHING;

INSERT INTO provider_procedures (provider_id, procedure_id, price)
SELECT 'dr-pratham-shah', id, CASE
  WHEN id = 'liposuction' THEN 7500
  WHEN id = 'rhinoplasty' THEN 9000
  WHEN id = 'facelift' THEN 14000
  ELSE 6000
END
FROM procedures WHERE id IN ('liposuction', 'rhinoplasty', 'facelift')
ON CONFLICT (provider_id, procedure_id) DO NOTHING;
