-- ============================================================
-- Migration: Auto-link provider records and admin on signup
-- Date: 2026-04-05
-- Purpose: When a user signs up whose email matches a seeded
--          provider record (user_id IS NULL), auto-link it.
--          Also auto-grant admin to aalang@ucsc.edu.
-- ============================================================

-- 1. Function: claim an existing provider record by email
--    Called from the frontend after login/signup to link
--    a pre-seeded provider row to the authenticated user.
CREATE OR REPLACE FUNCTION public.claim_provider_by_email()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_email TEXT;
  linked_provider_id TEXT;
BEGIN
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'not_authenticated');
  END IF;

  -- Get email from JWT
  caller_email := LOWER(auth.jwt() ->> 'email');

  -- Check if user already owns a provider record
  SELECT id INTO linked_provider_id
  FROM public.providers
  WHERE user_id = caller_id
  LIMIT 1;

  IF linked_provider_id IS NOT NULL THEN
    RETURN jsonb_build_object('linked', true, 'provider_id', linked_provider_id, 'reason', 'already_linked');
  END IF;

  -- Try to claim an unlinked provider record with matching email
  UPDATE public.providers
  SET user_id = caller_id
  WHERE LOWER(email) = caller_email
    AND user_id IS NULL
  RETURNING id INTO linked_provider_id;

  IF linked_provider_id IS NOT NULL THEN
    RETURN jsonb_build_object('linked', true, 'provider_id', linked_provider_id, 'reason', 'claimed');
  END IF;

  RETURN jsonb_build_object('linked', false, 'reason', 'no_matching_record');
END;
$$;

-- 2. Function: auto-grant admin for designated emails
--    Called from the frontend after login to ensure admin
--    row exists if the user's email is in the admin list.
CREATE OR REPLACE FUNCTION public.ensure_admin_if_designated()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_email TEXT;
  designated_emails TEXT[] := ARRAY['aalang@ucsc.edu'];
BEGIN
  IF caller_id IS NULL THEN
    RETURN false;
  END IF;

  caller_email := LOWER(auth.jwt() ->> 'email');

  IF caller_email = ANY(designated_emails) THEN
    INSERT INTO public.admins (user_id, email)
    VALUES (caller_id, caller_email)
    ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 3. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_provider_by_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_admin_if_designated() TO authenticated;
