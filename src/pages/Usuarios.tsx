import { useState } from "react";
import {
  UserCog, Pencil, Shield, UserPlus, Search,
  Users, ShoppingBag, KeyRound, CheckCircle, XCircle, Eye, EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdmins, useVendedores, useClientesPortal,
  useUpdateUsuario, useUpdateUserRole,
} from "@/hooks/useUsuarios";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Role label config ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin: { label: "Admin", variant: "default" },
  gerente: { label: "Gerente", variant: "secondary" },
  vendedor: { label: "Vendedor", variant: "outline" },
};

// ─── Helper: avatar initials ─────────────────────────────────────────────────

function Avatar({ nome }: { nome: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground shrink-0">
      {nome?.charAt(0)?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { isAdmin, canManageVendedores } = usePermissions();
  const { profile } = useAuth();
  const updateUser = useUpdateUsuario();
  const updateRole = useUpdateUserRole();

  const [tab, setTab] = useState("admins");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteCargo, setInviteCargo] = useState("");
  const [inviteRole, setInviteRole] = useState("vendedor");
  const [inviting, setInviting] = useState(false);
  const [directMode, setDirectMode] = useState(false);
  const [invitePassword, setInvitePassword] = useState("");
  const [showInvitePassword, setShowInvitePassword] = useState(false);

  // ── Reset senha cliente ──
  const [resetState, setResetState] = useState<{ open: boolean; cliente?: any }>({ open: false });
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { data: admins = [], isLoading: loadingAdmins } = useAdmins();
  const { data: vendedores = [], isLoading: loadingVendedores } = useVendedores();
  const { data: clientes = [], isLoading: loadingClientes } = useClientesPortal();

  const q = search.toLowerCase();
  const filterProfile = (u: any) =>
    !q || u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  const filterCliente = (c: any) =>
    !q || c.nome?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.telefone?.includes(q);

  const filteredAdmins = admins.filter(filterProfile);
  const filteredVendedores = vendedores.filter(filterProfile);
  const filteredClientes = clientes.filter(filterCliente);

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

  // Troca senha da cliente do portal.
  // Tenta via edge function admin-set-password (service role);
  // se não existir, envia email de redefinição como fallback.
  const handleResetClientPassword = async () => {
    if (!resetState.cliente) return;
    if (newPassword.length < 6) {
      toast.error("Mínimo 6 caracteres.");
      return;
    }
    setResetting(true);
    try {
      // Tenta edge function (requer service role no servidor)
      const { error: fnError } = await supabase.functions.invoke("admin-set-password", {
        body: { user_id: resetState.cliente.user_id, password: newPassword },
      });

      if (!fnError) {
        toast.success(`Nova senha definida para ${resetState.cliente.nome}.`);
        setResetState({ open: false });
        setNewPassword("");
      } else {
        // Fallback: envia email de redefinição
        const { error: emailError } = await supabase.auth.resetPasswordForEmail(
          resetState.cliente.email,
          { redirectTo: `${window.location.origin}/portal/nova-senha` }
        );
        if (emailError) throw emailError;
        toast.success(`Email de redefinição enviado para ${resetState.cliente.email}.`);
        setResetState({ open: false });
        setNewPassword("");
      }
    } catch (e: any) {
      toast.error(e?.message);
    }
    setResetting(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Email é obrigatório");
      return;
    }
    setInviting(true);
    try {
      if (directMode) {
        if (!invitePassword || invitePassword.length < 6) {
          toast.error("Senha deve ter no mínimo 6 caracteres");
          setInviting(false);
          return;
        }

        const { data, error } = await (supabase as any).rpc("fn_admin_create_user", {
          p_email: inviteEmail.trim().toLowerCase(),
          p_password: invitePassword,
          p_nome: inviteNome || inviteEmail.split('@')[0],
          p_empresa_id: profile?.empresa_id,
          p_role: inviteRole
        });

        if (error) {
          console.error("Erro RPC fn_admin_create_user:", error);
          throw new Error(error.message || "Erro ao criar usuário no banco");
        }

        toast.success("Usuário cadastrado com sucesso!");
        setInviteOpen(false);
        setInviteEmail(""); setInviteNome(""); setInviteCargo(""); setInvitePassword("");
      } else {
        const { data, error } = await supabase.functions.invoke("invite-user", {
          body: { email: inviteEmail, nome: inviteNome, cargo: inviteCargo, role: inviteRole },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success(`Convite enviado para ${inviteEmail}`);
        setInviteOpen(false);
        setInviteEmail(""); setInviteNome(""); setInviteCargo("");
      }
    } catch (e: any) {
      console.error("Erro no processo de cadastro/convite:", e);
      toast.error("Erro: " + (e.message || "Ocorreu um erro inesperado"));
    }
    setInviting(false);
  };

  const isLoading = tab === "admins" ? loadingAdmins : tab === "vendedores" ? loadingVendedores : loadingClientes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <UserCog className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">Administradores, vendedores e clientes do portal</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1" /> Convidar
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="admins" className="gap-1.5">
            <Shield className="w-4 h-4" />
            Administradores
            {admins.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{admins.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vendedores" className="gap-1.5">
            <Users className="w-4 h-4" />
            Vendedores
            {vendedores.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{vendedores.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1.5">
            <ShoppingBag className="w-4 h-4" />
            Clientes
            {clientes.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{clientes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Administradores ── */}
        <TabsContent value="admins" className="space-y-2 mt-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredAdmins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search ? "Nenhum resultado para a busca." : "Nenhum administrador cadastrado."}
            </p>
          ) : (
            filteredAdmins.map((u: any) => {
              const roles = u.user_roles?.map((r: any) => r.role) ?? [];
              const primaryRole = roles[0] ?? "admin";
              const roleConfig = ROLE_LABELS[primaryRole] ?? ROLE_LABELS.admin;
              return (
                <Card key={u.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar nome={u.nome} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-foreground">{u.nome}</p>
                          <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>
                          {!u.ativo && <Badge variant="destructive">Inativo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}{u.cargo && ` · ${u.cargo}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && u.user_id !== profile?.user_id && (
                        <Select value={primaryRole} onValueChange={(v) => handleRoleChange(u.user_id, u.empresa_id, v, primaryRole)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <Shield className="w-3 h-3 mr-1" /><SelectValue />
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
            })
          )}
        </TabsContent>

        {/* ── Vendedores ── */}
        <TabsContent value="vendedores" className="space-y-2 mt-4">
          {loadingVendedores ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredVendedores.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search ? "Nenhum resultado para a busca." : "Nenhum vendedor cadastrado."}
            </p>
          ) : (
            filteredVendedores.map((u: any) => (
              <Card key={u.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nome={u.nome} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground">{u.nome}</p>
                        <Badge variant="outline">Vendedor</Badge>
                        {!u.ativo && <Badge variant="destructive">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}{u.cargo && ` · ${u.cargo}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <Select value="vendedor" onValueChange={(v) => handleRoleChange(u.user_id, u.empresa_id, v, "vendedor")}>
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <Shield className="w-3 h-3 mr-1" /><SelectValue />
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
            ))
          )}
        </TabsContent>

        {/* ── Clientes ── */}
        <TabsContent value="clientes" className="space-y-2 mt-4">
          <p className="text-xs text-muted-foreground px-1">
            Todos os clientes cadastrados no sistema. O ícone <KeyRound className="inline w-3 h-3" /> indica que o cliente tem acesso ao portal.
          </p>
          {loadingClientes ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredClientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search ? "Nenhum resultado para a busca." : "Nenhum cliente cadastrado."}
            </p>
          ) : (
            filteredClientes.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nome={c.nome} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground">{c.nome}</p>
                        {c.has_portal_access ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="w-3 h-3" /> Portal ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <XCircle className="w-3 h-3" /> Sem acesso
                          </Badge>
                        )}
                        {!c.ativo && <Badge variant="destructive">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[c.email, c.telefone, c.cidade].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.has_portal_access && isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => { setResetState({ open: true, cliente: c }); setNewPassword(""); setShowPassword(false); }}
                      >
                        <KeyRound className="w-3 h-3" /> Senha
                      </Button>
                    )}
                    {!c.has_portal_access && <XCircle className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ── Reset Senha Clientes Dialog ── */}
      <Dialog
        open={resetState.open}
        onOpenChange={(o) => { setResetState((prev) => ({ ...prev, open: o })); if (!o) setNewPassword(""); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Redefinir Senha do Cliente
            </DialogTitle>
          </DialogHeader>
          {resetState.cliente && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-foreground">{resetState.cliente.nome}</p>
                <p className="text-muted-foreground">{resetState.cliente.email}</p>
              </div>
              <div className="space-y-1">
                <Label>Nova senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A nova senha será aplicada imediatamente ao login do cliente no portal.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setResetState({ open: false })}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleResetClientPassword}
                  disabled={resetting || newPassword.length < 6}
                >
                  {resetting ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Invite Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar Usuário do Sistema</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="usuario@email.com" type="email" />
            </div>
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={inviteNome} onChange={(e) => setInviteNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <Input value={inviteCargo} onChange={(e) => setInviteCargo(e.target.value)} placeholder="Ex: Vendedor Externo" />
            </div>
            <div className="space-y-1">
              <Label>Função</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-b border-border">
              <div className="space-y-0.5">
                <Label>Cadastro Direto</Label>
                <p className="text-[10px] text-muted-foreground">Define a senha agora sem enviar email</p>
              </div>
              <Switch checked={directMode} onCheckedChange={setDirectMode} />
            </div>

            {directMode && (
              <div className="space-y-1">
                <Label>Senha Temporária *</Label>
                <div className="relative">
                  <Input 
                    value={invitePassword} 
                    onChange={(e) => setInvitePassword(e.target.value)} 
                    placeholder="Mínimo 6 caracteres" 
                    type={showInvitePassword ? "text" : "password"} 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowInvitePassword(!showInvitePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showInvitePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleInvite} disabled={inviting}>
                {inviting ? "Processando..." : directMode ? "Criar Usuário" : "Enviar Convite"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {directMode 
                ? "O usuário será criado imediatamente e já poderá acessar o sistema." 
                : "O usuário receberá um email para definir a senha no primeiro acesso."}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
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
