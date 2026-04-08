-- Migration: Fix Multi-Tenancy for Public Catalog
-- Description: Adds a slug to catalogo_config and updates get_public_empresa_id to be dynamic.

-- 1. Add slug column to catalogo_config if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalogo_config' AND column_name = 'slug') THEN
        ALTER TABLE public.catalogo_config ADD COLUMN slug text;
    END IF;
END $$;

-- 2. Initialize slugs for existing records (using part of the ID to guarantee uniqueness)
UPDATE public.catalogo_config 
SET slug = lower(substring(id::text from 1 for 8))
WHERE slug IS NULL;

-- 3. Make slug required and unique
ALTER TABLE public.catalogo_config ALTER COLUMN slug SET NOT NULL;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalogo_config_slug_key') THEN
        ALTER TABLE public.catalogo_config ADD CONSTRAINT catalogo_config_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 4. Re-implement get_public_empresa_id to be dynamic
-- It will now look for a slug in the request context before falling back to anything.
CREATE OR REPLACE FUNCTION public.get_public_empresa_id()
RETURNS uuid 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _slug text;
    _empresa_id uuid;
    _headers json;
BEGIN
    -- Try to get from app settings (set via SET app.settings.empresa_slug = '...')
    _slug := current_setting('app.settings.empresa_slug', true);
    
    -- If not found, try to get from HTTP headers (x-catalog-slug)
    IF _slug IS NULL OR _slug = '' THEN
        BEGIN
            _headers := current_setting('request.headers', true)::json;
            _slug := _headers->>'x-catalog-slug';
        EXCEPTION WHEN OTHERS THEN
            _slug := NULL;
        END;
    END IF;

    -- Lookup the empresa_id by slug
    IF _slug IS NOT NULL AND _slug != '' THEN
        SELECT empresa_id INTO _empresa_id 
        FROM public.catalogo_config 
        WHERE slug = _slug 
        LIMIT 1;
        
        RETURN _empresa_id;
    END IF;

    -- No fallback to oldest anymore. Returning NULL forces the user to specify a catalog.
    RETURN NULL;
END;
$$;

-- 5. Hardening RLS Policies for Catalog Tables
-- Ensure they all use the dynamic lookup for anonymous visitors.

-- catalogo_config: Scope public read by the requested slug
DROP POLICY IF EXISTS "CatalogoConfig: public read" ON public.catalogo_config;
CREATE POLICY "CatalogoConfig: public read"
    ON public.catalogo_config FOR SELECT 
    TO anon 
    USING (empresa_id = public.get_public_empresa_id());

-- catalogo_banners: Scope public read
DROP POLICY IF EXISTS "Public read access for banners" ON public.catalogo_banners;
CREATE POLICY "Public read access for banners" 
    ON public.catalogo_banners FOR SELECT 
    TO anon 
    USING (empresa_id = public.get_public_empresa_id());

-- testemunhos: Scope public read
DROP POLICY IF EXISTS "Testemunhos: public read active" ON public.testemunhos;
CREATE POLICY "Testemunhos: public read active"
    ON public.testemunhos FOR SELECT
    TO anon
    USING (ativo = true AND empresa_id = public.get_public_empresa_id());

-- categorias: Scope public read
DROP POLICY IF EXISTS "Categorias: public read active" ON public.categorias;
CREATE POLICY "Categorias: public read active"
    ON public.categorias FOR SELECT
    TO anon
    USING (ativa = true AND empresa_id = public.get_public_empresa_id());

-- produto_imagens: Scope public read
DROP POLICY IF EXISTS "ProdutoImagens: public read scoped" ON public.produto_imagens;
DROP POLICY IF EXISTS "ProdutoImagens: public read" ON public.produto_imagens;
CREATE POLICY "ProdutoImagens: public read scoped"
    ON public.produto_imagens FOR SELECT
    TO anon
    USING (empresa_id = public.get_public_empresa_id());

-- produtos: Ensure the base table allows anon read for the scoped company
-- This is necessary for the security_invoker view 'produtos_catalogo' to work.
DROP POLICY IF EXISTS "Produtos: anon select scoped" ON public.produtos;
DROP POLICY IF EXISTS "Produtos: anon denied on base table" ON public.produtos;
CREATE POLICY "Produtos: anon select scoped"
    ON public.produtos FOR SELECT
    TO anon
    USING (ativo = true AND empresa_id = public.get_public_empresa_id());

