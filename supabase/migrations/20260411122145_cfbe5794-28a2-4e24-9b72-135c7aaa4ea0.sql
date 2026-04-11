
-- 1. CRITICAL: Fix get_my_empresa_id() to NEVER read from user_metadata (user-writable)
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.empresa_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

-- 2. Remove public-role policies on itens_devolucao (keep only authenticated ones)
DROP POLICY IF EXISTS "Usuários logados podem ver itens_devolucao" ON public.itens_devolucao;
DROP POLICY IF EXISTS "Usuários logados podem inserir itens_devolucao" ON public.itens_devolucao;
DROP POLICY IF EXISTS "Usuários logados podem atualizar itens_devolucao" ON public.itens_devolucao;

-- 3. Fix representantes: remove unconditional public SELECT
DROP POLICY IF EXISTS "Representantes podem ser visualizados publicamente" ON public.representantes;
DROP POLICY IF EXISTS "Representantes: Permitir visualização apenas para usuários autenticados" ON public.representantes;

-- Recreate as authenticated-only
CREATE POLICY "representantes_select_authenticated"
  ON public.representantes FOR SELECT
  TO authenticated
  USING (true);

-- 4. Fix get_public_empresa_id to validate catalog is active (already does) 
-- and add explicit IMMUTABLE marking for safety. The function already 
-- validates catalogo_publico_ativo = true, which is the correct guard.
-- No change needed here as it's already properly scoped.
