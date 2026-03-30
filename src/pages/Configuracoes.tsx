import { useState, useRef, useEffect } from "react";
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
  MapPin, Users, BookOpen, Bell, HardDrive, Shield, LogOut, Plus, Trash2, Save, Award, Sun, Moon, Monitor, Globe, FileDown
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresas, useUpdateEmpresa } from "@/hooks/useEmpresas";
import {
  useConfiguracoes, useUpsertConfiguracoes,
  useFormasPagamento, useAddFormaPagamento, useToggleFormaPagamento, useDeleteFormaPagamento,
  useCidadesAtendidas, useAddCidadesMassa, useDeleteCidade, useUpdateCidade,
  useRepresentantes, useAddRepresentante, useUpdateRepresentante, useDeleteRepresentante,
} from "@/hooks/useConfiguracoes";
import { getDistanceInKm, createColoredIcon } from "@/lib/geocoding";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAllNiveisRecompensa, useAddNivelRecompensa, useUpdateNivelRecompensa, useDeleteNivelRecompensa,
  type NivelRecompensa,
} from "@/hooks/useNiveisRecompensa";
import { ReciboConfig } from "@/components/configuracoes/ReciboConfig";

const TABS = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "visual", label: "Visual", icon: Palette },
  { id: "recibo", label: "Recibo", icon: FileDown },
  { id: "pdv", label: "PDV", icon: ShoppingCart },
  { id: "pagamento", label: "Pagamento", icon: CreditCard },
  { id: "parcelas", label: "Parcelas", icon: CalendarDays },
  { id: "cidades", label: "Cidades", icon: MapPin },
  { id: "representantes", label: "Representantes", icon: Users },
  { id: "vendedores", label: "Vendedores", icon: Users },
  { id: "indicacoes", label: "Indicações", icon: Award },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "portal", label: "Portal", icon: Globe },
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
    try {
      await supabase.auth.resetPasswordForEmail(user!.email!, {
        redirectTo: `${window.location.origin}/login`,
      });
    } catch {
      // Silently handle - don't reveal if email exists
    }
    // Always show the same message regardless of result
    toast.success("Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.");
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
              <CardDescription>Cores e tema do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ThemeSelector />
              <Separator />
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

        {/* RECIBO */}
        <TabsContent value="recibo">
          <Card>
            <CardHeader>
              <CardTitle>Personalização do Recibo</CardTitle>
              <CardDescription>Customize cores, conteúdo e aparência dos recibos de venda e pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <ReciboConfig config={config} empresa={empresa} onSave={saveConfig} />
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

        {/* 5. FORMAS DE PAGAMENTO + PIX */}
        <TabsContent value="pagamento">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações PIX</CardTitle>
                <CardDescription>Configure a chave PIX para recebimentos, QR Codes e recibos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Chave PIX</Label>
                    <Select
                      defaultValue={config?.pix_tipo || ""}
                      onValueChange={(v) => saveConfig({ pix_tipo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input
                      defaultValue={config?.pix_chave ?? ""}
                      placeholder="Digite sua chave PIX"
                      onBlur={(e) => saveConfig({ pix_chave: e.target.value.trim() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Recebedor</Label>
                    <Input
                      defaultValue={(config as any)?.pix_nome_recebedor ?? ""}
                      placeholder="Nome que aparece no PIX"
                      onBlur={(e) => saveConfig({ pix_nome_recebedor: e.target.value.trim() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade do Recebedor</Label>
                    <Input
                      defaultValue={(config as any)?.pix_cidade_recebedor ?? ""}
                      placeholder="Ex: São Paulo"
                      onBlur={(e) => saveConfig({ pix_cidade_recebedor: e.target.value.trim() })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Essas informações são usadas para gerar QR Codes PIX e códigos copiáveis em recibos e cobranças.
                </p>
              </CardContent>
            </Card>

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
          </div>
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
              <CardDescription>Gerencie as cidades onde os representantes atuam (Cadastro em massa)</CardDescription>
            </CardHeader>
            <CardContent>
              <CidadesMassaManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7.5. REPRESENTANTES */}
        <TabsContent value="representantes">
          <Card>
            <CardHeader>
              <CardTitle>Representantes Comerciais</CardTitle>
              <CardDescription>Membresia de área de atendimento no mapa</CardDescription>
            </CardHeader>
            <CardContent>
              <RepresentantesManager />
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
              <Separator />
              <NiveisRecompensaManager />
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

        {/* PORTAL DO CLIENTE */}
        <TabsContent value="portal">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Portal do Cliente</CardTitle>
              <CardDescription>Personalize o portal de acesso dos seus clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título do Portal</Label>
                  <Input
                    defaultValue={(config as any)?.portal_titulo ?? "Portal do Cliente"}
                    onBlur={(e) => saveConfig({ portal_titulo: e.target.value.trim() || "Portal do Cliente" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto do Rodapé</Label>
                  <Input
                    defaultValue={(config as any)?.portal_rodape ?? ""}
                    placeholder="Ex: © 2026 Minha Empresa"
                    onBlur={(e) => saveConfig({ portal_rodape: e.target.value.trim() })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Mensagem de Boas-vindas</Label>
                  <Input
                    defaultValue={(config as any)?.portal_mensagem_boas_vindas ?? ""}
                    placeholder="Mensagem exibida na página inicial do portal"
                    onBlur={(e) => saveConfig({ portal_mensagem_boas_vindas: e.target.value.trim() })}
                  />
                </div>
              </div>
              <Separator />
              <p className="text-sm font-semibold">Seções Visíveis no Portal</p>
              <div className="divide-y">
                <SwitchRow label="Mostrar Início / Dashboard" description="Permite ao cliente ver o resumo financeiro e ações rápidas" checked={(config as any)?.portal_mostrar_home ?? true} onCheckedChange={(v) => saveConfig({ portal_mostrar_home: v })} />
                <SwitchRow label="Mostrar Pedidos" description="Permite ao cliente ver e criar pedidos" checked={(config as any)?.portal_mostrar_pedidos ?? true} onCheckedChange={(v) => saveConfig({ portal_mostrar_pedidos: v })} />
                <SwitchRow label="Mostrar Parcelas" description="Permite ao cliente ver parcelas e saldos" checked={(config as any)?.portal_mostrar_parcelas ?? true} onCheckedChange={(v) => saveConfig({ portal_mostrar_parcelas: v })} />
                <SwitchRow label="Mostrar Histórico de Compras" description="Permite ao cliente ver compras anteriores" checked={(config as any)?.portal_mostrar_compras ?? true} onCheckedChange={(v) => saveConfig({ portal_mostrar_compras: v })} />
                <SwitchRow label="Mostrar Histórico de Pagamentos" description="Permite ao cliente visualizar os recibos e baixas de pagamentos" checked={(config as any)?.portal_mostrar_pagamentos ?? true} onCheckedChange={(v) => saveConfig({ portal_mostrar_pagamentos: v })} />
                <SwitchRow label="Mostrar Meus Dados" description="Permite ao cliente visualizar seu perfil e dados cadastrais" checked={(config as any)?.portal_mostrar_perfil ?? true} onCheckedChange={(v) => saveConfig({ portal_mostrar_perfil: v })} />
                <SwitchRow label="Mostrar Chave PIX" description="Exibe a chave PIX para pagamento no portal" checked={(config as any)?.portal_mostrar_pix ?? true} onCheckedChange={(v) => saveConfig({ portal_mostrar_pix: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
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

// Theme selector component
function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "dark" as const, label: "Escuro", icon: Moon },
    { value: "light" as const, label: "Claro", icon: Sun },
    { value: "system" as const, label: "Sistema", icon: Monitor },
  ];

  return (
    <div className="space-y-2">
      <Label>Tema da Interface</Label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <Button
            key={opt.value}
            variant={theme === opt.value ? "default" : "outline"}
            size="sm"
            className="gap-1.5 flex-1"
            onClick={() => setTheme(opt.value)}
          >
            <opt.icon className="h-4 w-4" />
            {opt.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {theme === "system" ? "O tema seguirá a preferência do seu sistema operacional." : `Tema ${theme === "dark" ? "escuro" : "claro"} ativo.`}
      </p>
    </div>
  );
}

// Sub-component for reward levels management
function NiveisRecompensaManager() {
  const { data: niveis } = useAllNiveisRecompensa();
  const addNivel = useAddNivelRecompensa();
  const updateNivel = useUpdateNivelRecompensa();
  const deleteNivel = useDeleteNivelRecompensa();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", pontos_minimos: "", cor: "#10b981", icone: "Star", beneficios: "" });

  const handleAdd = () => {
    if (!form.nome || !form.pontos_minimos) return;
    addNivel.mutate(
      { nome: form.nome, pontos_minimos: parseInt(form.pontos_minimos), cor: form.cor, icone: form.icone, beneficios: form.beneficios },
      { onSuccess: () => { setForm({ nome: "", pontos_minimos: "", cor: "#10b981", icone: "Star", beneficios: "" }); setShowForm(false); } }
    );
  };

  const CORES = ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Níveis de Recompensa</h3>
          <p className="text-xs text-muted-foreground">Defina faixas de pontos para classificar clientes indicadores</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Novo Nível
        </Button>
      </div>

      {showForm && (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome do nível</Label>
                <Input placeholder="Ex: Bronze" value={form.nome} onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pontos mínimos</Label>
                <Input type="number" min={0} placeholder="Ex: 50" value={form.pontos_minimos} onChange={(e) => setForm(p => ({ ...p, pontos_minimos: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Benefícios</Label>
              <Input placeholder="Ex: 5% de desconto em compras" value={form.beneficios} onChange={(e) => setForm(p => ({ ...p, beneficios: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-2">
                {CORES.map(c => (
                  <button key={c} className={cn("w-7 h-7 rounded-full border-2 transition-all", form.cor === c ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} onClick={() => setForm(p => ({ ...p, cor: c }))} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={addNivel.isPending}>{addNivel.isPending ? "Salvando..." : "Salvar"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {niveis && niveis.length > 0 ? (
        <div className="space-y-2">
          {niveis.map((n) => (
            <div key={n.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: n.cor + "22", color: n.cor }}>
                <Award className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{n.nome}</span>
                  <Badge variant="secondary" className="text-[10px]">{n.pontos_minimos}+ pts</Badge>
                  {!n.ativo && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inativo</Badge>}
                </div>
                {n.beneficios && <p className="text-xs text-muted-foreground truncate">{n.beneficios}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateNivel.mutate({ id: n.id, ativo: !n.ativo })}>
                  {n.ativo ? <Shield className="h-3 w-3" /> : <Shield className="h-3 w-3 text-muted-foreground" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNivel.mutate(n.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum nível cadastrado. Crie níveis como Bronze, Prata, Ouro para classificar seus indicadores.</p>
      )}
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
  const [uploading, setUploading] = useState(false);

  const handleChange = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${empresa.id}/logos/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('catalogo')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('catalogo')
        .getPublicUrl(filePath);

      onSave({ logo_url: publicUrl });
      toast.success("Logo atualizada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      onSave({ logo_url: null });
      toast.success("Logo removida!");
    } catch (error: any) {
      toast.error("Erro ao remover logo");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center py-4 border-b">
        <div className="relative group cursor-pointer overflow-hidden h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
          {empresa.logo_url ? (
            <img src={empresa.logo_url} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground opacity-50" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-20">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
            onChange={handleUploadLogo}
            disabled={uploading}
            title="Escolher imagem"
          />
        </div>
        
        <div className="space-y-1 flex-1">
          <h4 className="text-sm font-semibold">Logomarca da Empresa</h4>
          <p className="text-xs text-muted-foreground">Esta logo será exibida nos seus recibos, catálogo e portal do cliente.</p>
          <div className="flex gap-2 mt-3 items-center">
            <label className="relative inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-sm font-medium cursor-pointer transition-colors shadow-sm">
              {empresa.logo_url ? "Substituir Logo" : "Fazer Upload"}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={handleUploadLogo}
                disabled={uploading}
              />
            </label>
            {empresa.logo_url && (
              <Button variant="ghost" size="sm" className="text-destructive h-9" onClick={handleRemoveLogo}>
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <Label>Nome da Empresa</Label>
          <Input value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} onBlur={() => onSave({ nome: form.nome })} />
        </div>
        <div className="space-y-2">
          <Label>Razão Social</Label>
          <Input value={form.razao_social} onChange={(e) => handleChange("razao_social", e.target.value)} onBlur={() => onSave({ razao_social: form.razao_social })} />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input value={form.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} onBlur={() => onSave({ cnpj: form.cnpj })} />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={form.telefone} onChange={(e) => handleChange("telefone", e.target.value)} onBlur={() => onSave({ telefone: form.telefone })} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => handleChange("email", e.target.value)} onBlur={() => onSave({ email: form.email })} />
        </div>
        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input value={form.endereco} onChange={(e) => handleChange("endereco", e.target.value)} onBlur={() => onSave({ endereco: form.endereco })} />
        </div>
      </div>
      
      <div className="pt-4 flex justify-end">
        <Button onClick={() => onSave(form)} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Alterações
        </Button>
      </div>
    </div>
  );
}

// Sub-component for Representantes
function RepresentantesManager() {
  const { data: representantes } = useRepresentantes();
  const addRepresentante = useAddRepresentante();
  const updateRepresentante = useUpdateRepresentante();
  const deleteRepresentante = useDeleteRepresentante();
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", cor: "#3b82f6" });

  const handleAdd = () => {
    if (!form.nome) return;
    addRepresentante.mutate(form, {
      onSuccess: () => {
        setForm({ nome: "", telefone: "", email: "", cor: "#3b82f6" });
        setShowForm(false);
      }
    });
  };

  const formatPhone = (val: string) => {
    const v = val.replace(/\D/g, "");
    if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "").slice(0, 15);
  };

  const CORES = ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#6366f1"];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Cadastre os representantes para mostrá-los no mapa público das cidades atendidas.</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Representante
        </Button>
      </div>

      {showForm && (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input placeholder="Ex: João Silva" value={form.nome} onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp / Telefone</Label>
                <Input placeholder="Ex: (11) 99999-9999" value={form.telefone} onChange={(e) => setForm(p => ({ ...p, telefone: formatPhone(e.target.value) }))} maxLength={15} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input placeholder="Ex: joao@email.com" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cor no Mapa</Label>
                <div className="flex gap-2">
                  {CORES.map(c => (
                    <button key={c} className={cn("w-8 h-8 rounded-full border-2 transition-all", form.cor === c ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} onClick={() => setForm(p => ({ ...p, cor: c }))} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleAdd} disabled={addRepresentante.isPending}>{addRepresentante.isPending ? "Salvando..." : "Salvar Representante"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {representantes && representantes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {representantes.map(rep => (
            <Card key={rep.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: rep.cor }} />
                  <div>
                    <h4 className={cn("text-sm font-semibold", !rep.ativo && "line-through text-muted-foreground")}>{rep.nome}</h4>
                    <p className="text-xs text-muted-foreground">{rep.telefone || "Sem telefone"}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateRepresentante.mutate({ id: rep.id, ativo: !rep.ativo })} title={rep.ativo ? "Desativar" : "Ativar"}>
                    <Shield className={cn("h-3 w-3", !rep.ativo && "text-muted-foreground")} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteRepresentante.mutate(rep.id)} title="Excluir">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">Nenhum representante cadastrado.</p>
        </div>
      )}
    </div>
  );
}

// Sub-component for Cidades com cadastro em massa e geocoding
import { getCoordinatesForCity } from "@/lib/geocoding";

function CidadesMassaManager() {
  const { data: cidades } = useCidadesAtendidas();
  const { data: representantes } = useRepresentantes();
  const deleteCidade = useDeleteCidade();
  const addCidadesMassa = useAddCidadesMassa();

  const [textoMassa, setTextoMassa] = useState("");
  const [representanteSelecionado, setRepresentanteSelecionado] = useState("nenhum");
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [filtroRep, setFiltroRep] = useState<string>("todos");
  
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const filteredCidades = cidades?.filter(c => {
    if (filtroRep === "todos") return true;
    if (filtroRep === "nenhum") return !c.representante_id;
    return c.representante_id === filtroRep;
  });

  // Mapa de visão geral na administração
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([-15.78, -47.92], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapRef.current);
      markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const map = mapRef.current;
    const layerGroup = markersLayerRef.current;

    if (!layerGroup) return;
    layerGroup.clearLayers();

    const latLngs: L.LatLngTuple[] = [];

    filteredCidades?.forEach(c => {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;
      latLngs.push([lat, lng]);

      const rep = c.representantes as any;
      
      const marker = L.marker([lat, lng], { 
        icon: createColoredIcon(rep?.cor) 
      }).bindPopup(`<strong>${c.cidade}</strong><br/>Rep: ${rep?.nome || 'Nenhum'}`);
      
      layerGroup.addLayer(marker);
    });

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [filteredCidades]);

  const handleProcessMassa = async () => {
    if (!textoMassa.trim()) return;

    // Parser: divide por vírgula ou quebra de linha
    const cidadesRaw = textoMassa.split(/[\n,]/).map(t => t.trim()).filter(Boolean);
    const listaNormalizada: { cidade: string; estado: string }[] = [];

    // Remove duplicates based on array
    const cacheLocal = new Set<string>();

    for (const c of cidadesRaw) {
      // Tenta achar estado no formato "Cidade - UF" ou "Cidade/UF"
      const parts = c.split(/[-/]/);
      let nomeCidade = parts[0].trim();
      let est = parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : "";
      
      if (est.length > 2) est = ""; // Ignora se não parecer sigla
      
      const chaveParaCache = `${nomeCidade}-${est}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      
      // Checa duplicidade com existentes ignorando acentos
      const jaExisteNoBanco = cidades?.some(existente => {
        const existenteNormalizada = `${existente.cidade}-${existente.estado || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return existenteNormalizada === chaveParaCache;
      });

      if (!cacheLocal.has(chaveParaCache) && !jaExisteNoBanco) {
        listaNormalizada.push({ cidade: nomeCidade, estado: est });
        cacheLocal.add(chaveParaCache);
      }
    }

    if (listaNormalizada.length === 0) {
      toast.error("Nenhuma cidade nova válida identificada ou todas já cadastradas.");
      return;
    }

    setProcessando(true);
    setProgresso({ atual: 0, total: listaNormalizada.length });
    
    const finalData = [];
    const rep_id = representanteSelecionado !== "nenhum" ? representanteSelecionado : null;

    for (let i = 0; i < listaNormalizada.length; i++) {
        setProgresso(p => ({ ...p, atual: i }));
        const coords = await getCoordinatesForCity(listaNormalizada[i].cidade, listaNormalizada[i].estado);
        finalData.push({
            cidade: listaNormalizada[i].cidade,
            estado: listaNormalizada[i].estado || "",
            representante_id: rep_id,
            latitude: coords ? coords.latitude : null,
            longitude: coords ? coords.longitude : null,
            ativa: true
        });
    }

    setProgresso(p => ({ ...p, atual: listaNormalizada.length }));
    addCidadesMassa.mutate(finalData, {
      onSuccess: () => {
        setTextoMassa("");
        setProcessando(false);
        setRepresentanteSelecionado("nenhum");
      },
      onError: () => setProcessando(false)
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Adicionar Cidades (Em massa)</Label>
            <p className="text-xs text-muted-foreground">Cole de uma planilha, digite uma cidade por linha ou separadas por vírgula. Ex: São Paulo - SP, Rio de Janeiro - RJ.</p>
            <textarea
              className="w-full flex min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="São Paulo&#10;Salvador&#10;Feira de Santana&#10;Amargosa"
              value={textoMassa}
              onChange={(e) => setTextoMassa(e.target.value)}
              disabled={processando}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 w-full">
              <Label className="text-sm">Vincular Representante (Opcional)</Label>
              <Select value={representanteSelecionado} onValueChange={setRepresentanteSelecionado} disabled={processando}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um representante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum (Deixar sem representante)</SelectItem>
                  {representantes?.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.cor }} />
                         {r.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleProcessMassa} disabled={processando || !textoMassa.trim()}>
              {processando ? `Aguarde... ${progresso.atual}/${progresso.total}` : "Salvar Cidades"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 border-t space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Cidades Cadastradas ({cidades?.length || 0})</h3>
            <p className="text-xs text-muted-foreground font-medium">Use o mapa para conferir se todas as cidades estão na região correta.</p>
          </div>
          
          <div className="w-full sm:w-64 space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Filtrar Mapa e Lista</Label>
            <Select value={filtroRep} onValueChange={setFiltroRep}>
              <SelectTrigger className="h-8 text-xs bg-muted/30">
                <SelectValue placeholder="Todos os representantes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os representantes</SelectItem>
                <SelectItem value="nenhum">Sem representante</SelectItem>
                {representantes?.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
             <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-1 pr-2">
                {filteredCidades?.map((c) => {
                  const rep = c.representantes as any;
                  const faltaCoordenada = !c.latitude || !c.longitude;
                  
                  return (
                    <Dialog key={c.id}>
                      <DialogTrigger asChild>
                        <button className={cn("inline-flex items-center rounded-md border text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-1.5 py-1.5 px-2.5 shadow-sm", faltaCoordenada && "border-amber-300 bg-amber-50 text-amber-900 shadow-amber-100")}>
                          {rep && <div className="w-2 h-2 rounded-full ring-1 ring-black/10" style={{ backgroundColor: rep.cor || "#10b981" }} />}
                          {!rep && <div className="w-2 h-2 rounded-full bg-muted-foreground ring-1 ring-black/10" />}
                          <span>
                            {c.cidade}{c.estado ? ` - ${c.estado}` : ""}
                          </span>
                          {faltaCoordenada && <span className="text-[10px] ml-1 text-amber-700" title="Sem GPS">⚠</span>}
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar {c.cidade} {c.estado}</DialogTitle>
                          <DialogDescription>
                            Vincule a um representante ou informe a coordenada geográfica caso a busca automática não tenha achado.
                          </DialogDescription>
                        </DialogHeader>
                        <EditarCidadeModal cidade={c} representantes={representantes} />
                      </DialogContent>
                    </Dialog>
                  );
                })}
                {(!filteredCidades || filteredCidades.length === 0) && (
                  <p className="text-sm text-muted-foreground">Nenhuma cidade encontrada para este filtro.</p>
                )}
             </div>
          </div>

          <div className="lg:col-span-3 h-[400px] rounded-xl border border-border shadow-sm overflow-hidden bg-slate-50 relative z-0">
             <div ref={mapContainerRef} className="h-full w-full" />
             <div className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-sm p-2 rounded shadow-sm text-[10px] border">
               <p className="font-bold mb-1">Legenda</p>
               <div className="space-y-1">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> Sem GPS</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /> Sem Rep</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Ativa</div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditarCidadeModal({ cidade, representantes }: { cidade: any; representantes: any[] }) {
  const updateCidade = useUpdateCidade();
  const deleteCidade = useDeleteCidade();
  
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [repId, setRepId] = useState(cidade.representante_id || "nenhum");
  const [lat, setLat] = useState(cidade.latitude?.toString() || "");
  const [lng, setLng] = useState(cidade.longitude?.toString() || "");

  // Inicializa mapa para ajuste manual
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = parseFloat(lat) || -13.0; // Bahia default if null
    const initialLng = parseFloat(lng) || -42.0;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Se já tinha marcador, remove pra atualizar
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Cria marcador arrastável
    const marker = L.marker([initialLat, initialLng], { 
      draggable: true,
      icon: createColoredIcon(representantes.find(r => r.id === repId)?.cor)
    }).addTo(map);

    markerRef.current = marker;

    // Atualiza estados ao arrastar
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
    });

    // Permitir clique no mapa para mover
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setLat(e.latlng.lat.toFixed(6));
      setLng(e.latlng.lng.toFixed(6));
    });

    return () => {
      // Cleanup não necessário aqui pois o Dialog desmonta o conteúdo
    };
  }, [repId]); // Regera marcador se mudar rep (pra mudar cor)

  const handleSave = () => {
    updateCidade.mutate({
      id: cidade.id,
      representante_id: repId === "nenhum" ? null : repId,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null
    });
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Representante Responsável</Label>
            <Select value={repId} onValueChange={setRepId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um representante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum (Deixar sem representante)</SelectItem>
                {representantes?.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Latitude</Label>
              <Input placeholder="Ex: -13.8643" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Longitude</Label>
              <Input placeholder="Ex: -40.0827" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
             <p className="text-[11px] text-amber-800 leading-tight">
               <strong>Dica:</strong> Você pode arrastar o pino no mapa ao lado ou clicar em qualquer ponto do mapa para definir a localização exata da cidade.
             </p>
          </div>
        </div>

        <div className="h-[250px] rounded-lg border overflow-hidden bg-slate-100 relative shadow-inner">
           <div ref={mapContainerRef} className="h-full w-full z-0" />
        </div>
      </div>

      <div className="flex justify-between pt-4 mt-2 border-t">
         <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteCidade.mutate(cidade.id)}>
           <Trash2 className="h-4 w-4 mr-2" />Excluir Cidade
         </Button>
         <Button size="sm" onClick={handleSave} disabled={updateCidade.isPending}>
           {updateCidade.isPending ? "Salvando..." : "Confirmar Alterações"}
         </Button>
      </div>
    </div>
  );
}
