import { useState } from "react";
import { Truck, Calendar, ChevronDown, ChevronUp, User, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRomaneios } from "@/hooks/useRomaneios";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function RomaneioPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [dataFiltro, setDataFiltro] = useState(today);
  const { data: romaneios, isLoading } = useRomaneios(dataFiltro);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const totalGeral = romaneios?.reduce((s, r) => s + r.valor_total, 0) ?? 0;
  const totalVendas = romaneios?.reduce((s, r) => s + r.vendas.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Romaneio</h1>
            <p className="text-sm text-muted-foreground">Vendas agrupadas por vendedor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Vendedores</p>
            <p className="text-2xl font-bold text-foreground">{romaneios?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Vendas</p>
            <p className="text-2xl font-bold text-foreground">{totalVendas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-primary">{fmt(totalGeral)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : !romaneios?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma venda finalizada nesta data.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {romaneios.map((r) => (
            <Card key={r.vendedor_id}>
              <CardHeader
                className="cursor-pointer py-3 px-4"
                onClick={() => toggle(r.vendedor_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent">
                      <User className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{r.vendedor_nome}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {r.vendas.length} venda{r.vendas.length !== 1 && "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">{fmt(r.valor_total)}</span>
                    {expanded[r.vendedor_id] ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {expanded[r.vendedor_id] && (
                <CardContent className="pt-0 px-4 pb-4">
                  <Separator className="mb-3" />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.vendas.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{v.id.slice(0, 8)}</TableCell>
                          <TableCell className="font-medium">{v.cliente_nome ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(v.data_venda), "HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{fmt(v.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
