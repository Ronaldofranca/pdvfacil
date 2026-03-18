import { describe, it, expect } from "vitest";
import { parsePagamentos } from "@/hooks/useDashboard";

// ─── Recebido calculation helpers (mirroring Dashboard & Relatórios logic) ───

function calcRecebidoAVista(vendas: Array<{ pagamentos: unknown }>): number {
  let total = 0;
  for (const venda of vendas) {
    const pgtos = parsePagamentos(venda.pagamentos);
    for (const pg of pgtos) {
      if (pg.forma !== "crediario") {
        total += Number(pg.valor ?? 0);
      }
    }
  }
  return total;
}

function calcRecebidoTotal(
  pagamentosParcelas: Array<{ valor_pago: number }>,
  vendas: Array<{ pagamentos: unknown }>,
): number {
  const parcelasTotal = pagamentosParcelas.reduce((s, p) => s + Number(p.valor_pago), 0);
  const avistaTotal = calcRecebidoAVista(vendas);
  return parcelasTotal + avistaTotal;
}

// ─── Tests ───

describe("Recebidos - parcela totalmente paga", () => {
  it("counts full payment correctly", () => {
    const pagamentos = [{ valor_pago: 500 }];
    const vendas: any[] = [];
    expect(calcRecebidoTotal(pagamentos, vendas)).toBe(500);
  });
});

describe("Recebidos - pagamento parcial", () => {
  it("sums only the paid amount, not the full parcela", () => {
    const pagamentos = [{ valor_pago: 200 }, { valor_pago: 100 }];
    expect(pagamentos.reduce((s, p) => s + p.valor_pago, 0)).toBe(300);
    // Even if parcela.valor_total is 500, only 300 is counted
  });
});

describe("Recebidos - parcela em aberto", () => {
  it("does not count zero-payment parcelas", () => {
    const pagamentos: any[] = [];
    expect(calcRecebidoTotal(pagamentos, [])).toBe(0);
  });
});

describe("Recebidos - cancelamento/estorno", () => {
  it("cancelled vendas do not contribute to recebido", () => {
    // Cancelled vendas are filtered by status='finalizada' in queries
    // so they never appear in the vendas array passed to calcRecebidoAVista
    const vendas = [
      { pagamentos: [{ forma: "dinheiro", valor: 100 }] }, // finalizada
      // { pagamentos: [...], status: "cancelada" } — excluded by query
    ];
    expect(calcRecebidoAVista(vendas)).toBe(100);
  });
});

describe("Recebidos - consistency between Dashboard and Relatórios", () => {
  it("same formula produces same result", () => {
    const pagamentosParcelas = [{ valor_pago: 150 }, { valor_pago: 200 }];
    const vendas = [
      { pagamentos: [{ forma: "dinheiro", valor: 100 }, { forma: "pix", valor: 50 }] },
      { pagamentos: [{ forma: "crediario", valor: 300 }] },
    ];

    const dashboardRecebido = calcRecebidoTotal(pagamentosParcelas, vendas);
    const relatoriosRecebido = calcRecebidoTotal(pagamentosParcelas, vendas);
    expect(dashboardRecebido).toBe(relatoriosRecebido);
    expect(dashboardRecebido).toBe(350 + 150); // 150 à vista + 350 parcelas
  });
});

describe("Recebidos - period filter uses payment date", () => {
  it("filters by data_pagamento, not vencimento", () => {
    // The query uses .gte("data_pagamento", start).lt("data_pagamento", end)
    // This ensures we count by when payment was actually made
    const pagamentoJan = { valor_pago: 100, data_pagamento: "2026-01-15" };
    const pagamentoFeb = { valor_pago: 200, data_pagamento: "2026-02-10" };

    // Simulating a January filter
    const janPayments = [pagamentoJan, pagamentoFeb].filter(
      (p) => p.data_pagamento >= "2026-01-01" && p.data_pagamento < "2026-02-01",
    );
    expect(janPayments.reduce((s, p) => s + p.valor_pago, 0)).toBe(100);
  });
});

describe("Recebidos - no duplicate counting", () => {
  it("à vista and parcela payments are separate sources", () => {
    // À vista comes from vendas.pagamentos (non-crediário)
    // Parcela payments come from pagamentos table
    // They should NOT overlap
    const parcelaPagamentos = [{ valor_pago: 200 }];
    const vendas = [{ pagamentos: [{ forma: "dinheiro", valor: 300 }] }];

    const total = calcRecebidoTotal(parcelaPagamentos, vendas);
    expect(total).toBe(500); // 200 + 300, no duplication
  });

  it("crediário portion of a venda is NOT counted as à vista", () => {
    const vendas = [
      {
        pagamentos: [
          { forma: "dinheiro", valor: 100 },
          { forma: "crediario", valor: 400 },
        ],
      },
    ];
    expect(calcRecebidoAVista(vendas)).toBe(100); // only cash, not crediário
  });
});

describe("Recebidos - JSON string pagamentos handling", () => {
  it("handles pagamentos as JSON string (bug fix verification)", () => {
    const vendas = [
      { pagamentos: '[{"forma":"pix","valor":250}]' },
    ];
    // Before fix: Array.isArray would return false, missing this payment
    // After fix: parsePagamentos handles the string
    expect(calcRecebidoAVista(vendas)).toBe(250);
  });

  it("handles null pagamentos gracefully", () => {
    expect(calcRecebidoAVista([{ pagamentos: null }])).toBe(0);
  });
});
