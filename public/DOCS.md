# PDV Fácil — Documentação Técnica Completa

**Versão:** 2.1 — Atualizada em 12/03/2026  
**Última auditoria de segurança:** 12/03/2026

---

## 1. Visão Geral do Sistema

**PDV Fácil** é um SaaS multi-empresa para gestão de vendas externas. Vendedores de campo visitam clientes, registram pedidos, gerenciam estoque do veículo e precisam de ferramentas mobile com suporte offline.

### Tipos de Usuários

| Role | Descrição |
|------|-----------|
| **Admin** | Acesso total ao sistema, configurações da empresa, gestão de usuários |
| **Gerente** | Supervisão de vendas, relatórios, gestão de metas |
| **Vendedor** | PDV, visitas a clientes, entrada de pedidos |

### Principais Funcionalidades

- PDV Mobile otimizado para uso com uma mão
- CRM de clientes com score e classificação automática
- Controle de estoque com previsão inteligente
- Gestão de parcelas e pagamentos
- Catálogo online público (sem exposição de dados sensíveis)
- Mapa inteligente de clientes com geolocalização
- Metas e comissões por vendedor
- Sistema de alertas automáticos
- Sincronização offline via IndexedDB
- Backup em CSV
- Dashboard com KPIs em tempo real
- Relatórios gerenciais com exportação PDF/CSV
- Logs de auditoria completos
- Logs de segurança (login, erros, rate limiting)

### Stack Tecnológico

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — PostgreSQL + Auth + Edge Functions + Storage
- **Offline:** IndexedDB (via `idb` library)
- **PWA:** vite-plugin-pwa
- **Validação:** Zod + React Hook Form
- **Cache:** @tanstack/react-query

---

## 2. Arquitetura do Sistema

### Estrutura Modular

```
src/
├── components/       # Componentes UI por domínio
│   ├── auth/         # ProtectedRoute
│   ├── clientes/     # ClienteForm, HistoricoCompras
│   ├── estoque/      # MovimentoForm
│   ├── financeiro/   # GerarParcelasForm, PagamentoForm
│   ├── layout/       # AppLayout, Sidebar, TopBar, BottomNav
│   ├── produtos/     # ProdutoForm, CategoriaForm, KitForm
│   ├── ui/           # Componentes shadcn
│   └── vendas/       # PDVMobile, PDVModal
├── config/           # modules.ts (configuração de navegação)
├── contexts/         # AuthContext, OfflineContext
├── hooks/            # Todos os hooks de dados
├── integrations/     # Supabase client + types (auto-gerado)
├── lib/              # Utils, backup, reportExport, offline/db, offline/syncEngine
├── pages/            # Páginas de rota
│   └── catalogo/     # CatalogoPublico, CatalogoProduto, CatalogoTestemunhos
├── types/            # TypeScript types (auth.ts, modules.ts)
└── sql/              # SQL de referência das migrações
```

### Padrões Arquiteturais

- **Hooks como camada de dados:** Cada módulo tem um hook dedicado (useVendas, useClientes, etc.)
- **React Query:** Cache e mutations via `@tanstack/react-query`
- **Auth centralizado:** `AuthContext` provê session, roles e permissions com estado `rolesLoaded`
- **RLS no banco:** Isolamento de dados por empresa via Row Level Security
- **SECURITY DEFINER:** Funções de autorização executam com privilégios do owner com `search_path` fixo
- **Sanitização XSS:** Saídas HTML sanitizadas via `escapeHtml()` em exportações

### Fluxo de Dados

```
Página → Hook (useXxx) → Supabase SDK → PostgreSQL (RLS) → Resposta filtrada
```

### Fluxo de Autenticação

```
Login → signInWithPassword → onAuthStateChange → fetchUserData(roles+permissions) →
rolesLoaded=true → loading=false → UI renderiza com permissões corretas
```

---

## 3. Documentação do Banco de Dados

### Tabelas Principais

#### empresas
| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| id | uuid | No | gen_random_uuid() | Identificador único |
| nome | text | No | - | Nome fantasia |
| cnpj | text | No | - | CNPJ (unique) |
| razao_social | text | No | '' | Razão social |
| telefone | text | No | '' | Telefone |
| email | text | No | '' | Email |
| endereco | text | No | '' | Endereço |
| logo_url | text | Yes | NULL | URL do logo |
| ativa | boolean | No | true | Empresa ativa |
| created_at | timestamptz | No | now() | Data de criação |
| updated_at | timestamptz | No | now() | Última atualização |

#### profiles
| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| id | uuid | No | gen_random_uuid() | Identificador único |
| user_id | uuid | No | - | FK para auth.users |
| empresa_id | uuid | No | - | FK para empresas |
| nome | text | No | - | Nome do usuário |
| email | text | No | - | Email |
| telefone | text | No | '' | Telefone |
| cargo | text | No | '' | Cargo |
| avatar_url | text | Yes | NULL | URL do avatar |
| ativo | boolean | No | true | Usuário ativo |

#### user_roles
| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| id | uuid | No | gen_random_uuid() | Identificador |
| user_id | uuid | No | - | FK para auth.users |
| empresa_id | uuid | No | - | FK para empresas |
| role | app_role | No | - | admin/gerente/vendedor |
| created_at | timestamptz | No | now() | Data de criação |

**Constraint:** UNIQUE (user_id, empresa_id, role)

#### permissoes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| nome | text | Nome da permissão (unique) |
| descricao | text | Descrição |

**Permissões disponíveis:** criar_venda, editar_produto, ver_relatorios, registrar_pagamento, gerenciar_vendedores

#### role_permissoes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| role | app_role | Role vinculada |
| permissao_id | uuid | FK para permissoes |

#### clientes
| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| id | uuid | No | gen_random_uuid() | Identificador |
| empresa_id | uuid | No | - | FK para empresas |
| nome | text | No | - | Nome do cliente |
| cpf_cnpj | text | No | '' | CPF ou CNPJ |
| tipo | text | No | 'pf' | pf ou pj |
| telefone | text | No | '' | Telefone |
| email | text | No | '' | Email |
| rua | text | No | '' | Rua |
| cidade | text | No | '' | Cidade |
| estado | text | No | '' | Estado |
| cep | text | No | '' | CEP |
| latitude | float8 | Yes | NULL | Latitude GPS |
| longitude | float8 | Yes | NULL | Longitude GPS |
| observacoes | text | No | '' | Observações |
| ativo | boolean | No | true | Cliente ativo |

#### enderecos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| cliente_id | uuid | FK para clientes |
| empresa_id | uuid | FK para empresas |
| rua, numero, bairro, complemento | text | Endereço |
| cidade, estado, cep | text | Localização |
| latitude, longitude | float8 | Coordenadas |
| tipo | text | Tipo do endereço |
| principal | boolean | Endereço principal |

#### produtos
| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| id | uuid | No | gen_random_uuid() | Identificador |
| empresa_id | uuid | No | - | FK para empresas |
| nome | text | No | - | Nome do produto |
| descricao | text | No | '' | Descrição |
| codigo | text | No | '' | Código interno |
| preco | numeric | No | 0 | Preço de venda |
| custo | numeric | No | 0 | Preço de custo (NÃO exposto publicamente) |
| unidade | text | No | 'un' | Unidade de medida |
| categoria_id | uuid | Yes | NULL | FK para categorias |
| imagem_url | text | Yes | NULL | URL da imagem |
| slug | text | No | '' | Slug para URL |
| ativo | boolean | No | true | Produto ativo |
| destaque | boolean | No | false | Produto em destaque |
| lancamento | boolean | No | false | Lançamento |
| mais_vendido | boolean | No | false | Mais vendido |
| promocao | boolean | No | false | Em promoção |
| beneficios | jsonb | No | '[]' | Lista de benefícios |
| seo_titulo | text | No | '' | Título SEO |
| seo_descricao | text | No | '' | Descrição SEO |
| whatsapp_texto | text | No | '' | Texto para WhatsApp |

#### categorias
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| nome | text | Nome da categoria |
| descricao | text | Descrição |
| ativa | boolean | Categoria ativa |

#### kits
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| nome | text | Nome do kit |
| descricao | text | Descrição |
| preco | numeric | Preço do kit |
| imagem_url | text | Imagem |
| ativo | boolean | Kit ativo |

#### kit_itens
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| kit_id | uuid | FK para kits |
| produto_id | uuid | FK para produtos |
| quantidade | numeric | Quantidade no kit |

#### vendas
| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| id | uuid | No | gen_random_uuid() | Identificador |
| empresa_id | uuid | No | - | FK para empresas |
| vendedor_id | uuid | No | - | ID do vendedor |
| cliente_id | uuid | Yes | NULL | FK para clientes |
| data_venda | timestamptz | No | now() | Data da venda |
| subtotal | numeric | No | 0 | Subtotal |
| desconto_total | numeric | No | 0 | Desconto total |
| total | numeric | No | 0 | Total da venda |
| status | status_venda | No | 'rascunho' | rascunho/pendente/finalizada/cancelada |
| pagamentos | jsonb | No | '[]' | Formas de pagamento |
| observacoes | text | No | '' | Observações |

#### itens_venda
| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| id | uuid | gen_random_uuid() | Identificador |
| venda_id | uuid | - | FK para vendas |
| produto_id | uuid | - | FK para produtos |
| nome_produto | text | - | Nome do produto (snapshot) |
| quantidade | numeric | 1 | Quantidade |
| preco_original | numeric | 0 | Preço original |
| preco_vendido | numeric | 0 | Preço vendido |
| desconto | numeric | 0 | Desconto |
| subtotal | numeric | 0 | Subtotal do item |
| bonus | boolean | false | Item é brinde |

#### estoque
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| produto_id | uuid | FK para produtos |
| vendedor_id | uuid | ID do vendedor |
| quantidade | numeric | Quantidade em estoque |
| updated_at | timestamptz | Última atualização |

#### movimentos_estoque
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| produto_id | uuid | FK para produtos |
| vendedor_id | uuid | ID do vendedor |
| tipo | tipo_movimento | venda/reposicao/dano/ajuste |
| quantidade | numeric | Quantidade movimentada |
| data | timestamptz | Data do movimento |
| observacoes | text | Observações |

#### parcelas
| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| id | uuid | No | Identificador |
| empresa_id | uuid | No | FK para empresas |
| venda_id | uuid | Yes | FK para vendas |
| cliente_id | uuid | Yes | FK para clientes |
| numero | integer | No | Número da parcela |
| valor_total | numeric | No | Valor total |
| valor_pago | numeric | No | Valor já pago |
| saldo | numeric | Yes | Saldo restante (computed via trigger) |
| vencimento | date | No | Data de vencimento |
| status | status_parcela | No | pendente/paga/vencida |
| forma_pagamento | text | No | Forma de pagamento |
| data_pagamento | timestamptz | Yes | Data do pagamento |
| observacoes | text | No | Observações |

#### pagamentos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| parcela_id | uuid | FK para parcelas |
| usuario_id | uuid | ID do usuário |
| valor_pago | numeric | Valor pago |
| data_pagamento | timestamptz | Data do pagamento |
| forma_pagamento | text | Forma de pagamento |
| observacoes | text | Observações |

#### romaneios
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| vendedor_id | uuid | ID do vendedor |
| data | date | Data da rota |
| status | text | aberto/em_rota/finalizado |
| valor_total | numeric | Valor total |
| observacoes | text | Observações |

#### romaneio_vendas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| romaneio_id | uuid | FK para romaneios |
| venda_id | uuid | FK para vendas |

#### metas_vendedor
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| vendedor_id | uuid | ID do vendedor |
| mes | integer | Mês (1-12) |
| ano | integer | Ano |
| meta_valor | numeric | Valor da meta |
| percentual_comissao | numeric | % de comissão |

#### catalogo_config
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas (unique) |
| titulo | text | Título do catálogo |
| subtitulo | text | Subtítulo |
| descricao | text | Descrição |
| cor_primaria | text | Cor primária |
| cor_secundaria | text | Cor secundária |
| cor_fundo | text | Cor de fundo |
| cor_botoes | text | Cor dos botões |
| tipografia | text | Fonte |
| whatsapp_numero | text | Número WhatsApp |
| banner_url | text | URL do banner |
| estilo_cards | text | Estilo dos cards |
| secao_destaque | boolean | Exibir seção destaque |
| secao_categorias | boolean | Exibir seção categorias |
| secao_testemunhos | boolean | Exibir seção testemunhos |
| secao_beneficios | boolean | Exibir seção benefícios |
| secao_cta | boolean | Exibir seção CTA |
| cta_titulo, cta_descricao, cta_botao_texto, cta_botao_link | text | Config do CTA |
| seo_titulo, seo_descricao | text | SEO |
| beneficios | jsonb | Lista de benefícios |

#### testemunhos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| produto_id | uuid | FK para produtos (opcional) |
| nome_cliente | text | Nome do cliente |
| texto | text | Texto do testemunho |
| nota | integer | Nota (1-5) |
| avatar_url | text | Avatar |
| ativo | boolean | Ativo |

#### produto_imagens
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| produto_id | uuid | FK para produtos |
| empresa_id | uuid | FK para empresas |
| url | text | URL da imagem |
| alt | text | Texto alternativo |
| ordem | integer | Ordem de exibição |
| principal | boolean | Imagem principal |

#### historico_compras
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| cliente_id | uuid | FK para clientes |
| usuario_id | uuid | ID do usuário |
| data_compra | timestamptz | Data da compra |
| valor | numeric | Valor |
| descricao | text | Descrição |
| observacoes | text | Observações |
| produtos | jsonb | Produtos da compra |

#### configuracoes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas (unique) |
| permitir_desconto | boolean | Permitir desconto |
| permitir_brinde | boolean | Permitir brinde |
| permitir_alterar_preco | boolean | Permitir alterar preço |
| permitir_venda_sem_estoque | boolean | Permitir venda sem estoque |
| bloquear_venda_sem_estoque_vendedor | boolean | Bloquear venda sem estoque para vendedor |
| mostrar_preco_custo | boolean | Mostrar preço de custo |
| parcelas_max | integer | Máximo de parcelas |
| juros_parcelas | numeric | Juros por parcela |
| intervalo_parcelas | integer | Intervalo em dias entre parcelas |
| comissao_padrao | numeric | Comissão padrão (%) |
| meta_mensal_padrao | numeric | Meta mensal padrão |
| estoque_minimo_alerta | integer | Estoque mínimo para alerta |
| dias_cliente_inativo | integer | Dias para considerar cliente inativo |
| catalogo_publico_ativo | boolean | Catálogo público ativo |
| alerta_estoque_baixo | boolean | Alerta estoque baixo |
| alerta_parcelas_vencidas | boolean | Alerta parcelas vencidas |
| alerta_cliente_inativo | boolean | Alerta cliente inativo |
| alerta_meta_vendedor | boolean | Alerta meta vendedor |
| login_max_tentativas | integer | Máximo de tentativas de login |
| sessao_expiracao_horas | integer | Expiração da sessão (horas) |

#### notificacoes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| usuario_id | uuid | ID do usuário |
| titulo | text | Título |
| mensagem | text | Mensagem |
| tipo | text | info/warning/success/error |
| lida | boolean | Lida |

#### audit_logs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| usuario_id | uuid | ID do usuário |
| acao | text | INSERT/UPDATE/DELETE |
| tabela | text | Nome da tabela |
| registro_id | text | ID do registro |
| dados_anteriores | jsonb | Dados antes da operação |
| dados_novos | jsonb | Dados após a operação |
| ip | text | IP do usuário |

#### security_logs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| usuario_id | uuid | ID do usuário |
| evento | text | Tipo do evento |
| ip | text | IP |
| user_agent | text | User agent |
| detalhes | jsonb | Detalhes do evento |

#### formas_pagamento
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| nome | text | Nome da forma de pagamento |
| ativa | boolean | Ativa |

#### cidades_atendidas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| cidade | text | Nome da cidade |
| estado | text | UF |
| ativa | boolean | Ativa |

#### sync_queue
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| usuario_id | uuid | ID do usuário |
| device_id | text | ID do dispositivo |
| tabela | text | Tabela alvo |
| operacao | text | insert/update/delete |
| payload | jsonb | Dados da operação |
| status | text | pending/synced/error |
| erro | text | Mensagem de erro |
| synced_at | timestamptz | Data da sincronização |

#### devices
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador |
| empresa_id | uuid | FK para empresas |
| usuario_id | uuid | ID do usuário |
| device_id | text | ID único do dispositivo |
| nome | text | Nome do dispositivo |
| ultimo_sync | timestamptz | Última sincronização |

### View: produtos_catalogo

View pública que exclui a coluna `custo` dos produtos, expondo apenas dados seguros para o catálogo público.

### Enums

| Enum | Valores |
|------|---------|
| app_role | admin, gerente, vendedor |
| status_venda | rascunho, pendente, finalizada, cancelada |
| status_parcela | pendente, paga, vencida |
| tipo_movimento | venda, reposicao, dano, ajuste |
| forma_pagamento | dinheiro, pix, cartao_credito, cartao_debito, boleto, transferencia, outro |

### Funções do Banco

| Função | Tipo | Descrição |
|--------|------|-----------|
| get_my_empresa_id() | SECURITY DEFINER | Retorna empresa_id do usuário logado |
| has_role(user_id, role) | SECURITY DEFINER | Verifica se usuário tem uma role |
| is_admin() | SECURITY DEFINER | Atalho para verificar admin |
| is_gerente() | SECURITY DEFINER | Atalho para verificar gerente |
| has_permission(name) | SECURITY DEFINER | Verifica permissão via role_permissoes |
| handle_new_user() | Trigger | Auto-cria profile + role vendedor no signup |
| fn_atualizar_estoque() | Trigger | Atualiza estoque em movimentos |
| fn_parcela_status() | Trigger | Atualiza status da parcela |
| fn_atualizar_parcela_pagamento() | Trigger | Recalcula parcela ao pagar |
| fn_compute_saldo() | Trigger | Calcula saldo restante |
| fn_audit_log() | Trigger | Registra operações CUD |

> **Nota de segurança:** Todas as funções SECURITY DEFINER possuem `search_path` fixo para prevenir ataques de path injection.

---

## 4. Documentação da API

O sistema utiliza o **Supabase JavaScript SDK** que gera chamadas REST automaticamente. Todas as queries passam por `supabase.from('table')`.

### Módulo Auth

| Operação | Chamada SDK | Auth |
|----------|-------------|------|
| Sign Up | `supabase.auth.signUp({email, password, options: {data: {empresa_id, nome}}})` | Não |
| Sign In | `supabase.auth.signInWithPassword({email, password})` | Não |
| Sign Out | `supabase.auth.signOut()` | Sim |
| Get Session | `supabase.auth.getSession()` | Sim |
| Invite User | Edge Function `POST /invite-user` | Sim (admin only) |

### Edge Function: invite-user

**Endpoint:** `POST /functions/v1/invite-user`  
**Autenticação:** JWT Bearer token (admin obrigatório)

**Validações de segurança:**
- JWT validado via `getClaims()` (não apenas `getUser()`)
- Role `admin` verificada via RPC `is_admin()`
- `empresa_id` obtido via RPC `get_my_empresa_id()` (não do payload)
- Email normalizado (trim + lowercase) e validado por regex
- Role validada contra lista fixa `["admin", "gerente", "vendedor"]`
- Inputs truncados (nome: 200 chars, cargo: 100 chars)
- Erros internos NÃO expostos ao cliente

**Request:**
```json
{
  "email": "vendedor@empresa.com",
  "nome": "João Silva",
  "cargo": "Vendedor",
  "role": "vendedor"
}
```

**Responses:**
- `200` — Convite enviado
- `400` — Email inválido ou role inválida
- `401` — Não autorizado
- `403` — Não é admin
- `500` — Erro interno (genérico)

### Módulos de Dados (todos autenticados, com RLS)

| Módulo | Tabela | Operações | Permissão |
|--------|--------|-----------|-----------|
| Clientes | clientes | SELECT, INSERT, UPDATE, DELETE(admin) | Todos autenticados |
| Produtos | produtos | SELECT, INSERT, UPDATE, DELETE(admin) | editar_produto para escrita |
| Vendas | vendas + itens_venda | SELECT, INSERT, UPDATE, DELETE(admin) | criar_venda para inserção |
| Estoque | estoque, movimentos_estoque | SELECT, INSERT | Todos autenticados |
| Parcelas | parcelas | SELECT, INSERT, UPDATE, DELETE(admin) | Todos autenticados |
| Pagamentos | pagamentos | SELECT, INSERT | registrar_pagamento |
| Romaneios | romaneios, romaneio_vendas | SELECT, INSERT, UPDATE | Todos autenticados |
| Metas | metas_vendedor | SELECT(own/admin), INSERT/UPDATE(admin/gerente) | Baseado em role |

### API Pública do Catálogo (anônimo)

| Tabela/View | Acesso | Escopo |
|-------------|--------|--------|
| produtos_catalogo | SELECT | ativo = true (sem custo) |
| categorias | SELECT | ativa = true |
| testemunhos | SELECT | ativo = true |
| catalogo_config | SELECT | Configuração pública |
| produto_imagens | SELECT | Todas (público) |

### Exemplo de Uso

```typescript
import { supabase } from "@/integrations/supabase/client";

// Buscar produtos para catálogo
const { data } = await supabase
  .from("produtos_catalogo")
  .select("*, categorias(nome)")
  .eq("empresa_id", empresaId);

// Criar venda
const { data, error } = await supabase
  .from("vendas")
  .insert({
    empresa_id: empresaId,
    vendedor_id: userId,
    cliente_id: clienteId,
    total: 150.00,
    status: "finalizada"
  })
  .select()
  .single();

// Registrar pagamento
const { error } = await supabase
  .from("pagamentos")
  .insert({
    empresa_id: empresaId,
    parcela_id: parcelaId,
    usuario_id: userId,
    valor_pago: 75.00,
    forma_pagamento: "pix"
  });
```

---

## 5. Regras de Segurança

### Autenticação JWT
- JWT gerenciado automaticamente pelo Supabase Auth
- Refresh tokens automáticos
- Sessão validada em cada página via `AuthContext`
- `ProtectedRoute` bloqueia acesso não autenticado
- Estado `rolesLoaded` garante que roles estejam carregadas antes de renderizar UI protegida
- Edge functions validam JWT via `getClaims()` (não apenas `getUser()`)

### Controle de Permissões RBAC

| Role | Permissões |
|------|-----------|
| admin | criar_venda, editar_produto, ver_relatorios, registrar_pagamento, gerenciar_vendedores |
| gerente | criar_venda, ver_relatorios, registrar_pagamento, gerenciar_vendedores |
| vendedor | criar_venda |

- Roles armazenadas em tabela separada (`user_roles`) — previne escalação de privilégios
- Permissões mapeadas via `role_permissoes`
- Enforcement server-side via funções SECURITY DEFINER nas políticas RLS
- Auto-escalação prevenida: `user_id != auth.uid()` no INSERT de roles
- Edge functions validam roles via RPC server-side (não pelo payload do cliente)

### Isolamento Multi-Empresa
- **Toda tabela** possui coluna `empresa_id`
- **Toda política RLS** inclui `empresa_id = get_my_empresa_id()`
- `get_my_empresa_id()` é SECURITY DEFINER — não pode ser falsificada
- Edge functions obtêm `empresa_id` via RPC (não do payload do request)

### Proteção contra XSS
- Função `escapeHtml()` sanitiza todas as strings em exports HTML/PDF
- Caracteres `& < > " '` escapados antes de interpolação em HTML
- Nenhum `innerHTML` direto com dados do usuário

### Proteção contra SQL Injection
- Supabase SDK usa queries parametrizadas (proteção nativa)
- Nenhuma concatenação de string em queries SQL
- Validação de inputs via constraints no banco

### Proteção de Dados
- `custo` (preço de custo) excluído da view pública `produtos_catalogo`
- `catalogo_config` restrito à própria empresa (e acesso público anônimo)
- `audit_logs` e `security_logs` com leitura apenas para admin
- Nenhum dado sensível (senhas, hashes, tokens) em respostas da API
- Erros internos do servidor NUNCA expostos ao cliente

### Validação de Input
- Supabase SDK usa queries parametrizadas
- Validação frontend via `zod` + `react-hook-form`
- Constraints no banco (NOT NULL, UNIQUE, enums, foreign keys)
- Edge functions normalizam e truncam inputs

---

## 6. Sistema Offline

### Arquitetura

O sistema utiliza IndexedDB para persistência local e uma fila de sincronização para processar operações pendentes quando houver conectividade.

### Fluxo de Sincronização

1. Usuário realiza operação offline (ex: criar venda)
2. App armazena no IndexedDB com `status: pending`
3. Quando internet retorna, `processSyncQueue()` é executado
4. Itens processados em ordem FIFO (por timestamp)
5. Sucesso: item removido da fila
6. Falha: incrementa `retries` (máximo 3)
7. Após 3 falhas: status muda para `error`
8. Itens com erro podem ser retentados manualmente via `retryErrorItems()`

### Decisões de Design

- **UUIDs gerados client-side:** Sem dependência do servidor para IDs
- **Processamento FIFO:** Ordenado por timestamp
- **Máximo 3 retries:** Evita loops infinitos
- **OfflineContext:** Provê estado `isOnline` para toda a aplicação
- **Validação no sync:** `empresa_id`, `usuario_id` e `device_id` validados

### Tabelas IndexedDB

- `sync_queue`: Fila de operações pendentes
- `meta`: Metadados (último sync, etc.)

---

## 7. Sistema de Backup

### Implementação Atual

- Exportação CSV client-side por tabela
- Tabelas disponíveis: clientes, produtos, vendas, parcelas, pagamentos, estoque
- UTF-8 BOM para compatibilidade com Excel
- Máximo 10.000 linhas por exportação
- Downloads individuais em CSV
- Nomes com timestamp: `backup_{tabela}_{YYYY-MM-DD}.csv`

### Fluxo de Exportação

1. Usuário navega para `/backup`
2. Clica em "Exportar Tudo" ou tabela individual
3. `exportTable()` busca dados via Supabase SDK (filtrado por RLS)
4. `toCsv()` converte para CSV com escape correto
5. Browser realiza o download do arquivo

---

## 8. Sistema de Relatórios

### Exportação PDF

- Geração HTML-based com layout profissional
- Sanitização XSS via `escapeHtml()` em todos os campos interpolados
- Abertura em nova aba com `window.print()` automático
- Layout responsivo para impressão

### Exportação CSV

- UTF-8 BOM para compatibilidade com Excel
- Escape correto de aspas, vírgulas e quebras de linha
- Download automático via blob URL

### Formatação

- `fmtR(valor)` — Formata como R$ (moeda brasileira)
- `fmtN(valor)` — Formata número com separadores pt-BR

---

## 9. Fluxos Principais

### Registro de Venda no PDV

1. Vendedor seleciona cliente (opcional)
2. Adiciona produtos ao carrinho
3. Aplica descontos ou marca como bônus
4. Escolhe forma de pagamento
5. Sistema cria registro em `vendas` (status: rascunho)
6. Insere `itens_venda` para cada item
7. Gera `parcelas` se for parcelado
8. Trigger `fn_atualizar_estoque` atualiza estoque
9. Trigger `fn_audit_log` registra a operação
10. Status da venda atualizado para `finalizada`

### Pagamento de Parcelas

1. Usuário seleciona parcela pendente/vencida
2. Informa valor e forma de pagamento
3. Sistema insere em `pagamentos`
4. Trigger `fn_atualizar_parcela_pagamento` recalcula `valor_pago`
5. Trigger `fn_parcela_status` atualiza status (paga se completo)
6. Trigger `fn_compute_saldo` calcula saldo restante

### Atualização de Estoque

1. Usuário registra movimento de estoque
2. Sistema insere em `movimentos_estoque`
3. Trigger `fn_atualizar_estoque` executa:
   - Se tipo = reposicao/ajuste: `quantidade += valor`
   - Se tipo = venda/dano: `quantidade -= valor`
4. Upsert em `estoque` (INSERT ou UPDATE no conflito)

### Sincronização Offline

1. App detecta que está offline (`OfflineContext`)
2. Operações salvas no IndexedDB com UUID client-side
3. Ao reconectar, `processSyncQueue()` é chamado
4. Cada item é processado via Supabase SDK
5. Itens bem-sucedidos removidos da fila
6. Falhas incrementam contador de retries
7. `last_sync` atualizado ao final

---

## 10. Rotas da Aplicação

### Rotas Públicas (sem autenticação)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/login` | Login | Tela de login |
| `/aceitar-convite` | AceitarConvite | Aceitar convite de admin |
| `/documentacao` | Documentacao | Download da documentação técnica |
| `/catalogo` | CatalogoPublico | Catálogo público de produtos |
| `/catalogo/testemunhos` | CatalogoTestemunhos | Testemunhos do catálogo |
| `/catalogo/produtos` | CatalogoPublico | Lista pública de produtos |
| `/catalogo/:id` | CatalogoProduto | Detalhe do produto público |

### Rotas Protegidas (autenticação obrigatória)

| Rota | Página | Permissão |
|------|--------|-----------|
| `/` | Dashboard | Todos |
| `/vendas` | Vendas | criar_venda |
| `/clientes` | Clientes | Todos |
| `/produtos` | Produtos | editar_produto (escrita) |
| `/estoque` | Estoque | Todos |
| `/catalogo-interno` | Catalogo | Todos |
| `/romaneio` | Romaneio | Todos |
| `/financeiro` | Financeiro | Todos |
| `/relatorios` | Relatorios | ver_relatorios |
| `/usuarios` | Usuarios | gerenciar_vendedores |
| `/empresas` | Empresas | Admin |
| `/notificacoes` | Notificacoes | Todos |
| `/sync` | Sync | Todos |
| `/backup` | Backup | Todos |
| `/audit` | Audit | Admin |
| `/mapa-clientes` | MapaClientes | Todos |
| `/metas` | MetasComissoes | Gerente/Admin |
| `/previsao-estoque` | PrevisaoEstoque | Todos |
| `/alertas` | Alertas | Todos |
| `/configuracoes` | Configuracoes | Admin |
| `/mais` | Mais | Todos |

---

## 11. Guia de Manutenção

### Como Adicionar um Novo Módulo

1. **Criar hook** em `src/hooks/useNovoModulo.ts`
   - Fetching de dados via Supabase SDK
   - Mutations com `useMutation` do React Query
   
2. **Criar página** em `src/pages/NovoModulo.tsx`
   - Usar `ModulePage` como wrapper
   - Importar hook de dados

3. **Adicionar rota** em `src/App.tsx`
   ```tsx
   <Route path="/novo-modulo" element={<NovoModuloPage />} />
   ```

4. **Registrar na navegação** em `src/config/modules.ts`
   ```tsx
   { key: "novoModulo", label: "Novo Módulo", icon: IconComponent, path: "/novo-modulo" }
   ```

5. **Criar tabela no banco** via migration
   - Sempre incluir: `id`, `empresa_id`, `created_at`, `updated_at`
   - Habilitar RLS
   - Criar políticas com `get_my_empresa_id()`

6. **Adicionar permissões** se necessário
   - INSERT em `permissoes`
   - INSERT em `role_permissoes`

### Convenções do Projeto

- **Hooks:** Usam `@tanstack/react-query` para cache e mutations
- **Notificações:** Via `sonner` (toast)
- **Mobile:** Detecção via `use-mobile.tsx`
- **Forms:** `react-hook-form` + `zod` para validação
- **Estilos:** Tailwind CSS com tokens semânticos do design system
- **Componentes UI:** shadcn/ui (customizados)
- **Imports:** Sempre usar `@/` como alias para `src/`
- **Supabase client:** Nunca editar `client.ts` ou `types.ts` (auto-gerados)

### Como Alterar o Banco de Dados

1. Nunca editar `src/integrations/supabase/types.ts` (auto-gerado)
2. Nunca editar `src/integrations/supabase/client.ts` (auto-gerado)
3. Usar a ferramenta de migration para executar SQL
4. Sempre incluir RLS policies nas novas tabelas
5. Testar isolamento multi-empresa

---

## 12. Documentação do Catálogo Online

### Estrutura

- `/catalogo` — Página principal (pública, sem auth)
- `/catalogo/:slug` — Página individual do produto
- `/catalogo/testemunhos` — Testemunhos de clientes

### Fontes de Dados

- Produtos via view `produtos_catalogo` (sem dado de custo)
- Categorias via `categorias` (apenas ativas)
- Imagens via `produto_imagens`
- Testemunhos via `testemunhos` (apenas ativos)
- Configuração via `catalogo_config`

### Personalização (Admin)

Acessível via **Configurações → aba "Catálogo"** (apenas admin)

| Configuração | Campos |
|-------------|--------|
| Cores | cor_primaria, cor_secundaria, cor_fundo, cor_botoes |
| Tipografia | tipografia |
| Seções | secao_destaque, secao_categorias, secao_testemunhos, secao_beneficios, secao_cta |
| CTA | cta_titulo, cta_descricao, cta_botao_texto, cta_botao_link |
| SEO | seo_titulo, seo_descricao |
| Banner | banner_url |
| Cards | estilo_cards |

### Compartilhamento via WhatsApp

- Cada produto tem campo `whatsapp_texto` para mensagem customizada
- Config possui `whatsapp_numero` para botão de contato
- URL de compartilhamento: `https://wa.me/{numero}?text={texto_encoded}`

### Storage

- Imagens de produtos armazenadas no bucket `catalogo` (público)
- Upload gerenciado pela página de administração de produtos

---

## Apêndice A: Políticas RLS por Tabela

Todas as tabelas possuem RLS habilitado. Padrão geral:

- **SELECT:** `empresa_id = get_my_empresa_id()` (autenticado)
- **INSERT:** `empresa_id = get_my_empresa_id()` + permissão específica
- **UPDATE:** `empresa_id = get_my_empresa_id()` + permissão específica
- **DELETE:** `empresa_id = get_my_empresa_id() AND is_admin()`

Exceções notáveis:
- `audit_logs`: SELECT apenas para admin
- `security_logs`: SELECT apenas para admin
- `notificacoes`: Filtrado por `usuario_id = auth.uid()`
- `metas_vendedor`: Vendedor vê apenas suas próprias metas
- `produtos` (anon): Apenas `ativo = true`
- `categorias` (anon): Apenas `ativa = true`
- `testemunhos` (anon): Apenas `ativo = true`
- `catalogo_config` (anon): SELECT público
- `produto_imagens` (anon): SELECT público

---

## Apêndice B: Auditoria de Segurança

### Última auditoria: 12/03/2026

**Itens verificados e corrigidos:**

1. ✅ Sanitização XSS em exportações HTML/PDF (`escapeHtml()`)
2. ✅ Validação JWT via `getClaims()` em Edge Functions
3. ✅ Input validation e normalização em Edge Functions
4. ✅ Erros internos não vazam para o cliente
5. ✅ CORS headers adequados nas Edge Functions
6. ✅ Triggers de integridade recriados (estoque, parcelas, auditoria)
7. ✅ Políticas RLS para acesso anônimo ao catálogo
8. ✅ Race condition corrigida no carregamento de roles (`rolesLoaded`)
9. ✅ Dependências atualizadas (serialize-javascript)
10. ✅ Isolamento multi-empresa via `get_my_empresa_id()`
11. ✅ Roles em tabela separada (previne escalação de privilégio)
12. ✅ View `produtos_catalogo` exclui `custo`

### Recomendações pendentes:
- Ativar Leaked Password Protection nas configurações de autenticação
- Revisar periodicamente logs de auditoria (403 / acessos negados)
- Adicionar validação Zod server-side nos hooks de mutação

---

*Documento gerado automaticamente pelo sistema PDV Fácil — v2.1*
