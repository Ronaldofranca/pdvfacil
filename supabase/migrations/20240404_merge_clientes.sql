-- Client Merging System - Database Schema and RPC

-- 1. Add tracking columns to 'clientes' table
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.clientes(id),
ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS merged_by UUID REFERENCES public.profiles(id);

-- 2. Create 'cliente_merges' audit table
CREATE TABLE IF NOT EXISTS public.cliente_merges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id),
    source_cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    source_cliente_name TEXT NOT NULL,
    target_cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    merged_by UUID NOT NULL REFERENCES public.profiles(id),
    merged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cliente_merges_empresa_id ON public.cliente_merges(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cliente_merges_target_id ON public.cliente_merges(target_cliente_id);

-- Enable RLS
ALTER TABLE public.cliente_merges ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for cliente_merges
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage client merges') THEN
        CREATE POLICY "Admins can manage client merges" ON public.cliente_merges
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND (profiles.cargo = 'admin' OR profiles.cargo = 'master')
                )
            );
    END IF;
END $$;

-- 4. RPC for Merge Preview
CREATE OR REPLACE FUNCTION public.fn_get_merge_preview(_cliente_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'vendas', (SELECT count(*) FROM vendas WHERE cliente_id = _cliente_id),
        'parcelas', (SELECT count(*) FROM parcelas WHERE cliente_id = _cliente_id),
        'pedidos', (SELECT count(*) FROM pedidos WHERE cliente_id = _cliente_id),
        'historico_compras', (SELECT count(*) FROM historico_compras WHERE cliente_id = _cliente_id),
        'historico_cobrancas', (SELECT count(*) FROM historico_cobrancas WHERE cliente_id = _cliente_id),
        'devolucoes', (SELECT count(*) FROM devolucoes WHERE cliente_id = _cliente_id),
        'creditos', (SELECT count(*) FROM credito_clientes WHERE cliente_id = _cliente_id),
        'enderecos', (SELECT count(*) FROM enderecos WHERE cliente_id = _cliente_id),
        'telefones', (SELECT count(*) FROM cliente_telefones WHERE cliente_id = _cliente_id),
        'indicacoes_feitas', (SELECT count(*) FROM indicacoes_clientes WHERE cliente_indicador_id = _cliente_id),
        'ledger_entries', (SELECT count(*) FROM financial_ledger WHERE cliente_id = _cliente_id)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 5. Main RPC for Client Merging
CREATE OR REPLACE FUNCTION public.fn_merge_clientes(
    _empresa_id UUID,
    _source_id UUID,
    _target_id UUID,
    _merged_by UUID,
    _reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _stats JSONB;
    _source_name TEXT;
    _source_user_id UUID;
    _target_user_id UUID;
BEGIN
    -- 1. Validations
    IF _source_id = _target_id THEN
        RAISE EXCEPTION 'O cliente de origem e destino não podem ser o mesmo.';
    END IF;

    -- Verify clients existence and company
    SELECT nome, user_id INTO _source_name, _source_user_id FROM clientes WHERE id = _source_id AND empresa_id = _empresa_id;
    IF _source_name IS NULL THEN
        RAISE EXCEPTION 'Cliente de origem não encontrado ou pertence a outra empresa.';
    END IF;

    SELECT user_id INTO _target_user_id FROM clientes WHERE id = _target_id AND empresa_id = _empresa_id;
    IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = _target_id AND empresa_id = _empresa_id) THEN
        RAISE EXCEPTION 'Cliente de destino não encontrado ou pertence a outra empresa.';
    END IF;

    -- 2. Gather stats for audit
    _stats := public.fn_get_merge_preview(_source_id);

    -- 3. Execute transfers
    UPDATE vendas SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE parcelas SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE pedidos SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE historico_compras SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE historico_cobrancas SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE uso_pontos SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE indicacoes_clientes SET cliente_indicado_id = _target_id WHERE cliente_indicado_id = _source_id;
    UPDATE indicacoes_clientes SET cliente_indicador_id = _target_id WHERE cliente_indicador_id = _source_id;
    UPDATE enderecos SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE cliente_telefones SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE devolucoes SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE credito_clientes SET cliente_id = _target_id WHERE cliente_id = _source_id;
    UPDATE financial_ledger SET cliente_id = _target_id WHERE cliente_id = _source_id;
    
    -- Handle self-references in clientes table (e.g. who prompted)
    UPDATE clientes SET cliente_indicador_id = _target_id WHERE cliente_indicador_id = _source_id;

    -- 4. Handle Portal User (User ID)
    -- If source has a user and target doesn't, migrate the user link
    IF _source_user_id IS NOT NULL AND _target_user_id IS NULL THEN
        UPDATE clientes SET user_id = _source_user_id WHERE id = _target_id;
    END IF;
    -- Clear source user id to avoid duplicates/conflicts
    UPDATE clientes SET user_id = NULL WHERE id = _source_id;

    -- 5. Mark source as merged
    UPDATE clientes 
    SET 
        is_merged = true, 
        ativo = false, 
        merged_into_id = _target_id,
        merged_at = now(),
        merged_by = _merged_by
    WHERE id = _source_id;

    -- 6. Record in audit table
    INSERT INTO cliente_merges (
        empresa_id, source_cliente_id, source_cliente_name, target_cliente_id, 
        merged_by, reason, details
    ) VALUES (
        _empresa_id, _source_id, _source_name, _target_id, 
        _merged_by, _reason, _stats
    );

    RETURN jsonb_build_object('success', true, 'stats', _stats);
END;
$$;
