import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ParcelaCobranca {
  id: string;
  numero: number;
  valor_total: number;
  valor_pago: number;
  saldo: number;
  vencimento: string;
  status: string;
  cliente_id: string | null;
  venda_id: string | null;
  empresa_id: string;
  ultima_cobranca: string | null;
  clientes: { nome: string; telefone: string } | null;
}

export interface ClienteCobranca {
  cliente_id: string;
  nome: string;
  telefone: string;
  parcelas: ParcelaCobranca[];
  totalSaldo: number;
  qtdParcelas: number;
  maiorAtraso: number; // dias
}

export type FiltroCobranca = "todas" | "vencidas" | "vencendo_hoje" | "vencendo_amanha" | "pendentes";

export function useParcelasCobranca(filtro: FiltroCobranca) {
  return useQuery({
    queryKey: ["cobrancas", filtro],
    queryFn: async () => {
      const hoje = format(new Date(), "yyyy-MM-dd");
      const amanha = format(addDays(new Date(), 1), "yyyy-MM-dd");

      let q = supabase
        .from("parcelas")
        .select("*, clientes(nome, telefone)")
        .in("status", ["pendente", "vencida", "parcial"] as any[])
        .order("vencimento");

      if (filtro === "vencidas") {
        q = q.eq("status", "vencida" as any);
      } else if (filtro === "vencendo_hoje") {
        q = q.eq("vencimento", hoje).neq("status", "paga" as any);
      } else if (filtro === "vencendo_amanha") {
        q = q.eq("vencimento", amanha).neq("status", "paga" as any);
      } else if (filtro === "pendentes") {
        q = q.in("status", ["pendente", "parcial"] as any[]);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ParcelaCobranca[];
    },
  });
}

export function useClientesCobranca(filtro: FiltroCobranca) {
  const { data: parcelas, isLoading } = useParcelasCobranca(filtro);

  const clientes: ClienteCobranca[] = [];
  if (parcelas) {
    const map = new Map<string, ClienteCobranca>();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const p of parcelas) {
      if (!p.cliente_id) continue;
      let c = map.get(p.cliente_id);
      if (!c) {
        c = {
          cliente_id: p.cliente_id,
          nome: p.clientes?.nome ?? "—",
          telefone: p.clientes?.telefone ?? "",
          parcelas: [],
          totalSaldo: 0,
          qtdParcelas: 0,
          maiorAtraso: 0,
        };
        map.set(p.cliente_id, c);
      }
      c.parcelas.push(p);
      c.totalSaldo += Number(p.saldo ?? 0);
      c.qtdParcelas += 1;
      const venc = new Date(p.vencimento + "T12:00:00");
      const dias = Math.floor((hoje.getTime() - venc.getTime()) / 86400000);
      if (dias > c.maiorAtraso) c.maiorAtraso = dias;
    }
    clientes.push(...Array.from(map.values()).sort((a, b) => b.maiorAtraso - a.maiorAtraso));
  }

  return { clientes, isLoading };
}

// Reminder counts for dashboard
export function useLembretesContagem() {
  return useQuery({
    queryKey: ["lembretes-contagem"],
    queryFn: async () => {
      const hoje = format(new Date(), "yyyy-MM-dd");
      const amanha = format(addDays(new Date(), 1), "yyyy-MM-dd");

      const [vencidasRes, hojeRes, amanhaRes, atrasadosRes] = await Promise.all([
        supabase.from("parcelas").select("id", { count: "exact", head: true }).eq("status", "vencida" as any),
        supabase.from("parcelas").select("id", { count: "exact", head: true }).eq("vencimento", hoje).neq("status", "paga" as any),
        supabase.from("parcelas").select("id", { count: "exact", head: true }).eq("vencimento", amanha).neq("status", "paga" as any),
        supabase.from("parcelas").select("cliente_id").eq("status", "vencida" as any),
      ]);

      // Count clients with 2+ overdue parcelas
      const clienteMap = new Map<string, number>();
      (atrasadosRes.data ?? []).forEach((p: any) => {
        if (p.cliente_id) clienteMap.set(p.cliente_id, (clienteMap.get(p.cliente_id) ?? 0) + 1);
      });
      const clientesMultiplosAtraso = Array.from(clienteMap.values()).filter((c) => c >= 2).length;

      return {
        vencidas: vencidasRes.count ?? 0,
        vencendoHoje: hojeRes.count ?? 0,
        vencendoAmanha: amanhaRes.count ?? 0,
        clientesMultiplosAtraso,
      };
    },
    refetchInterval: 60000,
  });
}

// Generate WhatsApp message for a single parcela
export function gerarMensagemParcela(
  nomeCliente: string,
  parcela: ParcelaCobranca,
  saldoTotal?: number
) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const dataVenc = format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });

  return `Olá ${nomeCliente}!

Passando para lembrar que sua parcela nº ${parcela.numero} no valor de ${fmt(Number(parcela.saldo))} ${parcela.status === "vencida" ? "venceu" : "vence"} em ${dataVenc}.

Caso já tenha realizado o pagamento, por favor desconsidere esta mensagem.
${saldoTotal ? `\nSaldo atual em aberto: ${fmt(saldoTotal)}` : ""}
Obrigado!`;
}

// Generate reminder message (for tomorrow's due dates)
export function gerarMensagemLembrete(
  nomeCliente: string,
  parcela: ParcelaCobranca,
) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const dataVenc = format(new Date(parcela.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });

  return `Olá ${nomeCliente}!

Passando para lembrar que sua parcela de ${fmt(Number(parcela.saldo))} vence amanhã (${dataVenc}).

Caso já tenha realizado o pagamento, por favor desconsidere esta mensagem.

Obrigado!`;
}

// Generate WhatsApp message for grouped parcelas
export function gerarMensagemAgrupada(nomeCliente: string, parcelas: ParcelaCobranca[]) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const linhas = parcelas
    .map((p) => {
      const dataVenc = format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
      return `• Parcela ${p.numero} — ${fmt(Number(p.saldo))} — vencimento ${dataVenc}`;
    })
    .join("\n");

  const saldoTotal = parcelas.reduce((s, p) => s + Number(p.saldo ?? 0), 0);

  return `Olá ${nomeCliente}!

Você possui as seguintes parcelas em aberto:

${linhas}

Saldo total: ${fmt(saldoTotal)}

Caso já tenha realizado o pagamento, por favor desconsidere esta mensagem.

Obrigado!`;
}

// Open WhatsApp with message
export function abrirWhatsApp(telefone: string, mensagem: string) {
  const tel = telefone.replace(/\D/g, "");
  const telFormatted = tel.startsWith("55") ? tel : `55${tel}`;
  const url = `https://wa.me/${telFormatted}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
}

// Record collection in history
export function useRegistrarCobranca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      empresa_id: string;
      cliente_id: string;
      parcela_id?: string;
      tipo_cobranca: string;
      mensagem: string;
    }) => {
      // Insert into historico_cobrancas
      const { error } = await supabase.from("historico_cobrancas" as any).insert({
        empresa_id: input.empresa_id,
        cliente_id: input.cliente_id,
        parcela_id: input.parcela_id ?? null,
        tipo_cobranca: input.tipo_cobranca,
        mensagem: input.mensagem,
      } as any);
      if (error) throw error;

      // Update ultima_cobranca on parcela if applicable
      if (input.parcela_id) {
        await supabase
          .from("parcelas")
          .update({ ultima_cobranca: new Date().toISOString() } as any)
          .eq("id", input.parcela_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cobrancas"] });
      qc.invalidateQueries({ queryKey: ["parcelas"] });
      qc.invalidateQueries({ queryKey: ["lembretes-contagem"] });
      toast.success("Cobrança registrada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Get collection history for a client
export function useHistoricoCobrancas(clienteId: string | null) {
  return useQuery({
    queryKey: ["historico_cobrancas", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_cobrancas" as any)
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("data_envio", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });
}
