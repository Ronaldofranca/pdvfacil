
-- Fix cross-tenant privilege escalation: restrict role_permissoes modifications to service_role only
-- Drop existing admin-accessible INSERT/DELETE policies
DROP POLICY IF EXISTS "Only admins can manage role_permissoes" ON public.role_permissoes;
DROP POLICY IF EXISTS "Only admins can delete role_permissoes" ON public.role_permissoes;

-- Create new policies restricted to service_role (migrations/edge functions only)
CREATE POLICY "Service role can insert role_permissoes"
  ON public.role_permissoes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can delete role_permissoes"
  ON public.role_permissoes FOR DELETE
  TO service_role
  USING (true);
