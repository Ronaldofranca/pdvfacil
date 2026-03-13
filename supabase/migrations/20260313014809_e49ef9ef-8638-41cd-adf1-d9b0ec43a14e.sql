-- Suporte a endereço completo por CEP sem quebrar compatibilidade
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS bairro text NOT NULL DEFAULT '';

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS uf text NOT NULL DEFAULT '';

-- Mantém campo legado `estado` coexistindo com `uf` durante transição
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clientes_uf_len_chk'
      AND conrelid = 'public.clientes'::regclass
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_uf_len_chk CHECK (char_length(uf) <= 2);
  END IF;
END
$$;