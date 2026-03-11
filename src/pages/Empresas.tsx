import { useState } from "react";
import { Building2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmpresas, useUpdateEmpresa } from "@/hooks/useEmpresas";
import { usePermissions } from "@/hooks/usePermissions";

export default function EmpresasPage() {
  const { isAdmin } = usePermissions();
  const { data: empresas, isLoading } = useEmpresas();
  const update = useUpdateEmpresa();
  const [editing, setEditing] = useState<any>(null);

  const handleSave = () => {
    if (!editing) return;
    update.mutate(editing, { onSuccess: () => setEditing(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">Gestão multiempresa</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : (
        <div className="grid gap-4">
          {empresas?.map((e) => (
            <Card key={e.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{e.nome}</h3>
                      <Badge variant={e.ativa ? "default" : "destructive"}>{e.ativa ? "Ativa" : "Inativa"}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span>CNPJ: {e.cnpj || "—"}</span>
                      <span>Telefone: {e.telefone || "—"}</span>
                      <span>Email: {e.email || "—"}</span>
                      <span>Razão: {e.razao_social || "—"}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => setEditing({ ...e })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>CNPJ</Label>
                  <Input value={editing.cnpj} onChange={(e) => setEditing({ ...editing, cnpj: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input value={editing.telefone} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Endereço</Label>
                <Input value={editing.endereco} onChange={(e) => setEditing({ ...editing, endereco: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Razão Social</Label>
                <Input value={editing.razao_social} onChange={(e) => setEditing({ ...editing, razao_social: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSave} disabled={update.isPending}>
                  {update.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
