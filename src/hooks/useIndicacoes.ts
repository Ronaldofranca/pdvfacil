import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Indicações de um cliente (quem ele indicou) ───
export function useIndicacoesDoCliente(clienteIndicadorId: string | null) {
  return useQuery({
    queryKey: ["indicacoes", clienteIndicadorId],
    enabled: !!clienteIndicadorId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("indicacoes_clientes")
        .select("*, clientes!indicacoes_clientes_cliente_indicado_id_fkey(nome, telefone)")
        .eq("cliente_indicador_id", clienteIndicadorId!)
        .order("data_indicacao", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Resumo de indicações de um cliente ───
export function useResumoIndicacoes(clienteId: string | null) {
  return useQuery({
    queryKey: ["indicacoes_resumo", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      // Quantos indicou
      const { count: qtdIndicados } = await (supabase as any)
        .from("indicacoes_clientes")
        .select("id", { count: "exact", head: true })
        .eq("cliente_indicador_id", clienteId!);

      // Pontos do cliente
      const { data: cliente } = await (supabase as any)
        .from("clientes")
        .select("pontos_indicacao")
        .eq("id", clienteId!)
        .single();

      // Uso de pontos
      const { data: usos } = await (supabase as any)
        .from("uso_pontos")
        .select("pontos_usados, tipo, descricao, created_at")
        .eq("cliente_id", clienteId!)
        .order("created_at", { ascending: false });

      const totalUsado = (usos || []).reduce((s: number, u: any) => s + Number(u.pontos_usados), 0);

      return {
        qtdIndicados: qtdIndicados ?? 0,
        pontosAcumulados: Number(cliente?.pontos_indicacao ?? 0),
        pontosUsados: totalUsado,
        pontosDisponiveis: Number(cliente?.pontos_indicacao ?? 0) - totalUsado,
        historicoPontos: usos ?? [],
      };
    },
  });
}

// ─── Registrar indicação (quando venda é feita por cliente indicado) ───
export function useRegistrarIndicacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      empresa_id: string;
      cliente_indicador_id: string;
      cliente_indicado_id: string;
      venda_id: string;
      pontos: number;
    }) => {
      // Prevenção: não pode indicar a si mesmo
      if (params.cliente_indicador_id === params.cliente_indicado_id) {
        throw new Error("Cliente não pode indicar a si mesmo.");
      }

      // Inserir registro de indicação
      const { error: insError } = await (supabase as any)
        .from("indicacoes_clientes")
        .insert({
          empresa_id: params.empresa_id,
          cliente_indicador_id: params.cliente_indicador_id,
          cliente_indicado_id: params.cliente_indicado_id,
          venda_id: params.venda_id,
          pontos_gerados: params.pontos,
        });
      if (insError) throw insError;

      // Atualizar pontos do indicador
      const { data: indicador } = await (supabase as any)
        .from("clientes")
        .select("pontos_indicacao")
        .eq("id", params.cliente_indicador_id)
        .single();

      const novosPontos = Number(indicador?.pontos_indicacao ?? 0) + params.pontos;

      const { error: updError } = await (supabase as any)
        .from("clientes")
        .update({ pontos_indicacao: novosPontos, updated_at: new Date().toISOString() })
        .eq("id", params.cliente_indicador_id);
      if (updError) throw updError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicacoes"] });
      qc.invalidateQueries({ queryKey: ["indicacoes_resumo"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Indicação registrada e pontos creditados!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Usar pontos ───
export function useUsarPontos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      empresa_id: string;
      cliente_id: string;
      pontos: number;
      tipo: "desconto" | "brinde" | "credito";
      descricao: string;
      venda_id?: string;
    }) => {
      // Verificar saldo
      const { data: cliente } = await (supabase as any)
        .from("clientes")
        .select("pontos_indicacao")
        .eq("id", params.cliente_id)
        .single();

      const { data: usos } = await (supabase as any)
        .from("uso_pontos")
        .select("pontos_usados")
        .eq("cliente_id", params.cliente_id);

      const totalUsado = (usos || []).reduce((s: number, u: any) => s + Number(u.pontos_usados), 0);
      const disponivel = Number(cliente?.pontos_indicacao ?? 0) - totalUsado;

      if (params.pontos > disponivel) {
        throw new Error(`Pontos insuficientes. Disponível: ${disponivel}`);
      }

      const { error } = await (supabase as any)
        .from("uso_pontos")
        .insert({
          empresa_id: params.empresa_id,
          cliente_id: params.cliente_id,
          pontos_usados: params.pontos,
          tipo: params.tipo,
          descricao: params.descricao,
          venda_id: params.venda_id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicacoes_resumo"] });
      toast.success("Pontos utilizados com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Top indicadores (para dashboard/relatórios) ───
export function useTopIndicadores() {
  return useQuery({
    queryKey: ["top_indicadores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clientes")
        .select("id, nome, pontos_indicacao, telefone")
        .gt("pontos_indicacao", 0)
        .order("pontos_indicacao", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as { id: string; nome: string; pontos_indicacao: number; telefone: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
