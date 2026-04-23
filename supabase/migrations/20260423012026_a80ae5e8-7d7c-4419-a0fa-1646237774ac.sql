-- PDV Fácil - Comprehensive Security Hardening

-- 🛡️ 1. Set search_path for all remaining functions
ALTER FUNCTION "public"."fn_atualizar_limite_cliente"() SET search_path = public;
ALTER FUNCTION "public"."fn_normalize_string"(text) SET search_path = public;
ALTER FUNCTION "public"."fn_portal_login_conta"(text) SET search_path = public;
ALTER FUNCTION "public"."fn_atualizar_conta_acesso"(uuid, text, text, boolean) SET search_path = public;
ALTER FUNCTION "public"."fn_expandir_limite_comportamento"() SET search_path = public;
ALTER FUNCTION "public"."fn_criar_conta_acesso"(uuid, text, text, boolean) SET search_path = public;

-- 🛡️ 2. Secure Views
ALTER VIEW "public"."produtos_catalogo" SET (security_invoker = true);

-- 🛡️ 3. Storage Security (Fixing broad SELECT policy)
-- Note: Linter warned about public listing. We should make the policy more specific.
-- If the bucket is 'avatars', we usually only want people to see their own or public ones if intended.
-- For now, we'll keep it simple by ensuring listing isn't allowed if not needed.
-- However, since I don't see the exact policy name, I'll search for it first.
