import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Meta {
  id: string;
  empresa_id: string;
  vendedor_id: string;
  mes: number;
  ano: number;
  meta_valor: number;
  percentual_comissao: number;
}

interface VendedorDashboard {
  vendedorId: string;
  vendedorNome: string;
  vendasDia: number;
  totalDia: number;
  vendasMes: number;
  totalMes: number;
  metaValor: number;
  percentualMeta: number;
  percentualComissao: number;
  comissaoAcumulada: number;
}

export function useMetas(mes?: number, ano?: number) {
  const now = new Date();
  const m = mes ?? now.getMonth() + 1;
  const a = ano ?? now.getFullYear();

  return useQuery({
    queryKey: ["metas", m, a],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("metas_vendedor")
        .select("*")
        .eq("mes", m)
        .eq("ano", a);
      if (error) throw error;
      return data as Meta[];
    },
  });
}

export function useUpsertMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meta: {
      empresa_id: string;
      vendedor_id: string;
      mes: number;
      ano: number;
      meta_valor: number;
      percentual_comissao: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from("metas_vendedor")
        .upsert(meta, { onConflict: "vendedor_id,mes,ano" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metas"] });
      toast.success("Meta salva com sucesso");
    },
    onError: () => toast.error("Erro ao salvar meta"),
  });
}

export function useVendedorDashboard() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["vendedor-dashboard", profile?.user_id],
    queryFn: async () => {
      if (!profile) return null;

      const now = new Date();
      const mes = now.getMonth() + 1;
      const ano = now.getFullYear();
      const inicioDia = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Vendas do dia
      const { data: vendasDia } = await supabase
        .from("vendas")
        .select("total")
        .eq("vendedor_id", profile.user_id)
        .eq("status", "finalizada")
        .gte("data_venda", inicioDia);

      // Vendas do mês
      const { data: vendasMes } = await supabase
        .from("vendas")
        .select("total")
        .eq("vendedor_id", profile.user_id)
        .eq("status", "finalizada")
        .gte("data_venda", inicioMes);

      // Meta
      const { data: metas } = await (supabase as any)
        .from("metas_vendedor")
        .select("*")
        .eq("vendedor_id", profile.user_id)
        .eq("mes", mes)
        .eq("ano", ano)
        .limit(1);

      const meta = metas?.[0] as Meta | undefined;
      const totalDia = (vendasDia || []).reduce((s, v) => s + Number(v.total), 0);
      const totalMes = (vendasMes || []).reduce((s, v) => s + Number(v.total), 0);
      const metaValor = meta?.meta_valor ?? 0;
      const percentualComissao = meta?.percentual_comissao ?? 5;

      return {
        vendedorId: profile.user_id,
        vendedorNome: profile.nome,
        vendasDia: (vendasDia || []).length,
        totalDia,
        vendasMes: (vendasMes || []).length,
        totalMes,
        metaValor,
        percentualMeta: metaValor > 0 ? Math.round((totalMes / metaValor) * 100) : 0,
        percentualComissao,
        comissaoAcumulada: totalMes * (percentualComissao / 100),
      } as VendedorDashboard;
    },
    enabled: !!profile,
  });
}

export function useRankingVendedores(mes?: number, ano?: number) {
  const now = new Date();
  const m = mes ?? now.getMonth() + 1;
  const a = ano ?? now.getFullYear();

  return useQuery({
    queryKey: ["ranking-vendedores", m, a],
    queryFn: async () => {
      const inicioMes = new Date(a, m - 1, 1).toISOString();
      const fimMes = new Date(a, m, 0, 23, 59, 59).toISOString();

      const { data: vendas } = await supabase
        .from("vendas")
        .select("vendedor_id, total")
        .eq("status", "finalizada")
        .gte("data_venda", inicioMes)
        .lte("data_venda", fimMes);

      const { data: profiles } = await supabase.from("profiles").select("user_id, nome");

      const { data: metas } = await (supabase as any)
        .from("metas_vendedor")
        .select("*")
        .eq("mes", m)
        .eq("ano", a);

      const vendedorMap = new Map<string, { total: number; qtd: number }>();
      (vendas || []).forEach((v) => {
        const cur = vendedorMap.get(v.vendedor_id) || { total: 0, qtd: 0 };
        cur.total += Number(v.total);
        cur.qtd += 1;
        vendedorMap.set(v.vendedor_id, cur);
      });

      const ranking = Array.from(vendedorMap.entries()).map(([vendedorId, stats]) => {
        const perfil = (profiles || []).find((p) => p.user_id === vendedorId);
        const meta = (metas || []).find((mt: any) => mt.vendedor_id === vendedorId) as Meta | undefined;
        const metaValor = meta?.meta_valor ?? 0;
        const percComissao = meta?.percentual_comissao ?? 5;

        return {
          vendedorId,
          nome: perfil?.nome ?? "Vendedor",
          totalVendas: stats.total,
          qtdVendas: stats.qtd,
          metaValor,
          percentualMeta: metaValor > 0 ? Math.round((stats.total / metaValor) * 100) : 0,
          comissao: stats.total * (percComissao / 100),
        };
      });

      return ranking.sort((a, b) => b.totalVendas - a.totalVendas);
    },
  });
}
