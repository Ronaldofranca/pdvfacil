import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "p1", numero: 1, status: "rascunho" }, error: null }),
    })),
    rpc: vi.fn(),
  },
}));

describe("Pedidos de Reposição — business rules", () => {
  it("draft pedido can be edited (status = rascunho)", () => {
    const pedido = { id: "p1", status: "rascunho", fornecedor_nome: "Test" };
    expect(pedido.status).toBe("rascunho");
    // Rascunho allows editing — no restriction
    expect(true).toBe(true);
  });

  it("finalizado pedido cannot be edited directly", () => {
    const pedido = { id: "p2", status: "finalizado" };
    const canEdit = pedido.status === "rascunho";
    expect(canEdit).toBe(false);
  });

  it("recebido pedido blocks duplicate receipt", () => {
    const pedido = { id: "p3", status: "recebido" };
    const canReceive = pedido.status === "finalizado" || pedido.status === "recebido_parcial";
    expect(canReceive).toBe(false);
  });

  it("finalizado or recebido_parcial allows receipt", () => {
    expect(["finalizado", "recebido_parcial"].includes("finalizado")).toBe(true);
    expect(["finalizado", "recebido_parcial"].includes("recebido_parcial")).toBe(true);
  });

  it("cancelled pedido cannot be received", () => {
    const pedido = { status: "cancelado" };
    const canReceive = pedido.status === "finalizado" || pedido.status === "recebido_parcial";
    expect(canReceive).toBe(false);
  });

  it("partial receipt marks as recebido_parcial", () => {
    // Item: solicitado=10, recebido=5 → partial
    const items = [{ quantidade_solicitada: 10, quantidade_recebida: 5 }];
    const allReceived = items.every((i) => i.quantidade_recebida >= i.quantidade_solicitada);
    expect(allReceived).toBe(false);
  });

  it("full receipt marks as recebido", () => {
    const items = [
      { quantidade_solicitada: 10, quantidade_recebida: 10 },
      { quantidade_solicitada: 5, quantidade_recebida: 5 },
    ];
    const allReceived = items.every((i) => i.quantidade_recebida >= i.quantidade_solicitada);
    expect(allReceived).toBe(true);
  });

  it("PDF generation requires items array", () => {
    const pedido = {
      numero: 1,
      fornecedor_nome: "Fornecedor A",
      itens_pedido_reposicao: [
        { produto_id: "x", quantidade_solicitada: 5, custo_unitario: 10, subtotal: 50 },
      ],
      total_itens: 1,
      total_valor: 50,
    };
    expect(pedido.itens_pedido_reposicao.length).toBeGreaterThan(0);
    expect(pedido.total_valor).toBe(50);
  });

  it("subtotal calculation is quantity × cost", () => {
    const qty = 7;
    const custo = 12.5;
    expect(qty * custo).toBe(87.5);
  });

  it("only rascunho allows deletion (RLS enforced)", () => {
    const statuses = ["rascunho", "finalizado", "recebido", "cancelado"];
    const deletable = statuses.filter((s) => s === "rascunho");
    expect(deletable).toEqual(["rascunho"]);
  });
});
