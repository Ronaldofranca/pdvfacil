-- Criar tabela de representantes
CREATE TABLE public.representantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cor TEXT DEFAULT '#10b981',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alterar cidades_atendidas
ALTER TABLE public.cidades_atendidas
ADD COLUMN representante_id UUID REFERENCES public.representantes(id) ON DELETE SET NULL,
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC;

-- Políticas de RLS para Representantes
ALTER TABLE public.representantes ENABLE ROW LEVEL SECURITY;

-- Visitantes podem ver todos os representantes
CREATE POLICY "Representantes visíveis para visitantes" ON public.representantes
FOR SELECT USING (true);

-- Admin (de qualquer empresa) pode gerenciar
CREATE POLICY "Representantes: insert admin" ON public.representantes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "Representantes: update admin" ON public.representantes
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

CREATE POLICY "Representantes: delete admin" ON public.representantes
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin());

-- Políticas de RLS para Cidades (Atualizar permitindo leitura pública)
-- Drop existing select policy if it's restricted, or just add a new one for public reading
DROP POLICY IF EXISTS "Enable read access for all users" ON public.cidades_atendidas;
CREATE POLICY "Enable read access for all users" ON public.cidades_atendidas
FOR SELECT USING (true);
