-- Adicionar colunas de configuração de visibilidade no portal
ALTER TABLE public.configuracoes 
ADD COLUMN IF NOT EXISTS portal_mostrar_pagamentos BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS portal_mostrar_perfil BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS portal_mostrar_home BOOLEAN NOT NULL DEFAULT true;

-- Refinar RLS de pagamentos para permitir que clientes vejam seus próprios pagamentos
-- Atualmente existe a política "pagamentos_client_block" que é RESTRICTIVE e bloqueia tudo para is_cliente().
-- Vamos removê-la e substitui-la por uma que permite acesso aos seus próprios dados de parcela.

DROP POLICY IF EXISTS "pagamentos_client_block" ON public.pagamentos;

-- Nova política RESTRICTIVE para pagamentos: 
-- Se for cliente, só pode ver pagamentos vinculados a parcelas que pertencem a ele.
CREATE POLICY "pagamentos_client_scope" 
ON public.pagamentos 
AS RESTRICTIVE 
FOR SELECT 
TO authenticated 
USING (
  NOT public.is_cliente() 
  OR parcela_id IN (
    SELECT id FROM public.parcelas WHERE cliente_id = public.get_my_cliente_id()
  )
);
