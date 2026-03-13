
-- Schema changes first
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS vendedor_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS pix_chave text NOT NULL DEFAULT '';
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS pix_tipo text NOT NULL DEFAULT '';
