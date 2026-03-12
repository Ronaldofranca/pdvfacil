import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Building2, Palette, ShoppingCart, CreditCard, CalendarDays,
  MapPin, Users, BookOpen, Bell, HardDrive, Shield, LogOut, Plus, Trash2, Save, Award
} from "lucide-react";
import { useEmpresas, useUpdateEmpresa } from "@/hooks/useEmpresas";
import {
  useConfiguracoes, useUpsertConfiguracoes,
  useFormasPagamento, useAddFormaPagamento, useToggleFormaPagamento, useDeleteFormaPagamento,
  useCidadesAtendidas, useAddCidade, useDeleteCidade,
} from "@/hooks/useConfiguracoes";
import {
  useAllNiveisRecompensa, useAddNivelRecompensa, useUpdateNivelRecompensa, useDeleteNivelRecompensa,
  type NivelRecompensa,
} from "@/hooks/useNiveisRecompensa";

const TABS = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "visual", label: "Visual", icon: Palette },
  { id: "pdv", label: "PDV", icon: ShoppingCart },
  { id: "pagamento", label: "Pagamento", icon: CreditCard },
  { id: "parcelas", label: "Parcelas", icon: CalendarDays },
  { id: "cidades", label: "Cidades", icon: MapPin },
  { id: "vendedores", label: "Vendedores", icon: Users },
  { id: "indicacoes", label: "Indicações", icon: Award },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "backup", label: "Backup", icon: HardDrive },
  { id: "seguranca", label: "Segurança", icon: Shield },
];

export default function ConfiguracoesPage() {
  const { profile, user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: empresas } = useEmpresas();
  const updateEmpresa = useUpdateEmpresa();
  const { data: config } = useConfiguracoes();
  const upsertConfig = useUpsertConfiguracoes();
  const { data: formas } = useFormasPagamento();
  const addForma = useAddFormaPagamento();
  const toggleForma = useToggleFormaPagamento();
  const deleteForma = useDeleteFormaPagamento();
  const { data: cidades } = useCidadesAtendidas();
  const addCidade = useAddCidade();
  const deleteCidade = useDeleteCidade();

  const empresa = empresas?.[0];

  // Local state for forms
  const [perfilNome, setPerfilNome] = useState("");
  const [perfilLoaded, setPerfilLoaded] = useState(false);
  if (profile && !perfilLoaded) {
    setPerfilNome(profile.nome);
    setPerfilLoaded(true);
  }

  const [novaForma, setNovaForma] = useState("");
  const [novaCidade, setNovaCidade] = useState("");
  const [novoEstado, setNovoEstado] = useState("");

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ nome: perfilNome, updated_at: new Date().toISOString() })
      .eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado!");
  };

  const handleChangePassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user!.email!, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de redefinição de senha enviado!");
  };

  const SwitchRow = ({ label, description, checked, onCheckedChange, disabled }: {
    label: string; description?: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );

  const saveConfig = (partial: Record<string, any>) => upsertConfig.mutate(partial);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <Button variant="destructive" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" /> Sair
        </Button>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {TABS.map((t) => {
            const adminOnly = !["perfil"].includes(t.id);
            if (adminOnly && !isAdmin) return null;
            return (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs">
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* 1. PERFIL */}
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Perfil do Usuário</CardTitle>
              <CardDescription>Suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={perfilNome} onChange={(e) => setPerfilNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
                <p className="text-xs text-muted-foreground">O email não pode ser alterado por aqui.</p>
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={empresa?.nome ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={profile?.cargo ?? ""} disabled />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleUpdateProfile}><Save className="h-4 w-4 mr-1" /> Salvar Perfil</Button>
                <Button variant="outline" onClick={handleChangePassword}>Alterar Senha</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. EMPRESA */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>Informações cadastrais</CardDescription>
            </CardHeader>
            <CardContent>
              {empresa && <EmpresaForm empresa={empresa} onSave={(v) => updateEmpresa.mutate({ id: empresa.id, ...v })} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. VISUAL */}
        <TabsContent value="visual">
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>Cores usadas no sistema e catálogo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["cor_primaria", "cor_secundaria", "cor_botoes", "cor_fundo"].map((key) => {
                const labels: Record<string, string> = {
                  cor_primaria: "Cor Principal",
                  cor_secundaria: "Cor Secundária",
                  cor_botoes: "Cor dos Botões",
                  cor_fundo: "Cor de Fundo",
                };
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Label className="w-32">{labels[key]}</Label>
                    <input
                      type="color"
                      className="h-9 w-14 rounded border cursor-pointer"
                      defaultValue={(config as any)?.[key] ?? "#10b981"}
                      onBlur={(e) => saveConfig({ [key]: e.target.value })}
                    />
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">As cores são aplicadas ao catálogo público automaticamente.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. PDV */}
        <TabsContent value="pdv">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do PDV</CardTitle>
              <CardDescription>Regras de venda</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <SwitchRow label="Permitir venda sem estoque (admin)" checked={config?.permitir_venda_sem_estoque ?? false} onCheckedChange={(v) => saveConfig({ permitir_venda_sem_estoque: v })} />
              <SwitchRow label="Bloquear venda sem estoque (vendedores)" checked={config?.bloquear_venda_sem_estoque_vendedor ?? true} onCheckedChange={(v) => saveConfig({ bloquear_venda_sem_estoque_vendedor: v })} />
              <SwitchRow label="Mostrar preço de custo" checked={config?.mostrar_preco_custo ?? false} onCheckedChange={(v) => saveConfig({ mostrar_preco_custo: v })} />
              <SwitchRow label="Permitir alterar preço na venda" checked={config?.permitir_alterar_preco ?? false} onCheckedChange={(v) => saveConfig({ permitir_alterar_preco: v })} />
              <SwitchRow label="Permitir desconto" checked={config?.permitir_desconto ?? true} onCheckedChange={(v) => saveConfig({ permitir_desconto: v })} />
              <SwitchRow label="Permitir produto como brinde" checked={config?.permitir_brinde ?? false} onCheckedChange={(v) => saveConfig({ permitir_brinde: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. FORMAS DE PAGAMENTO */}
        <TabsContent value="pagamento">
          <Card>
            <CardHeader>
              <CardTitle>Formas de Pagamento</CardTitle>
              <CardDescription>Gerencie as formas de pagamento aceitas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Nova forma de pagamento" value={novaForma} onChange={(e) => setNovaForma(e.target.value)} />
                <Button onClick={() => { if (novaForma.trim()) { addForma.mutate(novaForma.trim()); setNovaForma(""); } }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formas?.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Switch checked={f.ativa} onCheckedChange={(v) => toggleForma.mutate({ id: f.id, ativa: v })} />
                      <span className={cn("text-sm", !f.ativa && "line-through text-muted-foreground")}>{f.nome}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteForma.mutate(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {(!formas || formas.length === 0) && (
                  <p className="text-sm text-muted-foreground">Nenhuma forma de pagamento cadastrada. Adicione acima.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. PARCELAS */}
        <TabsContent value="parcelas">
          <Card>
            <CardHeader>
              <CardTitle>Condições de Pagamento</CardTitle>
              <CardDescription>Parcelamento e juros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Máximo de parcelas</Label>
                <Input
                  type="number" min={1} max={24}
                  defaultValue={config?.parcelas_max ?? 6}
                  onBlur={(e) => saveConfig({ parcelas_max: parseInt(e.target.value) || 6 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Intervalo entre parcelas (dias)</Label>
                <Input
                  type="number" min={1}
                  defaultValue={config?.intervalo_parcelas ?? 30}
                  onBlur={(e) => saveConfig({ intervalo_parcelas: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Juros por parcela (%)</Label>
                <Input
                  type="number" min={0} step={0.1}
                  defaultValue={config?.juros_parcelas ?? 0}
                  onBlur={(e) => saveConfig({ juros_parcelas: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. CIDADES */}
        <TabsContent value="cidades">
          <Card>
            <CardHeader>
              <CardTitle>Cidades Atendidas</CardTitle>
              <CardDescription>Cidades disponíveis para clientes e filtros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Cidade" value={novaCidade} onChange={(e) => setNovaCidade(e.target.value)} className="flex-1" />
                <Input placeholder="UF" value={novoEstado} onChange={(e) => setNovoEstado(e.target.value)} className="w-16" maxLength={2} />
                <Button onClick={() => {
                  if (novaCidade.trim()) {
                    addCidade.mutate({ cidade: novaCidade.trim(), estado: novoEstado.trim().toUpperCase() });
                    setNovaCidade(""); setNovoEstado("");
                  }
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {cidades?.map((c) => (
                  <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
                    {c.cidade}{c.estado ? ` - ${c.estado}` : ""}
                    <button onClick={() => deleteCidade.mutate(c.id)} className="ml-1 hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {(!cidades || cidades.length === 0) && (
                  <p className="text-sm text-muted-foreground">Nenhuma cidade cadastrada.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. VENDEDORES */}
        <TabsContent value="vendedores">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Vendedores</CardTitle>
              <CardDescription>Comissão e metas padrão</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Comissão padrão (%)</Label>
                <Input
                  type="number" min={0} step={0.5}
                  defaultValue={config?.comissao_padrao ?? 5}
                  onBlur={(e) => saveConfig({ comissao_padrao: parseFloat(e.target.value) || 5 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Meta mensal padrão (R$)</Label>
                <Input
                  type="number" min={0}
                  defaultValue={config?.meta_mensal_padrao ?? 10000}
                  onBlur={(e) => saveConfig({ meta_mensal_padrao: parseFloat(e.target.value) || 10000 })}
                />
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">Permissões individuais de vendedores podem ser gerenciadas em Usuários.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INDICAÇÕES */}
        <TabsContent value="indicacoes">
          <Card>
            <CardHeader>
              <CardTitle>Programa de Indicações</CardTitle>
              <CardDescription>Configurações de pontuação por indicação de clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pontos por indicação que gera venda</Label>
                <Input
                  type="number" min={1}
                  defaultValue={config?.pontos_por_indicacao ?? 10}
                  onBlur={(e) => saveConfig({ pontos_por_indicacao: parseInt(e.target.value) || 10 })}
                />
                <p className="text-xs text-muted-foreground">Pontos creditados ao indicador quando o cliente indicado realiza uma compra.</p>
              </div>
              <div className="space-y-2">
                <Label>Valor mínimo de compra para validar indicação (R$)</Label>
                <Input
                  type="number" min={0} step={0.01}
                  defaultValue={config?.valor_minimo_indicacao ?? 0}
                  onBlur={(e) => saveConfig({ valor_minimo_indicacao: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Se 0, qualquer compra gera pontos. Se maior que 0, somente compras acima deste valor.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. CATÁLOGO */}
        <TabsContent value="catalogo">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Catálogo</CardTitle>
              <CardDescription>Catálogo público online</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow
                label="Catálogo público ativo"
                description="Permite acesso público ao catálogo de produtos"
                checked={config?.catalogo_publico_ativo ?? true}
                onCheckedChange={(v) => saveConfig({ catalogo_publico_ativo: v })}
              />
              <Separator />
              <p className="text-xs text-muted-foreground">
                Configurações avançadas do catálogo (título, descrição, cores, banner) podem ser editadas na página do Catálogo Interno.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 10. NOTIFICAÇÕES */}
        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Alertas automáticos do sistema</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <SwitchRow label="Parcelas vencidas" description="Alertar sobre parcelas vencidas" checked={config?.alerta_parcelas_vencidas ?? true} onCheckedChange={(v) => saveConfig({ alerta_parcelas_vencidas: v })} />
              <SwitchRow label="Estoque baixo" description="Alertar quando estoque estiver abaixo do mínimo" checked={config?.alerta_estoque_baixo ?? true} onCheckedChange={(v) => saveConfig({ alerta_estoque_baixo: v })} />
              <SwitchRow label="Cliente inativo" description="Alertar sobre clientes sem compras recentes" checked={config?.alerta_cliente_inativo ?? true} onCheckedChange={(v) => saveConfig({ alerta_cliente_inativo: v })} />
              <SwitchRow label="Meta de vendedor" description="Alertar sobre metas de vendedores" checked={config?.alerta_meta_vendedor ?? true} onCheckedChange={(v) => saveConfig({ alerta_meta_vendedor: v })} />
              <Separator />
              <div className="pt-3 space-y-4">
                <div className="space-y-2">
                  <Label>Estoque mínimo para alerta</Label>
                  <Input
                    type="number" min={1}
                    defaultValue={config?.estoque_minimo_alerta ?? 5}
                    onBlur={(e) => saveConfig({ estoque_minimo_alerta: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dias sem compra para cliente inativo</Label>
                  <Input
                    type="number" min={1}
                    defaultValue={config?.dias_cliente_inativo ?? 30}
                    onBlur={(e) => saveConfig({ dias_cliente_inativo: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 11. BACKUP */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup</CardTitle>
              <CardDescription>Exportação de dados do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Acesse a página de Backup para visualizar e exportar seus dados.
              </p>
              <Button variant="outline" onClick={() => navigate("/backup")}>
                <HardDrive className="h-4 w-4 mr-2" /> Ir para Backup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 12. SEGURANÇA */}
        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Configurações de segurança do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expiração da sessão (horas)</Label>
                <Input
                  type="number" min={1} max={720}
                  defaultValue={config?.sessao_expiracao_horas ?? 24}
                  onBlur={(e) => saveConfig({ sessao_expiracao_horas: parseInt(e.target.value) || 24 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de tentativas de login</Label>
                <Input
                  type="number" min={1} max={20}
                  defaultValue={config?.login_max_tentativas ?? 5}
                  onBlur={(e) => saveConfig({ login_max_tentativas: parseInt(e.target.value) || 5 })}
                />
              </div>
              <Separator />
              <Button variant="outline" onClick={() => navigate("/audit")}>
                <Shield className="h-4 w-4 mr-2" /> Ver Logs de Segurança
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-component for empresa form
function EmpresaForm({ empresa, onSave }: { empresa: any; onSave: (v: any) => void }) {
  const [form, setForm] = useState({
    nome: empresa.nome ?? "",
    razao_social: empresa.razao_social ?? "",
    cnpj: empresa.cnpj ?? "",
    telefone: empresa.telefone ?? "",
    email: empresa.email ?? "",
    endereco: empresa.endereco ?? "",
  });

  const handleChange = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome da Empresa</Label>
          <Input value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Razão Social</Label>
          <Input value={form.razao_social} onChange={(e) => handleChange("razao_social", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input value={form.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={form.telefone} onChange={(e) => handleChange("telefone", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Endereço</Label>
          <Input value={form.endereco} onChange={(e) => handleChange("endereco", e.target.value)} />
        </div>
      </div>
      <Button onClick={() => onSave(form)}>
        <Save className="h-4 w-4 mr-1" /> Salvar Empresa
      </Button>
    </div>
  );
}
