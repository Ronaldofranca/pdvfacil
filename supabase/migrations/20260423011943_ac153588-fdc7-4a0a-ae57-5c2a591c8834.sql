-- PDV Fácil - Security Fixes based on Antigravity Audit

-- 🛡️ 1. Table Security (RLS)

-- REPRESENTANTES
ALTER TABLE "public"."representantes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Representantes: Viewable by authenticated users" ON "public"."representantes";
DROP POLICY IF EXISTS "Representantes: Managed by admins only" ON "public"."representantes";

CREATE POLICY "Representantes: Viewable by authenticated users" 
ON "public"."representantes" 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Representantes: Managed by admins only" 
ON "public"."representantes" 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'admin'
  )
);

-- NOTIFICACOES
ALTER TABLE "public"."notificacoes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notificacoes: Users see own notifications" ON "public"."notificacoes";

CREATE POLICY "Notificacoes: Users see own notifications" 
ON "public"."notificacoes" 
FOR ALL 
TO authenticated 
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

-- DEVOLUCOES & ITENS_DEVOLUCAO
ALTER TABLE "public"."devolucoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."itens_devolucao" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Devolucoes: Authenticated access" ON "public"."devolucoes";

CREATE POLICY "Devolucoes: Authenticated access" 
ON "public"."devolucoes" 
FOR ALL 
TO authenticated 
USING (empresa_id = (SELECT get_my_empresa_id()))
WITH CHECK (empresa_id = (SELECT get_my_empresa_id()));

DROP POLICY IF EXISTS "Itens Devolução: Authenticated access" ON "public"."itens_devolucao";

CREATE POLICY "Itens Devolução: Authenticated access" 
ON "public"."itens_devolucao" 
FOR ALL 
TO authenticated 
USING (empresa_id = (SELECT get_my_empresa_id()))
WITH CHECK (empresa_id = (SELECT get_my_empresa_id()));


-- 🛡️ 2. Stored Procedure Security

-- Update fn_registrar_devolucao
ALTER FUNCTION "public"."fn_registrar_devolucao"(uuid, uuid, uuid, text, text, jsonb, text) SET search_path = public;
ALTER FUNCTION "public"."fn_registrar_devolucao"(uuid, uuid, uuid, text, text, jsonb, text) SECURITY INVOKER;

-- Update fn_corrigir_pagamento (Overload 1)
ALTER FUNCTION "public"."fn_corrigir_pagamento"(uuid, numeric, text, uuid, text) SET search_path = public;
ALTER FUNCTION "public"."fn_corrigir_pagamento"(uuid, numeric, text, uuid, text) SECURITY INVOKER;

-- Update fn_corrigir_pagamento (Overload 2)
ALTER FUNCTION "public"."fn_corrigir_pagamento"(uuid, numeric, timestamp with time zone, text, uuid, text) SET search_path = public;
ALTER FUNCTION "public"."fn_corrigir_pagamento"(uuid, numeric, timestamp with time zone, text, uuid, text) SECURITY INVOKER;
