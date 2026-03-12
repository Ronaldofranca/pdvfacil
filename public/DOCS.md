# PDV Fácil — Documentação Técnica Completa

**Versão:** 3.0  
**Data:** 2026-03-12  
**Tipo:** SaaS Multi-Tenant de Gestão de Vendas Externas  
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase (Lovable Cloud)

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Módulos do Sistema](#3-módulos-do-sistema)
4. [Estrutura do Banco de Dados](#4-estrutura-do-banco-de-dados)
5. [Rotas da API](#5-rotas-da-api)
6. [Sistema de Autenticação](#6-sistema-de-autenticação)
7. [Funcionamento Offline](#7-funcionamento-offline)
8. [Sistema de Segurança](#8-sistema-de-segurança)
9. [Fluxos Principais](#9-fluxos-principais)
10. [Backup e Recuperação](#10-backup-e-recuperação)
11. [Deploy e Infraestrutura](#11-deploy-e-infraestrutura)
12. [Boas Práticas e Limitações](#12-boas-práticas-e-limitações)

---

## 1. Visão Geral do Sistema

### Descrição

O **PDV Fácil** é um sistema SaaS multi-tenant para gestão de vendas externas, projetado para equipes de vendedores que atuam em campo. O sistema opera como uma Progressive Web App (PWA) com suporte offline-first, permitindo que vendedores registrem vendas, consultem estoque e gerenciem clientes mesmo sem conexão à internet.

### Objetivo

Fornecer uma plataforma completa e segura para empresas que operam com vendas externas, englobando:

- Gestão de equipes de vendedores com controle de papéis e permissões
- Controle de estoque segmentado por vendedor
- Registro e acompanhamento de vendas com PDV mobile
- Parcelamento e controle financeiro completo
- Catálogo público online com vitrine configurável
- Relatórios gerenciais e inteligência de negócio
- Programa de fidelidade com indicações e níveis de recompensa

### Principais Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **PDV Mobile** | Ponto de venda otimizado para smartphones e tablets com suporte a descontos, brindes e múltiplas formas de pagamento |
| **Gestão de Clientes** | CRM com geolocalização, indicações, programa de fidelidade e histórico de compras |
| **Controle de Estoque** | Estoque por vendedor com movimentações automáticas e previsão inteligente |
| **Romaneio** | Controle de carregamento e retorno de mercadorias por vendedor |
| **Financeiro** | Parcelamento automático, registro de pagamentos e controle de inadimplência |
| **Catálogo Online** | Vitrine pública configurável para WhatsApp e redes sociais |
| **Inteligência** | Previsão de estoque, alertas automáticos, metas e comissões por vendedor |
| **Multi-Tenant** | Isolamento completo de dados por empresa via RLS em todas as tabelas |
| **Offline-First** | Operação completa sem internet com fila de sincronização FIFO |
| **RBAC** | Controle de acesso granular baseado em papéis (Admin, Gerente, Vendedor) |
| **Auditoria** | Log completo de todas as alterações em dados sensíveis |

---

## 2. Arquitetura do Sistema

### Arquitetura Geral

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENTE (PWA)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  React   │  │ Tailwind │  │  Vite    │  │ Service │ │
│  │   18     │  │   CSS    │  │  Build   │  │ Worker  │ │
│  └────┬─────┘  └──────────┘  └──────────┘  └────┬────┘ │
│       │                                          │      │
│  ┌────┴──────────────────────────────────────────┴────┐ │
│  │              IndexedDB (Offline Storage)           │ │
│  │  ┌────────────┐  ┌────────┐  ┌──────────────────┐ │ │
│  │  │ sync_queue │  │ cache  │  │      meta        │ │ │
│  │  └────────────┘  └────────┘  └──────────────────┘ │ │
│  └───────────────────────┬───────────────────────────┘ │
└──────────────────────────┼─────────────────────────────┘
                           │ HTTPS (JWT Bearer)
┌──────────────────────────┼─────────────────────────────┐
│              LOVABLE CLOUD (Supabase)                   │
│  ┌───────────────┐  ┌────┴────────┐  ┌──────────────┐ │
│  │  Auth (JWT)   │  │  PostgREST  │  │ Edge Funcs   │ │
│  │  + GoTrue     │  │    API      │  │  (Deno)      │ │
│  └───────┬───────┘  └──────┬──────┘  └──────┬───────┘ │
│          │                 │                 │         │
│  ┌───────┴─────────────────┴─────────────────┴───────┐ │
│  │              PostgreSQL 15                         │ │
│  │  ┌─────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐ │ │
│  │  │ RLS │ │Triggers │ │Functions │ │  Views     │ │ │
│  │  └─────┘ └─────────┘ └──────────┘ └────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │              Storage (S3-compatible)               │ │
│  │  └── Bucket: catalogo (público)                   │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Componentes Principais

#### Frontend (PWA)
- **Framework:** React 18 com TypeScript
- **Build:** Vite 5 com HMR
- **Estilização:** Tailwind CSS + shadcn/ui (design system com tokens semânticos)
- **Roteamento:** React Router v6
- **Estado servidor:** TanStack Query (React Query) para cache, invalidação e sincronização
- **Offline:** IndexedDB via `idb` + Service Worker via `vite-plugin-pwa` (Workbox)
- **Formulários:** React Hook Form + Zod para validação de schema
- **Gráficos:** Recharts para dashboards e relatórios

#### Backend (Lovable Cloud / Supabase)
- **API:** PostgREST (REST auto-gerado a partir do schema PostgreSQL)
- **Auth:** GoTrue (JWT + refresh tokens + bcrypt)
- **Banco:** PostgreSQL 15 com RLS (Row-Level Security) em todas as tabelas
- **Edge Functions:** Deno runtime para lógica server-side (convites, verificações)
- **Storage:** S3-compatible para imagens do catálogo, isolado por `empresa_id`

#### PWA
- **Service Worker:** Workbox (via vite-plugin-pwa)
- **Manifest:** Ícones 192px e 512px
- **Caching:** Precache de assets estáticos; chamadas de API **não** são cacheadas
- **Instalável:** Suporte a instalação como app nativo em dispositivos móveis

---

## 3. Módulos do Sistema

### 3.1 Autenticação (`AuthContext`)
**Responsabilidade:** Gerenciar sessão do usuário, tokens JWT, refresh automático, roles e permissões.

- Login com email/senha via Supabase Auth (GoTrue)
- Carregamento sequencial: profile → roles → permissões ao iniciar sessão
- Timeout de segurança configurável (padrão: 8h) com aviso 2 min antes
- Limpeza completa de caches no logout (IndexedDB, Service Worker, React Query)
- Log de eventos de segurança (login, logout, timeout) na tabela `security_logs`
- Proteção contra race conditions com `fetchSeqRef` e `loadedUserIdRef`
- Fallback com timeout (10s init, 8s user data) para evitar tela branca

### 3.2 Usuários (`useUsuarios`)
**Responsabilidade:** CRUD de usuários do sistema com gestão de papéis.

- Visualização de profiles da mesma empresa (isolado por RLS)
- Convite de novos usuários via Edge Function `invite-user`
- Atribuição de roles: Admin, Gerente, Vendedor
- Ativação/desativação de contas
- Acesso restrito a administradores

### 3.3 Empresas (`useEmpresas`)
**Responsabilidade:** Gerenciamento multi-tenant.

- Cadastro de empresa com CNPJ único, razão social, contato, endereço
- Upload de logo via storage
- Apenas admins podem criar/editar empresas
- Cada usuário pertence a exatamente uma empresa

### 3.4 Clientes (`useClientes`)
**Responsabilidade:** CRM completo com programa de fidelidade e indicações.

- CRUD com validação Zod (nome, email, CPF/CNPJ, endereço)
- Tipos: Pessoa Física (PF) e Pessoa Jurídica (PJ)
- Geolocalização (latitude/longitude) para mapa de clientes
- Sistema de indicações: cliente pode indicar novos clientes
- Programa de pontos: acumula por indicação e compra de indicados (trigger automático)
- Níveis de recompensa: Bronze, Prata, Ouro, VIP (configurável por empresa)
- Campos automatizados: `pontos_indicacao`, `total_indicacoes`, `total_compras`
- Prevenção de auto-indicação (validação no frontend e trigger no banco)
- Histórico de compras vinculado

### 3.5 Produtos (`useProdutos`)
**Responsabilidade:** Catálogo de produtos com controle de custo protegido.

- CRUD com validação Zod (nome, código, preço, custo, unidade)
- Upload de múltiplas imagens (`produto_imagens`)
- Categorização por `categorias`
- Flags de destaque: destaque, mais vendido, lançamento, promoção
- SEO: título, descrição, slug para catálogo público
- **Custo protegido:** campo `custo` nunca exposto em APIs públicas (view `produtos_catalogo`)
- Requer permissão `editar_produto` para INSERT/UPDATE

### 3.6 Categorias (`useCategorias`)
**Responsabilidade:** Organização hierárquica de produtos.

- CRUD simples com nome e descrição
- Visível publicamente para o catálogo (RLS `anon` permite read de categorias ativas)
- Deleção restrita a admins

### 3.7 Kits (`useKits`)
**Responsabilidade:** Agrupamento de produtos em combos/kits.

- Composição: lista de produtos com quantidades (`kit_itens`)
- Preço independente do somatório dos itens
- Requer permissão `editar_produto` para gerenciamento
- Deleção restrita a admins

### 3.8 Estoque (`useEstoque`)
**Responsabilidade:** Controle de estoque segmentado por vendedor.

- Saldo por produto por vendedor (unique: empresa_id, produto_id, vendedor_id)
- Atualização automática via trigger `fn_atualizar_estoque`
- Tipos de movimento: venda (saída), reposição (entrada), dano (saída), ajuste (entrada)
- Upsert automático: cria registro se não existe, atualiza se existe

### 3.9 Movimentos de Estoque
**Responsabilidade:** Registro imutável de todas as movimentações.

- Insert-only (sem UPDATE/DELETE para preservar trilha de auditoria)
- Cada inserção dispara trigger que atualiza o saldo no `estoque`
- Vinculação com venda (observações com ID da venda)
- Filtros por vendedor e produto

### 3.10 Vendas (`useVendas`)
**Responsabilidade:** Registro e gestão completa de vendas.

- Fluxo: criação → itens → pagamentos → finalização
- Status: rascunho, pendente, aprovada, finalizada, cancelada
- Validação com Zod: mínimo 1 item, mínimo 1 pagamento, UUIDs válidos
- Triggers automáticos ao finalizar:
  - `fn_sync_venda_total`: atualiza total da venda ao inserir/remover itens
  - `fn_award_referral_points`: credita pontos ao indicador
  - `fn_audit_log`: registra alteração para auditoria
- Cancelamento disponível sem exclusão física

### 3.11 Itens de Venda
**Responsabilidade:** Detalhamento dos produtos em cada venda.

- RLS via JOIN com vendas (isolamento implícito por empresa)
- Campos: produto, quantidade, preço original/vendido, desconto, bônus, subtotal
- Snapshot do nome do produto para preservar histórico

### 3.12 Parcelas (`useParcelas`)
**Responsabilidade:** Parcelamento de vendas e contas a receber.

- Geração automática de N parcelas com cálculo proporcional
- Distribuição do resto centavos na primeira parcela
- Status automático via trigger `fn_parcela_status`:
  - `valor_pago >= valor_total` → status: **paga**
  - `vencimento < hoje AND status = pendente` → status: **vencida**
- Cálculo de saldo via trigger `fn_compute_saldo`: `saldo = valor_total - valor_pago`
- Filtros: por venda, por cliente, por status

### 3.13 Pagamentos
**Responsabilidade:** Registro de pagamentos contra parcelas.

- Validação via trigger `fn_validar_pagamento`:
  - Impede pagamento que exceda o valor da parcela (com tolerância de 0.1%)
  - Impede valores negativos ou zero
- Atualização automática do `valor_pago` na parcela via trigger `fn_atualizar_parcela_pagamento`
- Requer permissão `registrar_pagamento` (admin e gerente)
- Imutável (sem UPDATE para preservar trilha financeira)

### 3.14 Romaneios (`useRomaneios`)
**Responsabilidade:** Controle de carregamento de vendedores.

- Registro de saída e retorno de mercadorias
- Associação com vendas realizadas em rota (`romaneio_vendas`)
- Status: aberto → em_rota → finalizado
- Valor total calculado

### 3.15 Relatórios (`useRelatorios`)
**Responsabilidade:** Relatórios gerenciais e operacionais.

- Vendas por período, vendedor, cliente
- Estoque atual e movimentações
- Financeiro: recebido vs a receber
- Ranking de clientes por pontos/indicações
- Exportação de relatórios
- Requer permissão `ver_relatorios` (admin e gerente)

### 3.16 Dashboard (`useDashboard`)
**Responsabilidade:** Visão consolidada do negócio.

- KPIs: vendas do mês, ticket médio, meta atingida
- Top 10 clientes indicadores
- Distribuição de clientes por nível de fidelidade
- Alertas pendentes
- Gráficos de tendência com Recharts

### 3.17 Catálogo Online (`useCatalogo`)
**Responsabilidade:** Vitrine pública de produtos sem autenticação.

- Acesso anônimo via view `produtos_catalogo` (Security Definer)
- **Não expõe preço de custo** — campo excluído na view
- Configuração visual: cores, tipografia, banner, seções (destaque, categorias, testemunhos, CTA)
- Integração WhatsApp: botão com mensagem pré-formatada por produto
- SEO: meta tags configuráveis por produto e página
- Testemunhos de clientes (`testemunhos`)
- Rotas públicas: `/catalogo`, `/catalogo/:id`, `/catalogo/testemunhos`

### 3.18 Configurações (`useConfiguracoes`)
**Responsabilidade:** Parametrização centralizada do sistema por empresa.

- **PDV:** permitir desconto, alterar preço, venda sem estoque, brinde
- **Financeiro:** parcelas máximas, intervalo entre parcelas, juros
- **Equipe:** comissão padrão (%), meta mensal padrão
- **Fidelidade:** pontos por indicação, valor mínimo de indicação
- **Segurança:** expiração de sessão (horas), máximo de tentativas de login
- **Alertas:** estoque baixo, cliente inativo, parcelas vencidas, meta vendedor
- **Catálogo:** catálogo público ativo/inativo
- Restrito a administradores (RLS + ProtectedRoute)

### 3.19 Audit Logs (`useAuditLogs`)
**Responsabilidade:** Registro de todas as alterações em dados.

- Trigger `fn_audit_log` aplicado a tabelas críticas
- Registra: ação (INSERT/UPDATE/DELETE), dados antes/depois, usuário, tabela, registro_id, timestamp
- Apenas admins podem visualizar
- Imutável (sem UPDATE/DELETE permitidos via RLS)

### 3.20 Notificações (`useNotificacoes`)
**Responsabilidade:** Centro de notificações por usuário.

- Tipos: info, warning, success, error
- Isoladas por `usuario_id` E `empresa_id` (RLS duplo)
- Marcar como lida, excluir
- Notificações automáticas geradas por verificação de consistência

### 3.21 Sincronização Offline (`OfflineContext`)
**Responsabilidade:** Sincronização de dados entre dispositivo e servidor.

- Fila FIFO com retry automático (máx. 3 tentativas)
- Auto-sync a cada 30 segundos quando online e com pendências
- Feedback visual: contagem de pendentes, erros, último sync
- Identificação de dispositivo via UUID persistente

### 3.22 Inteligência de Vendas
**Responsabilidade:** Módulos avançados de análise e previsão.

- **Mapa de Clientes** (`/mapa-clientes`): Geolocalização para planejamento de rotas
- **Metas e Comissões** (`/metas`): Metas por vendedor/mês com % de comissão
- **Previsão de Estoque** (`/previsao-estoque`): Análise de tendência para necessidades futuras
- **Alertas Inteligentes** (`/alertas`): Monitoramento automático (estoque, inadimplência, inatividade)

---

## 4. Estrutura do Banco de Dados

### Diagrama ERD

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   empresas   │◄────│   profiles   │────►│  auth.users  │
│   (tenant)   │     │  (user_id)   │     │  (Supabase)  │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │                    │
       │             ┌──────┴───────┐     ┌──────────────┐
       │             │  user_roles  │     │  permissoes  │
       │             │  (user_id,   │     │  (nome)      │
       │             │   empresa_id,│     └──────┬───────┘
       │             │   role)      │            │
       │             └──────────────┘     ┌──────┴───────┐
       │                                  │role_permissoes│
       │                                  │(role,empresa) │
       │                                  └──────────────┘
       │
       ├──────────────────────────────────────────────────┐
       │                                                  │
┌──────┴───────┐     ┌──────────────┐          ┌──────────┴──────┐
│   clientes   │◄────│  indicacoes  │          │   produtos      │
│              │     │  _clientes   │          │                 │
│ pontos_ind.  │     └──────────────┘          └────────┬────────┘
│ total_compras│                                        │
│ total_indic. │     ┌──────────────┐          ┌────────┴────────┐
└──────┬───────┘     │  categorias  │◄─────────│ produto_imagens │
       │             └──────────────┘          └─────────────────┘
       │
       │             ┌──────────────┐          ┌─────────────────┐
       ├────────────►│    vendas    │─────────►│   itens_venda   │
       │             │ (vendedor_id,│          │ (venda_id,      │
       │             │  cliente_id) │          │  produto_id)    │
       │             └──────┬───────┘          └─────────────────┘
       │                    │
       │             ┌──────┴───────┐          ┌─────────────────┐
       ├────────────►│   parcelas   │◄─────────│   pagamentos    │
       │             │ (venda_id,   │          │ (parcela_id)    │
       │             │  cliente_id) │          └─────────────────┘
       │             └──────────────┘
       │
       │             ┌──────────────┐          ┌─────────────────┐
       │             │   estoque    │          │   movimentos    │
       │             │ (produto_id, │          │   _estoque      │
       │             │  vendedor_id)│          │ (produto_id)    │
       │             └──────────────┘          └─────────────────┘
       │
       │             ┌──────────────┐          ┌─────────────────┐
       │             │  romaneios   │─────────►│ romaneio_vendas │
       │             │(vendedor_id) │          │ (romaneio_id)   │
       │             └──────────────┘          └─────────────────┘
       │
       ├──────┬──────────┬──────────┬──────────┬──────────┐
       │      │          │          │          │          │
┌──────┴──┐┌──┴───┐┌─────┴──┐┌─────┴──┐┌──────┴──┐┌─────┴─────┐
│audit_log││secur.││devices ││config. ││notific. ││uso_pontos │
│         ││_logs ││        ││        ││         ││           │
└─────────┘└──────┘└────────┘└────────┘└─────────┘└───────────┘

Tabelas auxiliares:
┌──────────┐ ┌────────────┐ ┌───────────┐ ┌──────────────┐
│  kits    │ │ kit_itens  │ │testemunhos│ │catalogo_conf.│
└──────────┘ └────────────┘ └───────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐ ┌────────────────────┐
│  enderecos   │ │formas_pagam. │ │ cidades_atendidas  │
└──────────────┘ └──────────────┘ └────────────────────┘
┌──────────────┐ ┌──────────────┐ ┌────────────────────┐
│metas_vendedor│ │niveis_recomp.│ │ historico_compras  │
└──────────────┘ └──────────────┘ └────────────────────┘
┌──────────────┐
│  sync_queue  │
└──────────────┘
```

### Tabelas Detalhadas

#### `empresas` — Entidade raiz multi-tenant
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| nome | text | N | — | Nome fantasia |
| cnpj | text | N | — | CNPJ (unique) |
| razao_social | text | N | '' | Razão social |
| telefone | text | N | '' | Telefone |
| email | text | N | '' | Email corporativo |
| endereco | text | N | '' | Endereço |
| logo_url | text | S | null | URL do logo |
| ativa | boolean | N | true | Empresa ativa |
| created_at | timestamptz | N | now() | Criação |
| updated_at | timestamptz | N | now() | Atualização |

#### `profiles` — Dados de perfil do usuário
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| user_id | uuid | N | — | FK auth.users (unique) |
| empresa_id | uuid | N | — | FK empresas |
| nome | text | N | — | Nome completo |
| email | text | N | — | Email |
| telefone | text | N | '' | Telefone |
| cargo | text | N | '' | Cargo |
| avatar_url | text | S | null | URL do avatar |
| ativo | boolean | N | true | Ativo |
| created_at | timestamptz | N | now() | Criação |
| updated_at | timestamptz | N | now() | Atualização |

#### `user_roles` — Papéis do usuário (separado de profiles por segurança)
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| user_id | uuid | N | — | FK auth.users |
| empresa_id | uuid | N | — | FK empresas |
| role | app_role | N | — | admin / gerente / vendedor |
| created_at | timestamptz | N | now() | Criação |

**Constraint:** UNIQUE (user_id, empresa_id, role)

#### `clientes` — CRM completo
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| empresa_id | uuid | N | — | FK empresas |
| nome | text | N | — | Nome |
| cpf_cnpj | text | N | '' | CPF ou CNPJ |
| tipo | text | N | 'pf' | pf / pj |
| telefone | text | N | '' | Telefone |
| email | text | N | '' | Email |
| rua | text | N | '' | Rua |
| cidade | text | N | '' | Cidade |
| estado | text | N | '' | UF (2 caracteres) |
| cep | text | N | '' | CEP |
| latitude | float8 | S | null | GPS |
| longitude | float8 | S | null | GPS |
| observacoes | text | N | '' | Notas |
| ativo | boolean | N | true | Ativo |
| pontos_indicacao | numeric | N | 0 | Pontos acumulados via indicações |
| total_indicacoes | integer | N | 0 | Quantos clientes indicou |
| total_compras | integer | N | 0 | Compras como indicado |
| cliente_indicador_id | uuid | S | null | FK clientes (quem indicou) |
| created_at | timestamptz | N | now() | Criação |
| updated_at | timestamptz | N | now() | Atualização |

#### `produtos` — Catálogo com custo protegido
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| empresa_id | uuid | N | — | FK empresas |
| nome | text | N | — | Nome |
| descricao | text | N | '' | Descrição |
| codigo | text | N | '' | Código interno |
| categoria_id | uuid | S | null | FK categorias |
| preco | numeric | N | 0 | Preço de venda |
| custo | numeric | N | 0 | **Custo (protegido, nunca exposto em API pública)** |
| unidade | text | N | 'un' | Unidade de medida |
| imagem_url | text | S | null | Imagem principal |
| ativo | boolean | N | true | Ativo |
| destaque | boolean | N | false | Destaque no catálogo |
| mais_vendido | boolean | N | false | Flag mais vendido |
| lancamento | boolean | N | false | Lançamento |
| promocao | boolean | N | false | Em promoção |
| slug | text | N | '' | Slug para URL do catálogo |
| seo_titulo | text | N | '' | Título para SEO |
| seo_descricao | text | N | '' | Descrição para SEO |
| beneficios | jsonb | N | '[]' | Lista de benefícios |
| whatsapp_texto | text | N | '' | Texto pré-formatado para WhatsApp |
| created_at | timestamptz | N | now() | Criação |
| updated_at | timestamptz | N | now() | Atualização |

#### `vendas` — Registro de vendas
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| empresa_id | uuid | N | — | FK empresas |
| cliente_id | uuid | S | null | FK clientes |
| vendedor_id | uuid | N | — | ID do vendedor |
| data_venda | timestamptz | N | now() | Data da venda |
| status | status_venda | N | 'rascunho' | Status |
| subtotal | numeric | N | 0 | Subtotal bruto |
| desconto_total | numeric | N | 0 | Desconto total |
| total | numeric | N | 0 | Total final |
| pagamentos | jsonb | N | '[]' | Formas de pagamento |
| observacoes | text | N | '' | Observações |
| created_at | timestamptz | N | now() | Criação |
| updated_at | timestamptz | N | now() | Atualização |

**Enum `status_venda`:** rascunho, pendente, aprovada, finalizada, cancelada

#### `itens_venda` — Itens de cada venda
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| venda_id | uuid | N | — | FK vendas |
| produto_id | uuid | N | — | FK produtos |
| nome_produto | text | N | — | Snapshot do nome |
| quantidade | numeric | N | 1 | Quantidade |
| preco_original | numeric | N | 0 | Preço de tabela |
| preco_vendido | numeric | N | 0 | Preço praticado |
| desconto | numeric | N | 0 | Desconto aplicado |
| bonus | boolean | N | false | É brinde? |
| subtotal | numeric | N | 0 | Subtotal do item |
| created_at | timestamptz | N | now() | Criação |

#### `parcelas` — Contas a receber
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| empresa_id | uuid | N | — | FK empresas |
| venda_id | uuid | S | null | FK vendas |
| cliente_id | uuid | S | null | FK clientes |
| numero | integer | N | 1 | Número da parcela |
| valor_total | numeric | N | 0 | Valor da parcela |
| valor_pago | numeric | N | 0 | Total pago |
| saldo | numeric | S | computed | Saldo restante (trigger) |
| vencimento | date | N | — | Data de vencimento |
| status | status_parcela | N | 'pendente' | Status |
| forma_pagamento | text | N | '' | Forma |
| data_pagamento | timestamptz | S | null | Data do pagamento |
| observacoes | text | N | '' | Notas |
| created_at | timestamptz | N | now() | Criação |
| updated_at | timestamptz | N | now() | Atualização |

**Enum `status_parcela`:** pendente, paga, vencida

#### `pagamentos` — Registros financeiros
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| empresa_id | uuid | N | — | FK empresas |
| parcela_id | uuid | N | — | FK parcelas |
| valor_pago | numeric | N | — | Valor pago |
| forma_pagamento | text | N | '' | Forma |
| usuario_id | uuid | N | — | Quem registrou |
| data_pagamento | timestamptz | N | now() | Data |
| observacoes | text | N | '' | Notas |
| created_at | timestamptz | N | now() | Criação |

#### `estoque` — Saldo por vendedor
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| empresa_id | uuid | N | — | FK empresas |
| produto_id | uuid | N | — | FK produtos |
| vendedor_id | uuid | N | — | ID vendedor |
| quantidade | numeric | N | 0 | Saldo atual |
| updated_at | timestamptz | N | now() | Última atualização |

**Unique:** (empresa_id, produto_id, vendedor_id)

#### `movimentos_estoque` — Histórico de movimentações
| Campo | Tipo | Nulo | Default | Descrição |
|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK |
| empresa_id | uuid | N | — | FK empresas |
| produto_id | uuid | N | — | FK produtos |
| vendedor_id | uuid | N | — | Vendedor |
| tipo | tipo_movimento | N | — | Tipo |
| quantidade | numeric | N | — | Quantidade |
| data | timestamptz | N | now() | Data |
| observacoes | text | N | '' | Notas |
| created_at | timestamptz | N | now() | Criação |

**Enum `tipo_movimento`:** venda, reposicao, dano, ajuste

#### Demais Tabelas

| Tabela | Descrição | RLS Principal |
|---|---|---|
| `categorias` | Categorias de produtos | empresa_id + anon read (ativas) |
| `kits` | Kits/combos | empresa_id + `editar_produto` |
| `kit_itens` | Itens dos kits | via JOIN com kits |
| `romaneios` | Carregamentos | empresa_id |
| `romaneio_vendas` | Vendas por romaneio | via JOIN com romaneios |
| `niveis_recompensa` | Níveis de fidelidade | empresa_id (admin) |
| `indicacoes_clientes` | Registro de indicações | empresa_id |
| `uso_pontos` | Uso de pontos | empresa_id |
| `historico_compras` | Histórico de compras | empresa_id |
| `notificacoes` | Notificações | usuario_id + empresa_id |
| `audit_logs` | Logs de auditoria | empresa_id (admin read-only) |
| `security_logs` | Logs de segurança | empresa_id |
| `devices` | Dispositivos registrados | usuario_id |
| `sync_queue` | Fila de sincronização | empresa_id |
| `configuracoes` | Config por empresa | empresa_id (admin) |
| `catalogo_config` | Config do catálogo | empresa_id (admin) |
| `produto_imagens` | Imagens de produtos | empresa_id + anon read |
| `testemunhos` | Depoimentos | empresa_id |
| `enderecos` | Endereços de clientes | empresa_id |
| `formas_pagamento` | Formas de pagamento | empresa_id (admin) |
| `cidades_atendidas` | Cidades de atuação | empresa_id (admin/gerente) |
| `metas_vendedor` | Metas por vendedor | empresa_id + owner read |

### View: `produtos_catalogo`

View **Security Definer** (executa como owner, bypassa RLS) que expõe produtos ativos **excluindo o campo `custo`** para acesso anônimo no catálogo público. A policy `USING(false)` na tabela base `produtos` bloqueia acesso direto de anon.

---

## 5. Rotas da API

### 5.1 API REST (PostgREST — auto-gerada)

Todas as operações CRUD são feitas via Supabase Client SDK, que traduz para chamadas REST ao PostgREST. O RLS no PostgreSQL garante isolamento e autorização.

#### Clientes

| Método | Operação | Permissão | Descrição |
|---|---|---|---|
| GET | `supabase.from('clientes').select('*')` | Authenticated (empresa_id) | Lista clientes da empresa |
| POST | `supabase.from('clientes').insert({...})` | Authenticated (empresa_id) | Cria cliente |
| PATCH | `supabase.from('clientes').update({...}).eq('id', id)` | Authenticated (empresa_id) | Atualiza cliente |
| DELETE | `supabase.from('clientes').delete().eq('id', id)` | Admin only | Remove cliente |

**Exemplo de Request (criar cliente):**
```typescript
const { data, error } = await supabase.from('clientes').insert({
  empresa_id: 'uuid-da-empresa',
  nome: 'Maria Silva',
  telefone: '11999887766',
  email: 'maria@email.com',
  tipo: 'pf',
  cpf_cnpj: '123.456.789-00',
  cidade: 'São Paulo',
  estado: 'SP'
}).select().single();
```

**Exemplo de Response (sucesso):**
```json
{
  "id": "a1b2c3d4-...",
  "empresa_id": "uuid-da-empresa",
  "nome": "Maria Silva",
  "telefone": "11999887766",
  "email": "maria@email.com",
  "tipo": "pf",
  "pontos_indicacao": 0,
  "total_indicacoes": 0,
  "total_compras": 0,
  "ativo": true,
  "created_at": "2026-03-12T19:00:00Z"
}
```

#### Produtos

| Método | Operação | Permissão |
|---|---|---|
| GET | `from('produtos').select('*, categorias(nome)')` | Authenticated (empresa_id) |
| GET | `from('produtos_catalogo').select('*')` | Anon (público, sem custo) |
| POST | `from('produtos').insert({...})` | `editar_produto` |
| PATCH | `from('produtos').update({...}).eq('id', id)` | `editar_produto` |
| DELETE | `from('produtos').delete().eq('id', id)` | Admin only |

#### Vendas

| Método | Operação | Permissão |
|---|---|---|
| GET | `from('vendas').select('*, clientes(nome)')` | Authenticated (empresa_id) |
| POST | `from('vendas').insert({...})` | Authenticated (empresa_id) |
| PATCH | `from('vendas').update({status}).eq('id', id)` | Authenticated (empresa_id) |
| POST | `from('itens_venda').insert([...])` | Via venda (empresa_id) |

**Exemplo de Request (finalizar venda com validação Zod):**
```typescript
const input = {
  empresa_id: 'uuid',
  vendedor_id: 'uuid',
  cliente_id: 'uuid-cliente',
  itens: [{
    produto_id: 'uuid-produto',
    nome: 'Produto A',
    quantidade: 2,
    preco_original: 50.00,
    preco_vendido: 45.00,
    desconto: 10.00,
    bonus: false,
    subtotal: 90.00
  }],
  pagamentos: [{ forma: 'Dinheiro', valor: 90.00 }],
  desconto_total: 10.00
};
const venda = await finalizarVenda(input);
```

#### Parcelas e Pagamentos

| Método | Operação | Permissão |
|---|---|---|
| GET | `from('parcelas').select('*, clientes(nome)')` | Authenticated (empresa_id) |
| POST | `from('parcelas').insert([...])` | Authenticated (empresa_id) |
| POST | `from('pagamentos').insert({...})` | `registrar_pagamento` |

**Exemplo de Request (registrar pagamento):**
```typescript
const { data, error } = await supabase.from('pagamentos').insert({
  empresa_id: 'uuid',
  parcela_id: 'uuid-parcela',
  valor_pago: 150.00,
  forma_pagamento: 'PIX',
  usuario_id: 'uuid-usuario',
  observacoes: 'Pagamento via PIX'
}).select().single();
```

**Response de erro (pagamento excedente — trigger):**
```json
{
  "code": "P0001",
  "message": "Pagamento excede o valor da parcela. Valor restante: R$ 50.00"
}
```

#### Estoque

| Método | Operação | Permissão |
|---|---|---|
| GET | `from('estoque').select('*, produtos(nome, codigo)')` | Authenticated (empresa_id) |
| POST | `from('movimentos_estoque').insert({...})` | Authenticated (empresa_id) |

### 5.2 Edge Functions

#### `POST /functions/v1/invite-user`

Convida novo usuário para a empresa via email.

**Autenticação:** JWT + Admin role (verificado via `getClaims()` + `is_admin()`)  
**Headers:** `Authorization: Bearer <jwt>`

**Request:**
```json
{
  "email": "vendedor@empresa.com",
  "nome": "João Silva",
  "cargo": "Vendedor Externo",
  "role": "vendedor"
}
```

**Validações:**
- Email: formato válido, lowercase, trimmed
- Nome: máx. 200 caracteres
- Cargo: máx. 100 caracteres
- Role: deve ser `admin`, `gerente` ou `vendedor`

**Response (200):**
```json
{
  "success": true,
  "message": "Convite enviado para vendedor@empresa.com"
}
```

**Erros:**
- 401: JWT inválido ou ausente
- 403: Não é admin
- 400: Email inválido, role inválida, ou email já cadastrado

---

#### `POST /functions/v1/verificar-consistencia`

Verifica integridade dos dados financeiros e corrige problemas automaticamente.

**Autenticação:** JWT + Admin role  
**Headers:** `Authorization: Bearer <jwt>`

**Request:** `{}` (body vazio)

**Verificações realizadas:**
1. Vendas com total divergente da soma dos itens
2. Parcelas com valor_pago divergente da soma dos pagamentos
3. Parcelas vencidas com status pendente (auto-corrige para 'vencida')
4. Parcelas com saldo negativo
5. Itens de venda órfãos (sem venda associada)
6. Divergência entre total vendido e total parcelado (>5%)

**Response (200):**
```json
{
  "ok": true,
  "inconsistencias_encontradas": 2,
  "inconsistencias": [
    {
      "tipo": "VENDA_TOTAL_INCORRETO",
      "descricao": "1 venda(s) com total divergente da soma dos itens",
      "gravidade": "alta",
      "detalhes": "Venda abc123: total=100, soma_itens=95"
    },
    {
      "tipo": "PARCELA_STATUS_INCORRETO",
      "descricao": "3 parcela(s) vencida(s) ainda com status 'pendente'",
      "gravidade": "media",
      "detalhes": "Vencimentos desde 2026-02-15"
    }
  ],
  "correcoes_automaticas": [
    "Status de parcelas vencidas atualizado automaticamente"
  ]
}
```

### 5.3 RPCs (Functions PostgreSQL)

| Função | Tipo | Descrição |
|---|---|---|
| `get_my_empresa_id()` | SECURITY DEFINER | Retorna empresa_id do usuário logado |
| `has_role(user_id, role)` | SECURITY DEFINER | Verifica se usuário tem role na empresa |
| `is_admin()` | SECURITY DEFINER | Atalho: é admin? |
| `is_gerente()` | SECURITY DEFINER | Atalho: é gerente? |
| `has_permission(name)` | SECURITY DEFINER | Verifica permissão via role_permissoes |
| `check_vendas_total()` | SECURITY DEFINER | Vendas com total divergente (limit 50) |
| `check_parcelas_pagamentos()` | SECURITY DEFINER | Parcelas com valor divergente (limit 50) |
| `check_parcelas_vencidas()` | SECURITY DEFINER | Parcelas vencidas pendentes (limit 100) |
| `check_saldo_negativo()` | SECURITY DEFINER | Parcelas com saldo negativo (limit 50) |
| `check_itens_orfaos()` | SECURITY DEFINER | Contagem de itens sem venda |
| `check_resumo_financeiro()` | SECURITY DEFINER | Totais para validação cruzada |

### 5.4 Triggers

| Trigger | Tabela | Evento | Descrição |
|---|---|---|---|
| `fn_atualizar_estoque` | movimentos_estoque | AFTER INSERT | Atualiza saldo no estoque (upsert) |
| `fn_sync_venda_total` | itens_venda | AFTER INSERT/UPDATE/DELETE | Recalcula total da venda |
| `fn_parcela_status` | parcelas | BEFORE INSERT/UPDATE | Define status (paga/vencida) |
| `fn_compute_saldo` | parcelas | BEFORE INSERT/UPDATE | Calcula saldo = total - pago |
| `fn_validar_pagamento` | pagamentos | BEFORE INSERT | Valida que pagamento não excede parcela |
| `fn_atualizar_parcela_pagamento` | pagamentos | AFTER INSERT | Atualiza valor_pago na parcela |
| `fn_award_referral_points` | vendas | AFTER INSERT/UPDATE | Credita pontos ao indicador |
| `fn_update_total_indicacoes` | clientes | AFTER INSERT/UPDATE | Atualiza contador de indicações |
| `fn_audit_log` | (múltiplas) | AFTER INSERT/UPDATE/DELETE | Registra em audit_logs |

---

## 6. Sistema de Autenticação

### 6.1 Login

```
Usuário          Frontend         Supabase Auth       PostgreSQL
   │                │                  │                   │
   │─ email/senha ──►                  │                   │
   │                │── signInWith ────►│                   │
   │                │   Password       │                   │
   │                │◄── JWT + ────────│                   │
   │                │    refresh_token │                   │
   │                │                  │                   │
   │                │── get profile ───┼──────────────────►│
   │                │── get roles ─────┼──────────────────►│
   │                │── get perms ─────┼──────────────────►│
   │                │                  │                   │
   │                │── log login ─────┼──────────────────►│ security_logs
   │                │                  │                   │
   │◄── Dashboard ──│                  │                   │
```

- Email é normalizado (lowercase, trim) antes do envio
- Senhas são hashadas via bcrypt (Supabase Auth)
- Proteção contra senhas vazadas via HaveIBeenPwned (requer ativação manual)

### 6.2 JWT

- **Algoritmo:** HS256
- **Expiração do access token:** 1 hora (Supabase default)
- **Refresh token:** Longa duração, invalidado no logout
- **Claims padrão:** `sub` (user_id), `role` (anon/authenticated), `aud`, `iss`
- **Storage:** Supabase SDK gerencia via `localStorage`
- **Refresh automático:** Via `onAuthStateChange` callback

### 6.3 Controle de Sessão

- **Timeout por inatividade:** Configurável (padrão 8h) via `configuracoes.sessao_expiracao_horas`
- **Aviso de expiração:** Modal exibido 2 minutos antes com countdown
- **Extensão:** Clique em "Continuar" chama `supabase.auth.refreshSession()` e reseta timers
- **Limpeza completa no logout:**
  1. Log do evento em `security_logs`
  2. Invalidação do refresh token (server-side via `signOut`)
  3. Limpeza do React Query cache
  4. Limpeza do IndexedDB cache store (preserva `device_id`)
  5. Limpeza dos Service Worker caches
  6. Reset de estado React (session, user, profile, roles, permissions)
- **Monitoramento de atividade:** mousedown, keydown, touchstart, scroll, mousemove
- **Throttle:** Timers resetam no máximo a cada 30 segundos

### 6.4 Permissões (RBAC)

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│ user_roles  │────►│role_permissoes │────►│  permissoes  │
│             │     │               │     │              │
│ user_id     │     │ role          │     │ nome         │
│ empresa_id  │     │ empresa_id    │     │ descricao    │
│ role        │     │ permissao_id  │     │              │
└─────────────┘     └───────────────┘     └──────────────┘
```

**Roles disponíveis:**

| Role | Permissões | Acesso a Rotas |
|---|---|---|
| `admin` | criar_venda, editar_produto, ver_relatorios, registrar_pagamento, gerenciar_vendedores | Todas |
| `gerente` | criar_venda, ver_relatorios, registrar_pagamento, gerenciar_vendedores | Exceto: empresas, backup, configurações |
| `vendedor` | criar_venda | Dashboard, vendas, clientes, produtos, estoque, catálogo, romaneio, notificações, sync |

**Verificação no frontend:**
```typescript
// Hook de autenticação
const { hasRole, hasPermission, isAdmin, isGerente } = useAuth();

// Proteção de rota
<ProtectedRoute requiredRole="admin">
  <ConfiguracoesPage />
</ProtectedRoute>

// Verificação em componente
if (hasPermission('ver_relatorios')) { /* mostrar relatórios */ }
```

**Verificação no banco (RLS):**
```sql
-- Isolamento por empresa
USING (empresa_id = get_my_empresa_id())

-- Restrição por role
WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin())

-- Restrição por permissão
WITH CHECK (has_permission('registrar_pagamento'))
```

### 6.5 Multi-Tenant

O isolamento é garantido em **3 camadas:**

1. **RLS policies:** Toda tabela filtra por `empresa_id = get_my_empresa_id()`
2. **Foreign keys:** Todos os dados referenciam `empresas.id`
3. **Edge Functions:** Verificam `empresa_id` do caller via RPC `get_my_empresa_id()`

A função `get_my_empresa_id()` é **Security Definer** e consulta `profiles.empresa_id` do usuário autenticado via `auth.uid()`, garantindo que o empresa_id **não pode ser manipulado pelo cliente**.

**Tabelas com isolamento RLS:**
- Todas as 30+ tabelas do sistema (exceto `permissoes` que é read-only)
- View `produtos_catalogo` usa Security Definer para acesso anônimo controlado

---

## 7. Funcionamento Offline

### 7.1 Banco Local (IndexedDB)

```
IndexedDB: erp_offline (versão 1)
│
├── sync_queue ─── Fila de operações pendentes
│   ├── keyPath: uuid
│   ├── Indexes:
│   │   ├── by-status  → SyncStatus (pending | synced | error | conflict)
│   │   ├── by-table   → nome da tabela
│   │   └── by-timestamp → ISO timestamp para FIFO
│   └── Campos:
│       ├── uuid: string (v4)
│       ├── timestamp: string (ISO)
│       ├── device_id: string (UUID do dispositivo)
│       ├── status_sync: SyncStatus
│       ├── table: string (nome da tabela Supabase)
│       ├── operation: "insert" | "update" | "delete"
│       ├── payload: Record<string, unknown>
│       ├── retries: number
│       └── error_message?: string
│
├── cache ─── Cache de dados para acesso offline
│   ├── keyPath: key (formato "table:empresa_id")
│   └── Campos: data, updated_at
│
└── meta ─── Metadados do dispositivo
    ├── device_id → UUID único e persistente
    └── last_sync → timestamp da última sincronização
```

### 7.2 Fila de Sincronização

```
Operação Offline          sync_queue              Sync Engine
      │                      │                        │
      │── enqueue() ────────►│ status: pending         │
      │                      │ retries: 0              │
      │                      │                        │
      │   [CONEXÃO RESTAURADA]                        │
      │                      │                        │
      │                      │◄── processSyncQueue() ──│
      │                      │   (FIFO by timestamp)   │
      │                      │                        │
      │              SUCCESS │── removeQueueItem() ───►│
      │                      │                        │
      │              ERROR   │── retries + 1 ─────────►│
      │              (< 3)   │   status: pending       │
      │                      │                        │
      │              ERROR   │── status: error ────────►│
      │              (>= 3)  │   error_message = msg   │
      │                      │                        │
      │              setMeta("last_sync", now())       │
```

### 7.3 Reconciliação de Dados

- **Estratégia:** Last-write-wins (servidor tem versão final)
- **Ordenação:** FIFO por timestamp de enqueue
- **Retry:** Máximo 3 tentativas com incremento progressivo
- **Itens com erro permanente:** Status `error` para intervenção manual (botão "Retry")
- **Intervalo auto-sync:** A cada 30 segundos quando online E com pendências

### 7.4 Tratamento de Conflitos

- **Insert duplicado:** Chave duplicada gera erro, item marcado como `error`
- **Update em registro inexistente:** Erro de referência, item marcado como `error`
- **Delete em registro inexistente:** Operação silenciosa (idempotente)
- **Edição simultânea:** Último a sincronizar prevalece (campo `updated_at`)
- **Limpeza:** `clearSyncedItems()` remove itens já sincronizados

### 7.5 Service Worker (PWA)

- **Precache:** Todos os assets estáticos (JS, CSS, HTML, imagens, fontes)
- **Runtime cache:** **Não** cacheia chamadas de API (dados sempre frescos quando online)
- **Tokens:** **Não** armazenados no Service Worker cache
- **Limpeza:** Todos os caches SW são removidos no logout via `caches.delete()`
- **Instalação:** App instalável via prompt do navegador

---

## 8. Sistema de Segurança

### 8.1 Autenticação

| Mecanismo | Implementação |
|---|---|
| Login | Email/senha via Supabase Auth (GoTrue) |
| Hashing | bcrypt (via Supabase) |
| JWT | HS256 com refresh automático |
| Senha vazada | HaveIBeenPwned (requer ativação manual) |
| Email | Normalizado (lowercase, trim) |
| Signup | Apenas via convite (Edge Function `invite-user`) |
| Logout | Invalidação server-side + limpeza client-side total |
| Sessão | Timeout configurável com aviso prévio |

### 8.2 Controle de Acesso (Camadas)

| Camada | Mecanismo | Onde |
|---|---|---|
| **Rota (UI)** | `ProtectedRoute` com `requiredRole` | React Router |
| **API (REST)** | RLS policies em todas as tabelas | PostgreSQL |
| **Edge Functions** | JWT validation via `getClaims()` + `is_admin()` | Deno |
| **Banco** | `SECURITY DEFINER` functions com `search_path = public` | PostgreSQL |
| **Permissões** | `has_permission()` em policies críticas | PostgreSQL |

### 8.3 Row-Level Security (RLS)

Todas as 30+ tabelas têm RLS habilitado. **Padrões utilizados:**

```sql
-- 1. Isolamento por empresa (padrão principal)
USING (empresa_id = get_my_empresa_id())

-- 2. Restrição por role
WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin())

-- 3. Restrição por owner
USING (usuario_id = auth.uid())

-- 4. Restrição via JOIN (tabelas filhas sem empresa_id próprio)
USING (EXISTS (
  SELECT 1 FROM vendas v
  WHERE v.id = itens_venda.venda_id
  AND v.empresa_id = get_my_empresa_id()
))

-- 5. Restrição por permissão específica
WITH CHECK (has_permission('registrar_pagamento'))

-- 6. Bloqueio total para anon (tabelas sensíveis)
USING (false)  -- na tabela produtos para acesso direto anon
```

### 8.4 Proteções Contra Vulnerabilidades (OWASP)

| Vulnerabilidade | Proteção Implementada |
|---|---|
| **SQL Injection** | Supabase Client SDK usa queries parametrizadas exclusivamente |
| **XSS** | React escapa automaticamente; sanitização `escapeHtml` em HTML gerado |
| **Broken Access Control** | RLS em todas as tabelas + RBAC + ProtectedRoute no frontend |
| **IDOR** | RLS garante que IDs de outros tenants são invisíveis e inacessíveis |
| **CSRF** | API stateless com JWT no header Authorization (não usa cookies) |
| **Privilege Escalation** | Roles em tabela separada; policy impede auto-escalação (`user_id != auth.uid()` no INSERT) |
| **Sensitive Data Exposure** | View `produtos_catalogo` oculta custo; erros genéricos em Edge Functions |
| **Token Reuse** | Refresh token invalidado no logout; JWT com expiração de 1h |
| **Insecure Design** | Triggers de validação financeira; prevenção de auto-indicação |

### 8.5 Validação de Input

| Camada | Tecnologia | Cobertura |
|---|---|---|
| **Frontend** | Zod schemas | clientes, produtos, vendas, pagamentos, kits |
| **Edge Functions** | Validação manual | email regex, role whitelist, string sanitization |
| **Banco** | Triggers | `fn_validar_pagamento` (valor), `fn_parcela_status` (status) |
| **RLS** | PostgreSQL | empresa_id, role checks, permission checks |

### 8.6 Logs de Segurança

| Tabela | Eventos Registrados | Acesso |
|---|---|---|
| `security_logs` | login, logout, timeout, falhas de acesso | empresa_id |
| `audit_logs` | INSERT, UPDATE, DELETE em tabelas críticas (dados antes/depois) | Admin only |

**Campos de security_logs:** evento, usuario_id, empresa_id, ip, user_agent, detalhes (JSONB), created_at

---

## 9. Fluxos Principais

### 9.1 Fluxo de Venda

```
Vendedor                 PDV (Mobile/Desktop)     Supabase
   │                      │                          │
   │── Seleciona cliente ─►│                          │
   │── Adiciona produtos ─►│── Valida estoque ───────►│
   │── Aplica descontos ──►│── Desconto por nível ───│
   │── Define pagamento ──►│                          │
   │                      │                          │
   │── Finalizar ─────────►│── Valida Zod ──────────►│
   │                      │                          │
   │                      │── INSERT vendas ─────────►│ status: finalizada
   │                      │── INSERT itens[] ────────►│
   │                      │── INSERT movimentos[] ───►│ tipo: venda
   │                      │                          │
   │                      │   TRIGGERS EXECUTADOS:     │
   │                      │   1. fn_sync_venda_total   │
   │                      │   2. fn_atualizar_estoque  │
   │                      │   3. fn_award_referral_pts │
   │                      │   4. fn_audit_log          │
   │                      │                          │
   │◄── "Venda #abc..." ──│◄─────────────────────────│
```

### 9.2 Fluxo de Parcelamento

```
Admin/Gerente            Frontend               Supabase
   │                      │                      │
   │── Seleciona venda ──►│                      │
   │── Nº parcelas (ex:6)►│                      │
   │── 1º vencimento ────►│                      │
   │── Forma pagamento ──►│                      │
   │                      │                      │
   │── Gerar ─────────────►│                      │
   │                      │── Calcula:            │
   │                      │   valor = total / N   │
   │                      │   resto na 1ª parcela │
   │                      │── INSERT parcelas[] ──►│
   │                      │                      │
   │                      │   TRIGGERS:            │
   │                      │   fn_compute_saldo     │
   │                      │   fn_parcela_status    │
   │                      │                      │
   │◄── "6 parcelas" ─────│◄─────────────────────│
```

### 9.3 Fluxo de Pagamento

```
Vendedor/Gerente         Frontend               Supabase
   │                      │                      │
   │── Seleciona parcela ─►│                      │
   │── Valor (R$ 150) ───►│                      │
   │── Forma: PIX ────────►│                      │
   │                      │                      │
   │── Registrar ─────────►│                      │
   │                      │── INSERT pagamento ──►│
   │                      │                      │
   │                      │   TRIGGER 1: fn_validar_pagamento
   │                      │   └── 150 > restante? → EXCEPTION
   │                      │   └── 150 <= 0? → EXCEPTION
   │                      │   └── OK → continua
   │                      │                      │
   │                      │   TRIGGER 2: fn_atualizar_parcela_pagamento
   │                      │   └── parcela.valor_pago = SUM(pagamentos)
   │                      │                      │
   │                      │   TRIGGER 3: fn_parcela_status
   │                      │   └── pago >= total? → status: paga
   │                      │                      │
   │◄── "Pagamento ok" ───│◄─────────────────────│
```

### 9.4 Fluxo de Sincronização Offline

```
Vendedor (offline)       IndexedDB                  Supabase (quando online)
   │                      │                            │
   │── Cria venda ────────►│ enqueue("vendas","insert") │
   │── Edita cliente ─────►│ enqueue("clientes","update")│
   │── Registra estoque ──►│ enqueue("movimentos","ins") │
   │                      │                            │
   │   [SEM CONEXÃO]      │ status: pending (3 itens)  │
   │                      │                            │
   │   ... horas depois ...│                            │
   │                      │                            │
   │   [CONEXÃO RESTAURADA]│                            │
   │                      │── processSyncQueue() ──────►│
   │                      │   FIFO por timestamp        │
   │                      │                            │
   │                      │── item 1: vendas/insert ───►│ ✓ sucesso
   │                      │── item 2: clientes/update ─►│ ✓ sucesso
   │                      │── item 3: movimentos/ins ──►│ ✗ erro (retry 1/3)
   │                      │                            │
   │◄── "2 ok, 1 erro" ──│── setMeta("last_sync") ────│
   │                      │                            │
   │   [30s depois]       │── retry item 3 ────────────►│ ✓ sucesso
   │◄── "1 sincronizado" ─│                            │
```

### 9.5 Fluxo de Indicação de Clientes

```
Vendedor                 Frontend               Supabase
   │                      │                      │
   │── Cadastra cliente B ─►│                      │
   │   indicado por A     │── INSERT cliente B ──►│
   │                      │   indicador_id = A    │
   │                      │                      │
   │                      │   TRIGGER: fn_update_total_indicacoes
   │                      │   └── A.total_indicacoes += 1
   │                      │                      │
   │   ... dias depois ...│                      │
   │                      │                      │
   │── Finaliza venda de B►│── INSERT venda ──────►│
   │   valor: R$ 500      │   status: finalizada  │
   │                      │                      │
   │                      │   TRIGGER: fn_award_referral_points
   │                      │   ├── Verifica indicador de B → A
   │                      │   ├── Busca config: pontos=10, min=0
   │                      │   ├── 500 >= 0 → OK
   │                      │   ├── A.pontos_indicacao += 10
   │                      │   ├── INSERT indicacoes_clientes
   │                      │   └── B.total_compras += 1
   │                      │                      │
   │◄── Venda + pontos ───│                      │
   │                      │                      │
   │   No PDV do próximo   │                      │
   │   atendimento de A:   │                      │
   │                      │                      │
   │   A (Nível: Ouro)    │── Busca nível atual ─►│
   │   420 pontos         │── beneficio: 10% desc │
   │   Desconto: 10%      │                      │
```

---

## 10. Backup e Recuperação

### 10.1 Sistema de Backup

O backup é realizado via exportação de tabelas em formato CSV, acessível apenas para administradores via rota `/backup`.

**Tabelas exportáveis:**
- clientes
- produtos
- vendas
- parcelas
- pagamentos
- estoque

**Características:**
- Dados filtrados por RLS (somente da empresa do admin)
- Formato CSV com BOM UTF-8 (compatível com Excel)
- Download automático no navegador
- Limite: 10.000 registros por tabela por exportação

### 10.2 Exportação de Dados

```typescript
// Exportar tabela individual
const { csv, count } = await exportTable('clientes');
downloadCsv(csv, 'backup_clientes_2026-03-12.csv');

// Exportar todas as tabelas sequencialmente
await exportAllAsZip();
// Gera: backup_clientes_2026-03-12.csv,
//       backup_produtos_2026-03-12.csv, etc.
```

### 10.3 Recuperação de Desastre

| Tipo | Mecanismo | Retenção |
|---|---|---|
| Banco de dados | Backups automáticos Supabase | 7 dias |
| Storage (imagens) | Replicação S3 | Contínua |
| Dados offline | IndexedDB no dispositivo | Até limpeza |
| CSV manual | Exportação pelo admin | Responsabilidade do usuário |

**Recomendações:**
- Exportar CSVs semanalmente como backup adicional
- Manter cópia dos backups em serviço externo (Google Drive, S3)
- Testar restauração periodicamente

---

## 11. Deploy e Infraestrutura

### 11.1 Infraestrutura

| Componente | Tecnologia | Hospedagem |
|---|---|---|
| Frontend (SPA) | React + Vite | Lovable CDN (global) |
| Backend API | PostgREST (auto-gerado) | Lovable Cloud |
| Auth | GoTrue | Lovable Cloud |
| Banco de dados | PostgreSQL 15 | Lovable Cloud |
| Edge Functions | Deno runtime | Lovable Cloud (auto-deploy) |
| Storage | S3-compatible | Lovable Cloud |
| DNS/SSL | Managed | Automático |

### 11.2 Variáveis de Ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | URL do projeto backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Chave pública (anon) |
| `VITE_SUPABASE_PROJECT_ID` | Frontend | ID do projeto |
| `SUPABASE_URL` | Edge Functions | URL interna do backend |
| `SUPABASE_ANON_KEY` | Edge Functions | Chave anon (para caller client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Chave admin (operações privilegiadas) |
| `SUPABASE_DB_URL` | Migrações | Connection string PostgreSQL |
| `LOVABLE_API_KEY` | Edge Functions | Chave para integrações AI |

**Nota:** As variáveis `VITE_*` são públicas e seguras para o frontend. A `SUPABASE_SERVICE_ROLE_KEY` é secreta e nunca deve ser exposta no client-side.

### 11.3 Processo de Deploy

| Componente | Processo | Timing |
|---|---|---|
| **Frontend** | Alterações no código → clicar "Update" no painel de publicação | Manual |
| **Edge Functions** | Salvar alterações em `supabase/functions/*/index.ts` | Automático |
| **Migrações** | Criar arquivos em `supabase/migrations/` | Automático |
| **Domínio custom** | Settings → Domains (requer plano pago) | Manual |

---

## 12. Boas Práticas e Limitações

### Boas Práticas de Desenvolvimento

1. **Multi-Tenancy:** Sempre incluir `empresa_id` em novas tabelas e queries
2. **RLS:** Habilitar RLS em toda nova tabela; usar `get_my_empresa_id()` para filtrar
3. **Validação dupla:** Zod no frontend + triggers/constraints no banco
4. **Roles separadas:** Nunca armazenar roles na tabela de profiles; usar `user_roles`
5. **Security Definer:** Sempre definir `SET search_path = public` em functions SD
6. **Offline:** Enqueue todas as operações de escrita quando offline
7. **Auditoria:** Adicionar trigger `fn_audit_log` em novas tabelas sensíveis
8. **Erros genéricos:** Retornar mensagens genéricas ao cliente; logar detalhes no servidor
9. **Normalização:** Emails em lowercase com trim; limitar tamanho de strings
10. **Cache:** Não cachear respostas de API no Service Worker
11. **Design tokens:** Usar tokens semânticos do Tailwind (--primary, --background, etc.)
12. **TypeScript:** Manter tipos sincronizados com `integrations/supabase/types.ts`

### Limitações Conhecidas

| Limitação | Impacto | Mitigação |
|---|---|---|
| Query limit 1000 rows (Supabase) | Paginação necessária em tabelas grandes | `.limit()` explícito; paginação no frontend |
| Backup sem compressão ZIP | Múltiplos downloads CSV individuais | Exportação sequencial; futuro: zip client-side |
| Offline limitado a escrita | Relatórios e consultas complexas requerem conexão | Cache local para dados frequentes |
| Sem push notifications | Notificações apenas ao acessar o app | Polling via sync (30s); futuro: Web Push |
| Catálogo sem analytics | Não rastreia visitantes | Integrar analytics externo |
| Sync last-write-wins | Pode perder edições simultâneas | Improvável em uso típico (vendedores em campo) |
| Exportação 10k linhas | Empresas muito grandes podem truncar | Paginação na exportação |
| Sem realtime subscriptions | Dados não atualizam automaticamente entre dispositivos | React Query refetch on focus + sync manual |
| Sem relatório PDF nativo | Exportação apenas CSV | Futuro: geração de PDF server-side |

### Checklist para Produção

- [x] RLS habilitado em todas as tabelas (30+)
- [x] RBAC com roles em tabela separada
- [x] Edge Functions com validação JWT
- [x] Triggers de validação financeira
- [x] Isolamento multi-tenant completo
- [x] Audit logs em tabelas críticas
- [x] Security logs (login, logout, timeout)
- [x] Validação Zod no frontend
- [x] Sanitização de inputs em Edge Functions
- [x] Custo de produto protegido via view
- [ ] Ativar Leaked Password Protection (manual)
- [ ] Configurar domínio customizado
- [ ] Monitorar logs de segurança regularmente
- [ ] Definir backup automático externo
- [ ] Treinar equipe sobre operação offline

---

*Documento gerado em 2026-03-12 v3.0. Para atualizações, consulte o código-fonte do projeto.*
