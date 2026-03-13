import { useState } from "react";
import { DollarSign, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

function fmtR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  paga: "Paga",
  vencida: "Vencida",
};

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  parcial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paga: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  vencida: "bg-destructive/10 text-destructive",
};

export default function PortalParcelasPage() {
  const { cliente } = usePortalAuth();
  const [copied, setCopied] = useState(false);

  const { data: parcelas, isLoading } = useQuery({
    queryKey: ["portal-parcelas", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("parcelas")
        .select("id, numero, vencimento, valor_total, valor_pago, saldo, status, forma_pagamento")
        .eq("cliente_id", cliente!.id)
        .order("vencimento", { ascending: true });
      return data ?? [];
    },
  });

  const { data: config } = useQuery({
    queryKey: ["portal-config-pix", cliente?.empresa_id],
    enabled: !!cliente?.empresa_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracoes")
        .select("pix_chave, pix_tipo")
        .eq("empresa_id", cliente!.empresa_id)
        .maybeSingle();
      return data;
    },
  });

  const abertas = parcelas?.filter((p) => p.status === "pendente" || p.status === "parcial") ?? [];
  const vencidas = parcelas?.filter((p) => p.status === "vencida") ?? [];
  const pagas = parcelas?.filter((p) => p.status === "paga") ?? [];

  const copyPix = async () => {
    if (!config?.pix_chave) return;
    await navigator.clipboard.writeText(config.pix_chave);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const renderParcela = (p: any) => (
    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
      <div className="space-y-1">
        <p className="text-sm font-medium">Parcela {p.numero}</p>
        <p className="text-xs text-muted-foreground">
          Vencimento: {format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}
        </p>
        <Badge className={`text-[10px] ${statusColors[p.status] ?? ""}`}>
          {statusLabels[p.status] ?? p.status}
        </Badge>
      </div>
      <div className="text-right space-y-0.5">
        <p className="text-sm font-bold">{fmtR(Number(p.valor_total))}</p>
        {Number(p.valor_pago) > 0 && (
          <p className="text-xs text-green-600">Pago: {fmtR(Number(p.valor_pago))}</p>
        )}
        {Number(p.saldo) > 0 && (
          <p className="text-xs text-muted-foreground">Saldo: {fmtR(Number(p.saldo))}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <DollarSign className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Minhas Parcelas</h2>
      </div>

      {/* PIX Card */}
      {config?.pix_chave && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">💳 Chave PIX para pagamento</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-background px-3 py-2 rounded border truncate">
                {config.pix_chave}
              </code>
              <Button size="sm" variant="outline" onClick={copyPix} className="gap-1 shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use esta chave PIX para pagar sua parcela e envie o comprovante ao vendedor.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="abertas">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="abertas">Abertas ({abertas.length})</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas ({vencidas.length})</TabsTrigger>
          <TabsTrigger value="pagas">Pagas ({pagas.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value="abertas" className="space-y-2 mt-3">
          {abertas.length ? abertas.map(renderParcela) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela em aberto.</p>}
        </TabsContent>
        <TabsContent value="vencidas" className="space-y-2 mt-3">
          {vencidas.length ? vencidas.map(renderParcela) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela vencida.</p>}
        </TabsContent>
        <TabsContent value="pagas" className="space-y-2 mt-3">
          {pagas.length ? pagas.map(renderParcela) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela paga.</p>}
        </TabsContent>
        <TabsContent value="todas" className="space-y-2 mt-3">
          {parcelas?.length ? parcelas.map(renderParcela) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela encontrada.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
