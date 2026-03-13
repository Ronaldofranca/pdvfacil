import { useState } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

function fmtR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PortalComprasPage() {
  const { cliente } = usePortalAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: vendas, isLoading } = useQuery({
    queryKey: ["portal-vendas", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vendas")
        .select("id, data_venda, total, status, forma_pagamento, observacoes")
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
        .select("id, nome_produto, quantidade, preco_vendido, subtotal, bonus")
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
                    {v.forma_pagamento && (
                      <span className="text-xs text-muted-foreground">{v.forma_pagamento}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{fmtR(Number(v.total))}</p>
                  {expandedId === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedId === v.id && (
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
