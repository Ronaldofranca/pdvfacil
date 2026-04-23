import { supabase } from "@/integrations/supabase/client";

const TABLES = [
  "clientes",
  "cliente_telefones",
  "produtos",
  "kits",
  "kit_itens",
  "vendas",
  "itens_venda",
  "parcelas",
  "pagamentos",
  "pedidos",
  "itens_pedido",
  "estoque",
  "movimentos_estoque",
  "caixa_diario",
  "caixa_movimentacoes",
  "historico_compras",
] as const;

export type BackupTable = (typeof TABLES)[number];
export { TABLES };

const TABLE_LABELS: Record<BackupTable, string> = {
  clientes: "Clientes",
  cliente_telefones: "Telefones de Clientes",
  produtos: "Produtos",
  kits: "Kits",
  kit_itens: "Itens de Kit",
  vendas: "Vendas",
  itens_venda: "Itens de Venda",
  parcelas: "Parcelas",
  pagamentos: "Pagamentos",
  pedidos: "Pedidos",
  itens_pedido: "Itens de Pedido",
  estoque: "Estoque",
  movimentos_estoque: "Movimentações de Estoque",
  caixa_diario: "Caixa Diário",
  caixa_movimentacoes: "Movimentações de Caixa",
  historico_compras: "Histórico de Compras",
};

export { TABLE_LABELS };

// Priority groups
export const CRITICAL_TABLES: BackupTable[] = [
  "clientes", "vendas", "parcelas", "pagamentos", "pedidos",
];

export const FINANCIAL_TABLES: BackupTable[] = [
  "vendas", "itens_venda", "parcelas", "pagamentos",
  "caixa_diario", "caixa_movimentacoes",
];

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

export async function exportTable(table: BackupTable): Promise<{ csv: string; count: number }> {
  const client = supabase as any;
  const { data, error } = await client.from(table).select("*").limit(50000);
  if (error) throw new Error(`Erro ao exportar ${table}: ${error.message}`);
  const rows = (data ?? []) as Record<string, unknown>[];
  return { csv: toCsv(rows), count: rows.length };
}

function normalizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function downloadCsv(csv: string, filename: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = normalizeFileName(filename);
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAllAsZip(): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10);
  for (const table of TABLES) {
    const { csv } = await exportTable(table);
    if (csv) downloadCsv(csv, `backup_${table}_${timestamp}.csv`);
  }
}

export async function runServerBackup(tipo: "completo" | "incremental" = "completo") {
  const { data, error } = await supabase.functions.invoke("backup-automatico", {
    body: { tipo },
  });
  if (error) throw new Error(error.message || "Erro ao executar backup");
  return data;
}

export interface BackupLog {
  id: string;
  empresa_id: string;
  tipo: string;
  tabelas: string[];
  status: string;
  arquivo_url: string | null;
  tamanho_bytes: number;
  registros_total: number;
  erro: string | null;
  verificado: boolean;
  verificado_em: string | null;
  created_at: string;
}

export async function getBackupLogs(limit = 30): Promise<BackupLog[]> {
  const { data, error } = await (supabase as any)
    .from("backup_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function downloadBackupFile(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from("backups")
    .download(filePath);
  if (error) throw error;
  if (!data) throw new Error("Arquivo não encontrado");
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = normalizeFileName(fileName);
  a.click();
  URL.revokeObjectURL(url);
}

export async function listBackupFiles(prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from("backups")
    .list(prefix);
  if (error) return [];
  return (data ?? []).map((f: any) => f.name);
}
