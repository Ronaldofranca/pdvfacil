-- Migration para separar chaves PIX em tabela dedicada e segura

-- 1. Create configuracoes_pix table
CREATE TABLE IF NOT EXISTS public.configuracoes_pix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  pix_chave text NOT NULL DEFAULT '',
  pix_tipo text NOT NULL DEFAULT '',
  pix_nome_recebedor text NOT NULL DEFAULT '',
  pix_cidade_recebedor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.configuracoes_pix ENABLE ROW LEVEL SECURITY;

-- Only admins from the same empresa can select
CREATE POLICY "ConfigPix: admin select" ON public.configuracoes_pix
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Only admins from the same empresa can insert
CREATE POLICY "ConfigPix: admin insert" ON public.configuracoes_pix
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Only admins from the same empresa can update
CREATE POLICY "ConfigPix: admin update" ON public.configuracoes_pix
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin())
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- 2. Migrate existing PIX data
INSERT INTO public.configuracoes_pix (empresa_id, pix_chave, pix_tipo, pix_nome_recebedor, pix_cidade_recebedor)
SELECT 
  empresa_id, 
  COALESCE(pix_chave, ''), 
  COALESCE(pix_tipo, ''), 
  COALESCE(pix_nome_recebedor, ''), 
  COALESCE(pix_cidade_recebedor, '')
FROM public.configuracoes
ON CONFLICT (empresa_id) DO NOTHING;

-- 3. Replace RPC function to read from new table securely
DROP FUNCTION IF EXISTS public.get_pix_config(uuid);

CREATE OR REPLACE FUNCTION public.get_pix_config(_empresa_id uuid)
RETURNS TABLE (
  pix_chave text, 
  pix_tipo text, 
  pix_nome_recebedor text, 
  pix_cidade_recebedor text
)
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Permitir acesso apenas se:
  -- 1. Usuário é admin ou vendedor da mesma empresa
  -- 2. Usuário é um cliente logado desta empresa no portal
  IF public.get_my_empresa_id() = _empresa_id 
     OR EXISTS(SELECT 1 FROM public.clientes WHERE user_id = auth.uid() AND empresa_id = _empresa_id) THEN
    RETURN QUERY
    SELECT c.pix_chave, c.pix_tipo, c.pix_nome_recebedor, c.pix_cidade_recebedor
    FROM public.configuracoes_pix c
    WHERE c.empresa_id = _empresa_id
    LIMIT 1;
  ELSE
    RETURN;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pix_config(uuid) TO authenticated;

-- Função auxiliar para o admin salvar pix_config (já que o frontend salva na configuracoes)
CREATE OR REPLACE FUNCTION public.upsert_pix_config(
  _empresa_id uuid,
  _pix_chave text DEFAULT NULL,
  _pix_tipo text DEFAULT NULL,
  _pix_nome_recebedor text DEFAULT NULL,
  _pix_cidade_recebedor text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() OR public.get_my_empresa_id() != _empresa_id THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar as configurações de PIX.';
  END IF;

  INSERT INTO public.configuracoes_pix (
    empresa_id, pix_chave, pix_tipo, pix_nome_recebedor, pix_cidade_recebedor
  ) VALUES (
    _empresa_id, COALESCE(_pix_chave, ''), COALESCE(_pix_tipo, ''), COALESCE(_pix_nome_recebedor, ''), COALESCE(_pix_cidade_recebedor, '')
  )
  ON CONFLICT (empresa_id) DO UPDATE SET
    pix_chave = COALESCE(_pix_chave, configuracoes_pix.pix_chave),
    pix_tipo = COALESCE(_pix_tipo, configuracoes_pix.pix_tipo),
    pix_nome_recebedor = COALESCE(_pix_nome_recebedor, configuracoes_pix.pix_nome_recebedor),
    pix_cidade_recebedor = COALESCE(_pix_cidade_recebedor, configuracoes_pix.pix_cidade_recebedor),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_pix_config(uuid, text, text, text, text) TO authenticated;

-- 4. Drop columns from configuracoes table to remove the sensitive data from the main object
ALTER TABLE public.configuracoes DROP COLUMN IF EXISTS pix_chave;
ALTER TABLE public.configuracoes DROP COLUMN IF EXISTS pix_tipo;
ALTER TABLE public.configuracoes DROP COLUMN IF EXISTS pix_nome_recebedor;
ALTER TABLE public.configuracoes DROP COLUMN IF EXISTS pix_cidade_recebedor;
