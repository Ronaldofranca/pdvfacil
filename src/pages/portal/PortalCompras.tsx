import { useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { History, ChevronDown, ChevronUp, Package, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

function fmtR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PortalComprasPage() {
  const { config } = useOutletContext<{ config: any }>();
  const { cliente } = usePortalAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (config && config.portal_mostrar_compras === false) {
    return <Navigate to="/portal" replace />;
  }

  const { data: vendas, isLoading } = useQuery({
    queryKey: ["portal-vendas", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vendas")
        .select("id, data_venda, total, status, observacoes")
        .eq("cliente_id", cliente!.id)
        .order("data_venda", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: itensMap } = useQuery({
    queryKey: ["portal-itens-venda", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data } = await supabase
        .from("itens_venda")
        .select("id, nome_produto, quantidade, preco_vendido, subtotal, bonus, produtos(imagem_url)")
        .eq("venda_id", expandedId!);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <History className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Últimas Compras</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : !vendas?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma compra encontrada.</p>
      ) : (
        vendas.map((v) => (
          <Card key={v.id}>
            <CardContent className="p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {format(new Date(v.data_venda), "dd/MM/yyyy")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {v.status === "finalizada" ? "Finalizada" : v.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{fmtR(Number(v.total))}</p>
                  {expandedId === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedId === v.id && (
                <div className="mt-4 space-y-2 border-t pt-3">
                  {itensMap?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                          {item.produtos?.imagem_url ? (
                            <img src={item.produtos.imagem_url} alt={item.nome_produto} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-muted-foreground opacity-50" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {item.quantidade}x {item.nome_produto}
                            {item.bonus && <Badge variant="outline" className="ml-2 text-[9px]">Brinde</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{fmtR(Number(item.preco_vendido))} un.</p>
                        </div>
                      </div>
                      <span className="font-semibold">{fmtR(Number(item.subtotal))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{fmtR(Number(v.total))}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
