// Base entity interface - todas as tabelas seguem este padrão
export interface BaseEntity {
  id: string; // uuid
  empresa_id: string; // uuid
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Empresa extends BaseEntity {
  nome: string;
  cnpj: string;
  razao_social: string;
  telefone: string;
  email: string;
  endereco: string;
  logo_url: string | null;
  ativa: boolean;
}

export interface Usuario extends BaseEntity {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  ativo: boolean;
  avatar_url: string | null;
}

export interface Cliente extends BaseEntity {
  nome: string;
  cpf_cnpj: string;
  tipo: "pf" | "pj";
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  bairro: string;
  estado: string;
  uf: string;
  cep: string;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
}

export interface Produto extends BaseEntity {
  nome: string;
  descricao: string;
  codigo: string;
  preco: number;
  unidade: string;
  categoria_id: string | null;
  imagem_url: string | null;
  ativo: boolean;
}

export interface ItemVenda {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  subtotal: number;
}

export interface Venda extends BaseEntity {
  cliente_id: string;
  usuario_id: string;
  itens: ItemVenda[];
  subtotal: number;
  desconto: number;
  total: number;
  status: "rascunho" | "pendente" | "aprovada" | "faturada" | "cancelada";
  forma_pagamento: string;
  observacoes: string;
}

export interface MovimentacaoEstoque extends BaseEntity {
  produto_id: string;
  tipo: "entrada" | "saida" | "ajuste";
  quantidade: number;
  motivo: string;
  usuario_id: string;
}

export interface Romaneio extends BaseEntity {
  usuario_id: string;
  data_saida: string;
  data_retorno: string | null;
  status: "aberto" | "em_rota" | "finalizado";
  itens: { produto_id: string; quantidade: number }[];
  observacoes: string;
}

export interface Notificacao extends BaseEntity {
  usuario_id: string;
  titulo: string;
  mensagem: string;
  tipo: "info" | "warning" | "success" | "error";
  lida: boolean;
}

export interface AuditLog extends BaseEntity {
  usuario_id: string;
  acao: string;
  tabela: string;
  registro_id: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  ip: string;
}

export type ModuleKey =
  | "dashboard"
  | "pedidos"
  | "vendas"
  | "clientes"
  | "produtos"
  | "estoque"
  | "catalogo"
  | "romaneio"
  | "financeiro"
  | "cobrancas"
  | "relatorios"
  | "usuarios"
  | "empresas"
  | "notificacoes"
  | "sync"
  | "backup"
  | "audit"
  | "mapa"
  | "metas"
  | "previsao"
  | "alertas"
  | "caixa"
  | "importacao"
  | "configuracoes"
  | "conciliacao";
