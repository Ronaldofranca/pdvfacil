-- ========================================================
-- 1. ISOLAMENTO DE DADOS (REALTIME / RLS)
-- ========================================================

-- A) NOTIFICACOES: Apenas o dono ou admin vê.
DROP POLICY IF EXISTS "Notificacoes: select own" ON public.notificacoes;
CREATE POLICY "Notificacoes: select own" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND (usuario_id = auth.uid() OR public.is_admin()));

-- B) VENDAS: Vendedor só vê as suas. Admin vê todas da empresa.
DROP POLICY IF EXISTS "Vendas: select own empresa" ON public.vendas;
CREATE POLICY "Vendas: select own empresa" ON public.vendas
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND (vendedor_id = auth.uid() OR public.is_admin()));

-- C) ITENS_VENDA: Segue a permissão da venda pai.
DROP POLICY IF EXISTS "Itens venda: select via venda" ON public.itens_venda;
CREATE POLICY "Itens venda: select via venda" ON public.itens_venda
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vendas v 
    WHERE v.id = itens_venda.venda_id 
      AND v.empresa_id = public.get_my_empresa_id()
      AND (v.vendedor_id = auth.uid() OR public.is_admin())
  ));

-- D) PARCELAS: Segue a permissão da venda pai.
DROP POLICY IF EXISTS "Parcelas: select own empresa" ON public.parcelas;
CREATE POLICY "Parcelas: select own empresa" ON public.parcelas
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = parcelas.venda_id AND v.vendedor_id = auth.uid())
  ));


-- ========================================================
-- 2. PROTEÇÃO DE REPRESENTANTES E CONTATOS
-- ========================================================

-- A) Restringir SELECT direto na tabela representantes para Admins apenas
DROP POLICY IF EXISTS "Representantes visíveis para visitantes" ON public.representantes;
CREATE POLICY "Representantes: admin only select" ON public.representantes
  FOR SELECT TO authenticated
  USING (public.is_admin() AND empresa_id = public.get_my_empresa_id());

-- B) Função segura para o Mapa Público (Security Definer)
-- Retorna as cidades e os dados básicos do representante (incluindo telefone para contato)
-- Isso evita a exposição da tabela inteira via API REST direta.
CREATE OR REPLACE FUNCTION public.fn_get_cidades_publicas()
RETURNS TABLE (
  id UUID,
  cidade TEXT,
  estado TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  representante_nome TEXT,
  representante_telefone TEXT,
  representante_cor TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.cidade,
    c.estado,
    c.latitude,
    c.longitude,
    r.nome as representante_nome,
    r.telefone as representante_telefone,
    r.cor as representante_cor
  FROM public.cidades_atendidas c
  LEFT JOIN public.representantes r ON c.representante_id = r.id
  WHERE c.ativa = true;
END;
$$;

-- C) Garantir que Cidades Atendidas também tenha RLS protegendo contra deleção acidental
-- (A leitura continua pública via RPC acima, mas podemos restringir a tabela base se quisermos)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cidades_atendidas;
CREATE POLICY "Cidades: admin manage" ON public.cidades_atendidas
  FOR ALL TO authenticated
  USING (public.is_admin());
