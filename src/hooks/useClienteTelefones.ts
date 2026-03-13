import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeTelefone } from "@/lib/cepUtils";

export interface ClienteTelefone {
  id: string;
  empresa_id: string;
  cliente_id: string;
  telefone: string;
  tipo: string;
  principal: boolean;
  created_at: string;
  updated_at: string;
}

export interface TelefoneInput {
  id?: string;
  empresa_id: string;
  cliente_id: string;
  telefone: string;
  tipo: string;
  principal: boolean;
}

export function useClienteTelefones(clienteId: string | null) {
  return useQuery({
    queryKey: ["cliente_telefones", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cliente_telefones")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("principal", { ascending: false });
      if (error) throw error;
      return data as ClienteTelefone[];
    },
  });
}

export function useSaveClienteTelefones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, empresaId, telefones }: {
      clienteId: string;
      empresaId: string;
      telefones: { telefone: string; tipo: string; principal: boolean; id?: string }[];
    }) => {
      // Delete existing phones for this client
      await (supabase as any)
        .from("cliente_telefones")
        .delete()
        .eq("cliente_id", clienteId);

      // Insert new phones (telefone_normalizado is auto-computed by DB trigger)
      const toInsert = telefones
        .filter(t => normalizeTelefone(t.telefone).length > 0)
        .map(t => ({
          empresa_id: empresaId,
          cliente_id: clienteId,
          telefone: normalizeTelefone(t.telefone),
          telefone_normalizado: normalizeTelefone(t.telefone),
          tipo: t.tipo,
          principal: t.principal,
        }));

      if (toInsert.length > 0) {
        const { error } = await (supabase as any)
          .from("cliente_telefones")
          .insert(toInsert);
        if (error) throw error;
      }

      // Update main telefone field on clientes table with the principal phone
      const principal = toInsert.find(t => t.principal) || toInsert[0];
      if (principal) {
        await supabase
          .from("clientes")
          .update({ telefone: principal.telefone })
          .eq("id", clienteId);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["cliente_telefones", vars.clienteId] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => {
      if (e.message.includes("idx_cliente_telefones_empresa_tel_norm") || e.message.toLowerCase().includes("duplicate key value")) {
        toast.error("Este telefone já está cadastrado para outro cliente.");
      } else {
        toast.error(e.message);
      }
    },
  });
}

export async function checkDuplicatePhone(empresaId: string, telefone: string, excludeClienteId?: string): Promise<{ isDuplicate: boolean; clienteNome?: string }> {
  const normalized = normalizeTelefone(telefone);
  if (!normalized) return { isDuplicate: false };

  const { data } = await (supabase as any)
    .from("cliente_telefones")
    .select("cliente_id, clientes(nome)")
    .eq("empresa_id", empresaId)
    .eq("telefone_normalizado", normalized)
    .limit(1);

  if (data && data.length > 0) {
    const match = data[0];
    if (excludeClienteId && match.cliente_id === excludeClienteId) {
      return { isDuplicate: false };
    }
    return { isDuplicate: true, clienteNome: match.clientes?.nome };
  }
  return { isDuplicate: false };
}
