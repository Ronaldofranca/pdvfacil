import { useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Users, Search, Pencil, Trash2, Phone, History, RotateCcw, MessageCircle, Smartphone, Award, Star, ShieldCheck, Shield, UserCheck, ShoppingCart, MapPin, AlertTriangle } from "lucide-react";
import { normalizeSearch } from "@/lib/utils";
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
  
  const [search, setSearch, clearSearch] = usePersistentState("search", "", "clientes");
  const [formState, setFormState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [historicoState, setHistoricoState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const [pdvState, setPdvState] = useState<{ open: boolean; clienteId?: string; cart?: CartItem[] }>({ open: false });
  const [indicacoesState, setIndicacoesState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [portalState, setPortalState] = useState<{ open: boolean; data?: any }>({ open: false });
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mobileItem, setMobileItem] = useState<any | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const filtered = clientes?.filter((c: any) =>
    !c.is_merged && (
      normalizeSearch(c.nome).includes(normalizeSearch(search)) ||
      c.telefone?.includes(search) ||
      normalizeSearch(c.cidade ?? "").includes(normalizeSearch(search))
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

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 pr-20 h-11" placeholder="Buscar por nome, telefone ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={clearSearch}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* ── MOBILE: Card list ── */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Carregando...</p>
        ) : !filtered?.length ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhum cliente encontrado</p>
        ) : (
          <>
            {filtered.slice(0, visibleCount).map((c) => {
              const score = scores?.find((sc) => sc.clienteId === c.id);
              return (
                <Card key={c.id} className="p-0 overflow-hidden shadow-sm border border-border/50">
                  {/* Cabeçalho / Título (área de toque para abrir painel) */}
                  <div 
                    className="p-3 cursor-pointer active:bg-muted/60 transition-colors" 
                    onClick={() => setMobileItem(c)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-base text-foreground truncate">{c.nome}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                          {c.telefone && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                              <Phone className="w-3 h-3" /> {c.telefone}
                            </span>
                          )}
                          {c.cidade && (
                            <span className="flex items-center gap-1 truncate text-[11px] opacity-80">
                              <MapPin className="w-3 h-3" /> {c.cidade}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {score?.classificacao === "Risco" && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" /> Atraso
                          </div>
                        )}
                        {c.ativo === false && (
                          <div className="text-[10px] uppercase font-bold text-muted-foreground border border-border px-1.5 rounded">Inativo</div>
                        )}
                        {(c as any).permitir_fiado && (
                          <div className="text-[11px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/20 flex items-center gap-1">
                            {(() => {
                              const val = (((c as any).limite_credito_total || 1000) - ((c as any).limite_utilizado || 0));
                              return val > 0 
                                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
                                : <span className="text-destructive">Bloqueado</span>;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linha de Ações (Ações Rápidas) */}
                  <div className="flex items-center border-t border-border/50 divide-x divide-border/50 bg-muted/10">
                    {c.telefone && (
                      <>
                        <Button 
                          variant="ghost" 
                          className="flex-1 rounded-none h-11 text-xs font-semibold gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                          asChild
                        >
                          <a href={`tel:${c.telefone.replace(/\D/g, '')}`} onClick={(e) => e.stopPropagation()}>
                            <Phone className="w-4 h-4" /> Ligar
                          </a>
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="flex-1 rounded-none h-11 text-xs font-semibold gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                          asChild
                        >
                          <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <MessageCircle className="w-4 h-4" /> Whats
                          </a>
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="ghost" 
                      className="flex-1 rounded-none h-11 text-xs font-semibold gap-1.5 text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdvState({ open: true, clienteId: c.id });
                      }}
                    >
                      <ShoppingCart className="w-4 h-4" /> Vender
                    </Button>
                  </div>
                </Card>
              );
            })}
            
            {filtered.length > visibleCount && (
              <Button 
                variant="outline" 
                className="w-full mt-4 bg-background" 
                onClick={() => setVisibleCount(v => v + 20)}
              >
                Carregar mais...
              </Button>
            )}
          </>
        )}
      </div>

      {/* ── DESKTOP: Tabela completa ── */}
      <Card className="hidden md:block overflow-x-auto pb-2">
        <Table className="whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Limite Disp.</TableHead>
              <TableHead className="w-12 text-center">St.</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow 
                  key={c.id} 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => setFormState({ open: true, data: c })}
                  title="Clique para editar este cliente"
                >
                  <TableCell className="font-mono text-[10px] text-muted-foreground">#{c.id.split("-")[0]}</TableCell>
                  <TableCell>
                    <div className="max-w-[160px] lg:max-w-[220px] xl:max-w-[320px]">
                      <p className="font-medium truncate" title={c.nome}>{c.nome}</p>
                      {c.email && <p className="text-xs text-muted-foreground truncate" title={c.email}>{c.email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.telefone ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />{c.telefone}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[120px] lg:max-w-[160px] xl:max-w-[200px] truncate text-sm" title={`${c.cidade || "—"}${c.estado ? ` / ${c.estado}` : ""}`}>
                      {c.cidade || "—"}{c.estado ? ` / ${c.estado}` : ""}
                    </div>
                  </TableCell>
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
                    {c.permitir_fiado ? (
                      <span className="text-xs font-bold text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((c.limite_credito_total || 1000) - (c.limite_utilizado || 0))}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={c.ativo ? "default" : "secondary"} className="min-w-[24px] justify-center p-0.5 px-2" title={c.ativo ? "Ativo" : "Inativo"}>
                      {c.ativo ? "A" : "I"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
