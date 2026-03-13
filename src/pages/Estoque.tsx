import { useState } from "react";
import { Warehouse, Search, Plus, ArrowDownUp, TrendingUp, TrendingDown, AlertTriangle, Wrench, PackagePlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstoque, useMovimentos, useVendedores } from "@/hooks/useEstoque";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { MovimentoForm } from "@/components/estoque/MovimentoForm";
import { EntradaLoteForm } from "@/components/estoque/EntradaLoteForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_CONFIG: Record<string, { label: string; icon: any; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  venda: { label: "Venda", icon: TrendingDown, variant: "default" },
  reposicao: { label: "Reposição", icon: TrendingUp, variant: "secondary" },
  dano: { label: "Dano", icon: AlertTriangle, variant: "destructive" },
  ajuste: { label: "Ajuste", icon: Wrench, variant: "outline" },
};

export default function EstoquePage() {
  const { isAdmin, isGerente } = usePermissions();
  const { user } = useAuth();
  const canViewAll = isAdmin || isGerente;

  const [vendedorFilter, setVendedorFilter] = useState<string>(canViewAll ? "todos" : (user?.id ?? ""));
  const [search, setSearch] = useState("");
  const [movOpen, setMovOpen] = useState(false);
  const [loteOpen, setLoteOpen] = useState(false);

  const effectiveVendedor = vendedorFilter === "todos" ? undefined : vendedorFilter;
  const { data: estoque, isLoading: loadingEstoque } = useEstoque(effectiveVendedor);
  const { data: movimentos, isLoading: loadingMov } = useMovimentos({ vendedorId: effectiveVendedor });
  const { data: vendedores } = useVendedores();

  const filteredEstoque = estoque?.filter((e) =>
    (e as any).produtos?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMov = movimentos?.filter((m) =>
    (m as any).produtos?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Warehouse className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Estoque</h1>
            <p className="text-sm text-muted-foreground">Controle de estoque por vendedor</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLoteOpen(true)}>
            <PackagePlus className="w-4 h-4" /> Entrada em Lote
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setMovOpen(true)}>
            <Plus className="w-4 h-4" /> Novo Movimento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canViewAll && (
          <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vendedores</SelectItem>
              {vendedores?.map((v) => (
                <SelectItem key={v.user_id} value={v.user_id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="estoque">
        <TabsList>
          <TabsTrigger value="estoque" className="gap-1.5"><Warehouse className="w-4 h-4" />Saldo</TabsTrigger>
          <TabsTrigger value="movimentos" className="gap-1.5"><ArrowDownUp className="w-4 h-4" />Movimentos</TabsTrigger>
        </TabsList>

        {/* ─── SALDO ─── */}
        <TabsContent value="estoque">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEstoque ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : !filteredEstoque?.length ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum estoque encontrado</TableCell></TableRow>
                ) : (
                  filteredEstoque.map((e) => {
                    const qty = Number(e.quantidade);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <p className="font-medium">{(e as any).produtos?.nome}</p>
                          {(e as any).produtos?.codigo && <p className="text-xs text-muted-foreground">{(e as any).produtos.codigo}</p>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={qty <= 0 ? "destructive" : qty < 5 ? "secondary" : "default"}>
                            {qty} {(e as any).produtos?.unidade ?? "un"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(e.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── MOVIMENTOS ─── */}
        <TabsContent value="movimentos">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Obs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMov ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : !filteredMov?.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum movimento encontrado</TableCell></TableRow>
                ) : (
                  filteredMov.map((m) => {
                    const cfg = TIPO_CONFIG[m.tipo] ?? TIPO_CONFIG.ajuste;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{(m as any).produtos?.nome}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="gap-1">
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{Number(m.quantidade)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(m.data), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.observacoes || "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <MovimentoForm open={movOpen} onOpenChange={setMovOpen} />
      <EntradaLoteForm open={loteOpen} onOpenChange={setLoteOpen} />
    </div>
  );
}
