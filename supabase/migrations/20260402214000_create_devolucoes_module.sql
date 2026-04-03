-- Migration: Create Devolucoes Module
-- Description: Creates devolucoes, itens_devolucao and credito_clientes tables

CREATE TABLE IF NOT EXISTS public.devolucoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'concluida', -- 'rascunho', 'concluida', 'cancelada'
    data_devolucao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    motivo TEXT,
    observacoes TEXT,
    valor_total_devolvido NUMERIC(10, 2) NOT NULL DEFAULT 0,
    impacto_estoque_aplicado BOOLEAN DEFAULT false,
    impacto_financeiro_aplicado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_devolucoes_venda_id ON public.devolucoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_empresa_id ON public.devolucoes(empresa_id);

CREATE TABLE IF NOT EXISTS public.itens_devolucao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devolucao_id UUID NOT NULL REFERENCES public.devolucoes(id) ON DELETE CASCADE,
    item_venda_id UUID NOT NULL REFERENCES public.itens_venda(id) ON DELETE RESTRICT,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    quantidade NUMERIC(10, 3) NOT NULL,
    valor_unitario NUMERIC(10, 2) NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itens_devolucao_devolucao_id ON public.itens_devolucao(devolucao_id);

CREATE TABLE IF NOT EXISTS public.credito_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    devolucao_id UUID REFERENCES public.devolucoes(id) ON DELETE SET NULL,
    valor NUMERIC(10, 2) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'entrada', -- 'entrada', 'saida'
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_credito_clientes_cliente_id ON public.credito_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_credito_clientes_empresa_id ON public.credito_clientes(empresa_id);

-- RLS Policies For Devolucoes
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_devolucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credito_clientes ENABLE ROW LEVEL SECURITY;

-- Devolucoes RLS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'devolucoes' AND policyname = 'Usuários logados podem ver devoluções da sua empresa') THEN
        CREATE POLICY "Usuários logados podem ver devoluções da sua empresa" ON public.devolucoes FOR SELECT USING (empresa_id = (SELECT get_my_empresa_id()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'devolucoes' AND policyname = 'Usuários logados podem inserir devoluções') THEN
        CREATE POLICY "Usuários logados podem inserir devoluções" ON public.devolucoes FOR INSERT WITH CHECK (empresa_id = (SELECT get_my_empresa_id()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'devolucoes' AND policyname = 'Usuários logados podem atualizar devoluções da sua empresa') THEN
        CREATE POLICY "Usuários logados podem atualizar devoluções da sua empresa" ON public.devolucoes FOR UPDATE USING (empresa_id = (SELECT get_my_empresa_id()));
    END IF;
END $$;

-- Itens Devolução RLS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'itens_devolucao' AND policyname = 'Usuários logados podem ver itens_devolucao') THEN
        CREATE POLICY "Usuários logados podem ver itens_devolucao" ON public.itens_devolucao FOR SELECT USING (devolucao_id IN (SELECT id FROM devolucoes WHERE empresa_id = (SELECT get_my_empresa_id())));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'itens_devolucao' AND policyname = 'Usuários logados podem inserir itens_devolucao') THEN
        CREATE POLICY "Usuários logados podem inserir itens_devolucao" ON public.itens_devolucao FOR INSERT WITH CHECK (devolucao_id IN (SELECT id FROM devolucoes WHERE empresa_id = (SELECT get_my_empresa_id())));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'itens_devolucao' AND policyname = 'Usuários logados podem atualizar itens_devolucao') THEN
        CREATE POLICY "Usuários logados podem atualizar itens_devolucao" ON public.itens_devolucao FOR UPDATE USING (devolucao_id IN (SELECT id FROM devolucoes WHERE empresa_id = (SELECT get_my_empresa_id())));
    END IF;
END $$;

-- Credito Clientes RLS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credito_clientes' AND policyname = 'Usuários logados podem ver credito_clientes da sua empresa') THEN
        CREATE POLICY "Usuários logados podem ver credito_clientes da sua empresa" ON public.credito_clientes FOR SELECT USING (empresa_id = (SELECT get_my_empresa_id()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credito_clientes' AND policyname = 'Usuários logados podem inserir credito_clientes') THEN
        CREATE POLICY "Usuários logados podem inserir credito_clientes" ON public.credito_clientes FOR INSERT WITH CHECK (empresa_id = (SELECT get_my_empresa_id()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credito_clientes' AND policyname = 'Usuários logados podem atualizar credito_clientes') THEN
        CREATE POLICY "Usuários logados podem atualizar credito_clientes" ON public.credito_clientes FOR UPDATE USING (empresa_id = (SELECT get_my_empresa_id()));
    END IF;
END $$;
