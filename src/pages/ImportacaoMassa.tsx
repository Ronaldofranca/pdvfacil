import { useState, useCallback, useRef } from "react";
import { ModulePage } from "@/components/layout/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  Upload, FileSpreadsheet, Users, Package, Warehouse, DollarSign,
  Download, CheckCircle2, XCircle, AlertTriangle, ArrowRight, ArrowLeft, Loader2,
} from "lucide-react";
import {
  parseFile, autoMapColumns, validateImport, executeImport, downloadTemplate,
  SYSTEM_FIELDS,
  type ImportType, type ImportMode, type ColumnMapping, type ImportValidationResult, type ImportExecutionResult,
} from "@/lib/importEngine";
import { toast } from "sonner";

const IMPORT_TYPES: { key: ImportType; label: string; icon: any; desc: string }[] = [
  { key: "clientes", label: "Clientes", icon: Users, desc: "Cadastro de clientes com telefones e endereço" },
  { key: "produtos", label: "Produtos", icon: Package, desc: "Catálogo de produtos com categorias e preços" },
  { key: "estoque", label: "Estoque Inicial", icon: Warehouse, desc: "Estoque inicial por produto" },
  { key: "parcelas", label: "Parcelas Antigas", icon: DollarSign, desc: "Parcelas e cobranças históricas" },
];

type Step = "type" | "upload" | "mapping" | "preview" | "executing" | "done";

export default function ImportacaoPage() {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("type");
  const [importType, setImportType] = useState<ImportType>("clientes");
  const [mode, setMode] = useState<ImportMode>("skip_duplicates");
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [sheetColumns, setSheetColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [execResult, setExecResult] = useState<ImportExecutionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState("");

  const reset = () => {
    setStep("type");
    setRawRows([]);
    setSheetColumns([]);
    setMapping({});
    setValidation(null);
    setExecResult(null);
    setProgress(0);
    setFileName("");
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      setIsProcessing(true);
      const rows = await parseFile(file);
      if (!rows.length) { toast.error("Arquivo vazio ou sem dados"); return; }
      setRawRows(rows);
      const cols = Object.keys(rows[0]);
      setSheetColumns(cols);
      const autoMap = autoMapColumns(cols, importType);
      setMapping(autoMap);
      setStep("mapping");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [importType]);

  const handleValidate = useCallback(async () => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const result = await validateImport(rawRows, mapping, importType, profile.empresa_id, mode);
      setValidation(result);
      setStep("preview");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [rawRows, mapping, importType, mode, profile]);

  const handleExecute = useCallback(async () => {
    if (!profile || !validation) return;
    setStep("executing");
    setIsProcessing(true);
    try {
      const result = await executeImport(
        validation.valid,
        importType,
        profile.empresa_id,
        profile.user_id,
        mode,
        (cur, tot) => setProgress(Math.round((cur / tot) * 100))
      );
      setExecResult(result);
      setStep("done");
      toast.success("Importação concluída!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [validation, importType, mode, profile]);

  const updateMapping = (sheetCol: string, sysField: string) => {
    setMapping(prev => {
      const next = { ...prev };
      // Remove any existing mapping to this sysField
      for (const k of Object.keys(next)) {
        if (next[k] === sysField) delete next[k];
      }
      if (sysField === "__ignore__") {
        delete next[sheetCol];
      } else {
        next[sheetCol] = sysField;
      }
      return next;
    });
  };

  const sysFields = SYSTEM_FIELDS[importType];

  return (
    <ModulePage title="Importação em Massa" description="Importe dados de planilhas CSV ou Excel" icon={Upload}>
      {/* Progress Steps */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4 flex-wrap">
        {[
          { key: "type", label: "Tipo" },
          { key: "upload", label: "Upload" },
          { key: "mapping", label: "Mapeamento" },
          { key: "preview", label: "Prévia" },
          { key: "done", label: "Concluído" },
        ].map((s, i, arr) => (
          <span key={s.key} className="flex items-center gap-1">
            <span className={step === s.key || (step === "executing" && s.key === "done") ? "text-primary font-semibold" : ""}>
              {s.label}
            </span>
            {i < arr.length - 1 && <ArrowRight className="w-3 h-3" />}
          </span>
        ))}
      </div>

      {/* ───── Step 1: Choose Type ───── */}
      {step === "type" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IMPORT_TYPES.map(t => (
              <Card
                key={t.key}
                className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 ${importType === t.key ? "ring-2 ring-primary" : ""}`}
                onClick={() => setImportType(t.key)}
              >
                <CardContent className="py-4 px-4 flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                    <t.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Modo de importação</label>
              <Select value={mode} onValueChange={v => setMode(v as ImportMode)}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_only">Somente criar novos</SelectItem>
                  <SelectItem value="create_update">Criar e atualizar existentes</SelectItem>
                  <SelectItem value="skip_duplicates">Ignorar duplicados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="gap-2 mt-5" onClick={() => downloadTemplate(importType)}>
              <Download className="w-4 h-4" /> Baixar modelo
            </Button>
          </div>
          <Button className="gap-2" onClick={() => setStep("upload")}>
            Continuar <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ───── Step 2: Upload ───── */}
      {step === "upload" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Selecione o arquivo para importar <span className="text-primary">{IMPORT_TYPES.find(t => t.key === importType)?.label}</span></p>
                <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: CSV, XLSX</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
              <Button onClick={() => fileRef.current?.click()} disabled={isProcessing} className="gap-2">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isProcessing ? "Processando..." : "Selecionar arquivo"}
              </Button>
              {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
            </CardContent>
          </Card>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setStep("type")}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      )}

      {/* ───── Step 3: Column Mapping ───── */}
      {step === "mapping" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mapeamento de Colunas</CardTitle>
              <p className="text-xs text-muted-foreground">Vincule cada coluna da planilha ao campo correspondente do sistema</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sheetColumns.map(col => (
                  <div key={col} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                    <span className="text-sm font-medium min-w-[120px] truncate" title={col}>{col}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Select value={mapping[col] || "__ignore__"} onValueChange={v => updateMapping(col, v)}>
                      <SelectTrigger className="w-48 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">— Ignorar —</SelectItem>
                        {sysFields.map(f => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label} {f.required ? "*" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data preview */}
          {rawRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Prévia dos dados ({rawRows.length} linhas)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1 px-2 text-left font-semibold text-muted-foreground">#</th>
                        {sheetColumns.slice(0, 8).map(c => (
                          <th key={c} className="py-1 px-2 text-left font-semibold text-muted-foreground truncate max-w-[120px]">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
                          {sheetColumns.slice(0, 8).map(c => (
                            <td key={c} className="py-1 px-2 truncate max-w-[120px]">{String(row[c] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setStep("upload")}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button className="gap-2" onClick={handleValidate} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Validar e Pré-visualizar
            </Button>
          </div>
        </div>
      )}

      {/* ───── Step 4: Preview / Validation Results ───── */}
      {step === "preview" && validation && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total de linhas" value={validation.totalRows} icon={FileSpreadsheet} />
            <StatCard label="Válidas" value={validation.valid.length} icon={CheckCircle2} color="text-emerald-500" />
            <StatCard label="Com erro" value={validation.errors.length} icon={XCircle} color="text-red-500" />
            <StatCard label="Duplicadas" value={validation.duplicates.length} icon={AlertTriangle} color="text-amber-500" />
          </div>

          {/* Errors detail */}
          {validation.errors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Erros ({validation.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto divide-y divide-border text-xs">
                  {validation.errors.slice(0, 50).map((e, i) => (
                    <div key={i} className="py-1.5 flex items-start gap-2">
                      <Badge variant="destructive" className="text-[10px] shrink-0">Linha {e.rowIndex}</Badge>
                      <span className="text-muted-foreground">{e.error}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Valid preview */}
          {validation.valid.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dados a importar ({validation.valid.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1 px-2 text-left font-semibold text-muted-foreground">Linha</th>
                        {sysFields.slice(0, 6).map(f => (
                          <th key={f.key} className="py-1 px-2 text-left font-semibold text-muted-foreground">{f.label}</th>
                        ))}
                        <th className="py-1 px-2 text-left font-semibold text-muted-foreground">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.valid.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1 px-2 text-muted-foreground">{r.rowIndex}</td>
                          {sysFields.slice(0, 6).map(f => (
                            <td key={f.key} className="py-1 px-2 truncate max-w-[100px]">{r.data[f.key] || "—"}</td>
                          ))}
                          <td className="py-1 px-2">
                            <Badge variant={r.isDuplicate ? "secondary" : "outline"} className="text-[10px]">
                              {r.isDuplicate ? "Atualizar" : "Criar"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validation.valid.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center py-2">... e mais {validation.valid.length - 10} registros</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setStep("mapping")}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button className="gap-2" onClick={handleExecute} disabled={!validation.valid.length}>
              <Upload className="w-4 h-4" /> Importar {validation.valid.length} registros
            </Button>
          </div>
        </div>
      )}

      {/* ───── Step 5: Executing ───── */}
      {step === "executing" && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-medium">Importando dados...</p>
            <Progress value={progress} className="w-64" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </CardContent>
        </Card>
      )}

      {/* ───── Step 6: Done ───── */}
      {step === "done" && execResult && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-lg font-semibold">Importação concluída!</p>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-500">{execResult.created}</p>
                  <p className="text-xs text-muted-foreground">Criados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{execResult.updated}</p>
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{execResult.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {execResult.errors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">Erros durante importação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto divide-y divide-border text-xs">
                  {execResult.errors.map((e, i) => (
                    <div key={i} className="py-1.5 flex items-start gap-2">
                      <Badge variant="destructive" className="text-[10px] shrink-0">Linha {e.row}</Badge>
                      <span className="text-muted-foreground">{e.error}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button className="gap-2" onClick={reset}>
            <Upload className="w-4 h-4" /> Nova Importação
          </Button>
        </div>
      )}
    </ModulePage>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Icon className={`w-5 h-5 shrink-0 ${color || "text-muted-foreground"}`} />
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
