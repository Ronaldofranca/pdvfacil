-- PDV Fácil - Correções de Segurança (Audit Lovable)

-- 🛡️ 1. Tabelas sem RLS ou com acesso público
-- REPRESENTANTES: Ativar RLS e permitir apenas usuários autenticados
ALTER TABLE "public"."representantes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Representantes: Permitir visualização apenas para usuários autenticados" 
ON "public"."representantes" 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Representantes: Administradores podem gerenciar" 
ON "public"."representantes" 
FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND cargo = 'admin'));

-- NOTIFICACOES: Ativar RLS
ALTER TABLE "public"."notificacoes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notificacoes: Usuários veem suas próprias notificações" 
ON "public"."notificacoes" 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id);

-- DEVOLUCOES e ITENS_DEVOLUCAO: Garantir que apenas autenticados acessem
ALTER TABLE "public"."devolucoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."itens_devolucao" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devolucoes: Acesso apenas para autenticados" 
ON "public"."devolucoes" FOR ALL TO authenticated USING (true);

CREATE POLICY "Itens Devolução: Acesso apenas para autenticados" 
ON "public"."itens_devolucao" FOR ALL TO authenticated USING (true);


-- 🛡️ 2. Correções de Segurança em Stored Procedures
-- Mudança para SECURITY INVOKER (evita escalação de privilégios) 
-- e definição de search_path (evita ataques de search-path shadowing)

-- Exemplo para rpc_registrar_devolucao
ALTER FUNCTION "public"."rpc_registrar_devolucao" SET search_path = public;
ALTER FUNCTION "public"."rpc_registrar_devolucao" SECURITY INVOKER;

-- Exemplo para fn_corrigir_pagamento
ALTER FUNCTION "public"."fn_corrigir_pagamento"(uuid, numeric, text, uuid, text) SET search_path = public;
ALTER FUNCTION "public"."fn_corrigir_pagamento"(uuid, numeric, text, uuid, text) SECURITY INVOKER;


-- 🛡️ 3. Ajuste em Notificações Automáticas (Se houver trigger)
-- Garantir que a função de notificações da empresa também tenha search_path seguro
ALTER FUNCTION "public"."fn_check_notificacoes"() SET search_path = public;
