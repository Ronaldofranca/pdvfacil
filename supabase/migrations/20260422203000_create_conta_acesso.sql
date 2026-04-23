-- Migration: Create conta_acesso table and auth integration

CREATE TABLE IF NOT EXISTS public.conta_acesso (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    login text NOT NULL UNIQUE,
    senha_hash text NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    ultimo_login timestamp with time zone,
    mfa_ativo boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conta_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e gerentes podem ver conta_acesso" ON public.conta_acesso
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'gerente')
        )
    );

CREATE POLICY "Clientes podem ver sua propria conta" ON public.conta_acesso
    FOR SELECT TO authenticated
    USING (
        cliente_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid())
    );

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar conta de acesso
CREATE OR REPLACE FUNCTION fn_criar_conta_acesso(
    p_cliente_id uuid,
    p_login text,
    p_senha text,
    p_ativo boolean DEFAULT true
) RETURNS json AS $$
DECLARE
    v_user_id uuid;
    v_dummy_email text := p_login || '_' || p_cliente_id || '@acesso.pdv.local';
    v_senha_hash text;
BEGIN
    -- Check if login exists
    IF EXISTS (SELECT 1 FROM public.conta_acesso WHERE login = p_login) THEN
        RETURN json_build_object('error', 'Login já está em uso.');
    END IF;

    -- Get existing user_id if any
    SELECT user_id INTO v_user_id FROM public.clientes WHERE id = p_cliente_id;

    v_senha_hash := crypt(p_senha, gen_salt('bf'));

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        -- Create user in auth.users
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_dummy_email, v_senha_hash,
            now(), '{"provider":"email","providers":["email"]}', '{"role":"cliente"}', now(), now()
        );

        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
        ) VALUES (
            gen_random_uuid(), v_user_id, format('{"sub":"%s","email":"%s"}', v_user_id::text, v_dummy_email)::jsonb, 'email', now(), now(), now(), v_user_id::text
        );

        -- Update cliente
        UPDATE public.clientes SET user_id = v_user_id WHERE id = p_cliente_id;

        -- Add user_role
        INSERT INTO public.user_roles (user_id, role, empresa_id)
        SELECT v_user_id, 'cliente', empresa_id FROM public.clientes WHERE id = p_cliente_id;
    ELSE
        -- Update password for existing auth.users
        UPDATE auth.users SET encrypted_password = v_senha_hash WHERE id = v_user_id;
    END IF;

    -- Create conta_acesso record
    INSERT INTO public.conta_acesso (cliente_id, login, senha_hash, ativo)
    VALUES (p_cliente_id, p_login, v_senha_hash, p_ativo);

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Atualizar conta de acesso
CREATE OR REPLACE FUNCTION fn_atualizar_conta_acesso(
    p_cliente_id uuid,
    p_login text,
    p_senha text,
    p_ativo boolean
) RETURNS json AS $$
DECLARE
    v_user_id uuid;
    v_senha_hash text;
BEGIN
    -- Check uniqueness if login changed
    IF EXISTS (SELECT 1 FROM public.conta_acesso WHERE login = p_login AND cliente_id != p_cliente_id) THEN
        RETURN json_build_object('error', 'Login já está em uso por outro cliente.');
    END IF;

    SELECT user_id INTO v_user_id FROM public.clientes WHERE id = p_cliente_id;

    IF p_senha IS NOT NULL AND p_senha != '' THEN
        v_senha_hash := crypt(p_senha, gen_salt('bf'));
        
        UPDATE public.conta_acesso 
        SET login = p_login, senha_hash = v_senha_hash, ativo = p_ativo 
        WHERE cliente_id = p_cliente_id;

        IF v_user_id IS NOT NULL THEN
            UPDATE auth.users SET encrypted_password = v_senha_hash WHERE id = v_user_id;
        END IF;
    ELSE
        UPDATE public.conta_acesso 
        SET login = p_login, ativo = p_ativo 
        WHERE cliente_id = p_cliente_id;
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retornar o email do cliente para login no Supabase Auth
CREATE OR REPLACE FUNCTION fn_portal_login_conta(
    p_login text
) RETURNS text AS $$
DECLARE
    v_cliente_id uuid;
    v_user_id uuid;
    v_email text;
BEGIN
    SELECT cliente_id INTO v_cliente_id FROM public.conta_acesso WHERE login = p_login AND ativo = true;
    IF v_cliente_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT user_id INTO v_user_id FROM public.clientes WHERE id = v_cliente_id;
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
