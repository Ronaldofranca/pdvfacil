import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ─── Vendas por período ───
export function useRelVendasPeriodo(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_vendas_periodo", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select(`
          id, total, desconto_total, subtotal, data_venda, status, vendedor_id, pagamentos, 
          clientes(nome)
        `)
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Vendas com itens (para relatórios detalhados) ───
export function useRelVendasDetalhadas(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_vendas_detalhadas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select(`
          id, total, desconto_total, subtotal, data_venda, status, vendedor_id, cliente_id, 
          clientes(nome),
          itens_venda(produto_id, nome_produto, quantidade, preco_vendido, preco_original, subtotal, desconto, bonus, custo_unitario)
        `)
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any)
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Produtos vendidos (com custo e lucro) ───
export function useRelProdutosVendidos(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_produtos_vendidos", inicio, fim],
    queryFn: async () => {
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("id")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any);
      if (vErr) throw vErr;
      if (!vendas?.length) return [];

      const vendaIds = vendas.map((v) => v.id);
      const { data, error } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, quantidade, preco_vendido, subtotal, bonus, custo_unitario")
        .in("venda_id", vendaIds);
      if (error) throw error;

      const map = new Map<string, { nome: string; qtd: number; receita: number; custo: number; lucro: number }>();
      for (const item of data ?? []) {
        const key = item.produto_id;
        const curr = map.get(key) ?? { nome: item.nome_produto, qtd: 0, receita: 0, custo: 0, lucro: 0 };
        const itemReceita = Number(item.subtotal);
        const itemCusto = Number(item.custo_unitario ?? 0) * Number(item.quantidade);
        curr.qtd += Number(item.quantidade);
        curr.receita += itemReceita;
        curr.custo += itemCusto;
        curr.lucro += itemReceita - itemCusto;
        map.set(key, curr);
      }

      return Array.from(map.entries())
        .map(([id, v]) => ({ produto_id: id, ...v }))
        .sort((a, b) => b.receita - a.receita);
    },
  });
}

// ─── Parcelas pagas ───
export function useRelParcelasPagas(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_parcelas_pagas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, valor_pago, forma_pagamento, data_pagamento, usuario_id, parcela_id")
        .gte("data_pagamento", inicio)
        .lte("data_pagamento", fim + "T23:59:59")
        .order("data_pagamento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Parcelas vencidas ───
export function useRelParcelasVencidas() {
  return useQuery({
    queryKey: ["rel_parcelas_vencidas"],
    queryFn: async () => {
      const todayISO = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("parcelas")
        .select("*, clientes(nome)")
        .or(`status.eq.vencida,and(status.in.(pendente,parcial),vencimento.lt.${todayISO})`)
        .order("vencimento");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Todas as parcelas ───
export function useRelTodasParcelas(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_todas_parcelas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas")
        .select("*, clientes(nome)")
        .neq("status", "cancelada" as any)
        .gte("vencimento", inicio)
        .lte("vencimento", fim)
        .order("vencimento");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Parcelas por cliente (agrupadas) ───
export function useRelParcelasPorCliente() {
  return useQuery({
    queryKey: ["rel_parcelas_por_cliente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas")
        .select("*, clientes(nome), vendas(vendedor_id)")
        .neq("status", "cancelada" as any)
        .order("vencimento");
      if (error) throw error;

      const map = new Map<string, {
        nome: string;
        total_comprado: number;
        total_pago: number;
        total_pendente: number;
        total_vencido: number;
        parcelas: typeof data;
      }>();

      const todayISO = new Date().toISOString().split("T")[0];
      for (const p of data ?? []) {
        const cid = p.cliente_id ?? "sem_cliente";
        const nome = (p as any).clientes?.nome ?? "Sem cliente";
        const curr = map.get(cid) ?? { nome, total_comprado: 0, total_pago: 0, total_pendente: 0, total_vencido: 0, parcelas: [] };
        curr.total_comprado += Number(p.valor_total);
        curr.total_pago += Number(p.valor_pago);
        
        const isVencida = p.status === "vencida" || (["pendente", "parcial"].includes(p.status) && p.vencimento < todayISO);
        if (isVencida) curr.total_vencido += Number(p.saldo ?? 0);
        if (p.status === "pendente" || p.status === "parcial") curr.total_pendente += Number(p.saldo ?? 0);
        
        curr.parcelas.push(p);
        map.set(cid, curr);
      }

      return Array.from(map.entries()).map(([id, v]) => ({ cliente_id: id, ...v })).sort((a, b) => b.total_comprado - a.total_comprado);
    },
  });
}

// ─── Lucro por produto (receita - custo) ───
export function useRelLucroProduto(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_lucro_produto", inicio, fim],
    queryFn: async () => {
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("id")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any);
      if (vErr) throw vErr;
      if (!vendas?.length) return [];

      const vendaIds = vendas.map((v) => v.id);
      const { data: itens, error: iErr } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, quantidade, preco_vendido, subtotal, custo_unitario")
        .in("venda_id", vendaIds);
      if (iErr) throw iErr;

      const map = new Map<string, { nome: string; receita: number; custo: number; lucro: number; qtd: number }>();
      for (const item of itens ?? []) {
        const key = item.produto_id;
        const curr = map.get(key) ?? { nome: item.nome_produto, receita: 0, custo: 0, lucro: 0, qtd: 0 };
        const itemReceita = Number(item.subtotal);
        const itemCusto = Number(item.custo_unitario ?? 0) * Number(item.quantidade);
        curr.receita += itemReceita;
        curr.custo += itemCusto;
        curr.lucro += itemReceita - itemCusto;
        curr.qtd += Number(item.quantidade);
        map.set(key, curr);
      }

      return Array.from(map.entries())
        .map(([id, v]) => ({ produto_id: id, ...v, margem: v.receita > 0 ? (v.lucro / v.receita) * 100 : 0 }))
        .sort((a, b) => b.lucro - a.lucro);
    },
  });
}

// ─── Curva ABC ───
export function useRelCurvaABC(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_curva_abc", inicio, fim],
    queryFn: async () => {
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("id")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any);
      if (vErr) throw vErr;
      if (!vendas?.length) return [];

      const vendaIds = vendas.map((v) => v.id);
      const { data: itens, error: iErr } = await supabase
        .from("itens_venda")
        .select("produto_id, nome_produto, subtotal")
        .in("venda_id", vendaIds);
      if (iErr) throw iErr;

      const map = new Map<string, { nome: string; receita: number }>();
      for (const item of itens ?? []) {
        const curr = map.get(item.produto_id) ?? { nome: item.nome_produto, receita: 0 };
        curr.receita += Number(item.subtotal);
        map.set(item.produto_id, curr);
      }

      const sorted = Array.from(map.entries())
        .map(([id, v]) => ({ produto_id: id, ...v }))
        .sort((a, b) => b.receita - a.receita);

      const totalReceita = sorted.reduce((s, i) => s + i.receita, 0);
      let acumulado = 0;

      return sorted.map((item) => {
        acumulado += item.receita;
        const pctAcumulado = totalReceita > 0 ? (acumulado / totalReceita) * 100 : 0;
        const classe = pctAcumulado <= 80 ? "A" : pctAcumulado <= 95 ? "B" : "C";
        return { ...item, pct: totalReceita > 0 ? (item.receita / totalReceita) * 100 : 0, pctAcumulado, classe };
      });
    },
  });
}

// ─── Todos os profiles (para o mapa nome de vendedores) ───
export function useRelTodosProfiles() {
  return useQuery({
    queryKey: ["rel_todos_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, nome, email")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Vendedores (profiles com roles) — apenas para o dropdown de filtro ───
// Busca TODOS os profiles com roles, mas inclui qualquer um que tenha feito vendas.
// O filtro de exibição no dropdown usa apenas admin/gerente/vendedor/master.
export function useRelVendedores() {
  return useQuery({
    queryKey: ["rel_vendedores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select(`
          id,
          user_id, 
          nome, 
          email,
          user_roles(role)
        `)
        .order("nome");
      
      if (error) throw error;
      
      // Retorna TODOS os perfis que tenham ao menos uma role definida (admin/master/gerente/vendedor)
      // OU que não tenham nenhuma role (para garantir que o admin principal não suma)
      const rows: any[] = data ?? [];
      return rows.filter((p) => {
        const roles: string[] = (p.user_roles ?? []).map((r: any) => r.role);
        // Se tem roles, só aparece se for role de usuário do sistema
        if (roles.length > 0) {
          return roles.some((r) => ["admin", "gerente", "vendedor", "master"].includes(r));
        }
        // Se não tem roles definidas, inclui por precaução (pode ser o admin principal)
        return true;
      });
    },
  });
}

// ─── Clientes ───
export function useRelClientes() {
  return useQuery({
    queryKey: ["rel_clientes_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome, telefone, cidade").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Estoque atual ───
export function useRelEstoqueAtual() {
  return useQuery({
    queryKey: ["rel_estoque_atual"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque")
        .select("id, produto_id, vendedor_id, quantidade, produtos(nome, codigo)")
        .order("quantidade", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Movimentação de estoque ───
export function useRelMovimentacaoEstoque(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_movimentacao_estoque", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentos_estoque")
        .select("id, produto_id, vendedor_id, tipo, quantidade, data, observacoes, produtos(nome)")
        .gte("data", inicio)
        .lte("data", fim + "T23:59:59")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Metas de vendedores ───
export function useRelMetasVendedores(mes: number, ano: number) {
  return useQuery({
    queryKey: ["rel_metas_vendedores", mes, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_vendedor")
        .select("*")
        .eq("mes", mes)
        .eq("ano", ano);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Romaneios ───
export function useRelRomaneios(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_romaneios", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("romaneios")
        .select("*, romaneio_vendas(venda_id, vendas(id, total, data_venda, clientes(nome)))")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Pedidos por período ───
export function useRelPedidos(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_pedidos", inicio, fim],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pedidos")
        .select("id, empresa_id, cliente_id, vendedor_id, data_pedido, data_prevista_entrega, status, subtotal, desconto_total, valor_total, venda_id, created_at, clientes(nome)")
        .gte("data_pedido", inicio)
        .lte("data_pedido", fim + "T23:59:59")
        .order("data_pedido", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Resumo de lucro do período (com sangrias/suprimentos) ───
export function useRelLucroResumo(inicio: string, fim: string) {
  return useQuery({
    queryKey: ["rel_lucro_resumo", inicio, fim],
    queryFn: async () => {
      // 1. Vendas finalizadas no período
      const { data: vendas } = await supabase
        .from("vendas")
        .select("id, total")
        .gte("data_venda", inicio)
        .lte("data_venda", fim + "T23:59:59")
        .eq("status", "finalizada" as any);

      const totalVendido = vendas?.reduce((s, v) => s + Number(v.total), 0) ?? 0;
      const vendaIds = vendas?.map((v) => v.id) ?? [];

      // 2. Custo dos produtos vendidos
      let custoTotal = 0;
      if (vendaIds.length > 0) {
        const { data: itens } = await supabase
          .from("itens_venda")
          .select("quantidade, custo_unitario")
          .in("venda_id", vendaIds);
        for (const item of itens ?? []) {
          custoTotal += Number(item.custo_unitario ?? 0) * Number(item.quantidade);
        }
      }

      const lucroBruto = totalVendido - custoTotal;

      // 3. Sangrias e suprimentos do período (from caixa_movimentacoes)
      const { data: movCaixa } = await supabase
        .from("caixa_movimentacoes")
        .select("tipo, valor, created_at")
        .gte("created_at", inicio)
        .lte("created_at", fim + "T23:59:59");

      let totalSangrias = 0;
      let totalSuprimentos = 0;
      for (const mov of movCaixa ?? []) {
        if (mov.tipo === "sangria") totalSangrias += Number(mov.valor);
        else if (mov.tipo === "suprimento") totalSuprimentos += Number(mov.valor);
      }

      const lucroLiquido = lucroBruto - totalSangrias;

      return {
        totalVendido,
        custoTotal,
        lucroBruto,
        totalSangrias,
        totalSuprimentos,
        lucroLiquido,
        margemBruta: totalVendido > 0 ? (lucroBruto / totalVendido) * 100 : 0,
        margemLiquida: totalVendido > 0 ? (lucroLiquido / totalVendido) * 100 : 0,
      };
    },
  });
}

// ─── Clientes Completos (Relatório de CRM) ───
export function useRelClientesCompletos() {
  return useQuery({
    queryKey: ["rel_clientes_completos"],
    queryFn: async () => {
      // Fetch all clients
      const { data: clientes, error: cErr } = await supabase
        .from("clientes")
        .select("*")
        .eq("ativo", true);
      
      if (cErr) throw cErr;

      // Group sales by client to get count and total spent
      const { data: vendas, error: vErr } = await supabase
        .from("vendas")
        .select("cliente_id, total")
        .eq("status", "finalizada" as any);
      
      if (vErr) throw vErr;

      const statsMap = new Map<string, { count: number; total: number }>();
      for (const v of vendas ?? []) {
        if (!v.cliente_id) continue;
        const curr = statsMap.get(v.cliente_id) ?? { count: 0, total: 0 };
        curr.count += 1;
        curr.total += Number(v.total);
        statsMap.set(v.cliente_id, curr);
      }

      return (clientes ?? []).map(c => {
        const stats = statsMap.get(c.id) ?? { count: 0, total: 0 };
        return {
          ...c,
          qtd_compras: stats.count,
          total_gasto: stats.total
        };
      });
    },
  });
}

// ─── Edição em lote de telefones ───
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useBatchUpdateTelefones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; telefone: string }[]) => {
      // Use parallel promises for simple batching since Supabase doesn't have a specific batch update by multiple IDs in a single row
      const promises = payload.map(item => 
        supabase
          .from("clientes")
          .update({ telefone: item.telefone })
          .eq("id", item.id)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error).map(r => r.error);
      if (errors.length > 0) throw errors[0];
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rel_clientes_completos"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    }
  });
}

// ─── Edição em lote de cidades ───

export function useCidadesAtendidas() {
  return useQuery({
    queryKey: ["cidades_atendidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cidades_atendidas")
        .select("id, cidade, nome_normalizado")
        .eq("ativa", true)
        .order("cidade");

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCriarOuObterCidade() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cidade }: { cidade: string }) => {
      if (!user) throw new Error("Não autenticado");
      
      const { data, error } = await supabase.rpc("fn_criar_ou_obter_cidade", {
        _empresa_id: user.user_metadata?.empresa_id || user.id,
        _nome_cidade: cidade
      }); 
      
      if (error) throw error;
      return data; // Returns the UUID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidades_atendidas"] });
    }
  });
}

export function useBatchUpdateCidades() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { id: string; cidade_id: string; cidade_nome: string }[]) => {
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase.rpc("fn_batch_update_clientes_cidades", {
        _cambios: payload,
        _user_id: user.id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rel_clientes_completos"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    }
  });
}
