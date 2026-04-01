-- ========================================================
-- TABELA DE PREFERÊNCIAS INDIVIDUAIS DE USUÁRIO
-- ========================================================
-- Armazena layout do dashboard, cores e outras preferências visuais 
-- de forma isolada por usuário.

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  
  -- Configuração de Layout do Dashboard (Ordem, Visibilidade)
  -- Formato esperado: [ { id: "kpis", visible: true, order: 0 }, ... ]
  dashboard_layout jsonb DEFAULT '[]'::jsonb,
  
  -- Configuração Visual (Cores, Fontes, Gráficos)
  -- Formato esperado: { primary: "160 84% 39%", charts: ["#hex1", ...], ... }
  visual_config jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso: Cada usuário só vê e edita suas próprias preferências
CREATE POLICY "user_preferences: select own" ON public.user_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_preferences: insert own" ON public.user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_preferences: update own" ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.fn_update_user_preferences_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_preferences_updated
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.fn_update_user_preferences_timestamp();

-- Automar criação de preferências ao criar perfil (opcional, mas bom ter)
-- Já temos trg_on_auth_user_created para profiles. Vamos adicionar a criação da preferência lá.

CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS trigger AS $$
BEGIN
  -- Cria preferência padrão para o novo usuário
  INSERT INTO public.user_preferences (user_id, empresa_id)
  VALUES (NEW.user_id, NEW.empresa_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_user_preferences
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

-- Backfill: Criar preferências para usuários existentes que não tenham
INSERT INTO public.user_preferences (user_id, empresa_id)
SELECT user_id, empresa_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
