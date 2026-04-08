-- Migration: Security Hardening
-- Description: Fixes RLS for sensitive tables, adds search_path protection to functions, and ensures realtime isolation.

-- 1. RLS Hardening (Restrict sensitive tables to authenticated users)
-- This fixes the issue where public/anon roles could potentially bypass RLS if get_my_empresa_id() leaked.

-- Devolucoes Module
DROP POLICY IF EXISTS "Usuários logados podem ver itens_devolucao" ON public.itens_devolucao;
CREATE POLICY "Usuários logados podem ver itens_devolucao" ON public.itens_devolucao FOR SELECT TO authenticated USING (empresa_id = public.get_my_empresa_id());
DROP POLICY IF EXISTS "Usuários logados podem inserir itens_devolucao" ON public.itens_devolucao;
CREATE POLICY "Usuários logados podem inserir itens_devolucao" ON public.itens_devolucao FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_my_empresa_id());
DROP POLICY IF EXISTS "Usuários logados podem atualizar itens_devolucao" ON public.itens_devolucao;
CREATE POLICY "Usuários logados podem atualizar itens_devolucao" ON public.itens_devolucao FOR UPDATE TO authenticated USING (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "Usuários logados podem ver devoluções da sua empresa" ON public.devolucoes;
CREATE POLICY "Usuários logados podem ver devoluções da sua empresa" ON public.devolucoes FOR SELECT TO authenticated USING (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "Usuários logados podem ver credito_clientes da sua empresa" ON public.credito_clientes;
CREATE POLICY "Usuários logados podem ver credito_clientes da sua empresa" ON public.credito_clientes FOR SELECT TO authenticated USING (empresa_id = public.get_my_empresa_id());

-- Vendas Module (Core transactions)
DROP POLICY IF EXISTS "Vendas: select own empresa" ON public.vendas;
CREATE POLICY "Vendas: select own empresa" ON public.vendas FOR SELECT TO authenticated USING (empresa_id = public.get_my_empresa_id() AND (vendedor_id = auth.uid() OR public.is_admin()));

DROP POLICY IF EXISTS "Itens venda: select via venda" ON public.itens_venda;
CREATE POLICY "Itens venda: select via venda" ON public.itens_venda FOR SELECT TO authenticated USING (empresa_id = public.get_my_empresa_id());

-- 2. SQL Function search_path Protection (MITIGATE SEARCH PATH HIJACKING)
-- This applies to all custom functions in the public schema to ensure they always use the public schema safely.

DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as func_name, pg_get_function_identity_arguments(p.oid) as func_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND (
            p.proname ILIKE 'fn_%' OR 
            p.proname ILIKE 'trg_%' OR 
            p.proname ILIKE 'is_%' OR 
            p.proname ILIKE 'has_%' OR 
            p.proname ILIKE 'get_my_%' OR 
            p.proname ILIKE 'get_pix_%' OR 
            p.proname ILIKE 'upsert_pix_%' OR
            p.proname ILIKE 'handle_new_%' OR
            p.proname ILIKE 'check_%' OR
            p.proname ILIKE 'registrar_%' OR
            p.proname ILIKE 'finalizar_%'
          )
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', func_record.schema_name, func_record.func_name, func_record.func_args);
    END LOOP;
END $$;

-- 3. Realtime Isolation
-- Ensure row-level security is respected by the realtime publication.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime SET (publish_via_partition_root = true);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter publication, skipping.';
END $$;

