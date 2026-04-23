-- Remove 'vendedor' role from users who have both 'cliente' and 'vendedor' roles
-- and verify they have an entry in the 'clientes' table (double safety)
DELETE FROM public.user_roles ur
WHERE role = 'vendedor'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id 
      AND ur2.role = 'cliente'
  )
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.user_id = ur.user_id
  );
