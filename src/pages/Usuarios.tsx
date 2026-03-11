import { useState } from "react";
import { UserCog, Pencil, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { useUsuarios, useUpdateUsuario, useUpdateUserRole } from "@/hooks/useUsuarios";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin: { label: "Admin", variant: "default" },
  gerente: { label: "Gerente", variant: "secondary" },
  vendedor: { label: "Vendedor", variant: "outline" },
};

export default function UsuariosPage() {
  const { isAdmin, canManageVendedores } = usePermissions();
  const { profile } = useAuth();
  const { data: usuarios, isLoading } = useUsuarios();
  const updateUser = useUpdateUsuario();
  const updateRole = useUpdateUserRole();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);

  const filtered = usuarios?.filter(
    (u) => u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editing) return;
    updateUser.mutate(
      { id: editing.id, nome: editing.nome, telefone: editing.telefone, cargo: editing.cargo, ativo: editing.ativo },
      { onSuccess: () => setEditing(null) }
    );
  };

  const handleRoleChange = (userId: string, empresaId: string, newRole: string, oldRole: string) => {
    if (!isAdmin) return;
    updateRole.mutate({ user_id: userId, empresa_id: empresaId, role: newRole, old_role: oldRole });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <UserCog className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerenciar usuários e permissões</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {filtered?.map((u: any) => {
            const roles = u.user_roles?.map((r: any) => r.role) ?? [];
            const primaryRole = roles[0] ?? "vendedor";
            const roleConfig = ROLE_LABELS[primaryRole] ?? ROLE_LABELS.vendedor;

            return (
              <Card key={u.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">
                      {u.nome?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{u.nome}</p>
                        <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>
                        {!u.ativo && <Badge variant="destructive">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email} {u.cargo && `· ${u.cargo}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && u.user_id !== profile?.user_id && (
                      <Select value={primaryRole} onValueChange={(v) => handleRoleChange(u.user_id, u.empresa_id, v, primaryRole)}>
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {(isAdmin || canManageVendedores) && (
                      <Button variant="ghost" size="icon" onClick={() => setEditing({ ...u })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input value={editing.telefone} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Input value={editing.cargo} onChange={(e) => setEditing({ ...editing, cargo: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={editing.ativo} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSave} disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
