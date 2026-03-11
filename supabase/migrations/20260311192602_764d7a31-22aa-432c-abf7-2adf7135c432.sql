
-- Testemunhos para catálogo público
CREATE TABLE public.testemunhos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_cliente TEXT NOT NULL,
  avatar_url TEXT,
  texto TEXT NOT NULL,
  nota INTEGER NOT NULL DEFAULT 5 CHECK (nota >= 1 AND nota <= 5),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.testemunhos ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage within their empresa
CREATE POLICY "Testemunhos: select own empresa" ON public.testemunhos
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Testemunhos: insert own empresa" ON public.testemunhos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Testemunhos: update own empresa" ON public.testemunhos
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Testemunhos: delete admin only" ON public.testemunhos
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Public read for anon (catalog)
CREATE POLICY "Testemunhos: public read active" ON public.testemunhos
  FOR SELECT TO anon
  USING (ativo = true);

-- Also allow anon read on produtos and categorias for public catalog
CREATE POLICY "Produtos: public read active" ON public.produtos
  FOR SELECT TO anon
  USING (ativo = true);

CREATE POLICY "Categorias: public read active" ON public.categorias
  FOR SELECT TO anon
  USING (ativa = true);
