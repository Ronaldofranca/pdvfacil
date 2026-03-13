import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Search, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAddMovimentoLote, useVendedores, useEstoque } from "@/hooks/useEstoque";
import { useProdutos, useCategorias } from "@/hooks/useProdutos";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

const ORIGENS = [
  { value: "reposicao", label: "Reposição / Compra" },
  { value: "ajuste", label: "Ajuste / Devolução" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntradaLoteForm({ open, onOpenChange }: Props) {
  const { profile, user } = useAuth();
  const { isAdmin, isGerente } = usePermissions();
  const { data: produtos } = useProdutos();
  const { data: categorias } = useCategorias();
  const { data: vendedores } = useVendedores();
  const { data: estoqueData } = useEstoque(undefined);
  const addLote = useAddMovimentoLote();

  const canSelectVendedor = isAdmin || isGerente;

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [vendedorId, setVendedorId] = useState(user?.id ?? "");
  const [tipo, setTipo] = useState<string>("reposicao");
  const [observacoes, setObservacoes] = useState("");
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const produtosAtivos = useMemo(() =>
    (produtos ?? []).filter((p) => p.ativo),
    [produtos]
  );

  const estoqueMap = useMemo(() => {
    const map = new Map<string, number>();
    estoqueData?.forEach((e) => {
      const key = e.produto_id;
      map.set(key, (map.get(key) ?? 0) + Number(e.quantidade));
    });
    return map;
  }, [estoqueData]);

  const filtered = useMemo(() => {
    let list = produtosAtivos;
    if (catFilter !== "todas") {
      list = list.filter((p) => p.categoria_id === catFilter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((p) =>
        p.nome.toLowerCase().includes(s) || p.codigo?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [produtosAtivos, catFilter, search]);

  const itensPreenchidos = useMemo(() => {
    return Object.entries(quantidades)
      .map(([id, val]) => ({ produto_id: id, quantidade: parseFloat(val) || 0 }))
      .filter((i) => i.quantidade > 0);
  }, [quantidades]);

  const totalItens = itensPreenchidos.reduce((s, i) => s + i.quantidade, 0);

  const setQtd = (produtoId: string, value: string) => {
    setQuantidades((prev) => ({ ...prev, [produtoId]: value }));
  };

  const handleConfirm = () => {
    if (!profile || !user) return;
    if (itensPreenchidos.length === 0) return;

    addLote.mutate(
      {
        empresa_id: profile.empresa_id,
        vendedor_id: canSelectVendedor ? vendedorId : user.id,
        tipo: tipo as "reposicao" | "ajuste",
        observacoes,
        itens: itensPreenchidos,
      },
      {
        onSuccess: () => {
          setQuantidades({});
          setObservacoes("");
          setShowConfirm(false);
          onOpenChange(false);
        },
      }
    );
  };

  const handleReset = () => {
    setQuantidades({});
    setSearch("");
    setCatFilter("todas");
    setObservacoes("");
    setShowConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Entrada em Lote
          </DialogTitle>
        </DialogHeader>

        {showConfirm ? (
          /* ─── CONFIRMAÇÃO ─── */
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1">
              <p className="text-sm font-semibold text-foreground">Resumo da Entrada em Lote</p>
              <p className="text-sm text-muted-foreground">
                <strong>{itensPreenchidos.length}</strong> produto(s) · <strong>{totalItens}</strong> unidade(s) total
              </p>
              <p className="text-sm text-muted-foreground">
                Tipo: <strong>{ORIGENS.find((o) => o.value === tipo)?.label}</strong>
              </p>
              {observacoes && (
                <p className="text-sm text-muted-foreground">Obs: {observacoes}</p>
              )}
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensPreenchidos.map((item) => {
                    const prod = produtosAtivos.find((p) => p.id === item.produto_id);
                    return (
                      <TableRow key={item.produto_id}>
                        <TableCell>
                          <p className="font-medium">{prod?.nome ?? "—"}</p>
                          {prod?.codigo && <p className="text-xs text-muted-foreground">{prod.codigo}</p>}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">+{item.quantidade}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Voltar</Button>
              <Button onClick={handleConfirm} disabled={addLote.isPending} className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {addLote.isPending ? "Registrando..." : "Confirmar Entrada"}
              </Button>
            </div>
          </div>
        ) : (
          /* ─── FORMULÁRIO ─── */
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Dados gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo / Origem *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORIGENS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canSelectVendedor && (
                <div>
                  <Label>Vendedor *</Label>
                  <Select value={vendedorId} onValueChange={setVendedorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {vendedores?.map((v) => (
                        <SelectItem key={v.user_id} value={v.user_id}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Observação geral</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: NF 12345, Fornecedor XYZ..."
                  maxLength={500}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas categorias</SelectItem>
                  {categorias?.filter((c) => c.ativa).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabela de produtos */}
            <Card className="max-h-[340px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="w-[120px] text-right">Qtd Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filtered.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => {
                      const estoqueAtual = estoqueMap.get(p.id) ?? 0;
                      const catNome = (p as any).categorias?.nome;
                      const val = quantidades[p.id] ?? "";
                      return (
                        <TableRow key={p.id} className={val && parseFloat(val) > 0 ? "bg-primary/5" : ""}>
                          <TableCell>
                            <p className="font-medium text-sm">{p.nome}</p>
                            {p.codigo && <p className="text-xs text-muted-foreground">{p.codigo}</p>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{catNome ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={estoqueAtual <= 0 ? "destructive" : estoqueAtual < 5 ? "secondary" : "outline"}>
                              {estoqueAtual} {p.unidade ?? "un"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              className="w-[100px] ml-auto text-right"
                              value={val}
                              onChange={(e) => setQtd(p.id, e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Rodapé */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                {itensPreenchidos.length > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <strong>{itensPreenchidos.length}</strong> produto(s) · <strong>{totalItens}</strong> un total
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Informe a quantidade nos produtos desejados
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={itensPreenchidos.length === 0}
                >
                  Revisar e Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
