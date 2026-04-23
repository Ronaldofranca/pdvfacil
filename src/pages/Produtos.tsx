import { useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { Package, Tags, BoxesIcon, Pencil, Trash2, Search } from "lucide-react";
import { normalizeSearch } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useProdutos, useCategorias, useKits, useDeleteProduto, useDeleteKit } from "@/hooks/useProdutos";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProdutoForm } from "@/components/produtos/ProdutoForm";
import { KitForm } from "@/components/produtos/KitForm";
import { CategoriaForm } from "@/components/produtos/CategoriaForm";
import { MobileRowActions, mobileRowProps } from "@/components/layout/MobileRowActions";

export default function ProdutosPage() {
  const isMobile = useIsMobile();
  const { canEditProduto } = usePermissions();
  const { data: produtos, isLoading: loadingProd } = useProdutos();
  const { data: categorias, isLoading: loadingCat } = useCategorias();
  const { data: kits, isLoading: loadingKit } = useKits();
  const deleteProduto = useDeleteProduto();
  const deleteKit = useDeleteKit();
  
  const [search, setSearch, clearSearch] = usePersistentState("search", "", "produtos");
  const [produtoForm, setProdutoForm] = useState<{ open: boolean; data?: any }>({ open: false });
  const [kitForm, setKitForm] = useState<{ open: boolean; data?: any }>({ open: false });
  const [catForm, setCatForm] = useState<{ open: boolean; data?: any }>({ open: false });
  const [mobileItem, setMobileItem] = useState<any | null>(null);
  const [mobileCat, setMobileCat] = useState<any | null>(null);

  const filteredProdutos = produtos?.filter((p) =>
    normalizeSearch(p.nome).includes(normalizeSearch(search)) ||
    normalizeSearch(p.codigo ?? "").includes(normalizeSearch(search))
  );

  const filteredKits = kits?.filter((k) =>
    normalizeSearch(k.nome).includes(normalizeSearch(search))
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Produtos</h1>
            <p className="text-sm text-muted-foreground">Catálogo de produtos e kits</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 pr-20 h-11" placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)} />
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

      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos" className="gap-1.5"><Package className="w-4 h-4" />Produtos</TabsTrigger>
          <TabsTrigger value="kits" className="gap-1.5"><BoxesIcon className="w-4 h-4" />Kits</TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5"><Tags className="w-4 h-4" />Categorias</TabsTrigger>
        </TabsList>

        {/* ─── PRODUTOS TAB ─── */}
        <TabsContent value="produtos" className="space-y-4">
          {canEditProduto && (
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => setProdutoForm({ open: true })}>
                <Plus className="w-4 h-4" /> Novo Produto
              </Button>
            </div>
          )}

          {isMobile && (
            <p className="px-1 text-xs text-muted-foreground">Toque em um produto para abrir ações.</p>
          )}

          {/* ── MOBILE: Cards ── */}
          <div className="md:hidden space-y-2">
            {loadingProd ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Carregando...</p>
            ) : !filteredProdutos?.length ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Nenhum produto encontrado</p>
            ) : (
              filteredProdutos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => setMobileItem(p)}
                  aria-label={`Abrir ações do produto ${p.nome}`}
                >
                  <Card className="p-3 active:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3">
                      {p.imagem_url ? (
                        <img src={p.imagem_url} alt={p.nome} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">{p.nome}</p>
                        {p.codigo && <p className="text-xs text-muted-foreground">{p.codigo}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold text-primary">{fmt(Number(p.preco))}</span>
                        <Badge variant={p.ativo ? "default" : "secondary"} className="text-[10px]">{p.ativo ? "Ativo" : "Inativo"}</Badge>
                      </div>
                    </div>
                  </Card>
                </button>
              ))
            )}
          </div>

          {/* ── DESKTOP: Tabela completa ── */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Status</TableHead>
                  {canEditProduto && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProd ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : !filteredProdutos?.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell></TableRow>
                ) : (
                  filteredProdutos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {p.imagem_url ? (
                            <img src={p.imagem_url} alt={p.nome} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <p className="truncate">{p.nome}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.codigo || "—"}</TableCell>
                      <TableCell>{(p as any).categorias?.nome || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(Number(p.custo))}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(p.preco))}</TableCell>
                      <TableCell><Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                      {canEditProduto && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setProdutoForm({ open: true, data: p })}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteProduto.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── KITS TAB ─── */}
        <TabsContent value="kits" className="space-y-4">
          {canEditProduto && (
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => setKitForm({ open: true })}>
                <Plus className="w-4 h-4" /> Novo Kit
              </Button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingKit ? (
              <p className="text-muted-foreground col-span-full text-center py-8">Carregando...</p>
            ) : !filteredKits?.length ? (
              <p className="text-muted-foreground col-span-full text-center py-8">Nenhum kit encontrado</p>
            ) : (
              filteredKits.map((k) => (
                <Card key={k.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{k.nome}</h3>
                      <p className="text-lg font-bold text-primary">{fmt(Number(k.preco))}</p>
                    </div>
                    <Badge variant={k.ativo ? "default" : "secondary"}>{k.ativo ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  {k.descricao && <p className="text-sm text-muted-foreground">{k.descricao}</p>}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Itens do kit</p>
                    {(k as any).kit_itens?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.produtos?.nome}</span>
                        <span className="text-muted-foreground">×{Number(item.quantidade)}</span>
                      </div>
                    ))}
                    {!(k as any).kit_itens?.length && <p className="text-sm text-muted-foreground">Sem itens</p>}
                  </div>
                  {canEditProduto && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setKitForm({ open: true, data: k })}>
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteKit.mutate(k.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ─── CATEGORIAS TAB ─── */}
        <TabsContent value="categorias" className="space-y-4">
          {canEditProduto && (
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => setCatForm({ open: true })}>
                <Plus className="w-4 h-4" /> Nova Categoria
              </Button>
            </div>
          )}

          {isMobile && (
            <p className="px-1 text-xs text-muted-foreground">
              Toque em uma categoria para editar.
            </p>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  {!isMobile && <TableHead>Descrição</TableHead>}
                  {!isMobile && canEditProduto && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCat ? (
                  <TableRow><TableCell colSpan={isMobile ? 1 : 3} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : !categorias?.length ? (
                  <TableRow><TableCell colSpan={isMobile ? 1 : 3} className="text-center text-muted-foreground py-8">Nenhuma categoria</TableCell></TableRow>
                ) : (
                  categorias.map((c) => (
                    <TableRow
                      key={c.id}
                      {...mobileRowProps(isMobile && canEditProduto, () => setMobileCat(c), `Editar categoria ${c.nome}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="min-w-0">
                          <p>{c.nome}</p>
                          {isMobile && c.descricao && <p className="text-xs text-muted-foreground truncate">{c.descricao}</p>}
                        </div>
                      </TableCell>
                      {!isMobile && <TableCell className="text-muted-foreground">{c.descricao || "—"}</TableCell>}
                      {!isMobile && canEditProduto && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setCatForm({ open: true, data: c })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mobile product actions drawer */}
      <MobileRowActions
        open={isMobile && !!mobileItem}
        onOpenChange={(open) => !open && setMobileItem(null)}
        title="Ações do produto"
        summary={mobileItem && (
          <div className="flex items-center gap-3">
            {mobileItem.imagem_url ? (
              <img src={mobileItem.imagem_url} alt={mobileItem.nome} className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{mobileItem.nome}</p>
              <p className="text-sm font-bold text-primary">{fmt(Number(mobileItem.preco))}</p>
              {mobileItem.codigo && <p className="text-xs text-muted-foreground">{mobileItem.codigo}</p>}
            </div>
          </div>
        )}
      >
        {canEditProduto && (
          <>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => { setMobileItem(null); setProdutoForm({ open: true, data: mobileItem }); }}
            >
              <Pencil className="w-4 h-4" /> Editar produto
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="destructive"
              onClick={() => { setMobileItem(null); deleteProduto.mutate(mobileItem.id); }}
            >
              <Trash2 className="w-4 h-4" /> Excluir produto
            </Button>
          </>
        )}
      </MobileRowActions>

      {/* Mobile category actions drawer */}
      <MobileRowActions
        open={isMobile && !!mobileCat}
        onOpenChange={(open) => !open && setMobileCat(null)}
        title="Ações da categoria"
        summary={mobileCat && (
          <div>
            <p className="font-semibold text-foreground">{mobileCat.nome}</p>
            {mobileCat.descricao && <p className="text-sm text-muted-foreground">{mobileCat.descricao}</p>}
          </div>
        )}
      >
        {canEditProduto && (
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={() => { setMobileCat(null); setCatForm({ open: true, data: mobileCat }); }}
          >
            <Pencil className="w-4 h-4" /> Editar categoria
          </Button>
        )}
      </MobileRowActions>

      {/* Forms */}
      <ProdutoForm open={produtoForm.open} onOpenChange={(v) => setProdutoForm({ open: v })} produto={produtoForm.data} />
      <KitForm open={kitForm.open} onOpenChange={(v) => setKitForm({ open: v })} kit={kitForm.data} />
      <CategoriaForm open={catForm.open} onOpenChange={(v) => setCatForm({ open: v })} categoria={catForm.data} />
    </div>
  );
}
