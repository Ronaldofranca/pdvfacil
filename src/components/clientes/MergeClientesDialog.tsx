import { useState } from "react";
import { normalizeSearch } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClientes } from "@/hooks/useClientes";
import { useMergeClientes, useMergePreview } from "@/hooks/useMergeClientes";
import { AlertCircle, ArrowDown, CheckCircle2, Search, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MergeClientesDialog({ open, onOpenChange }: Props) {
  const { data: clientes } = useClientes();
  const merge = useMergeClientes();
  
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [searchSource, setSearchSource] = useState("");
  const [searchTarget, setSearchTarget] = useState("");
  const [reason, setReason] = useState("");
  const [deleteAfter, setDeleteAfter] = useState(false);
  
  const { data: preview, isLoading: loadingPreview } = useMergePreview(sourceId || null);

  const filteredSource = (clientes || []).filter(c => 
    !c.is_merged && c.ativo && (
      normalizeSearch(c.nome).includes(normalizeSearch(searchSource)) || 
      c.id.includes(searchSource)
    )
  ).slice(0, 5);

  const filteredTarget = (clientes || []).filter(c => 
    c.id !== sourceId && !c.is_merged && c.ativo && (
      normalizeSearch(c.nome).includes(normalizeSearch(searchTarget)) || 
      c.id.includes(searchTarget)
    )
  ).slice(0, 5);

  const handleMerge = () => {
    if (!sourceId || !targetId || !reason) return;
    
    merge.mutate({
      sourceId,
      targetId,
      reason,
      deleteSource: deleteAfter
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      }
    });
  };

  const resetForm = () => {
    setSourceId("");
    setTargetId("");
    setSearchSource("");
    setSearchTarget("");
    setReason("");
    setDeleteAfter(false);
  };

  const sourceClient = (clientes || []).find(c => c.id === sourceId);
  const targetClient = (clientes || []).find(c => c.id === targetId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Mesclar Clientes Duplicados
          </DialogTitle>
          <DialogDescription>
            Transfira vendas e histórico de um cadastro duplicado para o cadastro correto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Coluna Origem */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-destructive font-semibold">1. Cliente Origem (Incorreto)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome ou ID" 
                  className="pl-9"
                  value={searchSource} 
                  onChange={(e) => setSearchSource(e.target.value)} 
                />
              </div>
              {searchSource && !sourceId && (
                <div className="border rounded-md shadow-sm bg-background mt-1">
                  {filteredSource.length > 0 ? (
                    filteredSource.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left p-2 hover:bg-muted text-sm"
                        onClick={() => { setSourceId(c.id); setSearchSource(c.nome); }}
                      >
                        {c.nome} <span className="text-[10px] text-muted-foreground font-mono">#{c.id.split("-")[0]}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground">Nenhum cliente ativo encontrado.</div>
                  )}
                </div>
              )}
            </div>

            {sourceClient && (
              <div className="p-3 border-2 border-destructive/20 bg-destructive/5 rounded-lg space-y-2">
                <p className="font-medium text-sm text-destructive">{sourceClient.nome}</p>
                <div className="flex flex-wrap gap-1">
                   <Badge variant="outline" className="text-[10px] font-mono">ID: {sourceClient.id.split("-")[0]}...</Badge>
                   <Badge variant="outline" className="text-[10px]">{sourceClient.cidade || "Sem cidade"}</Badge>
                </div>
                {loadingPreview ? (
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ) : preview ? (
                  <div className="pt-2 text-xs space-y-1 text-muted-foreground border-t border-destructive/10">
                    <p>• {preview.vendas} vendas encontradas</p>
                    <p>• {preview.parcelas} parcelas a serem transferidas</p>
                    {preview.creditos > 0 && <p className="text-destructive font-medium">• R$ {preview.creditos.toFixed(2)} em créditos pendentes</p>}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Seta no meio (visual) */}
          <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:block">
            <div className="bg-primary p-2 rounded-full shadow-lg border-2 border-background">
              <ArrowDown className="w-5 h-5 text-primary-foreground transform -rotate-90" />
            </div>
          </div>

          {/* Coluna Destino */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-primary font-semibold">2. Cliente Destino (Correto)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome ou ID" 
                  className="pl-9"
                  value={searchTarget} 
                  onChange={(e) => setSearchTarget(e.target.value)} 
                />
              </div>
              {searchTarget && !targetId && (
                <div className="border rounded-md shadow-sm bg-background mt-1">
                  {filteredTarget.length > 0 ? (
                    filteredTarget.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left p-2 hover:bg-muted text-sm"
                        onClick={() => { setTargetId(c.id); setSearchTarget(c.nome); }}
                      >
                        {c.nome} <span className="text-[10px] text-muted-foreground font-mono">#{c.id.split("-")[0]}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground">Nenhum cliente ativo encontrado.</div>
                  )}
                </div>
              )}
            </div>

            {targetClient && (
              <div className="p-3 border-2 border-primary/20 bg-primary/5 rounded-lg space-y-2">
                <p className="font-medium text-sm text-primary">{targetClient.nome}</p>
                <div className="flex flex-wrap gap-1">
                   <Badge variant="outline" className="text-[10px] font-primary border-primary/20">ID: {targetClient.id.split("-")[0]}...</Badge>
                   <Badge variant="outline" className="text-[10px]">{targetClient.cidade || "Sem cidade"}</Badge>
                </div>
                <div className="pt-2 text-[10px] text-primary/60 border-t border-primary/10">Este cadastro concentrará todo o histórico após a operação.</div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Motivo da Mesclagem *</Label>
            <Textarea 
              placeholder="Ex: Cadastros duplicados com nomes variados." 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          <div className="flex items-start space-x-2 bg-muted/50 p-3 rounded-lg border border-dashed">
            <Checkbox 
              id="delete" 
              checked={deleteAfter} 
              onCheckedChange={(v) => setDeleteAfter(!!v)} 
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="delete" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5 text-destructive" /> Excluir cadastro de origem após o sucesso
              </label>
              <p className="text-xs text-muted-foreground">
                Se marcado, o cadastro de "Zenilda" será removido permanentemente após a transferência dos dados para "Zenaide". Caso contrário, ele apenas ficará inativo e oculto.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700">
              <strong>Atenção:</strong> Esta operação transferirá vendas, parcelas e créditos. 
              Embora o histórico seja preservado, os relatórios financeiros passarão a atribuir tudo ao cliente de destino. 
              Esta ação é auditada e irreversível se o cliente for excluído.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            variant="destructive" 
            disabled={!sourceId || !targetId || !reason || merge.isPending}
            onClick={handleMerge}
          >
            {merge.isPending ? "Processando..." : "Confirmar Mesclagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
