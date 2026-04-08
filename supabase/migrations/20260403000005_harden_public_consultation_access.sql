-- Harden public consultation access to use token-based RPCs instead of broad table reads.

-- Add index for patient-safe public lookup.
CREATE UNIQUE INDEX IF NOT EXISTS consultations_access_token_key
ON consultations (access_token)
WHERE access_token IS NOT NULL;

-- Ensure the newer token-based helper functions exist in the database.
CREATE OR REPLACE FUNCTION public.get_public_consultation(public_token text)
RETURNS TABLE (
  id uuid,
  patient_name text,
  email text,
  status text,
  scheduled_at timestamptz,
  meeting_mode text,
  meeting_location text,
  booking_notes text,
  provider_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.patient_name,
    c.email,
    c.status,
    c.scheduled_at,
    c.meeting_mode,
    c.meeting_location,
    c.booking_notes,
    p.name AS provider_name
  FROM public.consultations c
  JOIN public.providers p ON p.id = c.provider_id
  WHERE c.access_token = public_token;
$$;

CREATE OR REPLACE FUNCTION public.get_public_consultation_messages(public_token text)
RETURNS TABLE (
  id uuid,
  consultation_id uuid,
  sender_type text,
  sender_name text,
  body text,
  read_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cm.id,
    cm.consultation_id,
    cm.sender_type,
    cm.sender_name,
    cm.body,
    cm.read_at,
    cm.created_at
  FROM public.consultation_messages cm
  JOIN public.consultations c ON c.id = cm.consultation_id
  WHERE c.access_token = public_token
  ORDER BY cm.created_at ASC;
$$;

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

GRANT EXECUTE ON FUNCTION public.get_public_consultation(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_consultation_messages(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_public_consultation_message(text, text, text) TO anon, authenticated;

-- Remove broad public table access in favor of the RPC path.
DROP POLICY IF EXISTS "Public can read own consultation messages" ON consultation_messages;
DROP POLICY IF EXISTS "Anyone can send a consultation message" ON consultation_messages;

-- Keep provider/admin authenticated access on the raw table.
REVOKE ALL ON public.consultation_messages FROM anon;
GRANT SELECT, INSERT ON public.consultation_messages TO authenticated;
GRANT UPDATE (read_at) ON public.consultation_messages TO authenticated;

-- Public users should create consultations but not read the table directly.
REVOKE SELECT ON public.consultations FROM anon;
GRANT INSERT ON public.consultations TO anon;
