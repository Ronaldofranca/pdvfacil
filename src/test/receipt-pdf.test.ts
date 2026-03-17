import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RECEIPT_CONFIG } from "@/lib/receiptConfig";

const html2canvasMock = vi.fn(async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 794;
  canvas.height = 1123;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111111";
    ctx.fillRect(40, 40, 200, 80);
  }
  return canvas;
});

const outputMock = vi.fn(() => new Blob(["%PDF-1.4 mock receipt pdf content with visible data"], { type: "application/pdf" }));
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
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
  });

  it("gera um PDF válido com conteúdo real do recibo", async () => {
    const { generateReceiptPdfBlob } = await import("@/lib/reportExport");
    const result = await generateReceiptPdfBlob({ ...baseOptions });

    expect(result.blob.size).toBeGreaterThan(20);
    expect(await result.blob.slice(0, 4).text()).toBe("%PDF");
    expect(result.fileName).toContain("recibo_venda_abc123.pdf");
    expect(html2canvasMock).toHaveBeenCalled();
    expect(addImageMock).toHaveBeenCalled();
  });

  it("mantém a geração do PDF mesmo sem imagens de produto", async () => {
    const { generateReceiptPdfBlob } = await import("@/lib/reportExport");
    const result = await generateReceiptPdfBlob({
      ...baseOptions,
      logoUrl: undefined,
      itens: [{ nome: "Sem imagem", quantidade: 1, precoUnitario: 5, desconto: 0, subtotal: 5 }],
    });

    expect(result.blob.size).toBeGreaterThan(20);
    expect(html2canvasMock).toHaveBeenCalled();
  });

  it("só compartilha depois que o arquivo PDF está pronto", async () => {
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
  });
});
