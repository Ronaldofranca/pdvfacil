
-- Tipo de movimento
CREATE TYPE public.tipo_movimento AS ENUM ('venda', 'reposicao', 'dano', 'ajuste');

-- Estoque por vendedor
CREATE TABLE public.estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL,
  quantidade NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, produto_id, vendedor_id)
);

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estoque: select own empresa" ON public.estoque
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Estoque: insert own empresa" ON public.estoque
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Estoque: update own empresa" ON public.estoque
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Estoque: delete admin only" ON public.estoque
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Movimentos de estoque
CREATE TABLE public.movimentos_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL,
  tipo tipo_movimento NOT NULL,
  quantidade NUMERIC(12,2) NOT NULL,
  observacoes TEXT NOT NULL DEFAULT '',
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentos_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movimentos: select own empresa" ON public.movimentos_estoque
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Movimentos: insert own empresa" ON public.movimentos_estoque
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Movimentos: delete admin only" ON public.movimentos_estoque
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Trigger: atualizar estoque automaticamente ao inserir movimento
CREATE OR REPLACE FUNCTION public.fn_atualizar_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta NUMERIC;
BEGIN
  -- Calcular delta baseado no tipo
  IF NEW.tipo IN ('reposicao', 'ajuste') THEN
    delta := NEW.quantidade;
  ELSE
    delta := -1 * NEW.quantidade;
  END IF;

  -- Upsert no estoque
  INSERT INTO public.estoque (empresa_id, produto_id, vendedor_id, quantidade, updated_at)
  VALUES (NEW.empresa_id, NEW.produto_id, NEW.vendedor_id, delta, now())
  ON CONFLICT (empresa_id, produto_id, vendedor_id)
  DO UPDATE SET
    quantidade = public.estoque.quantidade + delta,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_atualizar_estoque
  AFTER INSERT ON public.movimentos_estoque
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_atualizar_estoque();
