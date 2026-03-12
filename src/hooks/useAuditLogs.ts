import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAuditLogs(filters?: { tabela?: string; limit?: number }) {
  return useQuery({
    queryKey: ["audit_logs", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 200);
      if (filters?.tabela) q = q.eq("tabela", filters.tabela);
      const { data, error } = await q;
      if (error) throw error;
      return data as {
        id: string;
        empresa_id: string;
        usuario_id: string | null;
        acao: string;
        tabela: string;
        registro_id: string | null;
        dados_anteriores: Record<string, unknown> | null;
        dados_novos: Record<string, unknown> | null;
        ip: string;
        created_at: string;
      }[];
    },
  });
}

export function useSecurityLogs(limit = 100) {
  return useQuery({
    queryKey: ["security_logs", limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as {
        id: string;
        empresa_id: string | null;
        usuario_id: string | null;
        evento: string;
        detalhes: Record<string, unknown>;
        ip: string;
        user_agent: string;
        created_at: string;
      }[];
    },
  });
}

export function useLogSecurityEvent() {
  return useMutation({
    mutationFn: async (event: { empresa_id: string; evento: string; detalhes?: Record<string, unknown> }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");
      const { error } = await (supabase as any).from("security_logs").insert({
        empresa_id: event.empresa_id,
        usuario_id: userId,
        evento: event.evento,
        detalhes: event.detalhes ?? {},
      });
      if (error) throw error;
    },
  });
}
