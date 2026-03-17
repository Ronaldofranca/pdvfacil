import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RECEIPT_CONFIG } from "@/lib/receiptConfig";

// ─── Mock html2canvas ───
vi.mock("html2canvas", () => ({
  default: vi.fn(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 794;
    canvas.height = 1123;
    return canvas;
  }),
}));

// ─── Mock jsPDF ───
vi.mock("jspdf", () => ({
  default: class MockJsPDF {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage = vi.fn();
    addPage = vi.fn();
    output = vi.fn(() => {
      // Create a blob that starts with %PDF so validation passes
      const content = new Uint8Array(2000);
      const header = new TextEncoder().encode("%PDF-1.4 mock");
      content.set(header, 0);
      return new Blob([content], { type: "application/pdf" });
    });
  },
}));

const baseOptions = {
  type: "venda" as const,
  id: "abc123",
  empresa: "Empresa Teste",
  logoUrl: "data:image/png;base64,AAA",
  data: "01/01/2026 10:00",
  cliente: { nome: "Maria", id: "cli-1" },
  itens: [
    { nome: "Produto A", quantidade: 1, precoUnitario: 10, desconto: 0, subtotal: 10, imagemUrl: "data:image/png;base64,BBB" },
  ],
  resumo: { subtotal: 10, descontos: 0, total: 10 },
  pagamentos: [{ forma: "PIX", valor: 10 }],
  receiptConfig: DEFAULT_RECEIPT_CONFIG,
};

describe("receipt PDF pipeline", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("gera HTML com estrutura completa do recibo", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML(baseOptions);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("receipt-header");
    expect(html).toContain("receipt-footer");
    expect(html).toContain("Empresa Teste");
    expect(html).toContain("Maria");
    expect(html).toContain("Produto A");
    expect(html).toContain("R$");
  });

  it("HTML contém todos os blocos obrigatórios", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      ...baseOptions,
      parcelas: [
        { numero: 1, valor: 5, vencimento: "01/02/2026", status: "Pendente" },
      ],
    });
    expect(html).toContain("Recibo de Venda");
    expect(html).toContain("Dados do Cliente");
    expect(html).toContain("Itens da Venda");
    expect(html).toContain("Subtotal");
    expect(html).toContain("TOTAL");
    expect(html).toContain("PIX");
    expect(html).toContain("Parcelas do Crediário");
  });

  it("produto sem imagem usa placeholder", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      ...baseOptions,
      itens: [{ nome: "Sem imagem", quantidade: 1, precoUnitario: 5, desconto: 0, subtotal: 5 }],
    });
    expect(html).toContain("Sem imagem");
    expect(html).toContain("product-placeholder");
  });

  it("botões de UI não aparecem no HTML do recibo", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML(baseOptions);
    expect(html).not.toContain("Exportar PDF");
    expect(html).not.toContain("Imprimir");
    expect(html).not.toContain("<button");
  });

  it("generateReceiptPdfBlob produz PDF válido", async () => {
    const { generateReceiptPdfBlob } = await import("@/lib/reportExport");
    const result = await generateReceiptPdfBlob({ ...baseOptions });
    expect(result.blob.size).toBeGreaterThan(100);
    expect(result.fileName).toContain("recibo_venda_abc123.pdf");
    expect(result.html).toContain("Produto A");
  }, 15000);

  it("shareReceiptWhatsApp compartilha arquivo PDF", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", { value: vi.fn(() => true), configurable: true });
    Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

    const { shareReceiptWhatsApp } = await import("@/lib/reportExport");
    const result = await shareReceiptWhatsApp({ ...baseOptions }, "11999999999");
    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(result.shared).toBe(true);
  }, 15000);
});
