import { useState } from "react";
import {
  HardDrive,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { TABLES, exportTable, downloadCsv, type BackupTable } from "@/lib/backup";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TABLE_LABELS: Record<BackupTable, string> = {
  clientes: "Clientes",
  produtos: "Produtos",
  vendas: "Vendas",
  parcelas: "Parcelas",
  pagamentos: "Pagamentos",
  estoque: "Estoque",
};

interface ExportResult {
  table: BackupTable;
  count: number;
  status: "success" | "error";
  message?: string;
}

export default function BackupPage() {
  const [selected, setSelected] = useState<Set<BackupTable>>(new Set(TABLES));
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState<ExportResult[]>([]);

  const toggleTable = (t: BackupTable) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(TABLES));
  const selectNone = () => setSelected(new Set());

  const handleExport = async () => {
    if (selected.size === 0) {
      toast.warning("Selecione ao menos uma tabela");
      return;
    }

    setExporting(true);
    setResults([]);
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    const newResults: ExportResult[] = [];

    for (const table of TABLES) {
      if (!selected.has(table)) continue;
      try {
        const { csv, count } = await exportTable(table);
        downloadCsv(csv, `backup_${table}_${timestamp}.csv`);
        newResults.push({ table, count, status: "success" });
      } catch (err: any) {
        newResults.push({ table, count: 0, status: "error", message: err.message });
      }
    }

    setResults(newResults);
    const ok = newResults.filter((r) => r.status === "success").length;
    const fail = newResults.filter((r) => r.status === "error").length;

    if (fail === 0) {
      toast.success(`${ok} tabela(s) exportada(s) com sucesso`);
    } else {
      toast.warning(`${ok} ok, ${fail} com erro`);
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <HardDrive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Backup</h1>
            <p className="text-sm text-muted-foreground">Exportar dados em CSV</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleExport} disabled={exporting || selected.size === 0}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar selecionadas
        </Button>
      </div>

      {/* Table selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Tabelas para exportar</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Todas
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone}>
                Nenhuma
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TABLES.map((t) => (
              <label
                key={t}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox checked={selected.has(t)} onCheckedChange={() => toggleTable(t)} />
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{TABLE_LABELS[t]}</span>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Resultado da exportação</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {results.map((r) => (
              <div key={r.table} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {r.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">{TABLE_LABELS[r.table]}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "success" ? (
                    <Badge variant="secondary">{r.count} registros</Badge>
                  ) : (
                    <Badge variant="destructive">Erro</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
