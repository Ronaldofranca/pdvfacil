-- Add missing columns to audit_logs
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS login text,
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Add missing column to cidades_atendidas
ALTER TABLE public.cidades_atendidas 
ADD COLUMN IF NOT EXISTS nome_normalizado text;

-- Add missing column to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS dashboard_layout jsonb DEFAULT '{}'::jsonb;

-- Ensure is_merged exists in clientes (it should, but just in case)
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS is_merged boolean DEFAULT false;

-- Create an index for nome_normalizado to improve search
CREATE INDEX IF NOT EXISTS idx_cidades_atendidas_nome_norm ON public.cidades_atendidas(nome_normalizado);
