import { ShoppingBag, DollarSign, AlertTriangle, CheckCircle, Plus, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

function fmtR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PortalHomePage() {
  const { cliente } = usePortalAuth();
  const navigate = useNavigate();

  const { data: parcelas } = useQuery({
    queryKey: ["portal-parcelas-resumo", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("parcelas")
        .select("id, valor_total, valor_pago, saldo, status, vencimento")
        .eq("cliente_id", cliente!.id);
      return data ?? [];
    },
  });

  const { data: pedidos } = useQuery({
    queryKey: ["portal-pedidos-recentes", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pedidos")
        .select("id, data_pedido, data_prevista_entrega, status, valor_total")
        .eq("cliente_id", cliente!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: vendedorProfile } = useQuery({
    queryKey: ["portal-vendedor", cliente?.vendedor_id],
    enabled: !!cliente?.vendedor_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome, email")
        .eq("user_id", cliente!.vendedor_id!)
        .maybeSingle();
      return data;
    },
  });

  const abertas = parcelas?.filter((p) => p.status === "pendente" || p.status === "parcial") ?? [];
  const vencidas = parcelas?.filter((p) => p.status === "vencida") ?? [];
  const totalAberto = abertas.reduce((s, p) => s + Number(p.saldo ?? 0), 0);
  const totalVencido = vencidas.reduce((s, p) => s + Number(p.saldo ?? 0), 0);
  const totalPago = parcelas?.filter((p) => p.status === "paga").reduce((s, p) => s + Number(p.valor_pago), 0) ?? 0;

  const statusMap: Record<string, string> = {
    rascunho: "Rascunho",
    aguardando_entrega: "Aguardando",
    em_rota: "Em Rota",
    entregue: "Entregue",
    cancelado: "Cancelado",
    convertido_em_venda: "Finalizado",
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h2 className="text-xl font-bold text-foreground">Olá, {cliente?.nome?.split(" ")[0]}!</h2>
        <p className="text-sm text-muted-foreground">Aqui está o resumo da sua conta.</p>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Em aberto</span>
            </div>
            <p className="text-lg font-bold">{fmtR(totalAberto)}</p>
            <p className="text-xs text-muted-foreground">{abertas.length} parcela{abertas.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Vencido</span>
            </div>
            <p className="text-lg font-bold text-destructive">{fmtR(totalVencido)}</p>
            <p className="text-xs text-muted-foreground">{vencidas.length} parcela{vencidas.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Total pago</span>
            </div>
            <p className="text-lg font-bold text-green-600">{fmtR(totalPago)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pedidos</span>
            </div>
            <p className="text-lg font-bold">{pedidos?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate("/portal/novo-pedido")} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
        {vendedorProfile && (
          <Button variant="outline" className="gap-2" asChild>
            <a href={`https://wa.me/55`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 text-green-600" /> Falar com {vendedorProfile.nome?.split(" ")[0]}
            </a>
          </Button>
        )}
      </div>

      {/* Recent Orders */}
      {pedidos && pedidos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pedidos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate("/portal/pedidos")}
              >
                <div>
                  <p className="text-sm font-medium">{format(new Date(p.data_pedido), "dd/MM/yyyy")}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {statusMap[p.status] ?? p.status}
                  </Badge>
                </div>
                <p className="text-sm font-bold">{fmtR(Number(p.valor_total))}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
