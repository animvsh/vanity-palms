-- Add Kevin as admin
-- 1. Insert into admins directly (user already signed up)
INSERT INTO public.admins (user_id, email)
SELECT id, email
FROM auth.users
WHERE lower(email) = lower('kevinramirez889@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

-- 2. Update the ensure_admin_if_designated function to include Kevin
CREATE OR REPLACE FUNCTION public.ensure_admin_if_designated()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_email TEXT;
  designated_emails TEXT[] := ARRAY['aalang@ucsc.edu', 'kevinramirez889@gmail.com'];
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

GRANT EXECUTE ON FUNCTION public.ensure_admin_if_designated() TO authenticated;
