-- Script corretivo para administrador ver as vendas independentemente de RLS
-- O problema é a política RESTRICTIVE que eu mesmo criei.
-- A política "vendas_client_scope" diz: SE FOR CLIENTE VÊ SÓ A SUA, SE NÃO FOR CLIENTE VÊ TUDO.
-- Mas se você "herdou" a tag de cliente por engano, ela bloqueia sua vida.

-- 1. Remove sua role de 'cliente' caso você tenha ganho ela acidentalmente
DELETE FROM public.user_roles 
WHERE role = 'cliente' 
  AND user_id = (SELECT id FROM auth.users WHERE email = auth.email());

-- 2. Refaz a função is_cliente() para ser à prova de balas
-- Mesmo que a tag fique pendurada, se você for admin não pode ser tratado como cliente
CREATE OR REPLACE FUNCTION public.is_cliente()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ 
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'cliente'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'gerente')
  )
$$;

-- 3. Reconstrói o scope permissive (apenas para garantir)
DROP POLICY IF EXISTS "Vendas: select own empresa" ON public.vendas;
CREATE POLICY "Vendas: select own empresa" ON public.vendas 
FOR SELECT TO authenticated 
USING (
  empresa_id = public.get_my_empresa_id() 
  AND (
    public.is_admin() 
    OR public.is_gerente()
    OR vendedor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);
