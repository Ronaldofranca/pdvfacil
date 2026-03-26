DROP POLICY IF EXISTS "LoginAttempts: no anon access" ON public.login_attempts;
DROP POLICY IF EXISTS "LoginAttempts: no auth access" ON public.login_attempts;

CREATE POLICY "LoginAttempts: no anon access"
ON public.login_attempts
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "LoginAttempts: no auth access"
ON public.login_attempts
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);