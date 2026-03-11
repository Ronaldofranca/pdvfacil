
-- 1) catalogo_config: visual customization and page content
CREATE TABLE IF NOT EXISTS public.catalogo_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  titulo text NOT NULL DEFAULT 'Nosso Catálogo',
  subtitulo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  banner_url text,
  whatsapp_numero text NOT NULL DEFAULT '',
  
  -- Visual customization
  cor_primaria text NOT NULL DEFAULT '#10b981',
  cor_secundaria text NOT NULL DEFAULT '#1e293b',
  cor_fundo text NOT NULL DEFAULT '#0f1117',
  cor_botoes text NOT NULL DEFAULT '#10b981',
  tipografia text NOT NULL DEFAULT 'Inter',
  estilo_cards text NOT NULL DEFAULT 'rounded',
  
  -- Sections toggle
  secao_destaque boolean NOT NULL DEFAULT true,
  secao_categorias boolean NOT NULL DEFAULT true,
  secao_testemunhos boolean NOT NULL DEFAULT true,
  secao_beneficios boolean NOT NULL DEFAULT true,
  secao_cta boolean NOT NULL DEFAULT true,
  
  -- Benefits section content
  beneficios jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- CTA section
  cta_titulo text NOT NULL DEFAULT '',
  cta_descricao text NOT NULL DEFAULT '',
  cta_botao_texto text NOT NULL DEFAULT 'Fale Conosco',
  cta_botao_link text NOT NULL DEFAULT '',
  
  -- SEO
  seo_titulo text NOT NULL DEFAULT '',
  seo_descricao text NOT NULL DEFAULT '',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(empresa_id)
);

ALTER TABLE public.catalogo_config ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own empresa config
CREATE POLICY "CatalogoConfig: select own empresa" ON public.catalogo_config
  FOR SELECT TO authenticated USING (empresa_id = get_my_empresa_id());

CREATE POLICY "CatalogoConfig: insert own empresa" ON public.catalogo_config
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "CatalogoConfig: update own empresa" ON public.catalogo_config
  FOR UPDATE TO authenticated 
  USING (empresa_id = get_my_empresa_id() AND is_admin())
  WITH CHECK (empresa_id = get_my_empresa_id());

-- Public read for catalog
CREATE POLICY "CatalogoConfig: public read" ON public.catalogo_config
  FOR SELECT TO anon USING (true);


-- 2) produto_imagens: gallery images for products
CREATE TABLE IF NOT EXISTS public.produto_imagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ProdutoImagens: select own empresa" ON public.produto_imagens
  FOR SELECT TO authenticated USING (empresa_id = get_my_empresa_id());

CREATE POLICY "ProdutoImagens: insert own empresa" ON public.produto_imagens
  FOR INSERT TO authenticated WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "ProdutoImagens: update own empresa" ON public.produto_imagens
  FOR UPDATE TO authenticated 
  USING (empresa_id = get_my_empresa_id())
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY "ProdutoImagens: delete own empresa" ON public.produto_imagens
  FOR DELETE TO authenticated USING (empresa_id = get_my_empresa_id());

CREATE POLICY "ProdutoImagens: public read" ON public.produto_imagens
  FOR SELECT TO anon USING (true);


-- 3) Add catalog fields to produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promocao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mais_vendido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lancamento boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_titulo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_descricao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS beneficios jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp_texto text NOT NULL DEFAULT '';

-- Create storage bucket for catalog images
INSERT INTO storage.buckets (id, name, public) VALUES ('catalogo', 'catalogo', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for catalog bucket
CREATE POLICY "Catalogo: public read" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'catalogo');

CREATE POLICY "Catalogo: auth upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogo');

CREATE POLICY "Catalogo: auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'catalogo');

CREATE POLICY "Catalogo: auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'catalogo');
