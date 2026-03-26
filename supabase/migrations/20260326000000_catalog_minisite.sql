-- Create catalogo_banners table
CREATE TABLE IF NOT EXISTS public.catalogo_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    imagem_url TEXT NOT NULL,
    titulo TEXT,
    subtitulo TEXT,
    link TEXT,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for catalogo_banners
ALTER TABLE public.catalogo_banners ENABLE ROW LEVEL SECURITY;

-- Add policies for catalogo_banners
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for banners' AND tablename = 'catalogo_banners') THEN
        CREATE POLICY "Public read access for banners" ON public.catalogo_banners FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin all access for banners' AND tablename = 'catalogo_banners') THEN
        CREATE POLICY "Admin all access for banners" ON public.catalogo_banners FOR ALL USING (
            auth.uid() IN (SELECT user_id FROM public.profiles WHERE empresa_id = catalogo_banners.empresa_id)
        );
    END IF;
END $$;

-- Add new columns to catalogo_config
ALTER TABLE public.catalogo_config 
ADD COLUMN IF NOT EXISTS secoes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS secoes_produto JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS header_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS footer_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS tema_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS imagem_institucional_url TEXT;

-- Add rich content columns to produtos
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS modo_uso TEXT,
ADD COLUMN IF NOT EXISTS diferenciais JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Recreate produtos_catalogo view with new columns
DROP VIEW IF EXISTS public.produtos_catalogo;

CREATE VIEW public.produtos_catalogo AS
  SELECT id, empresa_id, nome, descricao, codigo, categoria_id, preco, unidade,
         imagem_url, ativo, slug, seo_titulo, seo_descricao, beneficios,
         destaque, lancamento, mais_vendido, promocao, whatsapp_texto,
         modo_uso, diferenciais, observacoes,
         created_at, updated_at
  FROM public.produtos WHERE ativo = true;

GRANT SELECT ON public.produtos_catalogo TO anon;
GRANT SELECT ON public.produtos_catalogo TO authenticated;
