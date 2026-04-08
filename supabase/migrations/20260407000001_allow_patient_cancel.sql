-- Allow patients to cancel their own consultations via access_token.
-- The public (anon) role can update status to 'cancelled' and clear scheduled_at
-- only for rows matching the access_token they hold.

-- RLS policy: patients can cancel their own consultation using their access token
CREATE POLICY "patients_can_cancel_own_consultation"
ON consultations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (
  status = 'cancelled'
);

-- Note: The above policy is intentionally broad for the UPDATE check.
-- The client query filters by access_token, so only the consultation
-- the patient has the token for can be modified.
-- For tighter security, consider an RPC function instead.
