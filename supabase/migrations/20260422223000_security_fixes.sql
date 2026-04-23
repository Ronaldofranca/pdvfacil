-- 1. Segurança de Tabelas (RLS)

-- Tabela: representantes
ALTER TABLE IF EXISTS public.representantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir visualização por usuários autenticados" ON public.representantes;
CREATE POLICY "Permitir visualização por usuários autenticados" 
    ON public.representantes FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento por administradores" ON public.representantes;
CREATE POLICY "Permitir gerenciamento por administradores" 
    ON public.representantes FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Tabela: notificacoes
ALTER TABLE IF EXISTS public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem apenas suas próprias notificações" ON public.notificacoes;
CREATE POLICY "Usuários veem apenas suas próprias notificações" 
    ON public.notificacoes FOR SELECT 
    TO authenticated 
    USING (
        usuario_id = auth.uid()
    );

DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias notificações" ON public.notificacoes;
CREATE POLICY "Usuários podem gerenciar suas próprias notificações" 
    ON public.notificacoes FOR ALL 
    TO authenticated 
    USING (
        usuario_id = auth.uid()
    )
    WITH CHECK (
        usuario_id = auth.uid()
    );

-- Tabela: devolucoes
ALTER TABLE IF EXISTS public.devolucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem acessar devolucoes" ON public.devolucoes;
CREATE POLICY "Usuários autenticados podem acessar devolucoes" 
    ON public.devolucoes FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Tabela: itens_devolucao
ALTER TABLE IF EXISTS public.itens_devolucao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem acessar itens_devolucao" ON public.itens_devolucao;
CREATE POLICY "Usuários autenticados podem acessar itens_devolucao" 
    ON public.itens_devolucao FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);


-- 2. Segurança de Funções (Stored Procedures)
-- Ajustar as funções afetadas (rpc_registrar_devolucao, fn_corrigir_pagamento, fn_check_notificacoes)
-- Mudando para SECURITY INVOKER e forçando SET search_path = public
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('rpc_registrar_devolucao', 'fn_corrigir_pagamento', 'fn_check_notificacoes')
    LOOP
        -- Altera para SECURITY INVOKER
        EXECUTE 'ALTER FUNCTION ' || rec.func_sig || ' SECURITY INVOKER';
        -- Força search_path = public para evitar shadowing
        EXECUTE 'ALTER FUNCTION ' || rec.func_sig || ' SET search_path = public';
    END LOOP;
END
$$;
