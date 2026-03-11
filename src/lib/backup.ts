import { supabase } from "@/integrations/supabase/client";

const TABLES = ["clientes", "produtos", "vendas", "parcelas", "pagamentos", "estoque"] as const;
export type BackupTable = (typeof TABLES)[number];
export { TABLES };

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
  const { data, error } = await client.from(table).select("*").limit(10000);
  if (error) throw new Error(`Erro ao exportar ${table}: ${error.message}`);
  const rows = (data ?? []) as Record<string, unknown>[];
  return { csv: toCsv(rows), count: rows.length };
}

export function downloadCsv(csv: string, filename: string) {
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAllAsZip(): Promise<void> {
  // Export each table individually since we can't zip in browser without a lib
  const timestamp = new Date().toISOString().slice(0, 10);
  for (const table of TABLES) {
    const { csv } = await exportTable(table);
    if (csv) downloadCsv(csv, `backup_${table}_${timestamp}.csv`);
  }
}
