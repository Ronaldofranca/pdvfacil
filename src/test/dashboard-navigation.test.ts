import { describe, it, expect, vi } from "vitest";

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
    const result = parsePagamentos([{ forma: "dinheiro", valor: 250 }]);
    expect(result).toEqual([{ forma: "dinheiro", valor: 250 }]);
  });

  it("parses a JSON string", () => {
    const result = parsePagamentos('[{"forma":"pix","valor":100}]');
    expect(result).toEqual([{ forma: "pix", valor: 100 }]);
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
});

// ─── Route restore validation ───
const VALID_ROUTE_PREFIXES = [
  "/vendas", "/clientes", "/produtos", "/estoque", "/financeiro",
  "/relatorios", "/pedidos", "/cobrancas", "/caixa", "/metas",
  "/alertas", "/configuracoes", "/usuarios", "/empresas",
  "/notificacoes", "/sync", "/backup", "/audit", "/mais",
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
  it("sums non-crediario pagamentos from vendas", () => {
    const vendas = [
      { pagamentos: [{ forma: "dinheiro", valor: 100 }, { forma: "pix", valor: 150 }] },
      { pagamentos: [{ forma: "crediario", valor: 200 }] },
    ];

    let recebidoAVista = 0;
    for (const venda of vendas) {
      const pgtos = parsePagamentos(venda.pagamentos);
      for (const pg of pgtos) {
        if (pg.forma !== "crediario") {
          recebidoAVista += Number(pg.valor ?? 0);
        }
      }
    }

    expect(recebidoAVista).toBe(250); // 100 + 150, excluding crediario 200
  });

  it("handles vendas with string pagamentos", () => {
    const vendas = [
      { pagamentos: '[{"forma":"dinheiro","valor":300}]' },
    ];

    let recebidoAVista = 0;
    for (const venda of vendas) {
      const pgtos = parsePagamentos(venda.pagamentos);
      for (const pg of pgtos) {
        if (pg.forma !== "crediario") {
          recebidoAVista += Number(pg.valor ?? 0);
        }
      }
    }

    expect(recebidoAVista).toBe(300);
  });

  it("handles vendas with null pagamentos gracefully", () => {
    const vendas = [{ pagamentos: null }];

    let recebidoAVista = 0;
    for (const venda of vendas) {
      const pgtos = parsePagamentos(venda.pagamentos);
      for (const pg of pgtos) {
        if (pg.forma !== "crediario") {
          recebidoAVista += Number(pg.valor ?? 0);
        }
      }
    }

    expect(recebidoAVista).toBe(0);
  });
});

// ─── Timezone: localDayRange ───
describe("Dashboard - localDayRange timezone", () => {
  it("creates correct UTC bounds for local day", () => {
    const date = new Date(2026, 2, 14, 15, 30); // March 14, 2026 3:30pm local
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // start should be midnight local, end should be next midnight local
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getDate()).toBe(15);
    
    // A sale at 3:30pm should be within bounds
    const saleTime = date.getTime();
    expect(saleTime).toBeGreaterThanOrEqual(start.getTime());
    expect(saleTime).toBeLessThan(end.getTime());
  });
});
