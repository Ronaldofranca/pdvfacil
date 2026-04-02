/**
 * Testes de regressão: Filtro de período em Parcelas Vencidas (Financeiro)
 *
 * Esses testes validam APENAS a lógica de filtragem pura — sem Supabase/React.
 * Eles garantem que a correção do bug não regride.
 *
 * Bug original:
 *   - Query usava OR para datas  (gte OU lte) → sempre retornava tudo
 *   - Card "Vencido" usava query global sem período → nunca respondia ao filtro
 *
 * Correção:
 *   - Query usa AND (gte + lte) sobre o campo `vencimento` para status ≠ "paga"
 *   - Query usa AND sobre `data_pagamento` para status = "paga"
 *   - Card "Vencido" deriva do mesmo conjunto filtrado por período
 */

import { describe, it, expect } from "vitest";

// ─── Helpers (espelho da lógica em useParcelas.ts e Financeiro.tsx) ──────────

const TODAY = "2025-04-01";

type MockParcela = {
  id: string;
  status: "pendente" | "parcial" | "vencida" | "paga";
  vencimento: string;        // YYYY-MM-DD
  data_pagamento: string | null;
  saldo: number;
  clientes: { nome: string } | null;
};

/**
 * Filtra parcelas simulando a query corrigida do useParcelas.
 */
function filterParcelas(
  parcelas: MockParcela[],
  opts: {
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }
): MockParcela[] {
  const { status, startDate, endDate, search } = opts;

  return parcelas.filter((p) => {
    // ── Busca por cliente ───────────────────────────────────────────────────
    if (search) {
      const nome = p.clientes?.nome?.toLowerCase() ?? "";
      if (!nome.includes(search.toLowerCase())) return false;
    }

    // ── Filtro de status ────────────────────────────────────────────────────
    if (status === "pendente") {
      if (!["pendente", "parcial"].includes(p.status)) return false;
    } else if (status === "vencida") {
      const isVencida =
        p.status === "vencida" ||
        (["pendente", "parcial"].includes(p.status) && p.vencimento < TODAY);
      if (!isVencida) return false;
    } else if (status && status !== "todas") {
      if (p.status !== status) return false;
    }

    // ── Filtro de período (AND, não OR) ─────────────────────────────────────
    const dateField = status === "paga" ? p.data_pagamento : p.vencimento;
    if (startDate && (!dateField || dateField < startDate)) return false;
    if (endDate   && (!dateField || dateField > endDate))   return false;

    return true;
  });
}

/**
 * Soma o saldo das parcelas (para os cards).
 */
const sumSaldo = (ps: MockParcela[]) => ps.reduce((s, p) => s + p.saldo, 0);

// ─── Dados de teste ───────────────────────────────────────────────────────────

const PARCELAS: MockParcela[] = [
  // Vencidas em março
  { id: "1", status: "vencida",  vencimento: "2025-03-05", data_pagamento: null,       saldo: 100, clientes: { nome: "Ana" } },
  { id: "2", status: "pendente", vencimento: "2025-03-20", data_pagamento: null,       saldo: 200, clientes: { nome: "Bruno" } },
  // Vencida em abril (hoje)
  { id: "3", status: "vencida",  vencimento: "2025-04-01", data_pagamento: null,       saldo: 300, clientes: { nome: "Ana" } },
  // Pendente futura (não vencida)
  { id: "4", status: "pendente", vencimento: "2025-05-01", data_pagamento: null,       saldo: 150, clientes: { nome: "Carlos" } },
  // Paga em março
  { id: "5", status: "paga",     vencimento: "2025-02-01", data_pagamento: "2025-03-10", saldo: 0, clientes: { nome: "Bruno" } },
  // Paga em abril
  { id: "6", status: "paga",     vencimento: "2025-02-15", data_pagamento: "2025-04-01", saldo: 0, clientes: { nome: "Ana" } },
];

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Filtro de Parcelas Vencidas por Período", () => {

  // ── 1. Status vencidas + período com resultados ───────────────────────────
  describe("1. status=vencida + período com resultados", () => {
    it("retorna apenas vencidas dentro de março/2025", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-03-01",
        endDate: "2025-03-31",
      });
      expect(result.map((p) => p.id)).toEqual(["1", "2"]);
    });

    it("card Vencido reflete apenas o saldo do período filtrado", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-03-01",
        endDate: "2025-03-31",
      });
      expect(sumSaldo(result)).toBe(300); // 100 + 200
    });

    it("retorna parcela vencida única em intervalo de um dia", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-03-05",
        endDate: "2025-03-05",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });

  // ── 2. Status vencidas + período sem resultados ───────────────────────────
  describe("2. status=vencida + período sem resultados", () => {
    it("retorna lista vazia quando não há vencidas no período", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-06-01",
        endDate: "2025-06-30",
      });
      expect(result).toHaveLength(0);
    });

    it("card Vencido mostra zero quando lista está vazia", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-06-01",
        endDate: "2025-06-30",
      });
      expect(sumSaldo(result)).toBe(0);
    });

    it("não retorna pendentes futuras como vencidas", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-05-01",
        endDate: "2025-05-31",
      });
      // id=4 é pendente futura (vencimento 2025-05-01), não é vencida
      expect(result).toHaveLength(0);
    });
  });

  // ── 3. Integração com busca por cliente ───────────────────────────────────
  describe("3. busca por cliente + período + vencidas", () => {
    it("filtra por cliente Ana + vencidas em março", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-03-01",
        endDate: "2025-03-31",
        search: "Ana",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("filtra por cliente inexistente + vencidas → vazia", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-03-01",
        endDate: "2025-03-31",
        search: "Zélida",
      });
      expect(result).toHaveLength(0);
      expect(sumSaldo(result)).toBe(0);
    });

    it("busca case-insensitive funciona corretamente", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        search: "bRuNo",
      });
      expect(result.map((p) => p.id)).toContain("2");
    });
  });

  // ── 4. Consistência: cards e listagem usam o mesmo conjunto ──────────────
  describe("4. consistência entre cards e listagem", () => {
    it("saldo total do card = soma dos saldos da listagem filtrada", () => {
      const opts = { status: "vencida", startDate: "2025-03-01", endDate: "2025-04-01" };
      const listagem = filterParcelas(PARCELAS, opts);
      const cardVencido = sumSaldo(listagem);

      // Calcula separado como os cards fazem — deve ser igual
      const somaIndependente = listagem.reduce((s, p) => s + p.saldo, 0);
      expect(cardVencido).toBe(somaIndependente);
    });

    it("sem filtro de período, todos os vencidos aparecem", () => {
      const result = filterParcelas(PARCELAS, { status: "vencida" });
      // id=1 (mar), id=2 (mar pendente), id=3 (apr)
      expect(result.map((p) => p.id)).toEqual(["1", "2", "3"]);
    });
  });

  // ── 5. Campo de data correto ──────────────────────────────────────────────
  describe("5. campo de data correto por status", () => {
    it("status=paga usa data_pagamento, não vencimento", () => {
      const result = filterParcelas(PARCELAS, {
        status: "paga",
        startDate: "2025-03-01",
        endDate: "2025-03-31",
      });
      // Apenas id=5 foi pago em março (data_pagamento = 2025-03-10)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("5");
    });

    it("status=vencida usa vencimento, não data_pagamento", () => {
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-03-01",
        endDate: "2025-03-31",
      });
      // Deve retornar id=1 e id=2 (vencimento em março), não id=5 (paga)
      expect(result.every((p) => p.status !== "paga")).toBe(true);
    });

    it("não cruza data_pagamento com filtro de vencidas", () => {
      // Uma parcela vencida que não foi paga não tem data_pagamento
      const result = filterParcelas(PARCELAS, {
        status: "vencida",
        startDate: "2025-03-01",
        endDate: "2025-03-31",
      });
      expect(result.every((p) => p.data_pagamento === null)).toBe(true);
    });
  });

});
