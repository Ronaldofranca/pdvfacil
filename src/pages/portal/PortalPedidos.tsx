import { useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

function fmtR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  aguardando_entrega: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  em_rota: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  entregue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelado: "bg-destructive/10 text-destructive",
  convertido_em_venda: "bg-primary/10 text-primary",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_entrega: "Aguardando Entrega",
  em_rota: "Em Rota",
  entregue: "Entregue",
  cancelado: "Cancelado",
  convertido_em_venda: "Venda Finalizada",
};

export default function PortalPedidosPage() {
  const { config } = useOutletContext<{ config: any }>();
  const { cliente } = usePortalAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (config && config.portal_mostrar_pedidos === false) {
    return <Navigate to="/portal" replace />;
  }

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["portal-pedidos", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pedidos")
        .select("id, data_pedido, data_prevista_entrega, status, valor_total, subtotal, desconto_total, observacoes, horario_entrega")
        .eq("cliente_id", cliente!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: itensMap } = useQuery({
    queryKey: ["portal-itens-pedido", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data } = await supabase
        .from("itens_pedido")
        .select("id, nome_produto, quantidade, preco_pedido, subtotal, bonus")
        .eq("pedido_id", expandedId!);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Meus Pedidos</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : !pedidos?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido encontrado.</p>
      ) : (
        pedidos.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Pedido de {format(new Date(p.data_pedido), "dd/MM/yyyy")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${statusColors[p.status] ?? ""}`}>
                      {statusLabels[p.status] ?? p.status}
                    </Badge>
                    {p.data_prevista_entrega && (
                      <span className="text-xs text-muted-foreground">
                        Entrega: {format(new Date(p.data_prevista_entrega), "dd/MM/yyyy")}
                        {p.horario_entrega ? ` ${p.horario_entrega}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{fmtR(Number(p.valor_total))}</p>
                  {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedId === p.id && (
                <div className="mt-4 space-y-2 border-t pt-3">
                  {itensMap?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.quantidade}x {item.nome_produto}
                        {item.bonus && <Badge variant="outline" className="ml-1 text-[9px]">Brinde</Badge>}
                      </span>
                      <span>{fmtR(Number(item.subtotal))}</span>
                    </div>
                  ))}
                  {Number(p.desconto_total) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto</span>
                      <span>-{fmtR(Number(p.desconto_total))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{fmtR(Number(p.valor_total))}</span>
                  </div>
                  {p.observacoes && (
                    <p className="text-xs text-muted-foreground mt-2">📝 {p.observacoes}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
