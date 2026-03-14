
-- Add PIX receiver fields and portal config fields to configuracoes table
ALTER TABLE public.configuracoes 
  ADD COLUMN IF NOT EXISTS pix_nome_recebedor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_cidade_recebedor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS portal_titulo text NOT NULL DEFAULT 'Portal do Cliente',
  ADD COLUMN IF NOT EXISTS portal_mensagem_boas_vindas text NOT NULL DEFAULT 'Bem-vindo ao seu portal! Aqui você pode acompanhar seus pedidos, parcelas e histórico.',
  ADD COLUMN IF NOT EXISTS portal_rodape text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS portal_mostrar_pedidos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_mostrar_parcelas boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_mostrar_compras boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_mostrar_pix boolean NOT NULL DEFAULT true;
