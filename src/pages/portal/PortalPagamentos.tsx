import { Receipt, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";

function fmtR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PortalPagamentosPage() {
  const { config } = useOutletContext<{ config: any }>();
  const { cliente } = usePortalAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (config && config.portal_mostrar_pagamentos === false) {
    return <Navigate to="/portal" replace />;
  }

  // Busca pagamentos do cliente em duas etapas para evitar problema de tipos do Supabase:
  // 1) busca IDs das parcelas do cliente → 2) busca pagamentos dessas parcelas
  // Segurança garantida: apenas parcelas com cliente_id = cliente.id são usadas como filtro
  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ["portal-pagamentos", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      // Passo 1 — IDs das parcelas desta cliente
      const { data: parcelasData } = await supabase
        .from("parcelas")
        .select("id, numero, vencimento, valor_total")
        .eq("cliente_id", cliente!.id);

      const parcelaIds = (parcelasData ?? []).map((p) => p.id);
      if (parcelaIds.length === 0) return [];

      // Mapa parcela_id → info da parcela
      const parcelasMap = Object.fromEntries(
        (parcelasData ?? []).map((p) => [p.id, p])
      );

      // Passo 2 — Pagamentos dessas parcelas
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, valor_pago, forma_pagamento, data_pagamento, observacoes, parcela_id")
        .in("parcela_id", parcelaIds)
        .order("data_pagamento", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enriquece com info da parcela
      return (data ?? []).map((pg: any) => ({
        ...pg,
        parcela: parcelasMap[pg.parcela_id] ?? null,
      }));
    },
  });

  const totalPago = pagamentos?.reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <Receipt className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Meus Pagamentos</h2>
      </div>

      {/* Summary Card */}
      {!isLoading && pagamentos && pagamentos.length > 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-foreground">Total Pago</p>
                <p className="text-xs text-muted-foreground">{pagamentos.length} pagamento{pagamentos.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <p className="text-lg font-bold text-green-600">{fmtR(totalPago)}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : !pagamentos?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum pagamento registrado ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {pagamentos.map((pg: any) => {
            const parcela = pg.parcelas;
            const isExpanded = expandedId === pg.id;
            return (
              <Card key={pg.id}>
                <CardContent className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : pg.id)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {format(new Date(pg.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        {pg.forma_pagamento && (
                          <Badge variant="outline" className="text-[10px]">
                            {pg.forma_pagamento}
                          </Badge>
                        )}
                      </div>
                      {parcela && (
                        <p className="text-xs text-muted-foreground">
                          Parcela {parcela.numero} — venc. {format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-green-600">{fmtR(Number(pg.valor_pago))}</p>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-sm text-muted-foreground">
                      {parcela && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs font-medium text-foreground">Valor da parcela</p>
                            <p>{fmtR(Number(parcela.valor_total))}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">Pago neste registro</p>
                            <p className="text-green-600 font-semibold">{fmtR(Number(pg.valor_pago))}</p>
                          </div>
                        </div>
                      )}
                      {pg.observacoes && (
                        <div>
                          <p className="text-xs font-medium text-foreground">Observação</p>
                          <p>{pg.observacoes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
