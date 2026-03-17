import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RECEIPT_CONFIG } from "@/lib/receiptConfig";

// ─── Mock html2canvas ───
const html2canvasMock = vi.fn(async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 794;
  canvas.height = 1123;
  return canvas;
});

// ─── Mock jsPDF ───
const pdfBlobContent = "%PDF-1.4 mock receipt pdf content with visible data that is long enough to pass validation check minimum bytes padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding";
const outputMock = vi.fn(() => new Blob([pdfBlobContent], { type: "application/pdf" }));
const addImageMock = vi.fn();
const addPageMock = vi.fn();

vi.mock("html2canvas", () => ({ default: html2canvasMock }));
vi.mock("jspdf", () => ({
  default: class MockJsPDF {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage = addImageMock;
    addPage = addPageMock;
    output = outputMock;
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gera HTML com estrutura completa do recibo", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML(baseOptions);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<style>");
    expect(html).toContain("receipt-header");
    expect(html).toContain("receipt-footer");
    expect(html).toContain("Empresa Teste");
    expect(html).toContain("Maria");
    expect(html).toContain("Produto A");
    expect(html).toContain("R$");
  });

  it("HTML contém todos os blocos obrigatórios do recibo", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      ...baseOptions,
      parcelas: [
        { numero: 1, valor: 5, vencimento: "01/02/2026", status: "Pendente" },
        { numero: 2, valor: 5, vencimento: "01/03/2026", status: "Pendente" },
      ],
    });

    // Header
    expect(html).toContain("Recibo de Venda");
    expect(html).toContain("abc123");
    // Client
    expect(html).toContain("Maria");
    expect(html).toContain("cli-1");
    // Items
    expect(html).toContain("Produto A");
    // Summary
    expect(html).toContain("Subtotal");
    expect(html).toContain("TOTAL");
    // Payments
    expect(html).toContain("PIX");
    // Parcelas
    expect(html).toContain("Parcelas do Crediário");
    expect(html).toContain("01/02/2026");
    // Footer
    expect(html).toContain("receipt-footer");
  });

  it("produto sem imagem usa placeholder sem quebrar", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML({
      ...baseOptions,
      itens: [
        { nome: "Sem imagem", quantidade: 1, precoUnitario: 5, desconto: 0, subtotal: 5 },
      ],
    });

    expect(html).toContain("Sem imagem");
    expect(html).toContain("product-placeholder");
    expect(html).not.toContain("product-img");
  });

  it("produto com imagem inclui tag img", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML(baseOptions);

    expect(html).toContain("product-img");
    expect(html).toContain("data:image/png;base64,BBB");
  });

  it("botões de UI não aparecem no HTML do recibo", async () => {
    const { buildReceiptHTML } = await import("@/lib/reportExport");
    const html = await buildReceiptHTML(baseOptions);

    expect(html).not.toContain("Exportar PDF");
    expect(html).not.toContain("Imprimir");
    expect(html).not.toContain("WhatsApp");
    expect(html).not.toContain("<button");
  });

  it("generateReceiptPdfBlob chama html2canvas e addImage", async () => {
    const { generateReceiptPdfBlob } = await import("@/lib/reportExport");
    const result = await generateReceiptPdfBlob({ ...baseOptions });

    expect(result.blob.size).toBeGreaterThan(20);
    expect(result.fileName).toContain("recibo_venda_abc123.pdf");
    expect(result.html).toContain("Produto A");
    expect(html2canvasMock).toHaveBeenCalled();
    expect(addImageMock).toHaveBeenCalled();
  }, 15000);

  it("shareReceiptWhatsApp compartilha arquivo PDF", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", { value: vi.fn(() => true), configurable: true });
    Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

    const { shareReceiptWhatsApp } = await import("@/lib/reportExport");
    const result = await shareReceiptWhatsApp({ ...baseOptions }, "11999999999");

    expect(shareMock).toHaveBeenCalledTimes(1);
    const payload = shareMock.mock.calls[0][0];
    expect(payload.files[0]).toBeInstanceOf(File);
    expect(payload.files[0].size).toBeGreaterThan(20);
    expect(result.shared).toBe(true);
  }, 15000);
});
