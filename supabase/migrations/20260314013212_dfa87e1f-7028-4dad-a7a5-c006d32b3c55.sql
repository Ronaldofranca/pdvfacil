
-- Add kit_id and item_type to itens_venda for proper kit tracking
ALTER TABLE public.itens_venda ADD COLUMN kit_id uuid REFERENCES public.kits(id) ON DELETE SET NULL;
ALTER TABLE public.itens_venda ADD COLUMN item_type text NOT NULL DEFAULT 'produto';

-- Add kit_id to movimentos_estoque for kit traceability
ALTER TABLE public.movimentos_estoque ADD COLUMN kit_id uuid REFERENCES public.kits(id) ON DELETE SET NULL;

-- Update existing kit items (where nome_produto starts with 'Kit ') 
-- This is a best-effort retroactive fix
UPDATE public.itens_venda SET item_type = 'kit' WHERE nome_produto LIKE 'Kit %';
