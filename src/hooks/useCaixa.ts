import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CaixaDiario {
  id: string;
  empresa_id: string;
  usuario_id: string;
  data: string;
  valor_inicial: number;
  valor_contado: number | null;
  total_entradas: number;
  total_sangrias: number;
  total_suprimentos: number;
  saldo_teorico: number;
  diferenca: number | null;
  status: string;
  observacao_abertura: string;
  observacao_fechamento: string;
  aberto_em: string;
  fechado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaixaMovimentacao {
  id: string;
  empresa_id: string;
  caixa_id: string;
  usuario_id: string;
  tipo: string;
  valor: number;
  descricao: string;
  referencia_id: string | null;
  created_at: string;
}

export function useCaixaAberto() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["caixa_aberto", profile?.empresa_id, profile?.user_id],
    queryFn: async () => {
      if (!profile) return null;
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("caixa_diario")
        .select("*")
        .eq("empresa_id", profile.empresa_id)
        .eq("usuario_id", profile.user_id)
        .eq("data", today)
        .eq("status", "aberto")
        .maybeSingle();
      if (error) throw error;
      return data as CaixaDiario | null;
    },
    enabled: !!profile,
  });
}

export function useCaixaHistorico(limit = 30) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["caixa_historico", profile?.empresa_id, limit],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await (supabase as any)
        .from("caixa_diario")
        .select("*")
        .eq("empresa_id", profile.empresa_id)
        .order("data", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as CaixaDiario[];
    },
    enabled: !!profile,
  });
}

export function useCaixaMovimentacoes(caixaId: string | undefined) {
  return useQuery({
    queryKey: ["caixa_movimentacoes", caixaId],
    queryFn: async () => {
      if (!caixaId) return [];
      const { data, error } = await (supabase as any)
        .from("caixa_movimentacoes")
        .select("*")
        .eq("caixa_id", caixaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CaixaMovimentacao[];
    },
    enabled: !!caixaId,
  });
}

export function useAbrirCaixa() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { valor_inicial: number; observacao?: string }) => {
      if (!profile) throw new Error("Não autenticado");
      const today = new Date().toISOString().split("T")[0];
      // Check if already exists
      const { data: existing } = await (supabase as any)
        .from("caixa_diario")
        .select("id, status")
        .eq("empresa_id", profile.empresa_id)
        .eq("usuario_id", profile.user_id)
        .eq("data", today)
        .maybeSingle();
      if (existing) {
        if (existing.status === "aberto") throw new Error("Caixa já está aberto hoje");
        throw new Error("Caixa já foi fechado hoje. Contate um administrador para reabrir.");
      }
      const { data, error } = await (supabase as any)
        .from("caixa_diario")
        .insert({
          empresa_id: profile.empresa_id,
          usuario_id: profile.user_id,
          data: today,
          valor_inicial: input.valor_inicial,
          saldo_teorico: input.valor_inicial,
          observacao_abertura: input.observacao || "",
        })
        .select()
        .single();
      if (error) throw error;
      return data as CaixaDiario;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa_aberto"] });
      qc.invalidateQueries({ queryKey: ["caixa_historico"] });
      toast.success("Caixa aberto com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRegistrarMovimentacao() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      caixa_id: string;
      tipo: string;
      valor: number;
      descricao: string;
      referencia_id?: string;
    }) => {
      if (!profile) throw new Error("Não autenticado");
      const { data, error } = await (supabase as any)
        .from("caixa_movimentacoes")
        .insert({
          empresa_id: profile.empresa_id,
          caixa_id: input.caixa_id,
          usuario_id: profile.user_id,
          tipo: input.tipo,
          valor: input.valor,
          descricao: input.descricao,
          referencia_id: input.referencia_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa_aberto"] });
      qc.invalidateQueries({ queryKey: ["caixa_movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["caixa_historico"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFecharCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { caixa_id: string; valor_contado: number; observacao?: string }) => {
      // Get current saldo_teorico
      const { data: caixa, error: fetchErr } = await (supabase as any)
        .from("caixa_diario")
        .select("saldo_teorico, status")
        .eq("id", input.caixa_id)
        .single();
      if (fetchErr) throw fetchErr;
      if (caixa.status === "fechado") throw new Error("Caixa já está fechado");
      const diferenca = input.valor_contado - caixa.saldo_teorico;
      const { error } = await (supabase as any)
        .from("caixa_diario")
        .update({
          status: "fechado",
          valor_contado: input.valor_contado,
          diferenca,
          observacao_fechamento: input.observacao || "",
          fechado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.caixa_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa_aberto"] });
      qc.invalidateQueries({ queryKey: ["caixa_historico"] });
      toast.success("Caixa fechado com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReabrirCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caixaId: string) => {
      const { error } = await (supabase as any)
        .from("caixa_diario")
        .update({
          status: "aberto",
          valor_contado: null,
          diferenca: null,
          fechado_em: null,
          observacao_fechamento: "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", caixaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa_aberto"] });
      qc.invalidateQueries({ queryKey: ["caixa_historico"] });
      toast.success("Caixa reaberto com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
