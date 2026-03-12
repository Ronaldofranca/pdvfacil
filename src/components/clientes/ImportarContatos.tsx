import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Smartphone, CheckSquare, Upload, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PhoneContact {
  name: string;
  phones: string[];
}

interface SelectableContact {
  name: string;
  phone: string;
  selected: boolean;
}

function cleanPhone(raw: string): string {
  return raw.replace(/[\s\-\(\)\.\/\+]/g, "").replace(/^55/, "");
}

function formatPhone(cleaned: string): string {
  if (cleaned.length === 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  if (cleaned.length === 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return cleaned;
}

export function ImportarContatos({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [contacts, setContacts] = useState<SelectableContact[]>([]);
  const [step, setStep] = useState<"idle" | "picked" | "importing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({ created: 0, skipped: 0 });
  const [notMobile, setNotMobile] = useState(false);

  const pickContacts = useCallback(async () => {
    if (!("contacts" in navigator && "ContactsManager" in window)) {
      setNotMobile(true);
      return;
    }

    try {
      const props = ["name", "tel"];
      // @ts-ignore — Contact Picker API types
      const results: Array<{ name?: string[]; tel?: string[] }> = await navigator.contacts.select(props, { multiple: true });

      const mapped: SelectableContact[] = [];
      for (const c of results) {
        const name = c.name?.[0] || "Sem nome";
        const phones = c.tel || [];
        for (const p of phones) {
          const cleaned = cleanPhone(p);
          if (cleaned.length >= 8) {
            mapped.push({ name, phone: cleaned, selected: true });
          }
        }
      }

      if (!mapped.length) {
        toast.info("Nenhum contato com telefone válido encontrado.");
        return;
      }

      // Deduplicate by phone
      const seen = new Set<string>();
      const unique = mapped.filter((c) => {
        if (seen.has(c.phone)) return false;
        seen.add(c.phone);
        return true;
      });

      setContacts(unique);
      setStep("picked");
    } catch {
      toast.error("Permissão para acessar contatos negada.");
    }
  }, []);

  const toggleAll = (checked: boolean) => {
    setContacts((prev) => prev.map((c) => ({ ...c, selected: checked })));
  };

  const toggleOne = (idx: number) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)));
  };

  const importContacts = useCallback(async () => {
    if (!profile) return;
    const selected = contacts.filter((c) => c.selected);
    if (!selected.length) {
      toast.warning("Selecione pelo menos um contato.");
      return;
    }

    setStep("importing");
    setProgress(0);

    let created = 0;
    let skipped = 0;
    const batchSize = 20;

    for (let i = 0; i < selected.length; i += batchSize) {
      const batch = selected.slice(i, i + batchSize);

      // Check existing by phone
      const phones = batch.map((c) => c.phone);
      const { data: existing } = await supabase
        .from("clientes")
        .select("telefone")
        .eq("empresa_id", profile.empresa_id)
        .in("telefone", phones);

      const existingSet = new Set((existing || []).map((e) => e.telefone));

      const toInsert = batch
        .filter((c) => !existingSet.has(c.phone))
        .map((c) => ({
          empresa_id: profile.empresa_id,
          nome: c.name,
          telefone: c.phone,
        }));

      if (toInsert.length) {
        const { error } = await supabase.from("clientes").insert(toInsert);
        if (error) {
          toast.error(`Erro ao importar lote: ${error.message}`);
        } else {
          created += toInsert.length;
        }
      }
      skipped += batch.length - toInsert.length;

      setProgress(Math.round(((i + batch.length) / selected.length) * 100));
    }

    setResult({ created, skipped });
    setStep("done");
    qc.invalidateQueries({ queryKey: ["clientes"] });
  }, [contacts, profile, qc]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setContacts([]);
      setStep("idle");
      setProgress(0);
      setResult({ created: 0, skipped: 0 });
      setNotMobile(false);
    }, 300);
  };

  const selectedCount = contacts.filter((c) => c.selected).length;
  const allSelected = contacts.length > 0 && selectedCount === contacts.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Importar Contatos
          </DialogTitle>
          <DialogDescription>Importe contatos do telefone para criar clientes automaticamente.</DialogDescription>
        </DialogHeader>

        {notMobile && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Importação de contatos disponível apenas em dispositivos móveis.
            </p>
            <p className="text-xs text-muted-foreground">Abra o sistema no celular ou no aplicativo PWA instalado.</p>
          </div>
        )}

        {step === "idle" && !notMobile && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Users className="w-12 h-12 text-primary/60" />
            <p className="text-sm text-muted-foreground text-center">
              Selecione contatos do seu telefone para importar como clientes.
            </p>
            <Button onClick={pickContacts} className="gap-2">
              <Smartphone className="w-4 h-4" /> Acessar Contatos
            </Button>
          </div>
        )}

        {step === "picked" && (
          <>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
                <span>Selecionar todos ({contacts.length})</span>
              </label>
              <Badge variant="secondary">{selectedCount} selecionados</Badge>
            </div>

            <ScrollArea className="h-64 border rounded-md">
              <div className="p-2 space-y-1">
                {contacts.map((c, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <Checkbox checked={c.selected} onCheckedChange={() => toggleOne(i)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPhone(c.phone)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={importContacts} disabled={!selectedCount} className="gap-2">
                <Upload className="w-4 h-4" /> Importar {selectedCount}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-muted-foreground">Importando contatos...</p>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckSquare className="w-10 h-10 text-green-500" />
            <div>
              <p className="text-sm font-medium">{result.created} clientes criados</p>
              {result.skipped > 0 && (
                <p className="text-xs text-muted-foreground">{result.skipped} já existiam (ignorados)</p>
              )}
            </div>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
