import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCheck, Eye, EyeOff } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: { id: string; nome: string; email: string; cpf_cnpj: string; user_id?: string | null } | null;
  onSuccess?: () => void;
}

export function HabilitarPortalDialog({ open, onOpenChange, cliente, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!cliente) return;
    if (!cliente.email) {
      toast.error("O cliente precisa ter um email cadastrado.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-auth", {
        body: { action: "activate", cliente_id: cliente.id, password },
      });

      if (error) {
        const msg = typeof error === "object" && "message" in error ? error.message : "Erro ao ativar portal";
        toast.error(msg);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Portal ativado para ${cliente.nome}!`);
      setPassword("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Erro inesperado ao ativar portal.");
    } finally {
      setLoading(false);
    }
  };

  if (!cliente) return null;

  const alreadyActive = !!cliente.user_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Habilitar Portal do Cliente
          </DialogTitle>
          <DialogDescription>
            {alreadyActive
              ? `${cliente.nome} já possui acesso ao portal.`
              : `Criar acesso ao portal para ${cliente.nome}.`}
          </DialogDescription>
        </DialogHeader>

        {alreadyActive ? (
          <div className="py-4 text-center">
            <p className="text-sm text-green-600 font-medium">✅ Portal já está ativo para este cliente.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{cliente.email || "Sem email cadastrado"}</p>
            </div>

            {cliente.email && (
              <div className="space-y-2">
                <Label htmlFor="portal-pw">Senha de acesso</Label>
                <div className="relative">
                  <Input
                    id="portal-pw"
                    type={showPw ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O cliente usará este email e senha para acessar o portal.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {!alreadyActive && cliente.email && (
            <Button onClick={handleActivate} disabled={loading || password.length < 6}>
              {loading ? "Ativando..." : "Ativar Portal"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
