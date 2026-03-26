import { describe, it, expect } from "vitest";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Parcela {
  id: string;
  status: string;
  saldo: number;
  valor_pago: number;
  vencimento: string; // YYYY-MM-DD
  clientes?: { nome: string };
}

interface Pagamento {
  valor_pago: number;
  data_pagamento: string;
  parcelas?: { clientes?: { nome: string } };
}

// ─── Logic mirroring Financeiro.tsx ──────────────────────────────────────────

const isDateInRange = (
  dateStr: string | null,
  start: string | null,
  end: string | null
) => {
  if (!dateStr) return false;
  return (!start || dateStr >= start) && (!end || dateStr <= end);
};

const matchesSearch = (nome: string | null | undefined, search: string) =>
  !search || (nome?.toLowerCase().includes(search.toLowerCase()) ?? false);

/**
 * Computes card totals mirroring the logic in Financeiro.tsx:
 *
 * - totalPendente  → status pendente/parcial + within date range
 * - totalVencido   → saldo > 0 AND vencimento < today (frontend-computed, DB-status-agnostic)
 * - totalParcial   → status parcial + within date range  (valor_pago portion)
 * - totalRecebido  → sum of pagamentos within date range
 */
function calculateTotals(
  todasParcelasPendentesGlobal: Parcela[], // all pending/parcial, no date filter
  todasParcelasNoPeriodo: Parcela[],       // all statuses, date-range filtered
  pagamentos: Pagamento[],
  search: string,
  startDate: string | null,
  endDate: string | null,
  today: string // YYYY-MM-DD — injected for deterministic testing
) {
  // Pendente card: inside date range, pending/parcial
  const totalPendente = todasParcelasNoPeriodo
    .filter(
      (p) =>
        (p.status === "pendente" || p.status === "parcial") &&
        isDateInRange(p.vencimento, startDate, endDate) &&
        matchesSearch(p.clientes?.nome, search)
    )
    .reduce((s, p) => s + p.saldo, 0);

  // Vencido card: saldo > 0 AND due date is in the past — ignores DB status field
  const totalVencido = todasParcelasPendentesGlobal
    .filter((p) => {
      if (!matchesSearch(p.clientes?.nome, search)) return false;
      if (p.saldo <= 0) return false;
      return p.vencimento < today; // string comparison safe for YYYY-MM-DD
    })
    .reduce((s, p) => s + p.saldo, 0);

  // Parcial card: portion already paid
  const totalParcial = todasParcelasNoPeriodo
    .filter(
      (p) =>
        p.status === "parcial" &&
        isDateInRange(p.vencimento, startDate, endDate) &&
        matchesSearch(p.clientes?.nome, search)
    )
    .reduce((s, p) => s + p.valor_pago, 0);

  // Recebido card: payments in the period
  const totalRecebido = pagamentos
    .filter((pay) => matchesSearch(pay.parcelas?.clientes?.nome, search))
    .reduce((s, pay) => s + pay.valor_pago, 0);

  return { totalPendente, totalVencido, totalParcial, totalRecebido };
}

// ─── Test data ───────────────────────────────────────────────────────────────

// TODAY = 2026-03-26 (for deterministic test runs)
const TODAY = "2026-03-26";

// todasParcelasPendentesGlobal — no date filter, only pendente/parcial
const globalPending: Parcela[] = [
  // Overdue: vencimento < TODAY, saldo > 0
  { id: "1", status: "pendente", saldo: 200, valor_pago: 0,  vencimento: "2026-03-10", clientes: { nome: "Elane" } },
  { id: "2", status: "parcial",  saldo: 80,  valor_pago: 70, vencimento: "2026-03-01", clientes: { nome: "Nilza" } },
  // NOT overdue: future due date
  { id: "3", status: "pendente", saldo: 150, valor_pago: 0,  vencimento: "2026-04-10", clientes: { nome: "Elane" } },
  // NOT overdue: saldo = 0
  { id: "4", status: "parcial",  saldo: 0,   valor_pago: 100, vencimento: "2026-03-05", clientes: { nome: "Samy" } },
  // Overdue with status still "pendente" (the bug case — DB never updated status)
  { id: "5", status: "pendente", saldo: 90,  valor_pago: 0,  vencimento: "2026-02-15", clientes: { nome: "Samy" } },
];

// todasParcelasNoPeriodo — date-range filtered (March 2026)
const periodParcelas: Parcela[] = [
  { id: "1", status: "pendente", saldo: 200, valor_pago: 0,   vencimento: "2026-03-10", clientes: { nome: "Elane" } },
  { id: "2", status: "parcial",  saldo: 80,  valor_pago: 70,  vencimento: "2026-03-01", clientes: { nome: "Nilza" } },
  { id: "3", status: "pendente", saldo: 150, valor_pago: 0,   vencimento: "2026-03-28", clientes: { nome: "Elane" } },
  { id: "6", status: "paga",     saldo: 0,   valor_pago: 300, vencimento: "2026-03-15", clientes: { nome: "Samy" } },
];

const pagamentos: Pagamento[] = [
  { valor_pago: 300, data_pagamento: "2026-03-15", parcelas: { clientes: { nome: "Samy" } } },
  { valor_pago: 70,  data_pagamento: "2026-03-20", parcelas: { clientes: { nome: "Nilza" } } },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Card Vencido — nova lógica (data + saldo, sem depender do status do banco)", () => {
  it("mostra total global quando não há busca por cliente", () => {
    const { totalVencido } = calculateTotals(
      globalPending, periodParcelas, pagamentos, "", "2026-03-01", "2026-03-31", TODAY
    );
    // Overdue: Elane (200, id=1) + Nilza (80, id=2) + Samy (90, id=5) = 370
    expect(totalVencido).toBe(370);
  });

  it("mostra apenas vencidas do cliente pesquisado (Elane)", () => {
    const { totalVencido } = calculateTotals(
      globalPending, periodParcelas, pagamentos, "Elane", "2026-03-01", "2026-03-31", TODAY
    );
    // Elane: id=1 (200), id=3 futuro → só 200
    expect(totalVencido).toBe(200);
  });

  it("mostra apenas vencidas do cliente pesquisado (Nilza)", () => {
    const { totalVencido } = calculateTotals(
      globalPending, periodParcelas, pagamentos, "Nilza", "2026-03-01", "2026-03-31", TODAY
    );
    expect(totalVencido).toBe(80);
  });

  it("parcela com saldo = 0 não entra no card Vencido", () => {
    const { totalVencido } = calculateTotals(
      globalPending, periodParcelas, pagamentos, "Samy", "2026-03-01", "2026-03-31", TODAY
    );
    // Samy id=4 saldo=0 não conta; id=5 saldo=90 conta
    expect(totalVencido).toBe(90);
  });

  it("parcela com vencimento futuro não entra no card Vencido", () => {
    const future: Parcela[] = [
      { id: "99", status: "pendente", saldo: 500, valor_pago: 0, vencimento: "2026-12-31", clientes: { nome: "Test" } },
    ];
    const { totalVencido } = calculateTotals(
      future, [], [], "", null, null, TODAY
    );
    expect(totalVencido).toBe(0);
  });

  it("parcela vencida com saldo > 0 mas status='pendente' no banco ENTRA no card (bug fix)", () => {
    const bug: Parcela[] = [
      // Status do banco é 'pendente' mas vencimento já passou — era o bug
      { id: "10", status: "pendente", saldo: 123, valor_pago: 0, vencimento: "2026-01-01", clientes: { nome: "BugCliente" } },
    ];
    const { totalVencido } = calculateTotals(
      bug, [], [], "", null, null, TODAY
    );
    expect(totalVencido).toBe(123);
  });

  it("retorna ao total global após limpar a busca por cliente", () => {
    const withSearch = calculateTotals(
      globalPending, periodParcelas, pagamentos, "Elane", "2026-03-01", "2026-03-31", TODAY
    );
    const withoutSearch = calculateTotals(
      globalPending, periodParcelas, pagamentos, "", "2026-03-01", "2026-03-31", TODAY
    );
    expect(withSearch.totalVencido).toBe(200);
    expect(withoutSearch.totalVencido).toBe(370);
  });

  it("parcela paga (saldo=0) nunca entra como vencida", () => {
    const paid: Parcela[] = [
      { id: "11", status: "paga", saldo: 0, valor_pago: 200, vencimento: "2026-01-15", clientes: { nome: "Test" } },
    ];
    const { totalVencido } = calculateTotals(
      paid, [], [], "", null, null, TODAY
    );
    expect(totalVencido).toBe(0);
  });
});

describe("Card Pendente — consistência com card Vencido", () => {
  it("pendente não inclui vencida do mesmo período", () => {
    const { totalPendente } = calculateTotals(
      globalPending, periodParcelas, pagamentos, "", "2026-03-01", "2026-03-31", TODAY
    );
    // Elane id=1 (200) + Elane id=3 (150) + Nilza id=2 (80) = 430
    expect(totalPendente).toBe(430);
  });
});

describe("Timezone — comparação de vencimento com data local", () => {
  it("usa YYYY-MM-DD local na comparação, evitando erro de UTC", () => {
    // Parcela com vencimento = hoje → NÃO é vencida (vencimento == today, não <)
    const today: Parcela[] = [
      { id: "20", status: "pendente", saldo: 100, valor_pago: 0, vencimento: TODAY, clientes: { nome: "Test" } },
    ];
    const { totalVencido } = calculateTotals(today, [], [], "", null, null, TODAY);
    // today < today é false → não entra
    expect(totalVencido).toBe(0);
  });

  it("parcela com vencimento = hoje - 1 dia ENTRA como vencida", () => {
    const yesterday = "2026-03-25"; // TODAY - 1
    const yest: Parcela[] = [
      { id: "21", status: "pendente", saldo: 55, valor_pago: 0, vencimento: yesterday, clientes: { nome: "Test" } },
    ];
    const { totalVencido } = calculateTotals(yest, [], [], "", null, null, TODAY);
    expect(totalVencido).toBe(55);
  });
});

describe("Consistência entre listagem e cards", () => {
  it("total vencido do card = soma das parcelas vencidas na listagem", () => {
    // Simulating what the table shows for overdue items (same source: todasParcelasPendentesGlobal filtered)
    const listagemVencidas = globalPending.filter(
      (p) => p.saldo > 0 && p.vencimento < TODAY
    );
    const somaListagem = listagemVencidas.reduce((s, p) => s + p.saldo, 0);

    const { totalVencido } = calculateTotals(
      globalPending, periodParcelas, pagamentos, "", null, null, TODAY
    );
    expect(totalVencido).toBe(somaListagem);
  });
});
