-- 1. Helper function para remover acentos e espaços, deixando em minúsculo
CREATE OR REPLACE FUNCTION public.fn_normalize_string(val text)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT regexp_replace(
    translate(lower(val), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
    '[^a-z0-9]', '', 'g'
  );
$$;

-- 2. Adicionar campos nas tabelas
ALTER TABLE public.cidades_atendidas
ADD COLUMN IF NOT EXISTS nome_normalizado TEXT;

UPDATE public.cidades_atendidas
SET nome_normalizado = public.fn_normalize_string(cidade)
WHERE nome_normalizado IS NULL;

-- Garante índice para pesquisas rápidas ao criar novas cidades
CREATE INDEX IF NOT EXISTS idx_cidades_normalizadas ON public.cidades_atendidas (empresa_id, nome_normalizado);

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS cidade_id UUID REFERENCES public.cidades_atendidas(id) ON DELETE SET NULL;

-- 3. Função para garantir que não criamos duplicatas in-line
CREATE OR REPLACE FUNCTION public.fn_criar_ou_obter_cidade(
  _empresa_id UUID,
  _nome_cidade TEXT,
  _estado TEXT DEFAULT ''
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cidade_id UUID;
  _nome_normalizado TEXT;
BEGIN
  _nome_normalizado := public.fn_normalize_string(_nome_cidade);

  -- Tentar encontrar cidade com mesmo nome normalizado para a empresa
  SELECT id INTO _cidade_id
  FROM public.cidades_atendidas
  WHERE empresa_id = _empresa_id AND nome_normalizado = _nome_normalizado AND ativa = true
  LIMIT 1;

  IF FOUND THEN
    RETURN _cidade_id;
  END IF;

  -- Se não achou, cria nova
  INSERT INTO public.cidades_atendidas (empresa_id, cidade, nome_normalizado, estado, ativa)
  VALUES (_empresa_id, _nome_cidade, _nome_normalizado, _estado, true)
  RETURNING id INTO _cidade_id;

  RETURN _cidade_id;
END;
$$;

-- 4. Função para atualizar cidades de clientes em lote mantendo compatibilidade
CREATE OR REPLACE FUNCTION public.fn_batch_update_clientes_cidades(
  _cambios jsonb,
  _user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_admin boolean;
  row record;
  _updated_count integer := 0;
BEGIN
  _is_admin := public.is_admin();

  -- Para cada elemento no JSON: [ { "id": "uuid do cliente", "cidade_id": "uuid_cidade", "cidade_nome": "texto literal" } ]  
  FOR row IN SELECT * FROM jsonb_to_recordset(_cambios) as x(id uuid, cidade_id uuid, cidade_nome text) LOOP
    IF _is_admin THEN
      UPDATE public.clientes
      SET 
        cidade_id = row.cidade_id,
        cidade = row.cidade_nome,
        updated_at = now()
      WHERE id = row.id AND empresa_id = public.get_my_empresa_id();
    ELSE
      -- Apenas para clientes do vendedor correspondente ao user logado
      UPDATE public.clientes
      SET 
        cidade_id = row.cidade_id,
        cidade = row.cidade_nome,
        updated_at = now()
      WHERE id = row.id 
        AND empresa_id = public.get_my_empresa_id() 
        AND vendedor_id = _user_id;
    END IF;
    
    IF FOUND THEN
      _updated_count := _updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated', _updated_count);
END;
$$;
