
-- Categorias de produtos
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias: select own empresa" ON public.categorias
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Categorias: insert own empresa" ON public.categorias
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Categorias: update own empresa" ON public.categorias
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id())
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Categorias: delete admin only" ON public.categorias
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  codigo TEXT NOT NULL DEFAULT '',
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'un',
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtos: select own empresa" ON public.produtos
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Produtos: insert own empresa" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND public.has_permission('editar_produto'));

CREATE POLICY "Produtos: update own empresa" ON public.produtos
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.has_permission('editar_produto'))
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Produtos: delete admin only" ON public.produtos
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Kits
CREATE TABLE public.kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kits: select own empresa" ON public.kits
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Kits: insert own empresa" ON public.kits
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_my_empresa_id() AND public.has_permission('editar_produto'));

CREATE POLICY "Kits: update own empresa" ON public.kits
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.has_permission('editar_produto'))
  WITH CHECK (empresa_id = public.get_my_empresa_id());

CREATE POLICY "Kits: delete admin only" ON public.kits
  FOR DELETE TO authenticated
  USING (empresa_id = public.get_my_empresa_id() AND public.is_admin());

-- Kit Itens
CREATE TABLE public.kit_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kit_id, produto_id)
);

ALTER TABLE public.kit_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kit itens: select via kit empresa" ON public.kit_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.empresa_id = public.get_my_empresa_id()));

CREATE POLICY "Kit itens: insert via kit empresa" ON public.kit_itens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.empresa_id = public.get_my_empresa_id()) AND public.has_permission('editar_produto'));

CREATE POLICY "Kit itens: update via kit empresa" ON public.kit_itens
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.empresa_id = public.get_my_empresa_id()) AND public.has_permission('editar_produto'));

CREATE POLICY "Kit itens: delete via kit empresa" ON public.kit_itens
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.empresa_id = public.get_my_empresa_id()) AND public.has_permission('editar_produto'));
