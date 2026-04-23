import { useState, useEffect } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { DollarSign, Copy, Check, MessageCircle, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { buildPixPayload, generatePixQRCodeDataUrl } from "@/lib/reportExport";

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
  parcial: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  paga: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  vencida: "bg-destructive/10 text-destructive",
};

function PaymentHistory({ parcelaId }: { parcelaId: string }) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["portal-pagamentos", parcelaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, valor_pago, data_pagamento, observacoes")
        .eq("parcela_id", parcelaId)
        .order("data_pagamento", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <div className="animate-pulse h-8 bg-muted rounded mt-2" />;
  if (!payments || payments.length === 0) return null;

  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Histórico de Pagamentos</p>
      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between items-start text-sm bg-muted/30 p-2 rounded border border-border/50">
            <div className="space-y-0.5">
              <p className="font-medium">{format(new Date(p.data_pagamento), "dd/MM/yyyy")}</p>
              {p.observacoes && <p className="text-xs text-muted-foreground">{p.observacoes}</p>}
            </div>
            <p className="font-bold text-green-600">+{fmtR(Number(p.valor_pago))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortalParcelasPage() {
  const { config: layoutConfig } = useOutletContext<{ config: any }>();
  const { cliente } = usePortalAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  if (layoutConfig && layoutConfig.portal_mostrar_parcelas === false) {
    return <Navigate to="/portal" replace />;
  }

  const { data: parcelas, isLoading } = useQuery({
    queryKey: ["portal-parcelas", cliente?.id],
    enabled: !!cliente?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("parcelas")
        .select("id, numero, vencimento, valor_total, valor_pago, saldo, status, forma_pagamento, observacoes")
        .eq("cliente_id", cliente!.id)
        .order("vencimento", { ascending: true });
      return data ?? [];
    },
  });

  const { data: config } = useQuery({
    queryKey: ["portal-config-pix", cliente?.empresa_id],
    enabled: !!cliente?.empresa_id,
    queryFn: async () => {
      const { data: configData } = await (supabase as any)
        .from("configuracoes")
        .select("portal_mostrar_pix")
        .eq("empresa_id", cliente!.empresa_id)
        .maybeSingle();
      
      const { data: pixData } = await (supabase as any)
        .rpc("get_pix_config", { _empresa_id: cliente!.empresa_id });

      return { ...configData, ...(pixData?.[0] || {}) };
    },
  });

  const { data: vendedorProfile } = useQuery({
    queryKey: ["portal-vendedor-parcelas", cliente?.vendedor_id],
    enabled: !!cliente?.vendedor_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome, telefone")
        .eq("user_id", cliente!.vendedor_id!)
        .maybeSingle();
      return data;
    },
  });

  const todayStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }).split("/").reverse().join("-");
  const abertas = parcelas?.filter((p) => (p.status === "pendente" || p.status === "parcial") && p.vencimento >= todayStr) ?? [];
  const vencidas = parcelas?.filter((p) => (p.status === "pendente" || p.status === "parcial") && Number(p.saldo) > 0 && p.vencimento < todayStr) ?? [];
  const pagas = parcelas?.filter((p) => p.status === "paga") ?? [];
  const showPix = config?.portal_mostrar_pix ?? true;

  // Generate QR Code when a parcela is selected
  useEffect(() => {
    if (!selectedParcela || !config?.pix_chave) {
      setQrCodeUrl(null);
      return;
    }
    const parcela = parcelas?.find((p) => p.id === selectedParcela);
    if (!parcela || Number(parcela.saldo) <= 0) {
      setQrCodeUrl(null);
      return;
    }
    generatePixQRCodeDataUrl(
      config.pix_chave,
      config.pix_tipo,
      Number(parcela.saldo),
      config.pix_nome_recebedor,
      config.pix_cidade_recebedor
    ).then(setQrCodeUrl);
  }, [selectedParcela, config, parcelas]);

  const copyPixForParcela = async (parcela: any) => {
    if (!config?.pix_chave) return;
    const payload = buildPixPayload(
      config.pix_chave,
      config.pix_tipo,
      Number(parcela.saldo),
      config.pix_nome_recebedor,
      config.pix_cidade_recebedor
    );
    await navigator.clipboard.writeText(payload);
    setCopied(parcela.id);
    toast.success("PIX copiado! Cole no app do seu banco.");
    setTimeout(() => setCopied(null), 3000);
  };

  const buildWhatsAppUrl = (parcela: any) => {
    if (!vendedorProfile?.telefone) return null;
    const phone = vendedorProfile.telefone.replace(/\D/g, "");
    if (!phone) return null;
    const valor = fmtR(Number(parcela.saldo));
    const venc = format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy");
    const msg = encodeURIComponent(
      `Olá! Acabei de pagar a parcela ${parcela.numero} no valor de ${valor} (vencimento ${venc}).${cliente?.nome ? ` Cliente: ${cliente.nome}.` : ""} Estou enviando o comprovante.`
    );
    return `https://wa.me/55${phone}?text=${msg}`;
  };

  const renderParcela = (p: any) => {
    const isExpanded = selectedParcela === p.id;
    const canPay = p.status !== "paga" && Number(p.saldo) > 0;
    const whatsAppUrl = canPay ? buildWhatsAppUrl(p) : null;

    return (
      <Card key={p.id} className={isExpanded ? "border-primary/40" : ""}>
        <CardContent className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setSelectedParcela(isExpanded ? null : p.id)}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">Parcela {p.numero}</p>
              <p className="text-xs text-muted-foreground">
                Vencimento: {format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}
              </p>
              <Badge className={`text-[10px] ${statusColors[p.status] ?? ""}`}>
                {statusLabels[p.status] ?? p.status}
              </Badge>
              {p.observacoes && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.observacoes}</p>
              )}
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

          {/* Expanded: PIX + QR Code + WhatsApp */}
          {isExpanded && canPay && showPix && config?.pix_chave && (
            <div className="mt-4 border-t pt-4 space-y-4">
              {/* QR Code */}
              {qrCodeUrl && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-medium">QR Code PIX</p>
                  <img src={qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 rounded-lg border p-2 bg-white" />
                  <p className="text-xs text-muted-foreground">Escaneie com o app do seu banco</p>
                </div>
              )}

              {/* PIX Key + Copy */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Chave PIX</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded border truncate">
                    {config.pix_chave}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyPixForParcela(p)} className="gap-1 shrink-0">
                    {copied === p.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied === p.id ? "Copiado" : "Copiar PIX"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor: <strong>{fmtR(Number(p.saldo))}</strong>
                </p>
              </div>

              {/* Payment Message */}
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  📋 Após realizar o pagamento, envie o comprovante no WhatsApp para confirmação.
                </p>
              </div>

              {/* Payment History (Extrato) */}
              <PaymentHistory parcelaId={p.id} />

              {/* WhatsApp Button */}
              {whatsAppUrl && (
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" asChild>
                  <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4" />
                    Enviar comprovante no WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <DollarSign className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Minhas Parcelas</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : (
        <Tabs defaultValue="abertas">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="abertas">Abertas ({abertas.length})</TabsTrigger>
            <TabsTrigger value="vencidas">Vencidas ({vencidas.length})</TabsTrigger>
            <TabsTrigger value="pagas">Pagas ({pagas.length})</TabsTrigger>
            <TabsTrigger value="todas">Todas</TabsTrigger>
          </TabsList>

          <TabsContent value="abertas" className="space-y-3 mt-3">
            {abertas.length ? abertas.map(renderParcela) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela em aberto.</p>}
          </TabsContent>
          <TabsContent value="vencidas" className="space-y-3 mt-3">
            {vencidas.length ? vencidas.map(renderParcela) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela vencida.</p>}
          </TabsContent>
          <TabsContent value="pagas" className="space-y-3 mt-3">
            {pagas.length ? pagas.map(renderParcela) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela paga.</p>}
          </TabsContent>
          <TabsContent value="todas" className="space-y-3 mt-3">
            {parcelas?.length ? parcelas.map(renderParcela) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela encontrada.</p>}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
