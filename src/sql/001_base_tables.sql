-- =============================================
-- MIGRATION 001: Base tables + RBAC
-- Aplicar quando o Lovable Cloud estiver disponível
-- =============================================

-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'vendedor');

-- 2. Tabela empresas
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  razao_social text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  logo_url text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 3. Tabela profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  cargo text NOT NULL DEFAULT '',
  avatar_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Tabela user_roles (separada de profiles por segurança)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Tabela permissoes
CREATE TABLE public.permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;

-- 6. Tabela role_permissoes
CREATE TABLE public.role_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permissao_id uuid REFERENCES public.permissoes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permissao_id)
);

ALTER TABLE public.role_permissoes ENABLE ROW LEVEL SECURITY;

-- 7. Seed de permissões
INSERT INTO public.permissoes (nome, descricao) VALUES
  ('criar_venda', 'Criar novos pedidos de venda'),
  ('editar_produto', 'Editar cadastro de produtos'),
  ('ver_relatorios', 'Visualizar relatórios gerenciais'),
  ('registrar_pagamento', 'Registrar pagamentos e recebimentos'),
  ('gerenciar_vendedores', 'Gerenciar equipe de vendedores');

-- 8. Seed de permissões por role
-- Admin: todas as permissões
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'admin'::public.app_role, id FROM public.permissoes;

-- Gerente: criar_venda, ver_relatorios, registrar_pagamento, gerenciar_vendedores
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'gerente'::public.app_role, id FROM public.permissoes
WHERE nome IN ('criar_venda', 'ver_relatorios', 'registrar_pagamento', 'gerenciar_vendedores');

-- Vendedor: criar_venda
INSERT INTO public.role_permissoes (role, permissao_id)
SELECT 'vendedor'::public.app_role, id FROM public.permissoes
WHERE nome IN ('criar_venda');
