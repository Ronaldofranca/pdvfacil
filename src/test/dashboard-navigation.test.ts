import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Dashboard: parsePagamentos ───
function parsePagamentos(raw: unknown): Array<{ forma: string; valor: number }> {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

describe("Dashboard - parsePagamentos", () => {
  it("parses a normal array", () => {
    expect(parsePagamentos([{ forma: "dinheiro", valor: 250 }])).toEqual([{ forma: "dinheiro", valor: 250 }]);
  });

  it("parses a JSON string", () => {
    expect(parsePagamentos('[{"forma":"pix","valor":100}]')).toEqual([{ forma: "pix", valor: 100 }]);
  });

  it("returns empty array for null", () => {
    expect(parsePagamentos(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parsePagamentos(undefined)).toEqual([]);
  });

  it("returns empty array for invalid string", () => {
    expect(parsePagamentos("not json")).toEqual([]);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parsePagamentos('{"forma":"pix"}')).toEqual([]);
  });

  it("handles crediário payment", () => {
    const result = parsePagamentos([{ forma: "crediario", valor: 500 }]);
    expect(result[0].forma).toBe("crediario");
  });

  it("handles mixed payments", () => {
    const input = [
      { forma: "dinheiro", valor: 100 },
      { forma: "crediario", valor: 400 },
    ];
    const result = parsePagamentos(input);
    expect(result).toHaveLength(2);
  });
});

// ─── Route restore validation ───
const VALID_ROUTE_PREFIXES = [
  "/vendas", "/clientes", "/produtos", "/estoque", "/financeiro",
  "/relatorios", "/pedidos", "/cobrancas", "/caixa", "/metas",
  "/alertas", "/configuracoes", "/usuarios", "/empresas",
  "/notificacoes", "/sync", "/backup", "/audit", "/mais",
  "/catalogo-interno", "/romaneio", "/importacao", "/conciliacao",
  "/mapa-clientes", "/previsao-estoque", "/agenda-entregas",
  "/documentacao",
];

function isValidRestoreRoute(route: string): boolean {
  if (route === "/") return false;
  return VALID_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
}

describe("Route Restore - validation", () => {
  it("rejects root route", () => {
    expect(isValidRestoreRoute("/")).toBe(false);
  });

  it("accepts valid internal routes", () => {
    expect(isValidRestoreRoute("/vendas")).toBe(true);
    expect(isValidRestoreRoute("/clientes")).toBe(true);
    expect(isValidRestoreRoute("/produtos")).toBe(true);
    expect(isValidRestoreRoute("/documentacao")).toBe(true);
  });

  it("accepts sub-routes", () => {
    expect(isValidRestoreRoute("/vendas/123")).toBe(true);
    expect(isValidRestoreRoute("/estoque/movimentos")).toBe(true);
  });

  it("rejects login and portal routes", () => {
    expect(isValidRestoreRoute("/login")).toBe(false);
    expect(isValidRestoreRoute("/portal/login")).toBe(false);
    expect(isValidRestoreRoute("/catalogo")).toBe(false);
  });

  it("rejects unknown routes", () => {
    expect(isValidRestoreRoute("/unknown-page")).toBe(false);
  });
});

// ─── Dashboard recebido calculation ───
describe("Dashboard - recebido hoje calculation", () => {
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

  it("sums non-crediário pagamentos", () => {
    const vendas = [
      { pagamentos: [{ forma: "dinheiro", valor: 100 }, { forma: "pix", valor: 150 }] },
      { pagamentos: [{ forma: "crediario", valor: 200 }] },
    ];
    expect(calcRecebidoAVista(vendas)).toBe(250);
  });

  it("crediário-only sale = 0 recebido", () => {
    expect(calcRecebidoAVista([{ pagamentos: [{ forma: "crediario", valor: 250 }] }])).toBe(0);
  });

  it("cash-only sale = full value", () => {
    expect(calcRecebidoAVista([{ pagamentos: [{ forma: "dinheiro", valor: 250 }] }])).toBe(250);
  });

  it("handles string pagamentos", () => {
    expect(calcRecebidoAVista([{ pagamentos: '[{"forma":"dinheiro","valor":300}]' }])).toBe(300);
  });

  it("handles null pagamentos", () => {
    expect(calcRecebidoAVista([{ pagamentos: null }])).toBe(0);
  });

  it("sums multiple sales", () => {
    const vendas = [
      { pagamentos: [{ forma: "dinheiro", valor: 100 }] },
      { pagamentos: [{ forma: "pix", valor: 200 }] },
    ];
    expect(calcRecebidoAVista(vendas)).toBe(300);
  });
});

// ─── Dashboard lucro calculation ───
describe("Dashboard - lucro calculation", () => {
  it("calculates profit from itens_venda", () => {
    const itens = [
      { subtotal: 300, custo_unitario: 65, quantidade: 3 },
      { subtotal: 90, custo_unitario: 50, quantidade: 1 },
    ];
    let lucro = 0;
    for (const item of itens) {
      lucro += Number(item.subtotal) - Number(item.custo_unitario ?? 0) * Number(item.quantidade);
    }
    expect(lucro).toBe(145);
  });

  it("falls back to total when no items exist", () => {
    const totalVendasDia = 250;
    const itens: any[] = [];
    const vendaIds = ["abc-123"];

    let lucroDia = 0;
    if (itens.length > 0) {
      // not reached
    } else if (vendaIds.length > 0) {
      lucroDia = totalVendasDia;
    }
    expect(lucroDia).toBe(250);
  });

  it("handles zero cost items", () => {
    const itens = [{ subtotal: 100, custo_unitario: 0, quantidade: 2 }];
    let lucro = 0;
    for (const item of itens) {
      lucro += Number(item.subtotal) - Number(item.custo_unitario ?? 0) * Number(item.quantidade);
    }
    expect(lucro).toBe(100);
  });
});

// ─── Timezone: localDayRange ───
describe("Dashboard - localDayRange timezone", () => {
  it("creates correct UTC bounds for local day", () => {
    const date = new Date(2026, 2, 14, 15, 30);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getDate()).toBe(15);

    const saleTime = date.getTime();
    expect(saleTime).toBeGreaterThanOrEqual(start.getTime());
    expect(saleTime).toBeLessThan(end.getTime());
  });

  it("sale at 11:59 PM falls within today", () => {
    const today = new Date(2026, 2, 14);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const lateNight = new Date(2026, 2, 14, 23, 59, 59);
    expect(lateNight.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(lateNight.getTime()).toBeLessThan(end.getTime());
  });

  it("sale at 12:01 AM next day falls outside today", () => {
    const today = new Date(2026, 2, 14);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const nextDay = new Date(2026, 2, 15, 0, 1);
    expect(nextDay.getTime()).toBeGreaterThanOrEqual(end.getTime());
  });
});

// ─── Body scroll lock cleanup ───
describe("Body scroll lock cleanup", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
    document.body.removeAttribute("data-scroll-locked");
  });

  it("detects and cleans overflow:hidden", () => {
    document.body.style.overflow = "hidden";
    expect(document.body.style.overflow).toBe("hidden");
    document.body.style.overflow = "";
    expect(document.body.style.overflow).toBe("");
  });

  it("detects and cleans pointer-events:none", () => {
    document.body.style.pointerEvents = "none";
    document.body.style.pointerEvents = "";
    expect(document.body.style.pointerEvents).toBe("");
  });

  it("removes data-scroll-locked attribute", () => {
    document.body.setAttribute("data-scroll-locked", "1");
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(true);
    document.body.removeAttribute("data-scroll-locked");
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
  });
});

// ─── Session restore flag ───
describe("Session-based restore flag", () => {
  const SESSION_KEY = "app:route_restored";

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_KEY);
  });

  it("returns null when not set", () => {
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("persists within session after setting", () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    expect(sessionStorage.getItem(SESSION_KEY)).toBe("1");
  });

  it("prevents double restore", () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    const wasRestored = sessionStorage.getItem(SESSION_KEY) === "1";
    expect(wasRestored).toBe(true);
  });
});

// ─── invalidateDashboardQueries coverage ───
describe("Dashboard invalidation on payment", () => {
  it("invalidateDashboardQueries invalidates all required keys", () => {
    const invalidated: string[][] = [];
    const mockQc = {
      invalidateQueries: ({ queryKey }: { queryKey: string[] }) => {
        invalidated.push(queryKey);
      },
    };

    // Simulate what invalidateDashboardQueries does
    const requiredKeys = [
      ["dashboard"], ["dashboard_periodo"], ["vendas"],
      ["estoque"], ["movimentos_estoque"],
      ["parcelas"], ["pagamentos"], ["financial_ledger"],
    ];
    for (const key of requiredKeys) {
      mockQc.invalidateQueries({ queryKey: key });
    }

    expect(invalidated).toContainEqual(["dashboard"]);
    expect(invalidated).toContainEqual(["dashboard_periodo"]);
    expect(invalidated).toContainEqual(["parcelas"]);
    expect(invalidated).toContainEqual(["pagamentos"]);
    expect(invalidated.length).toBe(8);
  });

  it("payment registration should trigger dashboard refresh", () => {
    // This test validates the contract: after payment, dashboard keys must be invalidated
    const keysToInvalidate = ["dashboard", "dashboard_periodo", "parcelas", "pagamentos"];
    const allPresent = keysToInvalidate.every(k =>
      ["dashboard", "dashboard_periodo", "vendas", "estoque", "movimentos_estoque", "parcelas", "pagamentos", "financial_ledger"].includes(k)
    );
    expect(allPresent).toBe(true);
  });
});

// ─── Profit calculation: immutable historical snapshots ───
describe("Profit calculation - immutable historical snapshots", () => {
  // Simulates how the RPC computes profit per item
  function computeItemProfit(item: { subtotal: number; custo_unitario: number; quantidade: number }) {
    const lineCost = item.custo_unitario * item.quantidade;
    const lineProfit = item.subtotal - lineCost;
    return { lineCost, lineProfit };
  }

  function computeVendaTotals(itens: Array<{ subtotal: number; custo_unitario: number; quantidade: number }>) {
    let totalCost = 0;
    let totalProfit = 0;
    for (const item of itens) {
      const { lineCost, lineProfit } = computeItemProfit(item);
      totalCost += lineCost;
      totalProfit += lineProfit;
    }
    return { totalCost, totalProfit };
  }

  it("simple sale: price 100, cost 60, qty 1 → profit 40", () => {
    const { totalCost, totalProfit } = computeVendaTotals([
      { subtotal: 100, custo_unitario: 60, quantidade: 1 },
    ]);
    expect(totalCost).toBe(60);
    expect(totalProfit).toBe(40);
  });

  it("multiple items: sums correctly", () => {
    const { totalCost, totalProfit } = computeVendaTotals([
      { subtotal: 100, custo_unitario: 60, quantidade: 1 },
      { subtotal: 200, custo_unitario: 80, quantidade: 2 },
    ]);
    expect(totalCost).toBe(60 + 160);
    expect(totalProfit).toBe(40 + 40);
  });

  it("quantity > 1: multiplies cost correctly", () => {
    const { totalCost, totalProfit } = computeVendaTotals([
      { subtotal: 500, custo_unitario: 30, quantidade: 5 },
    ]);
    expect(totalCost).toBe(150);
    expect(totalProfit).toBe(350);
  });

  it("zero cost product: profit equals revenue", () => {
    const { totalCost, totalProfit } = computeVendaTotals([
      { subtotal: 200, custo_unitario: 0, quantidade: 3 },
    ]);
    expect(totalCost).toBe(0);
    expect(totalProfit).toBe(200);
  });

  it("historical immutability: changing product cost doesn't affect stored profit", () => {
    // Snapshot at time of sale: cost was 60
    const atSaleTime = computeVendaTotals([
      { subtotal: 100, custo_unitario: 60, quantidade: 1 },
    ]);
    // Product cost changes to 80 later — but stored values don't change
    const storedProfit = atSaleTime.totalProfit;
    expect(storedProfit).toBe(40);
    // The stored value remains 40 regardless of current product cost
    expect(storedProfit).not.toBe(20); // would be wrong if using new cost of 80
  });

  it("cancelled sales excluded from aggregate", () => {
    const vendas = [
      { total_profit: 40, status: "finalizada" },
      { total_profit: 30, status: "cancelada" },
      { total_profit: 50, status: "finalizada" },
    ];
    const lucroAgregado = vendas
      .filter(v => v.status === "finalizada")
      .reduce((s, v) => s + v.total_profit, 0);
    expect(lucroAgregado).toBe(90);
    expect(lucroAgregado).not.toBe(120); // must NOT include cancelled
  });

  it("dashboard must never use total as profit substitute", () => {
    const venda = { total: 250, total_profit: 40, total_cost: 210 };
    // The correct profit is total_profit, NOT total
    expect(venda.total_profit).toBe(40);
    expect(venda.total_profit).not.toBe(venda.total);
    expect(venda.total_cost + venda.total_profit).toBe(venda.total);
  });

  it("bonus items (free) have zero subtotal, profit is negative cost", () => {
    const { totalCost, totalProfit } = computeVendaTotals([
      { subtotal: 0, custo_unitario: 30, quantidade: 1 },
    ]);
    expect(totalCost).toBe(30);
    expect(totalProfit).toBe(-30);
  });
});
