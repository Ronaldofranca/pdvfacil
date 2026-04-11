import { useState } from "react";
import { Users, Search, Pencil, Trash2, Phone, History, RotateCcw, MessageCircle, Smartphone, Award, Star, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useClientes, useDeleteCliente } from "@/hooks/useClientes";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { HistoricoCompras } from "@/components/clientes/HistoricoCompras";
import { HabilitarPortalDialog } from "@/components/clientes/HabilitarPortalDialog";
import { ImportarContatos } from "@/components/clientes/ImportarContatos";
import { IndicacoesCliente } from "@/components/clientes/IndicacoesCliente";
import { MergeClientesDialog } from "@/components/clientes/MergeClientesDialog";
import { PDVModal } from "@/components/vendas/PDVModal";
import { useNiveisRecompensa, getNivelAtual } from "@/hooks/useNiveisRecompensa";
import { useClienteScores } from "@/hooks/useClienteScore";
import { MobileRowActions, mobileRowProps } from "@/components/layout/MobileRowActions";
import type { CartItem } from "@/hooks/useVendas";

function ClienteLevelBadge({ pontos, niveis }: { pontos: number; niveis: any[] | undefined }) {
  if (!niveis?.length) return null;
  const nivel = getNivelAtual(pontos, niveis);
  if (!nivel) return null;
  return (
    <Badge variant="outline" className="gap-1 text-[10px]" style={{ borderColor: nivel.cor, color: nivel.cor }}>
      <Award className="w-3 h-3" /> {nivel.nome}
    </Badge>
  );
}

export default function ClientesPage() {
  const isMobile = useIsMobile();
  const { isAdmin } = usePermissions();
  const { data: clientes, isLoading } = useClientes();
  const deleteCliente = useDeleteCliente();
  const { data: niveis } = useNiveisRecompensa();
  const { data: scores } = useClienteScores();

  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [historicoState, setHistoricoState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const [pdvState, setPdvState] = useState<{ open: boolean; clienteId?: string; cart?: CartItem[] }>({ open: false });
  const [indicacoesState, setIndicacoesState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [portalState, setPortalState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mobileItem, setMobileItem] = useState<any | null>(null);

  const filtered = clientes?.filter((c: any) =>
    !c.is_merged && (
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone?.includes(search) ||
      c.cidade?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">CRM — Gestão de clientes</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMergeOpen(true)}>
              <Users className="w-4 h-4" /> Mesclar Duplicados
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Smartphone className="w-4 h-4" /> Importar Contatos
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setFormState({ open: true })}>
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, telefone ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* ── MOBILE: Card list ── */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Carregando...</p>
        ) : !filtered?.length ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhum cliente encontrado</p>
        ) : (
          filtered.map((c) => {
            const score = scores?.find((sc) => sc.clienteId === c.id);
            return (
              <button
                key={c.id}
                type="button"
                className="w-full text-left"
                onClick={() => setMobileItem(c)}
                aria-label={`Abrir ações do cliente ${c.nome}`}
              >
                <Card className="p-3 active:bg-muted/60 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{c.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {c.telefone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{c.telefone}
                          </span>
                        )}
                        {c.cidade && <span className="text-xs text-muted-foreground">{c.cidade}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px]">{c.ativo ? "Ativo" : "Inativo"}</Badge>
                      {score && (
                        <Badge variant="outline" className={`gap-1 text-[10px] ${score.cor}`}>
                          <ShieldCheck className="w-2.5 h-2.5" /> {score.classificacao}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </button>
            );
          })
        )}
      </div>

      {/* ── DESKTOP: Tabela completa ── */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">#{c.id.split("-")[0]}</TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.nome}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.telefone ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />{c.telefone}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{c.cidade || "—"}{c.estado ? ` / ${c.estado}` : ""}</TableCell>
                  <TableCell>
                    {(() => {
                      const s = scores?.find((sc) => sc.clienteId === c.id);
                      if (!s) return <span className="text-xs text-muted-foreground">—</span>;
                      return (
                        <Badge variant="outline" className={`gap-1 text-[10px] ${s.cor}`}>
                          <ShieldCheck className="w-3 h-3" /> {s.classificacao} ({s.score})
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell><ClienteLevelBadge pontos={Number(c.pontos_indicacao)} niveis={niveis} /></TableCell>
                  <TableCell>
                    {Number(c.pontos_indicacao) > 0 ? (
                      <Badge variant="outline" className="gap-1 text-xs"><Star className="w-3 h-3 text-yellow-500" /> {Number(c.pontos_indicacao)}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.telefone && (
                        <Button variant="ghost" size="icon" title="WhatsApp" asChild>
                          <a href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-4 h-4 text-green-600" />
                          </a>
                        </Button>
                      )}
                      {isAdmin && (
                        <Button variant="ghost" size="icon" title={c.user_id ? "Portal ativo" : "Habilitar Portal"} onClick={() => setPortalState({ open: true, data: c })}>
                          <UserCheck className={`w-4 h-4 ${c.user_id ? "text-green-600" : "text-muted-foreground"}`} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Repetir última venda" onClick={() => setPdvState({ open: true, clienteId: c.id })}><RotateCcw className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" title="Indicações" onClick={() => setIndicacoesState({ open: true, data: c })}><Award className="w-4 h-4 text-yellow-500" /></Button>
                      <Button variant="ghost" size="icon" title="Histórico" onClick={() => setHistoricoState({ open: true, data: c })}><History className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setFormState({ open: true, data: c })}><Pencil className="w-4 h-4" /></Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => deleteCliente.mutate(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile client actions drawer */}
      <MobileRowActions
        open={isMobile && !!mobileItem}
        onOpenChange={(open) => !open && setMobileItem(null)}
        title="Ações do cliente"
        summary={mobileItem && (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{mobileItem.nome}</p>
            {mobileItem.telefone && <p className="text-sm text-muted-foreground">{mobileItem.telefone}</p>}
            {mobileItem.cidade && <p className="text-xs text-muted-foreground">{mobileItem.cidade}{mobileItem.estado ? ` / ${mobileItem.estado}` : ""}</p>}
          </div>
        )}
      >
        {mobileItem?.telefone && (
          <Button className="w-full justify-start gap-2" variant="outline" asChild>
            <a href={`https://wa.me/55${mobileItem.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 text-green-600" /> WhatsApp
            </a>
          </Button>
        )}
        <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); setHistoricoState({ open: true, data: mobileItem }); }}>
          <History className="w-4 h-4" /> Histórico de compras
        </Button>
        <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); setIndicacoesState({ open: true, data: mobileItem }); }}>
          <Award className="w-4 h-4 text-yellow-500" /> Indicações
        </Button>
        <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); setPdvState({ open: true, clienteId: mobileItem.id }); }}>
          <RotateCcw className="w-4 h-4" /> Repetir última venda
        </Button>
        <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); setFormState({ open: true, data: mobileItem }); }}>
          <Pencil className="w-4 h-4" /> Editar cliente
        </Button>
        {isAdmin && (
          <>
            <Button className="w-full justify-start gap-2" variant="outline" onClick={() => { setMobileItem(null); setPortalState({ open: true, data: mobileItem }); }}>
              <UserCheck className="w-4 h-4" /> {mobileItem?.user_id ? "Portal ativo" : "Habilitar Portal"}
            </Button>
            <Button className="w-full justify-start gap-2" variant="destructive" onClick={() => { setMobileItem(null); deleteCliente.mutate(mobileItem.id); }}>
              <Trash2 className="w-4 h-4" /> Excluir cliente
            </Button>
          </>
        )}
      </MobileRowActions>

      <MergeClientesDialog open={mergeOpen} onOpenChange={setMergeOpen} />
      <ClienteForm open={formState.open} onOpenChange={(v) => setFormState({ open: v })} cliente={formState.data} />
      <HistoricoCompras open={historicoState.open} onOpenChange={(v) => setHistoricoState({ open: v })} cliente={historicoState.data} />
      <ImportarContatos open={importOpen} onOpenChange={setImportOpen} />
      <IndicacoesCliente open={indicacoesState.open} onOpenChange={(v) => setIndicacoesState({ open: v })} cliente={indicacoesState.data} />
      <HabilitarPortalDialog open={portalState.open} onOpenChange={(v) => setPortalState({ open: v })} cliente={portalState.data} />
      <PDVModal
        open={pdvState.open}
        onOpenChange={(v) => setPdvState({ open: v })}
        initialClienteId={pdvState.clienteId}
      />
    </div>
  );
}
