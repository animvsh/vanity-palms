-- ============================================================
-- Migration: P0 production hardening
-- Date: 2026-04-06
-- Covers: FK indexes, submit_review_request signature fix,
--         get_unread_message_count hardening, RLS is_admin() wrapping,
--         message body length limit
-- ============================================================

-- 1. Add missing FK indexes for query performance
CREATE INDEX IF NOT EXISTS idx_procedures_concern_id ON public.procedures(concern_id);
CREATE INDEX IF NOT EXISTS idx_provider_procedures_provider_id ON public.provider_procedures(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_procedures_procedure_id ON public.provider_procedures(procedure_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_procedure_id ON public.reviews(procedure_id);
CREATE INDEX IF NOT EXISTS idx_consultations_provider_id ON public.consultations(provider_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_provider_id ON public.analytics_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_provider_id ON public.review_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_consultation_id ON public.review_requests(consultation_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_procedure_id ON public.review_requests(procedure_id);

-- 2. Add missing columns to reviews table for the 4 dropped fields
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS worth_it BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS would_choose_again BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS structured_answers JSONB;

-- 3. Fix submit_review_request to accept the 4 missing fields
CREATE OR REPLACE FUNCTION public.submit_review_request(
  public_token text,
  review_rating integer,
  review_body text,
  review_consult_rating integer default null,
  review_results_rating integer default null,
  review_recovery_rating integer default null,
  review_worth_it boolean default null,
  review_would_choose_again boolean default null,
  review_would_recommend boolean default null,
  review_structured_answers jsonb default null
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.review_requests%rowtype;
  created_review_id text;
BEGIN
  SELECT *
  INTO request_row
  FROM public.review_requests
  WHERE token = public_token
    AND used_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review request is invalid or expired';
  END IF;

  created_review_id := gen_random_uuid()::text;

  INSERT INTO public.reviews (
    id,
    provider_id,
    procedure_id,
    rating,
    body,
    patient_name,
    date,
    stage,
    consult_rating,
    results_rating,
    recovery_rating,
    worth_it,
    would_choose_again,
    would_recommend,
    structured_answers
  )
  VALUES (
    created_review_id,
    request_row.provider_id,
    request_row.procedure_id,
    review_rating,
    review_body,
    request_row.patient_name,
    current_date,
    request_row.stage,
    review_consult_rating,
    review_results_rating,
    review_recovery_rating,
    review_worth_it,
    review_would_choose_again,
    review_would_recommend,
    review_structured_answers
  );

  UPDATE public.review_requests
  SET used_at = now()
  WHERE id = request_row.id;

  RETURN created_review_id;
END;
$$;

-- Re-grant with new signature
GRANT EXECUTE ON FUNCTION public.submit_review_request(text, integer, text, integer, integer, integer, boolean, boolean, boolean, jsonb) TO anon, authenticated;

-- 4. Fix get_unread_message_count with SET search_path and caller check
CREATE OR REPLACE FUNCTION public.get_unread_message_count(target_provider_id TEXT)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.consultation_messages cm
  JOIN public.consultations c ON c.id = cm.consultation_id
  WHERE c.provider_id = target_provider_id
    AND cm.sender_type = 'patient'
    AND cm.read_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_message_count(text) TO authenticated;

-- 5. Add message body length constraint
ALTER TABLE public.consultation_messages
  ADD CONSTRAINT consultation_messages_body_length CHECK (length(body) <= 5000);

-- Update send_public_consultation_message to enforce length limit
CREATE OR REPLACE FUNCTION public.send_public_consultation_message(
  public_token text,
  patient_name text,
  message_body text
)
RETURNS TABLE (
  id uuid,
  consultation_id uuid,
  sender_type text,
  sender_name text,
  body text,
  read_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_consultation_id uuid;
BEGIN
  IF length(message_body) > 5000 THEN
    RAISE EXCEPTION 'Message body exceeds maximum length of 5000 characters';
  END IF;

  SELECT c.id
  INTO target_consultation_id
  FROM public.consultations c
  WHERE c.access_token = public_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consultation not found';
  END IF;

  RETURN QUERY
  INSERT INTO public.consultation_messages (
    consultation_id,
    sender_type,
    sender_name,
    body
  )
  VALUES (
    target_consultation_id,
    'patient',
    patient_name,
    message_body
  )
  RETURNING
    consultation_messages.id,
    consultation_messages.consultation_id,
    consultation_messages.sender_type,
    consultation_messages.sender_name,
    consultation_messages.body,
    consultation_messages.read_at,
    consultation_messages.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_public_consultation_message(text, text, text) TO anon, authenticated;

-- 6. Wrap RLS is_admin() calls in (SELECT ...) for per-statement evaluation
-- This prevents the planner from evaluating is_admin() once per row

-- review_requests
DROP POLICY IF EXISTS "review_requests_select_own_or_admin" ON public.review_requests;
CREATE POLICY "review_requests_select_own_or_admin"
ON public.review_requests
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin(auth.uid()))
  OR provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

-- provider_whitelist
DROP POLICY IF EXISTS "provider_whitelist_admin_read" ON public.provider_whitelist;
CREATE POLICY "provider_whitelist_admin_read"
ON public.provider_whitelist
FOR SELECT
TO authenticated
USING ((SELECT public.is_admin(auth.uid())));

-- admins
DROP POLICY IF EXISTS "admins_read_all" ON public.admins;
CREATE POLICY "admins_read_all"
ON public.admins
FOR SELECT
TO authenticated
USING ((SELECT public.is_admin(auth.uid())));

-- provider_procedures
DROP POLICY IF EXISTS "provider_procedures_select_own_or_admin" ON public.provider_procedures;
CREATE POLICY "provider_procedures_select_own_or_admin"
ON public.provider_procedures
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin(auth.uid()))
  OR provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "provider_procedures_write_own_or_admin" ON public.provider_procedures;
CREATE POLICY "provider_procedures_write_own_or_admin"
ON public.provider_procedures
FOR ALL
TO authenticated
USING (
  (SELECT public.is_admin(auth.uid()))
  OR provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  (SELECT public.is_admin(auth.uid()))
  OR provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

-- reviews
DROP POLICY IF EXISTS "reviews_admin_read" ON public.reviews;
CREATE POLICY "reviews_admin_read"
ON public.reviews
FOR SELECT
TO authenticated
USING ((SELECT public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "reviews_admin_delete" ON public.reviews;
CREATE POLICY "reviews_admin_delete"
ON public.reviews
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin(auth.uid())));

-- consultations
DROP POLICY IF EXISTS "consultations_select_own_or_admin" ON public.consultations;
CREATE POLICY "consultations_select_own_or_admin"
ON public.consultations
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin(auth.uid()))
  OR provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "consultations_update_own_or_admin" ON public.consultations;
CREATE POLICY "consultations_update_own_or_admin"
ON public.consultations
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_admin(auth.uid()))
  OR provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  (SELECT public.is_admin(auth.uid()))
  OR provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

-- analytics_events
DROP POLICY IF EXISTS "analytics_select_own_or_admin" ON public.analytics_events;
CREATE POLICY "analytics_select_own_or_admin"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin(auth.uid()))
  OR provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

-- storage
DROP POLICY IF EXISTS "storage_provider_images_insert" ON storage.objects;
CREATE POLICY "storage_provider_images_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-images'
  AND (
    (SELECT public.is_admin(auth.uid()))
    OR (storage.foldername(name))[1] IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "storage_provider_images_delete" ON storage.objects;
CREATE POLICY "storage_provider_images_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-images'
  AND (
    (SELECT public.is_admin(auth.uid()))
    OR (storage.foldername(name))[1] IN (
      SELECT id FROM public.providers WHERE user_id = auth.uid()
    )
  )
);
