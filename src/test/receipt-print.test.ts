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
const pdfBlobContent = "%PDF-1.4 mock receipt pdf for print test with enough bytes to pass validation";
vi.mock("jspdf", () => ({
  default: class MockJsPDF {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage = vi.fn();
    addPage = vi.fn();
    output = vi.fn(() => new Blob([pdfBlobContent], { type: "application/pdf" }));
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("printReceipt", () => {
  it("gera PDF e abre janela para impressão", async () => {
    const openMock = vi.fn().mockReturnValue({
      onload: null,
      focus: vi.fn(),
      print: vi.fn(),
    });
    vi.spyOn(window, "open").mockImplementation(openMock);

    const { printReceipt } = await import("@/lib/reportExport");

    await printReceipt({
      type: "venda",
      id: "abc123",
      empresa: "Empresa Teste",
      logoUrl: "data:image/png;base64,AAA",
      data: "01/01/2026 10:00",
      cliente: { nome: "Maria", id: "cli-1" },
      itens: [
        { nome: "Produto A", quantidade: 1, precoUnitario: 10, desconto: 0, subtotal: 10 },
      ],
      resumo: { subtotal: 10, descontos: 0, total: 10 },
      pagamentos: [{ forma: "PIX", valor: 10 }],
      receiptConfig: DEFAULT_RECEIPT_CONFIG,
    });

    expect(openMock).toHaveBeenCalledTimes(1);
    // First arg should be a blob URL
    expect(openMock.mock.calls[0][0]).toMatch(/^blob:/);
  });
});
