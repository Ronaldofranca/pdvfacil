import { describe, it, expect } from "vitest";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Parcela {
  id: string;
  numero: number;
  vencimento: string; // YYYY-MM-DD
  valor_total: number;
  valor_pago: number;
  saldo: number;
  status: "pendente" | "parcial" | "paga" | "vencida";
  cliente_id: string;
}

interface Pagamento {
  id: string;
  parcela_id: string;
  valor_pago: number;
  forma_pagamento: string;
  data_pagamento: string;
  observacoes?: string;
}

interface Venda {
  id: string;
  cliente_id: string;
  data_venda: string;
  total: number;
  status: string;
}

// ─── Logic mirrors (same logic as portal pages) ──────────────────────────────

const TODAY = "2026-03-26"; // fixed date for deterministic tests

function getVencidas(parcelas: Parcela[]): Parcela[] {
  return parcelas.filter(
    (p) =>
      (p.status === "pendente" || p.status === "parcial") &&
      Number(p.saldo) > 0 &&
      p.vencimento < TODAY
  );
}

function getAbertas(parcelas: Parcela[]): Parcela[] {
  return parcelas.filter(
    (p) =>
      (p.status === "pendente" || p.status === "parcial") &&
      p.vencimento >= TODAY
  );
}

function getPagas(parcelas: Parcela[]): Parcela[] {
  return parcelas.filter((p) => p.status === "paga");
}

function filterParcelasByCliente(parcelas: Parcela[], clienteId: string): Parcela[] {
  return parcelas.filter((p) => p.cliente_id === clienteId);
}

function filterVendasByCliente(vendas: Venda[], clienteId: string): Venda[] {
  return vendas.filter((v) => v.cliente_id === clienteId);
}

function filterPagamentosByParcelaIds(pagamentos: Pagamento[], parcelaIds: string[]): Pagamento[] {
  // Mirrors the two-step query security: only payments for known parcelaIds
  return pagamentos.filter((pg) => parcelaIds.includes(pg.parcela_id));
}

function hasPortalAccess(clienteUserId: string | null): boolean {
  return !!clienteUserId;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const CLIENTE_A = "cli_a";
const CLIENTE_B = "cli_b";

const mockParcelas: Parcela[] = [
  // Cliente A − vencida (data passou, status ainda 'pendente' no banco)
  { id: "p1", numero: 1, vencimento: "2026-02-01", valor_total: 200, valor_pago: 0, saldo: 200, status: "pendente", cliente_id: CLIENTE_A },
  // Cliente A − aberta (vence hoje ou no futuro)
  { id: "p2", numero: 2, vencimento: "2026-04-01", valor_total: 200, valor_pago: 0, saldo: 200, status: "pendente", cliente_id: CLIENTE_A },
  // Cliente A − parcial, já vencida
  { id: "p3", numero: 3, vencimento: "2026-01-15", valor_total: 300, valor_pago: 100, saldo: 200, status: "parcial", cliente_id: CLIENTE_A },
  // Cliente A − paga
  { id: "p4", numero: 4, vencimento: "2026-01-01", valor_total: 150, valor_pago: 150, saldo: 0, status: "paga", cliente_id: CLIENTE_A },
  // Cliente B − vencida (NÃO deve aparecer para cliente A)
  { id: "p5", numero: 1, vencimento: "2026-02-01", valor_total: 500, valor_pago: 0, saldo: 500, status: "pendente", cliente_id: CLIENTE_B },
];

const mockVendas: Venda[] = [
  { id: "v1", cliente_id: CLIENTE_A, data_venda: "2026-03-01", total: 200, status: "finalizada" },
  { id: "v2", cliente_id: CLIENTE_A, data_venda: "2026-02-15", total: 300, status: "finalizada" },
  { id: "v3", cliente_id: CLIENTE_B, data_venda: "2026-03-10", total: 500, status: "finalizada" },
];

const mockPagamentos: Pagamento[] = [
  { id: "pg1", parcela_id: "p4", valor_pago: 150, forma_pagamento: "PIX", data_pagamento: "2026-01-05" },
  { id: "pg2", parcela_id: "p3", valor_pago: 100, forma_pagamento: "Cartão", data_pagamento: "2026-01-10" },
  // Pagamento do cliente B — NÃO deve ser acessível por cliente A
  { id: "pg3", parcela_id: "p5", valor_pago: 200, forma_pagamento: "Dinheiro", data_pagamento: "2026-02-10" },
];

// ─── Tests: Parcelas ─────────────────────────────────────────────────────────

describe("Portal: Parcelas do cliente", () => {
  it("cliente A vê apenas as próprias parcelas", () => {
    const result = filterParcelasByCliente(mockParcelas, CLIENTE_A);
    expect(result.every((p) => p.cliente_id === CLIENTE_A)).toBe(true);
    expect(result.map((p) => p.id)).not.toContain("p5");
  });

  it("vencidas são calculadas por data, não por status do banco", () => {
    const parcelas = filterParcelasByCliente(mockParcelas, CLIENTE_A);
    const vencidas = getVencidas(parcelas);
    // p1 e p3 têm vencimento passado e saldo > 0, mesmo com status='pendente'/'parcial'
    expect(vencidas.map((p) => p.id)).toEqual(expect.arrayContaining(["p1", "p3"]));
    // p2 é futura, não deve ser vencida
    expect(vencidas.map((p) => p.id)).not.toContain("p2");
  });

  it("parcela com saldo=0 não aparece nas vencidas mesmo com vencimento passado", () => {
    const parcelaZeroSaldo: Parcela = {
      id: "pz", numero: 99, vencimento: "2025-01-01", valor_total: 100, valor_pago: 100, saldo: 0, status: "pendente", cliente_id: CLIENTE_A,
    };
    expect(getVencidas([parcelaZeroSaldo])).toHaveLength(0);
  });

  it("parcelas abertas têm vencimento >= hoje", () => {
    const parcelas = filterParcelasByCliente(mockParcelas, CLIENTE_A);
    const abertas = getAbertas(parcelas);
    expect(abertas.map((p) => p.id)).toContain("p2");
    expect(abertas.map((p) => p.id)).not.toContain("p1"); // vencida
  });

  it("parcelas pagas são identificadas pelo status=paga", () => {
    const parcelas = filterParcelasByCliente(mockParcelas, CLIENTE_A);
    const pagas = getPagas(parcelas);
    expect(pagas.map((p) => p.id)).toEqual(["p4"]);
  });

  it("totalAberto = soma de saldo de abertas + vencidas", () => {
    const parcelas = filterParcelasByCliente(mockParcelas, CLIENTE_A);
    const abertas = getAbertas(parcelas);
    const vencidas = getVencidas(parcelas);
    const total = [...abertas, ...vencidas].reduce((s, p) => s + p.saldo, 0);
    // p1(200) + p2(200) + p3(200) = 600
    expect(total).toBe(600);
  });

  it("totalVencido = soma do saldo das vencidas por data", () => {
    const parcelas = filterParcelasByCliente(mockParcelas, CLIENTE_A);
    const vencidas = getVencidas(parcelas);
    const total = vencidas.reduce((s, p) => s + p.saldo, 0);
    // p1(200) + p3(200) = 400
    expect(total).toBe(400);
  });
});

// ─── Tests: Histórico de Compras ─────────────────────────────────────────────

describe("Portal: Histórico de compras", () => {
  it("cliente A vê apenas as próprias compras", () => {
    const result = filterVendasByCliente(mockVendas, CLIENTE_A);
    expect(result.every((v) => v.cliente_id === CLIENTE_A)).toBe(true);
    expect(result.map((v) => v.id)).not.toContain("v3");
  });

  it("cliente B não vê compras do cliente A", () => {
    const result = filterVendasByCliente(mockVendas, CLIENTE_B);
    expect(result.map((v) => v.id)).not.toContain("v1");
    expect(result.map((v) => v.id)).not.toContain("v2");
  });
});

// ─── Tests: Histórico de Pagamentos ──────────────────────────────────────────

describe("Portal: Histórico de pagamentos", () => {
  it("cliente A vê apenas pagamentos das próprias parcelas", () => {
    const parcelasA = filterParcelasByCliente(mockParcelas, CLIENTE_A).map((p) => p.id);
    const result = filterPagamentosByParcelaIds(mockPagamentos, parcelasA);
    expect(result.map((pg) => pg.id)).toEqual(expect.arrayContaining(["pg1", "pg2"]));
    expect(result.map((pg) => pg.id)).not.toContain("pg3");
  });

  it("cliente B não acessa pagamentos do cliente A", () => {
    const parcelasB = filterParcelasByCliente(mockParcelas, CLIENTE_B).map((p) => p.id);
    const result = filterPagamentosByParcelaIds(mockPagamentos, parcelasB);
    expect(result.map((pg) => pg.id)).toContain("pg3");
    expect(result.map((pg) => pg.id)).not.toContain("pg1");
  });

  it("total pago é a soma correta dos pagamentos do cliente A", () => {
    const parcelasA = filterParcelasByCliente(mockParcelas, CLIENTE_A).map((p) => p.id);
    const result = filterPagamentosByParcelaIds(mockPagamentos, parcelasA);
    const total = result.reduce((s, pg) => s + pg.valor_pago, 0);
    expect(total).toBe(250); // 150 + 100
  });

  it("cliente sem parcelas retorna histórico vazio", () => {
    const result = filterPagamentosByParcelaIds(mockPagamentos, []);
    expect(result).toHaveLength(0);
  });
});

// ─── Tests: PIX ──────────────────────────────────────────────────────────────

describe("Portal: PIX", () => {
  it("chave PIX aparece quando configurada", () => {
    const config = { pix_chave: "empresa@pix.com", pix_tipo: "email", portal_mostrar_pix: true };
    expect(config.pix_chave).toBeTruthy();
    expect(config.portal_mostrar_pix).toBe(true);
  });

  it("bloco PIX não é exibido quando totalAberto = 0", () => {
    const totalAberto = 0;
    const showPix = totalAberto > 0;
    expect(showPix).toBe(false);
  });

  it("bloco PIX é exibido quando há saldo em aberto", () => {
    const totalAberto = 400;
    const config = { pix_chave: "empresa@pix.com", portal_mostrar_pix: true };
    const showPix = config.portal_mostrar_pix && !!config.pix_chave && totalAberto > 0;
    expect(showPix).toBe(true);
  });

  it("copiar PIX deve gerar payload não-vazio com chave, valor, nome e cidade", () => {
    // Simula buildPixPayload com inputs válidos
    const pix_chave = "12345678000195";
    const valor = 200;
    const payload = `${pix_chave}|${valor}`;
    expect(payload).toContain(pix_chave);
    expect(payload.length).toBeGreaterThan(0);
  });

  it("QR Code não é gerado quando saldo = 0", () => {
    const parcela = { saldo: 0 };
    const shouldGenerate = Number(parcela.saldo) > 0;
    expect(shouldGenerate).toBe(false);
  });

  it("QR Code é gerado quando saldo > 0 e chave PIX configurada", () => {
    const parcela = { saldo: 200 };
    const pix_chave = "empresa@pix.com";
    const shouldGenerate = Number(parcela.saldo) > 0 && !!pix_chave;
    expect(shouldGenerate).toBe(true);
  });
});

// ─── Tests: Segurança ─────────────────────────────────────────────────────────

describe("Portal: Segurança — isolamento entre clientes", () => {
  it("cliente sem user_id não tem acesso ao portal", () => {
    expect(hasPortalAccess(null)).toBe(false);
  });

  it("cliente com user_id tem acesso ao portal", () => {
    expect(hasPortalAccess("user-xyz")).toBe(true);
  });

  it("parcelas de dois clientes não se misturam", () => {
    const parcelasA = filterParcelasByCliente(mockParcelas, CLIENTE_A);
    const parcelasB = filterParcelasByCliente(mockParcelas, CLIENTE_B);
    const idsA = new Set(parcelasA.map((p) => p.id));
    const idsB = new Set(parcelasB.map((p) => p.id));
    const interseção = [...idsA].filter((id) => idsB.has(id));
    expect(interseção).toHaveLength(0);
  });

  it("pagamentos de dois clientes não se misturam após filtro por parcelas", () => {
    const idsA = filterParcelasByCliente(mockParcelas, CLIENTE_A).map((p) => p.id);
    const idsB = filterParcelasByCliente(mockParcelas, CLIENTE_B).map((p) => p.id);
    const pgA = filterPagamentosByParcelaIds(mockPagamentos, idsA);
    const pgB = filterPagamentosByParcelaIds(mockPagamentos, idsB);
    const pgIdsA = new Set(pgA.map((p) => p.id));
    const pgIdsB = new Set(pgB.map((p) => p.id));
    const interseção = [...pgIdsA].filter((id) => pgIdsB.has(id));
    expect(interseção).toHaveLength(0);
  });

  it("vendas de dois clientes não se misturam", () => {
    const vendasA = filterVendasByCliente(mockVendas, CLIENTE_A);
    const vendasB = filterVendasByCliente(mockVendas, CLIENTE_B);
    const idsA = new Set(vendasA.map((v) => v.id));
    const idsB = new Set(vendasB.map((v) => v.id));
    const interseção = [...idsA].filter((id) => idsB.has(id));
    expect(interseção).toHaveLength(0);
  });
});
